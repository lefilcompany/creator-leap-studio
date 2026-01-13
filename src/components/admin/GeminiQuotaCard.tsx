import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Video, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface QuotaData {
  status: "healthy" | "warning" | "critical" | "unknown";
  statusMessage: string;
  apiAccessible: boolean;
  apiKeyConfigured: boolean;
  stats: {
    last30Days: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      pendingRequests: number;
      quotaErrors: number;
      successRate: number;
    };
    dailyUsage: {
      date: string;
      requests: number;
      success: number;
      failed: number;
    }[];
  };
  recentErrors: {
    date: string;
    error: string;
    apiStatus?: number;
    model?: string;
  }[];
  availableModels: {
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
  }[];
  checkedAt: string;
}

export const GeminiQuotaCard = () => {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-gemini-quota");
      
      if (fnError) {
        throw new Error(fnError.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setQuotaData(data);
    } catch (err: any) {
      console.error("Erro ao verificar quota:", err);
      setError(err.message || "Erro ao verificar quota da API");
      toast.error("Erro ao verificar quota da API Gemini");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Saudável</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Atenção</Badge>;
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Erro ao verificar Gemini API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchQuotaStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!quotaData) return null;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Video className="h-5 w-5 text-purple-500" />
            </div>
            Status da API Gemini (Vídeo)
          </CardTitle>
          <CardDescription>
            Monitoramento de quota e uso da API de geração de vídeo
          </CardDescription>
        </div>
        <Button onClick={fetchQuotaStatus} variant="ghost" size="icon" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            {getStatusIcon(quotaData.status)}
            <div>
              <p className="font-medium">{quotaData.statusMessage}</p>
              <p className="text-xs text-muted-foreground">
                Verificado em: {new Date(quotaData.checkedAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          {getStatusBadge(quotaData.status)}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/20 text-center">
            <p className="text-2xl font-bold text-primary">
              {quotaData.stats.last30Days.totalRequests}
            </p>
            <p className="text-xs text-muted-foreground">Requisições (30d)</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <p className="text-2xl font-bold text-green-600">
              {quotaData.stats.last30Days.successfulRequests}
            </p>
            <p className="text-xs text-muted-foreground">Sucesso</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">
              {quotaData.stats.last30Days.failedRequests}
            </p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {quotaData.stats.last30Days.quotaErrors}
            </p>
            <p className="text-xs text-muted-foreground">Erros Quota</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Taxa de Sucesso</span>
              <span className="font-medium">{quotaData.stats.last30Days.successRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${quotaData.stats.last30Days.successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {quotaData.stats.dailyUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Uso nos últimos 7 dias</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quotaData.stats.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(label) => formatDate(label as string)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="success" 
                    name="Sucesso"
                    stackId="1"
                    stroke="hsl(142, 76%, 36%)"
                    fill="hsl(142, 76%, 36%, 0.5)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    name="Falhas"
                    stackId="1"
                    stroke="hsl(0, 84%, 60%)"
                    fill="hsl(0, 84%, 60%, 0.5)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {quotaData.recentErrors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Erros Recentes</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {quotaData.recentErrors.map((err, idx) => (
                <div 
                  key={idx} 
                  className="p-2 rounded-lg bg-destructive/5 border border-destructive/10 text-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(err.date).toLocaleString("pt-BR")}
                    </p>
                    {err.apiStatus && (
                      <Badge variant="outline" className="text-xs">
                        Status: {err.apiStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{err.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Models */}
        {quotaData.availableModels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Modelos Disponíveis</h4>
            <div className="flex flex-wrap gap-2">
              {quotaData.availableModels.slice(0, 6).map((model, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {model.displayName || model.name.split("/").pop()}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
