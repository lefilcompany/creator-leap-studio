import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { MCP_GROUPS, MCP_TOOLS, type McpToolDoc } from "@/data/mcpToolsCatalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolSidebarProps {
  selected: string;
  onSelect: (name: string) => void;
}

// Rótulos amigáveis por nome de função — foca no significado, não no nome cru.
export const FRIENDLY_LABELS: Record<string, string> = {
  echo: "Testar conexão",
  get_profile: "Meu perfil",
  get_credit_balance: "Saldo de créditos",

  list_brands: "Listar marcas",
  get_brand: "Detalhes da marca",
  create_brand: "Criar marca",
  update_brand: "Editar marca",

  list_personas: "Listar personas",
  get_persona: "Detalhes da persona",
  create_persona: "Criar persona",
  update_persona: "Editar persona",

  list_themes: "Listar temas estratégicos",
  get_theme: "Detalhes do tema",
  create_theme: "Criar tema estratégico",
  update_theme: "Editar tema",

  create_image_content: "Gerar imagem com briefing",
  create_quick_content: "Gerar conteúdo rápido",
  generate_caption: "Gerar legenda",
  create_content_plan: "Criar calendário de conteúdo",

  review_image: "Ajustar imagem",
  review_caption: "Ajustar legenda",
  review_text_for_image: "Ajustar texto sobre imagem",

  list_actions: "Histórico de entregas",
  get_action: "Detalhes da entrega",
  list_calendars: "Listar calendários",
  list_calendar_items: "Itens do calendário",
};

export const friendlyLabel = (t: McpToolDoc) =>
  FRIENDLY_LABELS[t.name] ?? t.title ?? t.name;

export function ToolSidebar({ selected, onSelect }: ToolSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MCP_TOOLS;
    return MCP_TOOLS.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        friendlyLabel(t).toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <nav className="space-y-4 py-4">
      <div className="px-3 relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ferramenta…"
          className="pl-8 pr-8 h-8 text-sm"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground italic">
          Nenhuma ferramenta encontrada para “{query}”.
        </p>
      ) : (
        MCP_GROUPS.map((group) => {
          const items = filtered.filter((t) => t.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h3>
              <ul className="space-y-0.5">
                {items.map((t: McpToolDoc) => (
                  <li key={t.name}>
                    <button
                      type="button"
                      onClick={() => onSelect(t.name)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
                        "hover:bg-muted/70",
                        selected === t.name
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/80",
                      )}
                    >
                      <span className="block truncate">{friendlyLabel(t)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground block truncate">
                        {t.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </nav>
  );
}
