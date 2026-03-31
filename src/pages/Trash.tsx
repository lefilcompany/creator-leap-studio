import { useState } from "react";
import { Trash2, RotateCcw, Clock, Image, Video, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrashItems, useRestoreAction, usePermanentDelete, useEmptyTrash } from "@/hooks/useTrash";
import { ACTION_TYPE_DISPLAY } from "@/types/action";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { differenceInDays } from "date-fns";

const Trash = () => {
  const { data: items = [], isLoading } = useTrashItems();
  const restoreAction = useRestoreAction();
  const permanentDelete = usePermanentDelete();
  const emptyTrash = useEmptyTrash();

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiresAt = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.max(0, differenceInDays(expiresAt, new Date()));
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('VIDEO') || type === 'GERAR_VIDEO') return <Video className="h-4 w-4" />;
    if (type.includes('IMAGEM') || type === 'CRIAR_CONTEUDO') return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageBreadcrumb items={[{ label: "Lixeira" }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lixeira</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'itens'} · Excluídos automaticamente após 30 dias
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                Esvaziar lixeira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Esvaziar lixeira?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso excluirá permanentemente todos os {items.length} itens da lixeira. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => emptyTrash.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Esvaziar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Lixeira vazia</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Itens excluídos aparecerão aqui</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(item => {
            const daysLeft = getDaysRemaining(item.deleted_at);
            return (
              <Card key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getTypeIcon(item.type)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.title || ACTION_TYPE_DISPLAY[item.type as keyof typeof ACTION_TYPE_DISPLAY] || item.type}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.brand_name && (
                        <Badge variant="secondary" className="text-xs">{item.brand_name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Será excluído em breve'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreAction.mutate(item.id)}
                      disabled={restoreAction.isPending}
                      className="gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Restaurar</span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Este item será excluído permanentemente e não poderá ser recuperado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => permanentDelete.mutate(item.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Trash;
