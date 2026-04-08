

# Plano: Tela de carregamento na Criação Personalizada (CreateImage)

## Objetivo
Adicionar a mesma tela de carregamento com logo animada e progress bar que existe no QuickContent, substituindo o formulário enquanto a imagem está sendo gerada.

## Mudanças

### `src/pages/CreateImage.tsx`

1. **Importar `QuickContentLoading`** e adicionar lógica de detecção de tarefa em andamento (mesmo padrão do QuickContent):
   - Adicionar: `const isGenerating = tasks.some(t => t.type === "create_image" && t.status === "running");`
   - Adicionar: `const generatingTask = generatingTaskId ? tasks.find(t => t.id === generatingTaskId) : null;`
   - Adicionar: `const isTaskComplete = generatingTask?.status === "complete";`

2. **Auto-navegação ao completar** — useEffect idêntico ao QuickContent que redireciona para o resultado quando a tarefa completa.

3. **Renderização condicional** — Antes do `return` principal, adicionar um bloco `if (isGenerating || isTaskComplete)` que renderiza:
   - O mesmo banner + breadcrumb ("Criar Conteúdo > Criar Imagem")
   - Header card com ícone ImageIcon, título "Criar Imagem", subtítulo, e badge de créditos
   - Progress bar card com `CreationProgressBar currentStep="generating"`
   - `<QuickContentLoading isComplete={isTaskComplete} />` no conteúdo principal

Isso mantém o contexto visual da página (banner, header, progress bar) e substitui o formulário pela tela de carregamento com a logo animada e barra de progresso.

### Arquivo alterado
- `src/pages/CreateImage.tsx` — ~30 linhas adicionadas antes do return principal

