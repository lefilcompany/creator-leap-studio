## Contexto — por que hoje é uma página customizada

A `/mcp-docs` atual é uma SPA React feita à mão (`src/pages/McpDocs.tsx` + catálogo em `src/data/mcpToolsCatalog.ts` + playground SSE). Ela documenta **tools MCP**, não endpoints REST.

## O ponto central: Swagger/OpenAPI ≠ MCP

Swagger UI (`swagger-ui-react`, `swagger-ui-dist`, Redoc, Scalar, Stoplight Elements) renderiza um documento **OpenAPI 3.x**, que descreve APIs **REST**: um path + método HTTP + request/response schema por operação.

O MCP do Creator não é REST. Ele expõe **um único endpoint** (`POST /functions/v1/mcp`) que fala **JSON-RPC 2.0 sobre Streamable HTTP (SSE)**. Todas as 29 tools compartilham essa mesma URL — o que muda é o campo `params.name` do envelope JSON-RPC e o `params.arguments`. OpenAPI não tem como representar isso de forma nativa: não existe "path por tool", não existe "response schema por tool" no nível do transporte — do ponto de vista HTTP tudo é um único `POST` que devolve `text/event-stream`.

Ou seja: **dá para usar Swagger UI, mas o resultado é pior que o que já temos**, porque teríamos que forçar o modelo MCP dentro de um formato pensado para outra coisa. As opções reais são três:

### Opção A — Swagger UI "puro" (uma operação só)
Gerar um `openapi.json` com **um único** `POST /mcp` recebendo o envelope JSON-RPC e devolvendo SSE. O `oneOf` do `params.arguments` listaria os 29 schemas de tool. Resultado: uma tela do Swagger com **um botão "Try it out"** e um dropdown gigante — o usuário perde a navegação por tool, perde os labels amigáveis, perde o bloqueio de ferramentas que gastam crédito, e perde o token compartilhado do painel de auth. Regressão clara.

### Opção B — Swagger UI "fake REST" (uma operação por tool)
Inventar paths falsos (`POST /tools/list_brands`, `POST /tools/create_persona`, ...) só para o Swagger renderizar bem. Problema: o botão "Try it out" chamaria essas URLs falsas, que **não existem** no servidor MCP. Teríamos que escrever um `requestInterceptor` custom no Swagger UI para reescrever cada request de volta pro envelope JSON-RPC + endpoint real + SSE parser — e nesse ponto estamos mantendo dois modelos de dados (o OpenAPI mentiroso + o interceptor que traduz) em vez de um só. Mais código, mais frágil, mesma UI menos bonita que a atual.

### Opção C — Manter a página atual (recomendado)
Continuar com `McpDocs.tsx` + `mcpToolsCatalog.ts`. Ela já é uma "Swagger-like" **desenhada para MCP**: sidebar com labels amigáveis, detalhe de tool com parâmetros/exemplo/annotations, playground que fala SSE de verdade, `AuthPanel` com token compartilhado, bloqueio automático das tools que gastam crédito. É exatamente o que Swagger UI **não** entrega para JSON-RPC.

O padrão da indústria hoje para "Swagger de MCP" é justamente isso: o próprio site oficial do MCP e ferramentas como o MCP Inspector renderizam catálogos de tools em UI custom, não em Swagger UI. Não existe uma lib Node "pronta" que gere Swagger de tools MCP porque os dois modelos não se encaixam.

## Recomendação

Manter a Opção C e **investir na página atual**, não trocar por Swagger. Melhorias sugeridas (todas opcionais, escolha as que quiser):

1. **Exportar o catálogo como `mcp.json` público** em `/mcp-docs/mcp.json` — o formato nativo do MCP (nome, description, inputSchema Zod convertido pra JSON Schema, annotations). Serve como "spec" oficial e pode ser consumida por clientes MCP e por LLMs.
2. **Botão "Copiar como cURL"** em cada tool, gerando o comando com o envelope JSON-RPC correto e o header `Accept: application/json, text/event-stream`.
3. **Snippet TypeScript/Python** de exemplo em cada tool (chamar via `fetch` e parsear SSE), reaproveitando o `prettifyResponse` que já existe.
4. **Busca por nome/label** na sidebar (já tem 29 tools, começa a valer a pena).
5. **Badge de "read-only / destructive / open-world"** derivado dos `annotations` — já temos o dado, falta expor visualmente.

Se depois de ler isso você ainda quiser Swagger UI, dá pra implementar a **Opção B** (não vou recomendar, mas é factível): gero `openapi.json` a partir do `mcpToolsCatalog`, monto Swagger UI em `/mcp-docs-swagger` como rota paralela, e escrevo o `requestInterceptor` que traduz para JSON-RPC + parseia SSE. Fica ao seu critério.

## Detalhes técnicos (para referência)

- Libs Node consideradas: `swagger-ui-react`, `swagger-ui-dist`, `redoc`, `@scalar/api-reference-react`, `@stoplight/elements`. Todas consomem **OpenAPI 3.x** e assumem REST.
- MCP transport de referência: Streamable HTTP com SSE (`text/event-stream`), envelope JSON-RPC 2.0. O servidor do Creator é `@lovable.dev/mcp-js` rodando em `supabase/functions/mcp/`.
- O que o "spec oficial" do MCP entrega hoje: `tools/list` (retorna nome/description/inputSchema JSON Schema/annotations) e `tools/call`. Isso já cobre o que Swagger cobriria — a página atual é basicamente um render bonito desse `tools/list`.

## Pergunta para você decidir

Quer que eu (1) mantenha a página atual e adicione as melhorias 1-5 acima, ou (2) prossiga mesmo assim com a Opção B (Swagger UI + interceptor traduzindo pra JSON-RPC), ciente das limitações?