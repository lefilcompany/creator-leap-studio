

## Renomear "Planejar Conteúdo" → "Calendário de Conteúdo"

Renomear todas as ocorrências de "Planejar Conteúdo" (e variações) para "Calendário de Conteúdo" em toda a aplicação. Não altera nomes internos de variáveis, tipos ou rotas — apenas os textos exibidos ao usuário.

### Arquivos a editar

1. **`src/lib/translations.ts`** — Alterar `planContent` em PT e EN:
   - PT: `"Planejar Conteúdo"` → `"Calendário de Conteúdo"` (sidebar e título da página)
   - EN: `"Plan Content"` → `"Content Calendar"`

2. **`src/types/action.ts`** — Display strings:
   - `ActionDisplayType`: `'Planejar conteúdo'` → `'Calendário de conteúdo'`
   - `ACTION_TYPE_DISPLAY`: mesmo
   - `ACTION_STYLE_MAP`: atualizar a chave

3. **`src/pages/PlanContent.tsx`** — Textos no breadcrumb, alt da imagem, h1 e dica contextual

4. **`src/pages/PlanResult.tsx`** — Título `"Planejamento de Conteúdo"` → `"Calendário de Conteúdo"`

5. **`src/components/dashboard/DashboardRecentActivity.tsx`** — `'PLANEJAR_CONTEUDO': 'Planejar Conteúdo'` → `'Calendário de Conteúdo'`

6. **`src/components/admin/UserLogsDialog.tsx`** — Mesmo mapeamento de display

7. **`src/components/onboarding/tourSteps.ts`** — Tour step do nav e do plan content

8. **`src/lib/creditCosts.ts`** — Label `"Planejamento de conteúdo"` → `"Calendário de conteúdo"`

9. **`src/pages/CreditHistory.tsx`** — Label `"Planejamento de Conteúdo"` → `"Calendário de Conteúdo"`

10. **`src/pages/Onboarding.tsx`** — Texto descritivo `"planejamento de conteúdo"` → `"calendário de conteúdo"`

11. **`supabase/functions/platform-chat/index.ts`** — Texto do prompt do chatbot

12. **`supabase/functions/generate-plan/index.ts`** — Description no credit history log

### O que NÃO muda
- Enum `PLANEJAR_CONTEUDO` no banco (tipo de ação) — permanece inalterado
- Nomes de variáveis/funções (`planContent`, `plan_content`) — apenas labels visíveis
- Rotas (`/plan`, `/plan-result`) — permanecem iguais
- Arquivo `types.ts` do Supabase — gerado automaticamente

