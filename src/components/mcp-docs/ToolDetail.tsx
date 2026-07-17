import { useState } from "react";
import type { McpToolDoc } from "@/data/mcpToolsCatalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./CodeBlock";
import { ToolPlayground } from "./ToolPlayground";
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Eye,
  ShieldAlert,
} from "lucide-react";
import {
  buildCurlSnippet,
  buildPythonSnippet,
  buildTypescriptSnippet,
  isReadOnly,
} from "@/lib/mcp-docs/exports";

interface ToolDetailProps {
  tool: McpToolDoc;
}

export function ToolDetail({ tool }: ToolDetailProps) {
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const readOnly = isReadOnly(tool);

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            POST
          </Badge>
          <code className="text-sm bg-muted/70 px-2 py-0.5 rounded-md font-mono">
            tools/call · {tool.name}
          </code>
          {readOnly ? (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" /> somente leitura
            </Badge>
          ) : null}
          {tool.costCredits ? (
            <Badge variant="secondary" className="gap-1">
              <Coins className="h-3 w-3" /> {tool.costCredits} crédito
              {tool.costCredits > 1 ? "s" : ""}
            </Badge>
          ) : null}
          {tool.destructive ? (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> destrutiva
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold">{tool.title}</h1>
        <p className="text-muted-foreground">{tool.description}</p>
        {tool.notes ? (
          <p className="text-sm bg-muted/50 border border-border rounded-xl px-3 py-2">
            <strong>Nota:</strong> {tool.notes}
          </p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Parâmetros
        </h2>
        {tool.params.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem parâmetros.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Obrig.</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {tool.params.map((p) => (
                  <tr key={p.name} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {p.type}
                    </td>
                    <td className="px-3 py-2">
                      {p.required ? (
                        <Badge variant="destructive" className="text-[10px]">
                          sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Exemplo de request
          </h2>
          <CodeBlock
            code={JSON.stringify(tool.exampleRequest, null, 2)}
            language="request"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Exemplo de response
          </h2>
          <CodeBlock
            code={JSON.stringify(tool.exampleResponse, null, 2)}
            language="response"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Chamando por código
        </h2>
        <Tabs defaultValue="curl">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="ts">TypeScript</TabsTrigger>
            <TabsTrigger value="py">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-3">
            <CodeBlock code={buildCurlSnippet(tool)} language="bash" />
          </TabsContent>
          <TabsContent value="ts" className="mt-3">
            <CodeBlock code={buildTypescriptSnippet(tool)} language="typescript" />
          </TabsContent>
          <TabsContent value="py" className="mt-3">
            <CodeBlock code={buildPythonSnippet(tool)} language="python" />
          </TabsContent>
        </Tabs>
      </section>

      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Playground</h2>
            <p className="text-xs text-muted-foreground">
              Teste esta ferramenta em tempo real usando seu access token OAuth.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlaygroundOpen((v) => !v)}
          >
            {playgroundOpen ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Fechar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> Testar
              </>
            )}
          </Button>
        </div>
        {playgroundOpen ? <ToolPlayground tool={tool} /> : null}
      </section>
    </article>
  );
}
