// Utilitários da página /mcp-docs — geração de mcp.json público, snippets
// cURL/TS/Python e inferência de annotations a partir do nome da tool.
import type { McpToolDoc } from "@/data/mcpToolsCatalog";

// Endpoint MCP interno — só é exposto quando o painel de docs decidir mostrar.
export const MCP_ENDPOINT =
  "https://lcpmqnkorcsclmpfbizr.supabase.co/functions/v1/mcp";

// Converte um McpToolParam[] em algo próximo do JSON Schema que o próprio MCP
// devolveria em `tools/list`. Suficiente para spec pública e leitura por LLMs.
function paramsToJsonSchema(tool: McpToolDoc) {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];
  for (const p of tool.params) {
    properties[p.name] = {
      type: normalizeJsonType(p.type),
      description: p.description,
    };
    if (p.required) required.push(p.name);
  }
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

function normalizeJsonType(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes("number") || lower.includes("int")) return "number";
  if (lower.includes("bool")) return "boolean";
  if (lower.includes("array") || lower.endsWith("[]")) return "array";
  if (lower.includes("object") || lower.includes("record")) return "object";
  // uuid, string, url, enum → string
  return "string";
}

// Heurística barata: read-only se começa com list_/get_ ou é echo/get_profile.
export function isReadOnly(tool: McpToolDoc): boolean {
  if (tool.destructive) return false;
  return (
    tool.name === "echo" ||
    tool.name.startsWith("list_") ||
    tool.name.startsWith("get_")
  );
}

export function buildMcpManifest(tools: McpToolDoc[]) {
  return {
    name: "creator-mcp",
    title: "Creator MCP",
    version: "1.0.0",
    protocol: "Model Context Protocol · 2025-06-18",
    transport: "streamable-http",
    endpoint: MCP_ENDPOINT,
    tools: tools.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: paramsToJsonSchema(t),
      annotations: {
        readOnlyHint: isReadOnly(t),
        destructiveHint: !!t.destructive,
        idempotentHint: isReadOnly(t),
        openWorldHint: t.group === "Conteúdo" || t.group === "Revisão",
      },
      ...(t.costCredits ? { costCredits: t.costCredits } : {}),
    })),
  };
}

// --- Snippets --------------------------------------------------------------

export function buildCurlSnippet(tool: McpToolDoc): string {
  const body = JSON.stringify(tool.exampleRequest, null, 2);
  return [
    `curl -X POST '${MCP_ENDPOINT}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream' \\`,
    `  -H "Authorization: Bearer $CREATOR_MCP_TOKEN" \\`,
    `  --data-raw '${body.replace(/'/g, "'\\''")}'`,
  ].join("\n");
}

export function buildTypescriptSnippet(tool: McpToolDoc): string {
  const body = JSON.stringify(tool.exampleRequest, null, 2);
  return `// Requer Node 18+ (fetch nativo). Guarde seu token em CREATOR_MCP_TOKEN.
const res = await fetch("${MCP_ENDPOINT}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "Authorization": \`Bearer \${process.env.CREATOR_MCP_TOKEN}\`,
  },
  body: JSON.stringify(${body}),
});

// A resposta é SSE: linhas 'data: {...}' com o envelope JSON-RPC.
const raw = await res.text();
const payload = raw
  .split(/\\n\\n+/)
  .flatMap((block) =>
    block
      .split("\\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim()),
  )
  .map((s) => JSON.parse(s));

console.log(payload[0]?.result);`;
}

export function buildPythonSnippet(tool: McpToolDoc): string {
  const body = JSON.stringify(tool.exampleRequest, null, 2);
  return `# pip install requests
import json, os, requests

resp = requests.post(
    "${MCP_ENDPOINT}",
    headers={
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {os.environ['CREATOR_MCP_TOKEN']}",
    },
    data=json.dumps(${body}),
)

# SSE: linhas 'data: {...}' com envelope JSON-RPC
payloads = []
for block in resp.text.split("\\n\\n"):
    data_lines = [l[5:].strip() for l in block.splitlines() if l.startswith("data:")]
    if data_lines:
        payloads.append(json.loads("\\n".join(data_lines)))

print(payloads[0]["result"] if payloads else resp.text)`;
}
