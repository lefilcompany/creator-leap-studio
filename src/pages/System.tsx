import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Zap, TrendingUp, FileText, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { CreditUsageOverTimeChart } from "@/components/admin/CreditUsageOverTimeChart";
import { ActionTypeDistributionChart } from "@/components/admin/ActionTypeDistributionChart";
import { GeminiQuotaCard } from "@/components/admin/GeminiQuotaCard";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const SystemDashboard = () => {
  const [startDate, setStartDate] = useState(() => subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState(new Date());

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["system-users-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, credits, max_credits, created_at, credits_expire_at");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch credit history for charts
  const { data: creditHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["system-credit-history", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_history")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch total actions count
  const { data: actionsCount = 0 } = useQuery({
    queryKey: ["system-actions-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("actions")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch recent actions (last 7 days)
  const { data: recentActionsCount = 0 } = useQuery({
    queryKey: ["system-recent-actions"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count, error } = await supabase
        .from("actions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 2,
  });

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
    const totalMaxCredits = users.reduce((sum, u) => sum + (u.max_credits || 0), 0);
    const usersWithCredits = users.filter(u => (u.credits || 0) > 0).length;
    const totalCreditHistory = creditHistory.reduce((sum, ch) => sum + (ch.credits_used || 0), 0);

    return { totalUsers, totalCredits, totalMaxCredits, usersWithCredits, totalCreditHistory };
  }, [users, creditHistory]);

  // User growth chart data
  const userGrowthData = useMemo(() => {
    if (users.length === 0) return [];
    const months: Record<string, number> = {};
    const sortedUsers = [...users].sort((a, b) => 
      new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
    );
    
    let cumulative = 0;
    sortedUsers.forEach(user => {
      const d = new Date(user.created_at!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      cumulative++;
      months[key] = cumulative;
    });

    return Object.entries(months).map(([month, count]) => ({ month, users: count }));
  }, [users]);

  const isLoading = loadingUsers || loadingHistory;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma — foco em usuários individuais
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{stats.usersWithCredits} com créditos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Ativos</CardTitle>
            <div className="p-2 rounded-lg bg-chart-1/10">
              <Zap className="h-5 w-5 text-chart-1" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-1">{stats.totalCredits.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">em circulação</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Consumidos</CardTitle>
            <div className="p-2 rounded-lg bg-chart-5/10">
              <TrendingUp className="h-5 w-5 text-chart-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-5">{stats.totalCreditHistory.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conteúdos</CardTitle>
            <div className="p-2 rounded-lg bg-chart-3/10">
              <FileText className="h-5 w-5 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-3">{actionsCount.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">criados na plataforma</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
            <div className="p-2 rounded-lg bg-chart-2/10">
              <Activity className="h-5 w-5 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-2">{recentActionsCount}</div>
            <p className="text-xs text-muted-foreground">últimos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onRangeChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />

      {/* User Growth Chart */}
      {userGrowthData.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Crescimento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ users: { label: "Usuários", color: "hsl(var(--primary))" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => {
                      const [y, m] = v.split('-');
                      return format(new Date(+y, +m - 1), 'MMM/yy', { locale: ptBR });
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        const [y, m] = d.month.split('-');
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="text-xs text-muted-foreground capitalize">
                              {format(new Date(+y, +m - 1), 'MMMM yyyy', { locale: ptBR })}
                            </div>
                            <div className="font-bold text-primary">{d.users} usuários</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Credit & Content Charts */}
      <div className="space-y-6">
        <CreditUsageOverTimeChart
          creditHistory={creditHistory}
          startDate={startDate}
          endDate={endDate}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <ActionTypeDistributionChart creditHistory={creditHistory} />
          <GeminiQuotaCard />
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;
