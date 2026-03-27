

## Melhorias no Chatbot - Formatação, Reply, Copiar e Prompts de Criação

### O que será feito

1. **Renderização com Markdown** - Usar `react-markdown` (já instalado) para formatar respostas do assistente com negrito, listas, etc.

2. **Reply a mensagem específica** - Ao clicar/hover em uma mensagem, exibir botão de reply. Ao clicar, mostra um preview da mensagem referenciada acima do input (estilo WhatsApp). O texto do reply é prefixado na mensagem enviada para contexto.

3. **Copiar mensagem** - Botão de copiar no hover de cada mensagem (assistente e usuário), copiando o conteúdo para clipboard com feedback visual.

4. **Ação "Criar Imagem com Prompt"** - Quando o assistente sugerir um prompt de criação de imagem, incluir um botão de ação que redireciona para `/create/content` com o prompt pré-preenchido no campo `description`. O system prompt será atualizado para instruir o agente a gerar blocos de prompt de imagem quando o usuário pedir, usando um formato especial `[PROMPT_IMAGE: ...]` que o frontend detecta e transforma em botão clicável.

5. **Design alinhado ao sistema** - Melhorar visual com rounded-2xl nos balões, avatar do assistente (ícone Sparkles), espaçamento refinado, hover states com ações, e cores consistentes com o tema rosa/roxo do sistema.

### Detalhes técnicos

**Arquivo: `src/components/PlatformChatbot.tsx`**
- Adicionar tipo `Message` com campo opcional `replyTo: { idx: number; content: string }`
- Adicionar estado `replyingTo` para controlar qual mensagem está sendo respondida
- Renderizar mensagens com `ReactMarkdown` dentro de `prose prose-sm`
- No hover de cada mensagem, mostrar toolbar com ícones Reply e Copy
- Detectar padrão `[PROMPT_IMAGE: ...]` no conteúdo e renderizar como botão "Usar este prompt" que navega para `/create/content?prompt=...`
- Preview do reply acima do input com botão X para cancelar

**Arquivo: `supabase/functions/platform-chat/index.ts`**
- Adicionar ao system prompt instrução para gerar prompts de imagem no formato `[PROMPT_IMAGE: descrição detalhada do prompt]` quando o usuário pedir sugestões de imagem ou prompts criativos
- Instruir o agente a ser proativo em sugerir prompts de criação

**Arquivo: `src/pages/CreateContent.tsx`**
- Ler query param `prompt` da URL e pré-preencher o campo `description` do formulário

### Estimativa
- 3 arquivos modificados
- Nenhuma migração de banco necessária

