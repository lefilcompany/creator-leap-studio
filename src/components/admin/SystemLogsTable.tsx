import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { RefreshCw, Search, AlertCircle, Info, AlertTriangle, Bug } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string | null;
  metadata: any;
  user_id: string | null;
  team_id: string | null;
  created_at: string;
}

export const SystemLogsTable = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;

    return matchesSearch && matchesLevel && matchesSource;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const uniqueSources = [...new Set(logs.map((log) => log.source).filter(Boolean))];

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

  const getSourceBadge = (source: string | null) => {
    if (!source) return <span className="text-muted-foreground">-</span>;
    
    const colors: Record<string, string> = {
      auth: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      "edge-function": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      client: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      database: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      webhook: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    };

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[source] || "bg-muted text-muted-foreground"}`}>
        {source}
      </span>
    );
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Logs do Sistema</CardTitle>
            <CardDescription>
              Visualize atividades e erros do sistema
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem ou fonte..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <NativeSelect
            value={levelFilter}
            onValueChange={(value) => {
              setLevelFilter(value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-40"
            options={[
              { value: "all", label: "Todos os níveis" },
              { value: "error", label: "Erros" },
              { value: "warn", label: "Avisos" },
              { value: "info", label: "Info" },
              { value: "debug", label: "Debug" },
            ]}
          />
          <NativeSelect
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-40"
            options={[
              { value: "all", label: "Todas as fontes" },
              ...uniqueSources.map((source) => ({
                value: source!,
                label: source!,
              })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum log encontrado</h3>
            <p className="text-muted-foreground">
              {logs.length === 0
                ? "O sistema ainda não registrou nenhum log."
                : "Nenhum log corresponde aos filtros selecionados."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[140px]">Data/Hora</TableHead>
                    <TableHead className="w-[100px]">Nível</TableHead>
                    <TableHead className="w-[120px]">Fonte</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getLevelBadge(log.level)}</TableCell>
                      <TableCell>{getSourceBadge(log.source)}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate" title={log.message}>
                          {log.message}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredLogs.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
