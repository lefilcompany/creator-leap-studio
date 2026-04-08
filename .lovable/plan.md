

# Plano: Sistema de Report de Problemas na Geração

## Resumo

Criar um sistema completo de reporte de problemas: dialog com formulário, tabela no banco, Edge Function para enviar email ao suporte, e página admin para gerenciar os reports.

---

## Componentes

### 1. Tabela `generation_reports` no banco

Campos: `id`, `user_id`, `team_id`, `action_id`, `action_type`, `description`, `screenshot_urls` (jsonb array), `status` (open/resolved/dismissed), `created_at`, `resolved_at`, `admin_notes`. RLS: usuário vê os próprios, system admin vê todos e pode atualizar.

### 2. Componente `ReportProblemDialog`

Dialog reutilizável com:
- Campo de descrição do problema (textarea, obrigatório)
- Upload de até 3 screenshots (usando bucket `content-images`)
- Seleção do tipo de problema (imagem distorcida, texto incorreto, erro de geração, outro)
- Botão de enviar com loading state

Ao submeter: insere na tabela `generation_reports` e invoca a Edge Function de email.

### 3. Edge Function `send-report-email`

Recebe os dados do report e envia email para `suporte.creator@lefil.com.br` via Resend (já configurado no projeto) com:
- Nome e email do usuário
- Equipe (se tiver)
- Tipo e descrição do problema
- Links das screenshots
- Link direto para a action no sistema
- Data/hora do report

### 4. Página Admin `/system/reports`

Tabela com todos os reports, filtros por status, busca por usuário. Cada report mostra:
- Quem enviou (nome, email, avatar)
- Equipe
- Data/hora
- Tipo de problema
- Descrição
- Screenshots (clicáveis)
- Status (badge colorido)
- Botão para marcar como resolvido/dispensado com campo de notas

### 5. Integrações

- Botão "Reportar problema" no `QuickContentResult.tsx` abre o dialog
- Mesmo botão no `ContentResult.tsx` para consistência
- Nova rota `/system/reports` no App.tsx
- Novo item "Reports" no `SystemSidebar.tsx` com ícone `MessageSquareWarning`

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `generation_reports` com RLS |
| `src/components/ReportProblemDialog.tsx` | Novo componente dialog |
| `supabase/functions/send-report-email/index.ts` | Nova Edge Function |
| `src/pages/system/SystemReports.tsx` | Nova página admin |
| `src/pages/QuickContentResult.tsx` | Integrar dialog |
| `src/pages/ContentResult.tsx` | Integrar dialog |
| `src/App.tsx` | Adicionar rota `/system/reports` |
| `src/components/system/SystemSidebar.tsx` | Adicionar link "Reports" |

---

## Detalhes Técnicos

### Email via Resend
O projeto já tem `RESEND_API_KEY` e `LOVABLE_API_KEY` configurados. A Edge Function usará o gateway Resend para enviar o email formatado em HTML com os detalhes do report.

### Upload de Screenshots
Reutiliza o bucket `content-images` (público). O usuário seleciona imagens, faz upload via `supabase.storage`, e os URLs são salvos no campo `screenshot_urls`.

### Status Flow
`open` → `resolved` ou `dismissed` (admin atualiza via painel).

