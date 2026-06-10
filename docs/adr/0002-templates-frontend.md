# ADR 0002 — Templates por Marca (Frontend)

- **Status:** Proposto
- **Data:** 2026-06-10
- **Escopo:** Telas, navegação, componentes e hooks da funcionalidade de Templates.
- **ADRs relacionadas:** [0001 — Backend](./0001-templates-backend.md), [0003 — Agente de IA](./0003-templates-ai-agent.md)

---

## 1. Contexto

A funcionalidade exige duas superfícies distintas:

1. **Gestão por marca** — usuário precisa subir, listar, ajustar e excluir templates dentro do contexto da marca, com a mesma sensação de "configurar a marca" que já existe em `BrandDetails.tsx`.
2. **Consumo no fluxo de criação** — quando o usuário quer gerar uma peça nova a partir de um template, o fluxo é fundamentalmente **diferente** do `/create-image` livre: não há briefing aberto, apenas zonas de texto + escolha do fundo. Misturar os dois fluxos na mesma tela esconde affordances importantes.

A decisão validada no grilling foi **separar completamente os dois fluxos** com uma rota própria `/create-from-template`.

## 2. Decisão

### 2.1. Gestão de templates dentro da marca

- Nova aba **"Templates"** em `BrandDetails.tsx` (ao lado das abas existentes), seguindo o padrão floating board (`bg-card`, `rounded-2xl`, raw divs).
- Componente `BrandTemplatesList`:
  - Grid responsivo de cards mostrando `preview_path`, nome, contagem de zonas, data.
  - Header com botão `+ Novo template` e contador `X / 10`.
  - Menu de contexto por card: `Ajustar zonas`, `Excluir` (soft-delete, vai para Trash).
- Hook `useBrandTemplates(brandId)` (React Query) → lista templates `ready`/`draft` não deletados.
- Empty state: ilustração + CTA "Enviar o primeiro template".

### 2.2. Upload e ajuste — `TemplateUploadDialog`

Diálogo multi-step usando o padrão dos dialogs existentes (sem usar Card; raw divs; terminologia "ajustar"):

1. **Upload** — dropzone aceitando `.pdf` (1 página) ou `.png`/`.jpg`, ≤ 5MB. Validação no client antes de enviar.
2. **Processando** — skeleton enquanto `import-brand-template` retorna; mensagem "Detectando zonas de texto e logo…".
3. **Ajustar zonas** — canvas interativo:
   - Imagem do template ao fundo.
   - Sobreposição de retângulos editáveis (drag, resize) por zona detectada.
   - Painel lateral por zona: `label`, `original_text`, `font_family` (autocomplete Google Fonts), `font_weight`, `font_size_px`, `color`, `align`, `max_chars`.
   - Toggle "Incluir slot para logo da marca" → habilita um retângulo dedicado.
   - Botões "Adicionar zona" e "Remover zona".
4. **Resolver fontes** — se alguma `font_family` não está em Google Fonts:
   - Bloqueia o "Salvar" e mostra inline-uploader que cai no fluxo de `custom_fonts`.
5. **Confirmar** — POST em `commit-brand-template`; toast de sucesso; fecha diálogo.

### 2.3. Página de criação a partir de template

Nova rota **`/create-from-template`** (BrowserRouter, lazy import) com:

- **Header** com breadcrumbs (`Início › Criar a partir de template`), sem back button.
- **Seleção de marca** (se usuário tem várias) → galeria de templates daquela marca.
- Ao escolher um template, layout em duas colunas (responsivo):
  - **Esquerda — preview ao vivo:** mostra `preview_path` do template com placeholders dos textos atuais sobrepostos; atualiza em tempo real conforme o usuário digita.
  - **Direita — formulário dinâmico:**
    - Um campo por zona em `text_zones[]` (label = `zone.label`, contador `value.length / max_chars`).
    - Bloco "Fundo da imagem" com toggle `Reusar fundo original` / `Gerar novo fundo`. Quando "novo": campo descritivo + select de estilo (reuso de componentes `VisualStyleGrid` se aplicável).
    - Se `logo_slot` existir: toggle `Incluir logo da marca` (default ligado).
    - Custo previsto: `Math.ceil(IMAGE_COST * 0.5)` créditos.
    - Botão `Gerar imagem` → `CreditConfirmationDialog` → chama `generate-from-template`.
- Após sucesso, redireciona para `/content/:actionId` (reuso do `ContentResult`).

### 2.4. Navegação

- Novo item no `AppSidebar` ("Criar a partir de template") na seção de criação.
- Tour de onboarding pode receber um passo opcional (não no MVP).

### 2.5. Hooks e arquitetura de dados

```
src/hooks/
├── useBrandTemplates.ts        // list, create, update, soft-delete
├── useImportTemplate.ts        // wrapper de import-brand-template (multi-step)
└── useGenerateFromTemplate.ts  // mutation + tracking de créditos
```

- Todas as chamadas vão por `supabase.functions.invoke()` (regra do projeto, nunca path).
- Erros mapeados para toast amigável; 402/insuficientes → mesmo modal de compra de crédito já existente.

### 2.6. Convenções obrigatórias do projeto

- Floating board: `bg-card`, `rounded-2xl`, `shadow-xl`, raw divs sobre Card.
- Sem rótulo "(opcional)".
- Terminologia: "ajustar", nunca "revisar".
- Breadcrumbs no lugar de back buttons; ocultos no mobile.
- Texto sobre imagem segue specs já memorizadas (12–36px, max 50 chars no preview ao vivo — limite real fica em `max_chars` do template).

## 3. Consequências

**Positivas**
- Fluxo livre (`/create-image`) permanece intocado: zero risco de regressão.
- Página dedicada permite UI muito mais direta (sem briefing aberto).
- Ajuste manual após OCR garante zero surpresa visual.

**Negativas**
- Mais um ponto de entrada para "criar imagem" → exige reforço no onboarding e copy clara.
- Canvas interativo de ajuste é o componente mais complexo do MVP; demanda atenção a usabilidade mobile (provável fallback: bloquear ajuste fino no mobile, permitir só uso).

**Riscos**
- Preview ao vivo no client precisa carregar a fonte real (Google Fonts ou `custom_fonts`) — pode causar FOUT. Mitigar com `font-display: block` durante render do preview.

## 4. Alternativas consideradas

1. **Toggle dentro de `/create-image`** — rejeitada: mistura dois modelos mentais (briefing livre vs. preenchimento de slots).
2. **Aba global de templates (fora da marca)** — rejeitada: templates pertencem visualmente à marca; tirar do contexto da marca dilui propriedade.
3. **Permitir editar template sem ajuste manual** — rejeitada: OCR sozinho não é confiável o suficiente para fidelidade visual.
