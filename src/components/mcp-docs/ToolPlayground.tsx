import { useEffect, useState } from "react";
import { Play, Loader2, AlertTriangle, Ban } from "lucide-react";
import type { McpToolDoc } from "@/data/mcpToolsCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeBlock } from "./CodeBlock";
import { useMcpAuth } from "@/contexts/McpAuthContext";

// Endpoint interno do MCP — NÃO renderizar em nenhuma UI enquanto SHOW_CONNECTION_INFO = false.
const MCP_ENDPOINT = "https://lcpmqnkorcsclmpfbizr.supabase.co/functions/v1/mcp";

interface ToolPlaygroundProps {
  tool: McpToolDoc;
}

interface RunResult {
  status: number;
  ms: number;
  body: string;
}

export function ToolPlayground({ tool }: ToolPlaygroundProps) {
  const { token: contextToken } = useMcpAuth();
  const [token, setToken] = useState(contextToken ?? "");
  const [body, setBody] = useState(JSON.stringify(tool.exampleRequest, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza o token quando o usuário loga/desloga no painel de auth.
  useEffect(() => {
    if (contextToken) setToken(contextToken);
  }, [contextToken]);

  const costBlocked = !!tool.costCredits && tool.costCredits > 0;

  const run = async () => {
    setError(null);
    setResult(null);
    if (!token.trim()) {
      setError("Cole seu access token OAuth (Bearer) para testar.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      setError("O corpo do request não é um JSON válido.");
      return;
    }
    setLoading(true);
    const started = performance.now();
    try {
      const res = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(parsed),
      });
      const ms = Math.round(performance.now() - started);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResult({ status: res.status, ms, body: pretty });
    } catch (e) {
      const ms = Math.round(performance.now() - started);
      setResult({
        status: 0,
        ms,
        body: (e as Error).message ?? "Falha de rede",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBody(JSON.stringify(tool.exampleRequest, null, 2));
    setResult(null);
    setError(null);
  };

  if (costBlocked) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-amber-600" />
          <h4 className="text-sm font-semibold">Teste desabilitado</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Esta ferramenta consome{" "}
          <strong>
            {tool.costCredits} crédito{tool.costCredits! > 1 ? "s" : ""}
          </strong>{" "}
          reais da conta autenticada. Para evitar débitos indevidos, o playground do
          /mcp-docs não executa chamadas que gastem crédito. Use um cliente MCP
          conectado (Claude, ChatGPT, etc.) se quiser rodá-la em ambiente real.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tool.destructive ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <span>Esta operação é <strong>irreversível</strong>. Não teste em dados de produção.</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Access token (Bearer)
        </label>
        <Input
          type="password"
          placeholder="Cole seu access token OAuth aqui"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Nada é salvo. O token existe apenas nesta aba do navegador.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Corpo da requisição (JSON-RPC)
        </label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-xs min-h-[180px]"
          spellCheck={false}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Enviar
        </Button>
        <Button variant="ghost" onClick={reset} disabled={loading}>
          Restaurar exemplo
        </Button>
      </div>

      {result ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full font-mono ${
                result.status >= 200 && result.status < 300
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              HTTP {result.status || "network error"}
            </span>
            <span className="text-muted-foreground">{result.ms} ms</span>
          </div>
          <CodeBlock code={result.body} language="response" />
        </div>
      ) : null}
    </div>
  );
}
