

## Substituir "Temas Estratégicos" / "Temas" / "Tema" por "Editorias" / "Editoria"

Vou trocar todos os rótulos voltados ao usuário (UI, traduções, tour de onboarding, breadcrumbs, mensagens, formulários) que fazem referência a "Temas Estratégicos", "Tema Estratégico", "Temas", "Tema", "Novo Tema", "Editar Tema", etc. por suas equivalências:

- "Temas Estratégicos" → "Editorias"
- "Tema Estratégico" / "Tema" → "Editoria"
- "Novo Tema" → "Nova Editoria"
- "Editar Tema" → "Editar Editoria"
- "Criar Tema" → "Criar Editoria"
- "tema(s) estratégico(s)" / "tema(s)" (em frases corridas voltadas ao usuário) → "editoria(s)"
- "Macro-temas" / "Macro Temas" → "Macro-editorias" / "Macro Editorias"

### Arquivos que serão alterados (apenas strings visíveis ao usuário)

**Navegação, traduções e tour**
- `src/lib/translations.ts` — `sidebar.themes`, bloco `themes.*` (PT e ES)
- `src/lib/formTranslations.ts` — bloco `forms.themes.*`, textos com "temas" em mensagens de exclusão/saída de equipe
- `src/components/onboarding/tourSteps.ts` — passos referentes a `nav-themes`, `themes-create-button`, `plan-themes-field`, `select-theme`, `review-theme-field`
- `src/components/onboarding/TourSelector.tsx` (se houver label) e `src/pages/Themes.tsx` (label do tour "Tour de Temas Estratégicos")

**Páginas**
- `src/pages/Themes.tsx` — breadcrumb, título "Seus Temas Estratégicos", popover explicativo, botão "Novo tema", textos de erro/toast, dica dos 3 gratuitos
- `src/pages/ThemeView.tsx` — breadcrumbs e textos
- `src/pages/CreateContent.tsx` — label "Tema Estratégico", mensagens de validação/loader
- `src/pages/CreateImage.tsx` — `CustomizationCardInline` title "Tema" e descrição
- `src/pages/PlanContent.tsx` — label "Tema Estratégico" e placeholders
- `src/pages/Brands.tsx` — bullet "Adicione personas e temas estratégicos à marca"
- `src/pages/ActionView.tsx` — labels "Tema Estratégico" / "Temas Estratégicos"
- `src/pages/CreditHistory.tsx` — `CREATE_THEME: "Criar Tema"` → "Criar Editoria"

**Componentes**
- `src/components/temas/ThemeDialog.tsx` — títulos, descrições e botão "Criar Tema"
- `src/components/temas/ThemeDetails.tsx` — "Editar tema", "Macro Temas"
- `src/components/temas/ThemeList.tsx` — empty state "Nenhum tema encontrado"
- `src/components/quick-content/CustomizationCards.tsx` — title "Tema" / descrição
- `src/components/dashboard/DashboardStats.tsx` — label "Temas Estratégicos"
- `src/components/perfil/LeaveTeamDialog.tsx` — texto "marcas, temas e conteúdos"
- `src/components/historico/ActionDetails.tsx` — label "Tema Estratégico"
- `src/lib/creditCosts.ts` — `CREATE_THEME: "Criar tema"` → "Criar editoria"

**Chatbot (texto exibido ao usuário)**
- `supabase/functions/platform-chat/index.ts` — seção "🎯 Temas Estratégicos (/themes)" do conhecimento base, dicas e descrição geral

### O que NÃO será alterado (intencionalmente)

- Nomes de variáveis, tipos, hooks, rotas (`/themes`), IDs DOM (`nav-themes`, `themes-list`, etc.), tabelas e colunas do banco (`strategic_themes`, `theme_id`, `themeData`, etc.), props internas e arquivos de tipo (`src/types/theme.ts`).
- Prompts internos enviados à IA em edge functions (`generate-plan`, `generate-quick-content`, `edit-image`, `review-image`, `imagePromptBuilder`) — esses textos ("TEMA ESTRATÉGICO:", "Tema Estratégico:") são instruções internas para o modelo e mantê-los preserva a qualidade da geração. Posso alterá-los também se preferir, mas o padrão é não tocar.
- Migration SQL antiga (`20251001133719_*.sql`) — registros históricos de planos no banco; mudanças cosméticas não justificam nova migration.
- `next-themes` / `useTheme` / `setTheme` (toggle de modo claro/escuro) — não é "tema estratégico".
- Arquivos de documentação (`README.md`, guias `.md`) salvo se solicitado.

### Pergunta de escopo

Antes de aplicar, confirme:

1. **Prompts internos para a IA** (não visíveis ao usuário, mas afetam contexto enviado ao Gemini): manter como "Tema Estratégico" ou trocar para "Editoria"? Por padrão vou **manter** para preservar comportamento de geração.
2. **Rota `/themes`** continua a mesma (não vou renomear para `/editorias` para evitar quebrar links existentes, favoritos e analytics). Confirme se está ok.

Se concordar com esses dois pontos, aplico tudo de uma vez. Se quiser que eu também (a) traduza prompts internos e/ou (b) crie redirect `/themes` → `/editorias`, me avise antes de aprovar.

