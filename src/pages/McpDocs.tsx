import { useEffect, useMemo, useState } from "react";
import { MCP_TOOLS } from "@/data/mcpToolsCatalog";
import { ToolSidebar } from "@/components/mcp-docs/ToolSidebar";
import { ToolDetail } from "@/components/mcp-docs/ToolDetail";
import { AuthPanel } from "@/components/mcp-docs/AuthPanel";
import { McpAuthProvider } from "@/contexts/McpAuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Menu, ShieldCheck } from "lucide-react";
import { CreatorLogo } from "@/components/CreatorLogo";
import { buildMcpManifest } from "@/lib/mcp-docs/exports";


// Toggle interno — quando o dono do projeto quiser expor URL do endpoint e instruções OAuth,
// basta mudar para `true`. Nada mais precisa ser tocado.
const SHOW_CONNECTION_INFO = false;

export default function McpDocs() {
  const [selected, setSelected] = useState<string>(MCP_TOOLS[0]?.name ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hash sync: /mcp-docs#create_image_content
  useEffect(() => {
    document.title = "Creator MCP — Documentação de API";
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && MCP_TOOLS.some((t) => t.name === hash)) {
        setSelected(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const tool = useMemo(
    () => MCP_TOOLS.find((t) => t.name === selected) ?? MCP_TOOLS[0],
    [selected],
  );

  const handleSelect = (name: string) => {
    setSelected(name);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${name}`);
    }
  };
  const downloadManifest = () => {
    const manifest = buildMcpManifest(MCP_TOOLS);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creator-mcp.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <McpAuthProvider>
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-semibold">Ferramentas MCP</p>
              </div>
              <div className="overflow-y-auto h-[calc(100vh-3.25rem)]">
                <ToolSidebar selected={selected} onSelect={handleSelect} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3">
            <CreatorLogo className="!h-10" />
            <div className="border-l border-border pl-3">
              <h1 className="text-base font-semibold leading-tight">Creator MCP</h1>
              <p className="text-xs text-muted-foreground leading-tight">Conecte agentes de IA ao Creator via MCP</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">v1.0.0</Badge>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> OAuth 2.1
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadManifest}
              className="hidden sm:inline-flex"
              title="Baixa um mcp.json com o catálogo completo (nome, description, inputSchema, annotations)."
            >
              <Download className="h-4 w-4 mr-1.5" />
              mcp.json
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)] gap-6">
          {/* Sidebar desktop */}
          <aside className="hidden lg:block border-r border-border pr-2 sticky top-[3.75rem] h-[calc(100vh-3.75rem)] overflow-y-auto">
            <ToolSidebar selected={selected} onSelect={handleSelect} />
          </aside>

          {/* Content */}
          <main className="py-6 pb-24 min-w-0">
            <section className="mb-8 rounded-2xl bg-card border border-border p-5 space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Sobre esta API
              </h2>
              <p className="text-sm text-muted-foreground">
                O Creator MCP expõe ferramentas de contexto (marcas, personas, temas), criação
                (imagem, quick, legenda, calendário) e revisão (imagem, legenda, texto sobre imagem)
                via <strong>Model Context Protocol</strong> (JSON-RPC sobre HTTP streamable). Todas
                as chamadas rodam autenticadas com o token OAuth do usuário — RLS do banco é
                respeitada em cada operação.
              </p>
              {SHOW_CONNECTION_INFO ? (
                <p className="text-sm text-muted-foreground">
                  Endpoint e instruções de conexão OAuth aparecem aqui quando habilitados.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  As instruções de conexão (URL do endpoint e fluxo OAuth) ainda não estão públicas.
                  Consulte o time do Creator para receber acesso.
                </p>
              )}
            </section>

            <div className="mb-8">
              <AuthPanel />
            </div>

            {tool ? <ToolDetail key={tool.name} tool={tool} /> : null}
          </main>
        </div>
      </div>
    </div>
    </McpAuthProvider>
  );
}
