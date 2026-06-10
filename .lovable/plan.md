
# Plano: ADRs da funcionalidade de Templates por Marca

Vou criar 3 arquivos `.md` em `docs/adr/` (diretório novo) para revisão, consolidando as decisões já validadas no grilling:

```
docs/adr/
├── 0001-templates-backend.md
├── 0002-templates-frontend.md
└── 0003-templates-ai-agent.md
```

## Decisões consolidadas (transversais às 3 ADRs)

| # | Decisão | Resposta |
|---|---|---|
| 1 | Detecção de texto | Híbrido OCR + ajuste manual |
| 2 | Fundo na geração | Usuário escolhe por geração (reusar limpo ou gerar novo) |
| 3 | PDF multipágina | Apenas 1 página por template; rejeitar/escolher na importação |
| 4 | Composição final | Híbrido — IA gera fundo, Canvas server-side desenha texto |
| 5 | Fontes | Google Fonts auto + fallback pede upload (.ttf/.otf via `custom_fonts`) |
| 6 | UX | Página própria `/create-from-template` |
| 7 | Permissões | Qualquer membro da equipe (igual marca) |
| 8 | Limite | 10 templates por marca |
| 9 | Custo | 50% do custo de uma imagem comum |
| 10 | Elementos editáveis | Texto + slot de logo da marca (puxa de `brands.logo`) |

---

## Conteúdo de cada ADR (resumo do que cada arquivo vai conter)

### `0001-templates-backend.md`
- **Status:** Proposto
- **Contexto:** Marcas precisam reutilizar layouts visuais aprovados. Hoje cada criação parte do zero.
- **Decisões:**
  - Nova tabela `brand_templates` (1 template = 1 página): `id, brand_id, user_id, workspace_id, name, source_file_path, preview_path, width, height, text_zones jsonb, logo_slot jsonb, font_assets jsonb, status (draft|ready|failed), source_type (pdf|png), deleted_at, created_at, updated_at`.
  - GRANTs `authenticated`/`service_role`, RLS via `can_access_workspace_resource`, soft-delete (padrão Trash).
  - Schema de `text_zones[]`: `{ id, label, bbox {x,y,w,h}, font_family, font_weight, font_size_px, color, align, line_height, max_chars, original_text }`.
  - Schema de `logo_slot`: `{ bbox, fit: "contain"|"cover", padding }` ou `null`.
  - Bucket `brand-templates` (privado) com paths `{workspace_id}/{brand_id}/{template_id}/source.(pdf|png)` + `clean_background.png` (gerado no salvamento, custo amortizado).
  - Edge functions:
    - `import-brand-template` — recebe arquivo, valida (PDF=1 página, tipo, ≤5MB), gera preview PNG e clean_background, retorna zonas detectadas para confirmação.
    - `commit-brand-template` — salva zonas finais após ajuste do usuário.
    - `generate-from-template` — orquestra pipeline (ver ADR 3) e cria `actions` com `type='template_image'` e custo 50% do `IMAGE` (ver `creditCosts.ts`).
  - Limite de 10 templates por marca validado por trigger.
  - Reutiliza `actions` (sem nova tabela de output) e modelo de créditos individual.
- **Consequências:** custo extra de storage (~2-3 MB/template), pipeline determinístico previsível.
- **Alternativas rejeitadas:** template como linha em `brands` (rígido); compor 100% por IA (tipografia quebra).

### `0002-templates-frontend.md`
- **Status:** Proposto
- **Contexto:** Precisa de UI para gerenciar templates por marca e um fluxo dedicado de criação.
- **Decisões:**
  - Nova aba "Templates" em `BrandDetails.tsx` (lista, upload, exclusão, contador X/10).
  - `TemplateUploadDialog` — etapas: upload → preview com zonas detectadas sobrepostas (canvas interativo) → ajuste manual de bbox/texto/fonte → confirmação. Se fonte não estiver em Google Fonts, bloqueia o "Salvar" pedindo upload do arquivo de fonte.
  - Nova rota `/create-from-template` com:
    - Galeria de templates da marca selecionada (thumbnails).
    - Form lateral: campos dinâmicos por zona detectada (label + maxLength), toggle "Reusar fundo original / Gerar novo fundo" (se "novo": campo de descrição), toggle "Incluir logo da marca" (se slot existir).
    - Botão "Gerar imagem" → consome 50% do custo, vai para `ContentResult` existente.
  - Item no `AppSidebar` apontando para `/create-from-template`.
  - Componentes seguem padrão: bg-card, rounded-2xl, raw divs (sem Card), terminologia "ajustar".
  - Breadcrumbs ao invés de back button.
  - `useBrandTemplates(brandId)` hook (React Query) + `useCreateFromTemplate()` mutation.
