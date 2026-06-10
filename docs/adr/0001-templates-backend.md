# ADR 0001 — Templates por Marca (Backend)

- **Status:** Proposto
- **Data:** 2026-06-10
- **Escopo:** Camada de dados, storage, edge functions, permissões e modelo de créditos da funcionalidade de Templates.
- **ADRs relacionadas:** [0002 — Frontend](./0002-templates-frontend.md), [0003 — Agente de IA](./0003-templates-ai-agent.md)

---

## 1. Contexto

Hoje cada criação de imagem parte do zero: o usuário descreve briefing, escolhe estilo e o agente gera. Marcas profissionais possuem **layouts visuais aprovados** (posts padrão, banners de campanha, templates de promoção) que precisam ser reaplicados com mensagens diferentes mantendo identidade visual, tipografia e composição idênticas.

A ausência desse recurso obriga o usuário a:
1. Recriar manualmente o briefing a cada postagem similar;
2. Conviver com inconsistências visuais entre peças que deveriam parecer uma série;
3. Investir créditos repetidamente para reproduzir um mesmo layout.

A funcionalidade de **Templates por Marca** resolve isso permitindo upload de arquivos PDF/PNG, extração das zonas editáveis (texto + slot de logo) e reaplicação determinística com novo conteúdo.

## 2. Decisão

### 2.1. Modelo de dados

Nova tabela **`brand_templates`** (1 template = 1 página de arquivo):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `brand_id` | uuid FK → brands | |
| `user_id` | uuid | criador |
| `workspace_id` | uuid | preenchido por trigger `set_workspace_id_from_user` |
| `name` | text | nome amigável |
| `source_type` | text | `pdf` ou `png` |
| `source_file_path` | text | path no bucket privado |
| `preview_path` | text | PNG renderizado em 1024px (capa) |
| `clean_background_path` | text \| null | fundo limpo gerado no commit (cache) |
| `width`, `height` | int | dimensões originais em px |
| `text_zones` | jsonb | array de zonas (schema 2.2) |
| `logo_slot` | jsonb \| null | slot opcional de logo (schema 2.3) |
| `font_assets` | jsonb | resoluções de fonte por zona (schema 2.4) |
| `status` | text | `draft` \| `ready` \| `failed` |
| `deleted_at` | timestamptz | soft-delete (padrão Trash) |
| `created_at`, `updated_at` | timestamptz | |

**RLS / GRANTs**
- `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated; GRANT ALL TO service_role.`
- RLS via `can_access_workspace_resource(user_id, workspace_id, (SELECT team_id FROM brands WHERE id=brand_id))`.
- Soft-delete segue padrão Trash (retenção 30 dias, `cleanup-trash` purga storage).

**Trigger de limite:** rejeita INSERT quando `COUNT(*) WHERE brand_id=NEW.brand_id AND deleted_at IS NULL >= 10`.

### 2.2. Schema `text_zones[]`

```jsonc
{
  "id": "uuid",
  "label": "Título" | "CTA" | "Subtítulo" | "...",
  "bbox": { "x": 0.05, "y": 0.10, "w": 0.90, "h": 0.18 },  // normalizado 0-1
  "font_family": "Inter",
  "font_weight": 700,
  "font_size_px": 64,        // referência do template original
  "color": "#0F172A",
  "align": "left" | "center" | "right",
  "line_height": 1.1,
  "max_chars": 60,           // sugerido; UI valida
  "original_text": "Texto detectado no upload"
}
```

### 2.3. Schema `logo_slot`

```jsonc
{
  "bbox": { "x": 0.78, "y": 0.04, "w": 0.18, "h": 0.10 },
  "fit": "contain" | "cover",
  "padding": 8
}
```

Ausente (`null`) quando o template não tem slot reservado para logo. Quando presente, o logo é resolvido a partir de `brands.logo` no momento da geração — nunca embarcado no template.

### 2.4. Schema `font_assets`

