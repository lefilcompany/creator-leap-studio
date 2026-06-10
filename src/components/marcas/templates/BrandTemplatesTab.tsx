import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, LayoutTemplate } from "lucide-react";
import { useBrandTemplates } from "@/hooks/useBrandTemplates";
import { TemplateCard } from "./TemplateCard";
import { TemplateUploadDialog } from "./TemplateUploadDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { BrandTemplate } from "@/types/template";

interface Props {
  brandId: string;
}

const MAX = 10;

export function BrandTemplatesTab({ brandId }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BrandTemplate | null>(null);
  const { list, softDelete } = useBrandTemplates(brandId);

  const templates = list.data ?? [];
  const atLimit = templates.length >= MAX;

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await softDelete.mutateAsync(toDelete.id);
      toast.success("Template movido para a lixeira");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir template");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Templates</h3>
          <span className="text-xs text-muted-foreground">{templates.length} / {MAX}</span>
        </div>
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          disabled={atLimit}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo template
        </Button>
      </div>

      <div className="p-5">
        {list.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        )}

        {!list.isLoading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nenhum template ainda</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Suba um layout aprovado da marca para reaproveitar com mensagens novas mantendo identidade visual.
            </p>
            <Button onClick={() => setUploadOpen(true)} size="sm" className="rounded-xl mt-2">
              <Plus className="h-4 w-4 mr-1" /> Enviar o primeiro template
            </Button>
          </div>
        )}

        {!list.isLoading && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onDelete={() => setToDelete(t)} />
            ))}
          </div>
        )}

        {atLimit && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Limite de {MAX} templates por marca atingido. Exclua um para liberar espaço.
          </p>
        )}
      </div>

      <TemplateUploadDialog brandId={brandId} open={uploadOpen} onOpenChange={setUploadOpen} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template &quot;{toDelete?.name}&quot; será movido para a lixeira e poderá ser restaurado em até 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
