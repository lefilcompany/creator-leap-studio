import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Sparkles, Trash2, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { BrandTemplate } from "@/types/template";

interface Props {
  template: BrandTemplate;
  onDelete: () => void;
}

export function TemplateCard({ template, onDelete }: Props) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 overflow-hidden shadow-sm hover:shadow-md transition-all group">
      <div className="relative aspect-square bg-muted/40">
        {template.preview_url ? (
          <img src={template.preview_url} alt={template.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {template.text_zones?.length ?? 0} zonas · {template.status === "ready" ? "Pronto" : "Rascunho"}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full rounded-xl"
          disabled={template.status !== "ready"}
        >
          <Link to={`/create/template?templateId=${template.id}`}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar
          </Link>
        </Button>
      </div>
    </div>
  );
}
