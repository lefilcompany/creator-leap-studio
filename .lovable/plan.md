# Criar novo workspace — fluxo em etapas

## Problema

Hoje o botão "Criar novo workspace" no `WorkspaceSwitcher` navega para `/workspace?action=create`, mas a página `Workspace.tsx` ignora o parâmetro `action`. Nada acontece. Não existe nenhuma UI de criação no projeto.

## Solução

Criar um modal **full-screen** (estilo da referência da Lovable) que abre quando a URL tem `?action=create`, com etapas curtas, perguntas diretas e termos já usados no app (nada de "pool", manter "Individuais" / "Compartilhados", como já ajustado nas memórias).

## Etapas do wizard

```
[1 Identidade]  →  [2 Créditos]  →  [3 Revisão]
```

**Etapa 1 — Identidade do workspace**
- Avatar (opcional, upload imediato após criar — pode ser pulado)
- Nome do workspace (obrigatório, mín. 2 chars)
- Frase curta de apoio: "Espaço para colaborar com sua equipe e organizar marcas, conteúdos e calendários."
- Botões: `Cancelar` · `Continuar`

**Etapa 2 — Modelo de créditos**  
Dois cards lado a lado (mesma linguagem do `Workspace.tsx`):
- **Individuais** (padrão / recomendado) — "Cada membro usa os próprios créditos. Sem transferências, sem limites a configurar."
- **Compartilhados** — "Você disponibiliza créditos para o workspace e define quanto cada membro pode gastar por mês."

Se escolher **Compartilhados**, mostra logo abaixo:
- Input "Disponibilizar agora (opcional)" — quantidade a transferir do saldo pessoal (validar contra `user.credits`, permite 0)
- Input "Limite mensal padrão por membro" (default `0` = não pode gastar; texto auxiliar reforça que membros começam com 0 conforme regra do app)
- Texto: "Você pode ajustar tudo isso depois em Configurações do Workspace."

Botões: `Voltar` · `Continuar`

**Etapa 3 — Revisão e criar**
- Resumo: nome, avatar, modo de créditos (e valor a transferir + limite padrão se compartilhado)
- Botões: `Voltar` · `Criar workspace` (loading)

## Lógica de submit (sequencial, com rollback simples)

1. `INSERT public.workspaces { name, owner_id: user.id, is_personal: false, credit_mode }` → recebe `workspace_id`.
2. `INSERT public.workspace_members { workspace_id, user_id, role: 'owner', status: 'active', joined_at: now() }`.
3. Se avatar selecionado: upload em `workspace-avatars/{workspace_id}/...` e `UPDATE workspaces.avatar_url`.
4. Se modo `shared` e valor > 0: `rpc('workspace_transfer_personal_to_shared', { p_workspace_id, p_amount })` (já existe).
5. `UPDATE profiles.current_workspace_id = workspace_id` (entra no workspace recém-criado).
6. `WorkspaceContext.reload()` + `refreshProfile()` + `navigate('/workspace')` (limpa `?action=create`).
7. `toast.success("Workspace criado")`.

Erros em qualquer etapa: `toast.error` com mensagem; se já criou o workspace e a transferência falhar, manter o workspace e avisar que a transferência não ocorreu (usuário pode refazer em Configurações).

## UI / arquivos

- **Novo:** `src/components/workspace/CreateWorkspaceWizard.tsx` — `Dialog` em modo full-screen (`max-w-none w-screen h-screen rounded-none p-0`) com header (logo + botão fechar X), conteúdo central com `max-w-xl` e indicador de passos no topo (1·2·3 com linha de progresso). Reutiliza `Button`, `Input`, `Label`, `Avatar`, `cn`, padrão floating board (`bg-card`, `rounded-2xl`).
- **Editar:** `src/pages/Workspace.tsx`
  - `useEffect` adicional: se `params.get('action') === 'create'` → abre o wizard e remove o param da URL.
  - Renderiza `<CreateWorkspaceWizard open={...} onClose={...} onCreated={...} />`.
- **Editar:** `src/components/WorkspaceSwitcher.tsx` — manter o `navigate('/workspace?action=create')` (já funciona, só passa a ter handler).

## Linguagem (memórias do projeto)
- "Individuais" / "Compartilhados" (não "Pessoais", não "pool").
- "Disponibilizar créditos para o workspace" (não "transferir para o pool").
- Sem rótulo "(opcional)" — usar texto auxiliar quando precisar.
- Breadcrumbs/back: usar botão `Voltar` entre etapas; botão `X` no canto fecha o wizard.

## Não-escopo
- Seleção de plano: o app cobra créditos por usuário (`profiles.plan_id`, `profiles.credits`), não por workspace. Não faz sentido pedir plano na criação — fica fora.
- Convites de membros: já existem em Configurações do Workspace; o wizard finaliza levando o usuário para lá caso queira convidar (link "Convidar membros agora" na tela de sucesso).
