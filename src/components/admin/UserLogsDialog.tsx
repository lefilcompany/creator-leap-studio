import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info, AlertTriangle, Bug, History, CreditCard, Zap, MousePointer, XCircle, ExternalLink, Copy, Check, Navigation } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  team_name: string | null;
}

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string | null;
  metadata: any;
  created_at: string;
}

interface CreditHistoryItem {
  id: string;
  action_type: string;
  credits_used: number;
  credits_before: number;
  credits_after: number;
  description: string | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  type: string;
  status: string;
  created_at: string;
  details: any;
  result: any;
}

interface UserEvent {
  id: string;
  event_type: string;
  event_name: string;
  event_data: any;
  page_url: string | null;
  created_at: string;
}

interface UserLogsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserLogsDialog = ({ user, open, onOpenChange }: UserLogsDialogProps) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [clicks, setClicks] = useState<UserEvent[]>([]);
  const [errors, setErrors] = useState<UserEvent[]>([]);
  const [navigations, setNavigations] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  useEffect(() => {
    if (user && open) {
      fetchUserData();
    }
  }, [user, open]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all data in parallel
      const [logsResult, creditResult, actionsResult, clicksResult, errorsResult, navigationsResult] = await Promise.all([
        // System logs
        supabase
          .from("system_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        // Credit history
        supabase
          .from("credit_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        // Actions
        supabase
          .from("actions")
          .select("id, type, status, created_at, details, result")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        // Clicks
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_type", "click")
          .order("created_at", { ascending: false })
          .limit(200),
        // Errors
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_type", "error")
          .order("created_at", { ascending: false })
          .limit(100),
        // Navigations
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("event_type", "navigation")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setLogs(logsResult.data || []);
      setCreditHistory(creditResult.data || []);
      setActions(actionsResult.data || []);
      setClicks(clicksResult.data || []);
      setErrors(errorsResult.data || []);
      setNavigations(navigationsResult.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
      case "warn":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            Aviso
          </Badge>
        );
      case "info":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-500">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
      case "debug":
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-muted-foreground text-muted-foreground">
            <Bug className="h-3 w-3" />
            Debug
          </Badge>
        );
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const getActionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      CRIAR_CONTEUDO: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      CRIAR_CONTEUDO_RAPIDO: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      REVISAR_CONTEUDO: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      PLANEJAR_CONTEUDO: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      GERAR_VIDEO: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    };

    const labels: Record<string, string> = {
      CRIAR_CONTEUDO: "Criar Conteúdo",
      CRIAR_CONTEUDO_RAPIDO: "Conteúdo Rápido",
      REVISAR_CONTEUDO: "Revisar Conteúdo",
      PLANEJAR_CONTEUDO: "Planejar Conteúdo",
      GERAR_VIDEO: "Gerar Vídeo",
    };

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[type] || "bg-muted text-muted-foreground"}`}>
        {labels[type] || type}
      </span>
    );
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{user.name}</DialogTitle>
              <DialogDescription>{user.email}</DialogDescription>
              <p className="text-xs text-muted-foreground mt-1 font-mono flex items-center gap-1">
                {user.id}
                <button 
                  onClick={copyUserId}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copiar ID"
                >
                  {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="clicks" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="clicks" className="flex items-center gap-1 text-xs">
                <MousePointer className="h-3 w-3" />
                Cliques ({clicks.length})
              </TabsTrigger>
              <TabsTrigger value="navigations" className="flex items-center gap-1 text-xs">
                <Navigation className="h-3 w-3" />
                Navegação ({navigations.length})
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-1 text-xs">
                <XCircle className="h-3 w-3" />
                Erros ({errors.length})
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1 text-xs">
                <History className="h-3 w-3" />
                Logs ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                Créditos ({creditHistory.length})
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-1 text-xs">
                <Zap className="h-3 w-3" />
                Ações ({actions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clicks" className="mt-4">
              <ScrollArea className="h-[400px]">
                {clicks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MousePointer className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum clique registrado para este usuário.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Elemento</TableHead>
                        <TableHead>Página</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clicks.map((click) => (
                        <TableRow key={click.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(click.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="max-w-sm">
                            <p className="text-sm font-medium truncate">{click.event_name}</p>
                            {click.event_data && (
                              <details className="mt-1">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver detalhes
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                                  {JSON.stringify(click.event_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {click.page_url || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              <ScrollArea className="h-[400px]">
                {errors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum erro registrado para este usuário.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Página</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.map((error) => (
                        <TableRow key={error.id} className="bg-destructive/5">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(error.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="max-w-sm">
                            <p className="text-sm font-medium text-destructive truncate">{error.event_name}</p>
                            {error.event_data && (
                              <details className="mt-1">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver stack trace
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                                  {error.event_data.stack || JSON.stringify(error.event_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {error.page_url || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Info className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum log encontrado para este usuário.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead className="w-[100px]">Nível</TableHead>
                        <TableHead>Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getLevelBadge(log.level)}</TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm">{log.message}</p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <details className="mt-1">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver detalhes
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="credits" className="mt-4">
              <ScrollArea className="h-[400px]">
                {creditHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum histórico de créditos encontrado.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead className="text-right">Usado</TableHead>
                        <TableHead className="text-right">Antes</TableHead>
                        <TableHead className="text-right">Depois</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {getActionTypeBadge(item.action_type)}
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            -{item.credits_used}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.credits_before}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.credits_after}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <ScrollArea className="h-[400px]">
                {actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma ação encontrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actions.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(action.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {getActionTypeBadge(action.type)}
                            {(action.details || action.result) && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver detalhes da ação
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {action.details && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Entrada:</p>
                                      <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(action.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {action.result && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Resultado:</p>
                                      {action.result.imageUrl && (
                                        <a 
                                          href={action.result.imageUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          Ver imagem gerada
                                        </a>
                                      )}
                                      <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(action.result, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{action.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="navigations" className="mt-4">
              <ScrollArea className="h-[400px]">
                {navigations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Navigation className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma navegação registrada para este usuário.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {navigations.map((nav) => (
                        <TableRow key={nav.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(nav.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            <code className="bg-muted px-1 rounded text-xs">
                              {nav.event_data?.from || "-"}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">
                            <code className="bg-muted px-1 rounded text-xs">
                              {nav.event_data?.to || nav.page_url || "-"}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
