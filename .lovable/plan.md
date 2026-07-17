# Documentação pública do MCP do Creator (estilo Swagger)

Criar uma página pública `/mcp-docs` que documenta as 29 ferramentas do MCP do Creator no estilo Swagger/OpenAPI, com navegação lateral, exemplo de request/response para cada tool e um playground para testar chamadas reais — sem expor a URL de conexão do MCP por enquanto (fica atrás de uma flag para ativar depois).

## Objetivo

Servir de referência técnica para desenvolvedores do Marketing OS Orchestrator integrarem o Creator. Substitui/complementa `docs/MCP_CREATOR.md` com uma UI interativa navegável.

## Rota e acesso

- Rota pública: `/mcp-docs` (adicionada em `src/App.tsx` fora do `ProtectedRoute`, no mesmo nível de `/privacy`).
- Sem sidebar/dashboard — layout próprio full-width.
- SEO: `<title>` "Creator MCP — Documentação de API" e meta description dedicada, H1 único, sem indexação bloqueada.
- Sem menção da URL do endpoint MCP nem da anon key. Uma constante `SHOW_CONNECTION_INFO = false` controla a exibição futura de um bloco "Como conectar" (URL + instruções OAuth). Quando o usuário quiser expor, é um único toggle.

## Estrutura da página

Layout Swagger-like em 3 áreas:

```text
┌───────────────────────────────────────────────────────┐
│  Header: título + versão (1.0.0) + badge "OAuth 2.1"  │
├──────────────┬────────────────────────────────────────┤
│  Sidebar     │  Conteúdo da tool selecionada          │
│  (grupos):   │  - Nome + descrição                    │
│  • Perfil    │  - Tabela de parâmetros (nome, tipo,   │
│  • Marcas    │    obrigatório, descrição)             │
│  • Personas  │  - Exemplo de request (JSON-RPC)       │
│  • Temas     │  - Exemplo de response                 │
│  • Conteúdo  │  - Botão "Testar" (abre playground)    │
│  • Revisão   │                                        │
│  • Contexto  │                                        │
└──────────────┴────────────────────────────────────────┘
```

## Fonte dos dados

Um único arquivo `src/data/mcpToolsCatalog.ts` descreve todas as 29 tools em formato tipado:

```ts
type McpToolDoc = {
  name: string;
  group: "Perfil" | "Marcas" | "Personas" | "Temas" | "Conteúdo" | "Revisão" | "Contexto";
  title: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest: object;   // corpo JSON-RPC completo
  exampleResponse: object;  // resposta MCP típica
  costCredits?: number;     // quando aplicável
  notes?: string;           // avisos (assíncrono, timeout, etc.)
};
```

Popular com as 29 tools atuais lendo os schemas Zod já existentes em `src/lib/mcp/tools/**` — os nomes, descrições e inputSchemas ficam sincronizados com a implementação real.

## Playground de teste

Painel colapsável abaixo do exemplo, com:

- Textarea editável já preenchido com o `exampleRequest`.
- Campo "Bearer token" (senha) — o usuário cola manualmente o access token OAuth dele. Não persistimos nada (só `useState`).
- Botão "Enviar" — faz `fetch` direto para o endpoint MCP em runtime; a URL vem de uma const interna e **não é renderizada em lugar nenhum da UI** enquanto `SHOW_CONNECTION_INFO = false`.
- Área de resposta: status HTTP, tempo de resposta, JSON formatado com syntax highlight.
- Aviso destacado: "Chamadas reais consomem créditos e afetam sua conta" nas tools com custo.

## Componentes novos

- `src/pages/McpDocs.tsx` — página principal, layout e roteamento interno da sidebar.
- `src/components/mcp-docs/ToolSidebar.tsx` — navegação agrupada.
- `src/components/mcp-docs/ToolDetail.tsx` — detalhes + tabela de params + exemplos.
- `src/components/mcp-docs/ToolPlayground.tsx` — form de teste + fetch + render de resposta.
- `src/components/mcp-docs/CodeBlock.tsx` — bloco de código com botão copiar (reaproveita `lucide-react` Copy).
- `src/data/mcpToolsCatalog.ts` — catálogo das 29 tools.

Reaproveita shadcn: `Tabs`, `Card`, `Badge`, `Button`, `Input`, `Textarea`, `ScrollArea`, `Collapsible`.

## Fora de escopo

- Não alterar nenhuma tool MCP, nenhuma edge function, nem `src/lib/mcp/**`.
- Não expor URL do endpoint / anon key / string de conexão até o toggle ser ativado.
- Não adicionar auth na rota — é 100% pública, sem consumir dados do usuário logado.
- Sem geração automática do OpenAPI JSON nesta iteração (pode virar follow-up).

## Detalhes técnicos

- Design tokens do projeto (bg-card, rounded-2xl, sem cores hardcoded).
- Responsivo: sidebar vira `Sheet` em mobile.
- Syntax highlight leve com `<pre>` + classes Tailwind (sem adicionar libs pesadas tipo Prism).
- Tipagem estrita no catálogo para o TS pegar tools faltantes.
