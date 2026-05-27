import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Eye, RotateCcw } from "lucide-react";
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-card rounded-2xl shadow-2xl border p-8 max-w-md w-full mx-4 flex flex-col items-center gap-6"
        >
          {/* Progress Bar */}
          <CreationProgressBar
            currentStep={isComplete ? "result" : isError ? "config" : "generating"}
            className="mb-2"
          />

          {/* Status Icon */}
          <div className="flex flex-col items-center gap-3">
            {isRunning && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative bg-primary/10 rounded-full p-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Gerando seu conteúdo...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Isso pode levar alguns segundos. Você pode sair desta tela — a geração continuará em segundo plano.
                </p>
                {/* Indeterminate progress */}
                <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden mt-2">
                  <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
                </div>
              </>
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