- **Consequências:** dois fluxos paralelos de criação (livre + template); decisões de UX claras para cada um.
- **Alternativas rejeitadas:** colocar dentro do `/create-image` (mistura modos), aba global de templates (perde escopo por marca).

### `0003-templates-ai-agent.md`
- **Status:** Proposto
- **Contexto:** Pipeline de geração precisa preservar fidelidade tipográfica (impossível com IA pura) mas manter flexibilidade visual no fundo.
- **Decisões — pipeline em 4 estágios:**
  1. **Importação (1x por template):**
     - PDF → rasteriza p.1 com pdf.js (já no projeto via deps).
     - PNG → usa direto.
     - Chama Gemini Vision (`google/gemini-2.5-flash` via `LOVABLE_API_KEY`) com prompt estruturado pedindo JSON de zonas (bbox normalizado, texto, fonte estimada, peso, tamanho aproximado em px, cor hex, alinhamento).
     - Inpainting do texto via Gemini image edit (`google/gemini-3-pro-image-preview`) → gera `clean_background.png`.
     - Retorna ao frontend para ajuste manual (princípio "OCR sugere, humano confirma").
  2. **Geração — etapa fundo (por uso):**
     - Branch A (reusar): lê `clean_background.png` do bucket.
     - Branch B (gerar novo): chama `google/gemini-3.1-flash-image-preview` com prompt enriquecido pelo Art Director (mem `image-generation/art-director-enrichment`), respeitando aspect ratio do template e estilo da marca (mem `brand-style-feedback-system`).
  3. **Geração — etapa texto (Canvas server-side em Deno):**
     - Edge function usa `@napi-rs/canvas` ou `skia-canvas` via npm specifier no Deno.
     - Carrega fonte: Google Fonts CDN (cache) ou arquivo do bucket `custom-fonts`.
     - Desenha cada zona: respeita bbox, fonte, peso, tamanho, cor, alinhamento, line-height; auto-shrink se exceder bbox (mem `text-on-image-specs`).
     - Se `logo_slot` ativo: baixa `brands.logo` e cola com fit configurado.
  4. **Compliance & finalização:**
     - Roda `complianceCheck` (mem `content-compliance-moderation`) no texto antes do desenho.
     - Salva PNG final em `content-images`, cria `actions` com `type='template_image'`, debita créditos, dispara legenda sugerida (mem `legenda-sugerida-padrao-v2`).
  - **Guardrails:**
    - Logo da marca é imutável (mem `reference-image-preservation`).
    - Sem contexto político.
    - Modelo determinístico: nenhuma reescrita de texto pela IA (texto vai exatamente como o usuário digitou).
- **Consequências:** custo de IA reduzido (1 inpainting amortizado + 0-1 fundo por uso) justifica desconto de 50%; tipografia 100% fiel.
- **Alternativas rejeitadas:** edição via Gemini Pro de ponta a ponta (texto borrado, palavras inventadas); composição 100% determinística sem IA (sem flexibilidade de fundo).

---

## Após aprovação do plano
Crio os 3 arquivos `.md` com o conteúdo acima detalhado em prosa de ADR (Contexto / Decisão / Consequências / Alternativas / Riscos). Nenhuma alteração de código, migração ou edge function nesta etapa — só documentação.

Usei as skills `grill-with-docs` (interview iterativo) e `grill-me` (challenge das decisões). Confirma a entrega que vou gerar?
