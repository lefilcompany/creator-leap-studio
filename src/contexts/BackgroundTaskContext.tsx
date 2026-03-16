import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface BackgroundTask {
  id: string;
  type: string;
  label: string;
  status: "running" | "complete" | "error";
  resultRoute: string;
  resultState?: any;
  errorMessage?: string;
  createdAt: number;
}

interface BackgroundTaskContextType {
  tasks: BackgroundTask[];
  addTask: (
    label: string,
    type: string,
    asyncFn: () => Promise<{ route: string; state: any }>,
    onComplete?: () => void
  ) => string;
  removeTask: (id: string) => void;
  navigateToResult: (taskId: string) => void;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | null>(null);

export function useBackgroundTasks() {
  const ctx = useContext(BackgroundTaskContext);
  if (!ctx) throw new Error("useBackgroundTasks must be used within BackgroundTaskProvider");
  return ctx;
}

export function BackgroundTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const navigate = useNavigate();
  const autoRemoveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addTask = useCallback((
    label: string,
    type: string,
    asyncFn: () => Promise<{ route: string; state: any }>,
    onComplete?: () => void
  ) => {
    // Check for existing running task of same type
    setTasks(prev => {
      const existing = prev.find(t => t.type === type && t.status === "running");
      if (existing) {
        toast.error("Já existe uma geração em andamento deste tipo.");
        return prev;
      }
      return prev;
    });

    const id = `${type}_${Date.now()}`;
    const task: BackgroundTask = {
      id,
      type,
      label,
      status: "running",
      resultRoute: "",
      createdAt: Date.now(),
    };

    setTasks(prev => {
      if (prev.find(t => t.type === type && t.status === "running")) return prev;
      return [...prev, task];
    });

    toast.info("Geração iniciada!", { description: label, duration: 3000 });

    // Run async work
    asyncFn()
      .then(({ route, state }) => {
        setTasks(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, status: "complete" as const, resultRoute: route, resultState: state }
              : t
          )
        );

        toast.success("Conteúdo gerado com sucesso! 🎉", {
          description: label,
          duration: 8000,
          action: {
            label: "Ver resultado",
            onClick: () => navigate(route, { state }),
          },
        });

        onComplete?.();

        // Auto-remove after 60s
        const timer = setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== id));
          autoRemoveTimers.current.delete(id);
        }, 60000);
        autoRemoveTimers.current.set(id, timer);
      })
      .catch((err: any) => {
        console.error("Background task error:", err);
        setTasks(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, status: "error" as const, errorMessage: err.message || "Erro desconhecido" }
              : t
          )
        );

        toast.error("Erro na geração", {
          description: err.message || "Tente novamente.",
          duration: 6000,
        });

        // Auto-remove errors after 30s
        const timer = setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== id));
          autoRemoveTimers.current.delete(id);
        }, 30000);
        autoRemoveTimers.current.set(id, timer);
      });

    return id;
  }, [navigate]);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const timer = autoRemoveTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoRemoveTimers.current.delete(id);
    }
  }, []);

  const navigateToResult = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === "complete" && task.resultRoute) {
      navigate(task.resultRoute, { state: task.resultState });
      removeTask(taskId);
    }
  }, [tasks, navigate, removeTask]);

  return (
    <BackgroundTaskContext.Provider value={{ tasks, addTask, removeTask, navigateToResult }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}
