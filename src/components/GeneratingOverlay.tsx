import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Eye, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratingOverlayProps {
  taskId: string | null;
  onReset: () => void;
}

export function GeneratingOverlay({ taskId, onReset }: GeneratingOverlayProps) {
  const { tasks, navigateToResult, removeTask } = useBackgroundTasks();

  if (!taskId) return null;

  const task = tasks.find(t => t.id === taskId);

  // Task was removed (auto-cleanup or manual) — reset
  if (!task) {
    return null;
  }

  const isRunning = task.status === "running";
  const isComplete = task.status === "complete";
  const isError = task.status === "error";

  const partials = task.partialImages || [];
  const latestPartial = partials.length > 0 ? partials[partials.length - 1] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-card rounded-2xl shadow-2xl border p-6 sm:p-8 max-w-lg w-full flex flex-col items-center gap-5 max-h-[92vh] overflow-y-auto"
        >
          {/* Progress Bar */}
          <CreationProgressBar
            currentStep={isComplete ? "result" : isError ? "config" : "generating"}
            className="mb-1 w-full"
          />

          {/* Live partial preview (only while running and we have partials) */}
          {isRunning && latestPartial && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full rounded-2xl overflow-hidden border border-primary/20 bg-muted/30 shadow-lg"
            >
              <div className="aspect-square w-full relative">
                <img
                  src={latestPartial}
                  alt={`Prévia ${partials.length}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Shimmer overlay enquanto refina */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-transparent animate-pulse pointer-events-none" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/50">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                    Prévia {partials.length}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-background/95 via-background/70 to-transparent">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 text-primary animate-spin" />
                    <span className="text-[11px] font-medium text-foreground">
                      Refinando detalhes...
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Icon — só quando ainda não há partial preview */}
          <div className="flex flex-col items-center gap-3 w-full">
            {isRunning && !latestPartial && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative bg-primary/10 rounded-full p-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Gerando seu conteúdo...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {task.progressMessage || "Isso pode levar alguns segundos. Você pode sair desta tela — a geração continuará em segundo plano."}
                </p>
                {/* Indeterminate progress */}
                <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden mt-2">
                  <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
                </div>
              </>
            )}

            {isRunning && latestPartial && (
              <div className="w-full text-center">
                <p className="text-sm font-semibold text-foreground">
                  {task.progressMessage || "Gerando sua imagem..."}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Você pode fechar esta tela — a geração continua em segundo plano.
                </p>
              </div>
            )}

            {isComplete && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-green-500/10 rounded-full p-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground">Conteúdo gerado com sucesso! 🎉</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Seu conteúdo está pronto para visualização.
                </p>
              </>
            )}

            {isError && (
              <>
                <div className="bg-destructive/10 rounded-full p-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Erro na geração</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {task.errorMessage || "Ocorreu um erro durante a geração. Tente novamente."}
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            {isComplete && (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    removeTask(task.id);
                    onReset();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Criar outro
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  onClick={() => navigateToResult(task.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver resultado
                </Button>
              </>
            )}

            {isError && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  removeTask(task.id);
                  onReset();
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
