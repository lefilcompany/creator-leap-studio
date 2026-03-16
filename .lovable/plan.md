

# Plano: Processamento em segundo plano para todas as gerações

## Problema
O usuário fica preso na tela de geração até o processo completar. Não pode navegar pelo sistema durante a geração.

## Solução
Criar um sistema de **background tasks** via React Context que:
1. Captura o trabalho assíncrono (API call) e permite o usuário navegar livremente
2. Mostra indicador de progresso na sidebar (acima do card de créditos)
3. Exibe toast com link ao resultado quando finalizado
4. Suporta todos os fluxos: CreateImage, CreateContent, QuickContent, ReviewContent, PlanContent

---

## Arquitetura

```text
┌─────────────────────────────────────────┐
│           BackgroundTaskProvider         │
│  (Context global no App.tsx)            │
│                                         │
│  tasks: Map<id, {                       │
│    type, label, status,                 │
│    progress, resultRoute, resultState   │
│  }>                                     │
│                                         │
│  addTask(config) → id                   │
│  Runs async work in background          │
│  On complete → toast + store result     │
│  On error → toast error                 │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌─────────────┐    ┌──────────────┐
  │  Sidebar     │    │  Pages       │
  │  indicator   │    │  dispatch &  │
  │  (above      │    │  navigate    │
  │   credits)   │    │  away        │
  └─────────────┘    └──────────────┘
```

## Arquivos

### 1. **CRIAR** `src/contexts/BackgroundTaskContext.tsx`

- Context com `tasks` state (Map ou array)
- Task interface: `{ id, type, label, status: 'running'|'complete'|'error', progress, resultRoute, resultState, createdAt }`
- `addTask(label, type, asyncFn, resultRoute)` — executa `asyncFn` em background, ao completar salva resultado
- `removeTask(id)` — limpa task concluída
- `getActiveTasks()` — retorna tasks em andamento
- Ao completar: mostra toast com botão "Ver resultado" que navega para `resultRoute` com `resultState`
- Ao falhar: mostra toast de erro

### 2. **EDITAR** `src/App.tsx`

- Envolver com `<BackgroundTaskProvider>` (dentro do BrowserRouter para ter acesso ao navigate)

### 3. **CRIAR** `src/components/SidebarTaskIndicator.tsx`

- Componente que lê tasks do context
- Mostra acima do card de créditos na sidebar
- Task em andamento: ícone animado (Loader2) + label truncado + barra de progresso mini
- Task concluída: ícone check verde + "Ver resultado" clicável
- Collapsed sidebar: apenas ícone com tooltip
- Auto-remove tasks concluídas após 30s

### 4. **EDITAR** `src/components/AppSidebar.tsx`

- Importar e renderizar `<SidebarTaskIndicator />` acima do card de créditos (dentro da seção `mt-auto mb-5`)

### 5. **EDITAR** `src/pages/CreateImage.tsx`

- Refatorar `handleGenerateContent`:
  - Validar form e preparar payload (compressão de imagens, base64) **antes** de dispatch
  - Chamar `addTask()` passando uma async function que faz a chamada API + caption + retorna resultState
  - Navegar imediatamente para `/dashboard` ou `/history` após dispatch
  - Remover o `loading` state que bloqueia a UI (ou mantê-lo apenas durante a preparação do payload)

### 6. **EDITAR** `src/pages/CreateContent.tsx`

- Mesmo padrão: preparar payload → dispatch background task → navegar
- Suportar tanto modo imagem quanto modo vídeo

### 7. **EDITAR** `src/pages/QuickContent.tsx`

- Mesmo padrão para `generateQuickContent`

### 8. **EDITAR** `src/pages/ReviewContent.tsx`

- Mesmo padrão para `handleReview`

### 9. **EDITAR** `src/pages/PlanContent.tsx`

- Mesmo padrão para geração de plano

### 10. **EDITAR** result pages (ContentResult, QuickContentResult, ReviewResult, PlanResult)

- Manter suporte a `location.state` (para compatibilidade)
- Quando receber dados via location.state, funcionar normalmente (sem mudanças)

## Fluxo do usuário

1. Usuário preenche form e clica "Gerar"
2. Sistema prepara payload (comprime imagens etc.) — loading breve de 1-3s
3. Task é adicionada ao background context → toast "Geração iniciada"
4. Usuário é redirecionado para onde estava (dashboard) ou pode navegar livremente
5. Sidebar mostra indicador pulsante com label "Gerando imagem..."
6. Ao completar: toast "Conteúdo gerado!" com botão "Ver resultado"
7. Sidebar atualiza indicador para "Concluído" com link clicável
8. Clicando, navega para a result page com os dados

## Detalhes técnicos

- Background tasks vivem apenas em memória (não persistem em refresh) — aceitável pois geração leva 30-90s
- Limite de 1 task simultânea por tipo (evitar spam)
- A preparação do payload (compressão de imagens base64) ainda acontece na página de form, antes do dispatch
- O `asyncFn` passado ao context é autossuficiente — contém toda a lógica de API call e retorna `{ route, state }`

## Riscos mitigados

- **Refresh da página**: task é perdida, mas a action já foi salva no banco pelo backend — acessível via Histórico
- **Erro durante geração**: toast de erro informativo, task marcada como 'error' na sidebar
- **Múltiplas gerações**: suportado — sidebar mostra lista de tasks ativas

