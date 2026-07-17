import { MCP_GROUPS, MCP_TOOLS, type McpToolDoc } from "@/data/mcpToolsCatalog";
import { cn } from "@/lib/utils";

interface ToolSidebarProps {
  selected: string;
  onSelect: (name: string) => void;
}

// Rótulos amigáveis por nome de função — foca no significado, não no nome cru.
const FRIENDLY_LABELS: Record<string, string> = {
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

const friendlyLabel = (t: McpToolDoc) => FRIENDLY_LABELS[t.name] ?? t.title ?? t.name;

export function ToolSidebar({ selected, onSelect }: ToolSidebarProps) {
  return (
    <nav className="space-y-6 py-4">
      {MCP_GROUPS.map((group) => {
        const items = MCP_TOOLS.filter((t) => t.group === group);
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
      })}
    </nav>
  );
}