```jsonc
{
  "Inter": { "source": "google", "weights": [400, 700] },
  "BrandSans": { "source": "custom", "font_id": "uuid-de-custom_fonts" }
}
```

Mapeia cada `font_family` referenciada em `text_zones` para uma das duas origens. Sem essa resolução, o template não pode ser salvo como `ready`.

### 2.5. Storage

Novo bucket privado **`brand-templates`** com estrutura:

```
{workspace_id}/{brand_id}/{template_id}/
├── source.(pdf|png)
├── preview.png
└── clean_background.png
```

Políticas RLS em `storage.objects`:
- `SELECT`/`INSERT`/`DELETE` apenas para membros ativos do workspace do path (via `is_workspace_member`).

### 2.6. Edge functions

| Função | Responsabilidade |
|---|---|
| `import-brand-template` | Recebe arquivo + `brand_id`, valida (PDF=1 página, MIME, ≤5MB), rasteriza PDF para PNG, chama Vision/Inpainting (ver ADR 0003 §1), retorna `{ template_id (status=draft), text_zones detectadas, logo_slot sugerido, clean_background_url }` para confirmação do usuário. |
| `commit-brand-template` | Recebe `template_id` + `text_zones` e `logo_slot` ajustados pelo usuário + `font_assets` resolvidos. Valida que toda fonte está disponível (Google Fonts ou `custom_fonts`). Promove status para `ready`. |
| `generate-from-template` | Orquestra pipeline da ADR 0003. Cria `actions(type='template_image')`, debita créditos, persiste resultado em `content-images`. |
| `delete-brand-template` | Soft-delete (`deleted_at = now()`). Purga física executada por `cleanup-trash`. |

Todas reutilizam padrões existentes: CORS, validação JWT, Zod nos bodies, `LOVABLE_API_KEY`/`GEMINI_API_KEY`.

### 2.7. Modelo de créditos

- Reuso de `profiles.credits` e `consume_workspace_credits` (modelo individual v2).
- Novo `action_type = 'template_image'` em `src/lib/creditCosts.ts` e `supabase/functions/_shared/creditCosts.ts`.
- **Custo = 50% do custo de `IMAGE`** (arredondamento para cima). Justificativa de produto na ADR 0003.
- `actions` mantém a estrutura atual; campo `details.template_id` armazena referência.

### 2.8. Permissões

Qualquer membro ativo do workspace/equipe que vê a marca pode subir, editar, deletar e usar templates daquela marca. Mesmo modelo das tabelas `brands` e `personas`.

## 3. Consequências

**Positivas**
- Pipeline determinístico → custo de IA por geração cai (1 fundo amortizado + 0-1 fundo novo) e justifica desconto.
- Reuso de `actions` mantém histórico, favoritos, trash, créditos e relatórios funcionando sem mudanças.
- Soft-delete e RLS herdam padrões já testados.

**Negativas / custos**
- Storage extra: ~2-3 MB por template (source + preview + clean_background). Com cap de 10/marca, vira teto previsível.
- Necessidade de um trigger de limite e de validação cruzada de fontes no `commit`.
- Compromisso de manter Vision (Gemini) acessível para nova importação.

**Riscos**
- Vision pode errar a detecção de fonte; mitigado pela ADR 0002 (ajuste manual obrigatório).
- PDFs com fontes embutidas não-padrão podem exigir fallback; mitigado pelo bucket `custom-fonts`.

## 4. Alternativas consideradas

1. **Coluna `templates jsonb` em `brands`** — rejeitada: rompe normalização, dificulta RLS por template, impede soft-delete granular.
2. **Sem cache de `clean_background`** — rejeitada: força inpainting a cada geração, inviabiliza desconto de 50%.
3. **Permissão restrita a Dono/Admin** — rejeitada: marcas no produto já operam com modelo aberto à equipe; restringir templates criaria atrito desnecessário.
4. **Sem limite de templates por marca** — rejeitada para MVP: storage cresce sem teto. Pode ser revisto após telemetria.
