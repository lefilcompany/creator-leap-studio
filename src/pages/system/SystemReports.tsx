import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, XCircle, Search, Eye, Loader2, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  user_id: string;
  team_id: string | null;
  action_id: string | null;
  action_type: string | null;
  problem_type: string;
  description: string;
  screenshot_urls: string[];
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  team_name?: string;
}

const PROBLEM_TYPE_LABELS: Record<string, string> = {
  distorted_image: "Imagem distorcida",
  incorrect_text: "Texto incorreto",
  generation_error: "Erro de geração",
  other: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: "Aberto", variant: "destructive", icon: AlertTriangle },
  resolved: { label: "Resolvido", variant: "default", icon: CheckCircle2 },
  dismissed: { label: "Dispensado", variant: "secondary", icon: XCircle },
};

export default function SystemReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [screenshotDialog, setScreenshotDialog] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("generation_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for each report
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const teamIds = [...new Set((data || []).filter((r: any) => r.team_id).map((r: any) => r.team_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      let teamsMap: Record<string, string> = {};
      if (teamIds.length > 0) {
        const { data: teams } = await supabase.rpc("get_all_teams_admin");
        if (teams) {
          teamsMap = Object.fromEntries(teams.map((t: any) => [t.id, t.name]));
        }
      }

      const profilesMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      );

      const enriched = (data || []).map((r: any) => ({
        ...r,
        screenshot_urls: r.screenshot_urls || [],
        user_name: profilesMap[r.user_id]?.name || "Desconhecido",
        user_email: profilesMap[r.user_id]?.email || "",
        user_avatar: profilesMap[r.user_id]?.avatar_url || "",
        team_name: r.team_id ? teamsMap[r.team_id] || "" : "",
      }));

      setReports(enriched);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Erro ao carregar reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes || null,
      };
      if (newStatus === "resolved" || newStatus === "dismissed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("generation_reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;

      toast.success(`Report ${newStatus === "resolved" ? "resolvido" : "dispensado"} com sucesso`);
      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Erro ao atualizar report");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.user_name?.toLowerCase().includes(q) ||
      r.user_email?.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.team_name?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquareWarning className="h-6 w-6 text-destructive" />
          Reports de Problemas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie reports de problemas na geração de conteúdo
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.open}</p>
            <p className="text-xs text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-muted-foreground">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</p>
            <p className="text-xs text-muted-foreground">Dispensados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="dismissed">Dispensados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum report encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {report.user_avatar ? (
                              <img src={report.user_avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                {report.user_name?.charAt(0) || "?"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{report.user_name}</p>
                              {report.team_name && (
                                <p className="text-xs text-muted-foreground truncate">{report.team_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{PROBLEM_TYPE_LABELS[report.problem_type] || report.problem_type}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">{report.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setAdminNotes(report.admin_notes || "");
                            }}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(v) => { if (!v) setSelectedReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detalhes do Report
            </DialogTitle>
            <DialogDescription>Informações completas do report de problema</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-5 py-2">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                {selectedReport.user_avatar ? (
                  <img src={selectedReport.user_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold">
                    {selectedReport.user_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedReport.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.user_email}</p>
                  {selectedReport.team_name && (
                    <p className="text-xs text-muted-foreground">Equipe: {selectedReport.team_name}</p>
                  )}
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {(() => {
                    const cfg = STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.open;
                    const Icon = cfg.icon;
                    return (
                      <Badge variant={cfg.variant} className="gap-1 mt-1">
                        <Icon className="h-3 w-3" />{cfg.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              {/* Problem details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Tipo do problema</p>
                  <p className="text-sm">{PROBLEM_TYPE_LABELS[selectedReport.problem_type] || selectedReport.problem_type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Descrição</p>
                  <div className="bg-muted/20 rounded-xl p-4 text-sm whitespace-pre-wrap">{selectedReport.description}</div>
                </div>
                {selectedReport.action_id && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Action ID</p>
                    <code className="text-xs bg-muted/30 px-2 py-1 rounded">{selectedReport.action_id}</code>
                  </div>
                )}
              </div>

              {/* Screenshots */}
              {selectedReport.screenshot_urls.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Capturas de tela</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedReport.screenshot_urls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setScreenshotDialog(url)}
                        className="w-24 h-24 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary transition-all"
                      >
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin actions */}
              {selectedReport.status === "open" && (
                <div className="space-y-3 pt-3 border-t border-border/30">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Notas do administrador</p>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Adicione notas sobre a resolução..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(selectedReport.id, "resolved")}
                      disabled={isUpdating}
                      className="flex-1 gap-2 rounded-xl"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Marcar como Resolvido
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedReport.id, "dismissed")}
                      disabled={isUpdating}
                      className="flex-1 gap-2 rounded-xl"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Dispensar
                    </Button>
                  </div>
                </div>
              )}

              {selectedReport.admin_notes && selectedReport.status !== "open" && (
                <div className="p-3 bg-muted/20 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Notas do admin</p>
                  <p className="text-sm">{selectedReport.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot zoom dialog */}
      <Dialog open={!!screenshotDialog} onOpenChange={(v) => { if (!v) setScreenshotDialog(null); }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Screenshot</DialogTitle>
            <DialogDescription>Visualização ampliada da captura de tela</DialogDescription>
          </DialogHeader>
          {screenshotDialog && (
            <img src={screenshotDialog} alt="Screenshot ampliada" className="w-full max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
