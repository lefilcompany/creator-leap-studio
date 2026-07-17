import { MCP_GROUPS, MCP_TOOLS, type McpToolDoc } from "@/data/mcpToolsCatalog";
import { cn } from "@/lib/utils";

interface ToolSidebarProps {
  selected: string;
  onSelect: (name: string) => void;
}

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
                    <span className="font-mono text-xs block truncate">{t.name}</span>
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
