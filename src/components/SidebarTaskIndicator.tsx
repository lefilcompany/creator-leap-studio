import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { Loader2, CheckCircle2, AlertCircle, X, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarTaskIndicatorProps {
  collapsed: boolean;
}

export function SidebarTaskIndicator({ collapsed }: SidebarTaskIndicatorProps) {
  const { tasks, removeTask, navigateToResult } = useBackgroundTasks();

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {tasks.map((task) => {
        const isRunning = task.status === "running";
        const isComplete = task.status === "complete";
        const isError = task.status === "error";

        if (collapsed) {
          return (
            <Tooltip key={task.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => isComplete ? navigateToResult(task.id) : undefined}
                  className={cn(
                    "flex items-center justify-center p-2.5 rounded-lg transition-all duration-300",
                    isRunning && "bg-primary/10 text-primary animate-pulse",
                    isComplete && "bg-green-500/10 text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/20",
                    isError && "bg-destructive/10 text-destructive"
                  )}
                >
                  {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
                  {isComplete && <CheckCircle2 className="h-5 w-5" />}
                  {isError && <AlertCircle className="h-5 w-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium">{task.label}</span>
                  <span className="text-[10px] opacity-70">
                    {isRunning && "Gerando..."}
                    {isComplete && "Clique para ver resultado"}
                    {isError && (task.errorMessage || "Erro")}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-300 relative group",
              isRunning && "bg-primary/10 border border-primary/20",
              isComplete && "bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/15",
              isError && "bg-destructive/10 border border-destructive/20"
            )}
            onClick={() => isComplete ? navigateToResult(task.id) : undefined}
          >
            {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />}
            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
            {isError && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{task.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRunning && "Gerando em segundo plano..."}
                {isComplete && "Toque para ver resultado"}
                {isError && "Erro na geração"}
              </p>
              {isRunning && (
                <div className="mt-1 h-1 w-full rounded-full bg-primary/20 overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
                </div>
              )}
            </div>

            {/* Close button */}
            {!isRunning && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-foreground/10"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}

            {isComplete && (
              <Eye className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        );
      })}
    </div>
  );
}
