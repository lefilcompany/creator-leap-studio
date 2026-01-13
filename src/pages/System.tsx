import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { UsersTable } from "@/components/admin/UsersTable";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { TeamDistributionChart } from "@/components/admin/TeamDistributionChart";
import { SubscriptionStatusChart } from "@/components/admin/SubscriptionStatusChart";
import { CreditsDistributionChart } from "@/components/admin/CreditsDistributionChart";
import { TopTeamsChart } from "@/components/admin/TopTeamsChart";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { CreditUsageOverTimeChart } from "@/components/admin/CreditUsageOverTimeChart";
import { TeamGrowthChart } from "@/components/admin/TeamGrowthChart";
import { ActionTypeDistributionChart } from "@/components/admin/ActionTypeDistributionChart";
import { SystemLogsTable } from "@/components/admin/SystemLogsTable";
import { GeminiQuotaCard } from "@/components/admin/GeminiQuotaCard";
import { Users, Building2, Coins, TrendingUp, ScrollText } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  credits: number;
  plan_id: string;
  subscription_status: string | null;
  created_at: string;
  subscription_period_end: string | null;
  plan_name: string;
  plan_credits: number;
  admin_name: string;
  admin_email: string;
  member_count: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  created_at: string;
  team_name: string | null;
  credits: number | null;
  plan_id: string | null;
  plan_name: string | null;
  role: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  avatar_url: string | null;
  tutorial_completed: boolean | null;
  updated_at: string | null;
  actions_count: number;
  total_credits_used: number;
  last_action_at: string | null;
  subscription_status: string | null;
  last_online_at: string | null;
  total_session_seconds: number;
}

interface Plan {
  id: string;
  name: string;
}

interface CreditHistoryItem {
  id: string;
  team_id: string;
  user_id: string;
  action_type: string;
  credits_used: number;
  credits_before: number;
  credits_after: number;
  description: string | null;
  created_at: string;
  metadata: any;
}

const Admin = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination states
  const [teamsPageSize, setTeamsPageSize] = useState(20);
  const [teamsCurrentPage, setTeamsCurrentPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(20);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);

  // Date range filter - default últimos 3 meses
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch ALL teams using admin function
      const { data: teamsData, error: teamsError } = await supabase.rpc(
        "get_all_teams_admin"
      );

      if (teamsError) throw teamsError;

      // Enrich teams data with plan info and admin info
      const enrichedTeams = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const { data: planData } = await supabase
            .from("plans")
            .select("name, credits")
            .eq("id", team.plan_id)
            .single();

          const { data: adminData } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", team.admin_id)
            .single();

          const { count: memberCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          return {
            ...team,
            plan_name: planData?.name || "Desconhecido",
            plan_credits: planData?.credits || 0,
            admin_name: adminData?.name || "Desconhecido",
            admin_email: adminData?.email || "",
            member_count: memberCount || 0,
          };
        })
      );

      setTeams(enrichedTeams);

      // Fetch ALL users with full profile data
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch all user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Fetch actions count per user
      const { data: actionsData } = await supabase
        .from("actions")
        .select("user_id, created_at");

      // Fetch credit history per user
      const { data: creditHistoryUserData } = await supabase
        .from("credit_history")
        .select("user_id, credits_used");

      // Fetch presence history per user
      const { data: presenceData } = await supabase
        .from("user_presence_history")
        .select("user_id, started_at, ended_at, duration_seconds");

      // Create lookup maps for efficient access
      const teamsMapForUsers = new Map(teamsData?.map(t => [t.id, t]) || []);
      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      const plansMapForUsers = new Map(plansData?.map(p => [p.id, p.name]) || []);

      // Calculate actions per user
      const actionsCountMap = new Map<string, { count: number; lastAction: string | null }>();
      actionsData?.forEach(action => {
        const existing = actionsCountMap.get(action.user_id);
        if (existing) {
          existing.count++;
          if (!existing.lastAction || action.created_at > existing.lastAction) {
            existing.lastAction = action.created_at;
          }
        } else {
          actionsCountMap.set(action.user_id, { count: 1, lastAction: action.created_at });
        }
      });

      // Calculate total credits used per user
      const creditsUsedMap = new Map<string, number>();
      creditHistoryUserData?.forEach(ch => {
        const existing = creditsUsedMap.get(ch.user_id) || 0;
        creditsUsedMap.set(ch.user_id, existing + (ch.credits_used || 0));
      });

      // Calculate presence data per user
      const presenceMap = new Map<string, { lastOnline: string | null; totalSeconds: number }>();
      presenceData?.forEach(p => {
        const existing = presenceMap.get(p.user_id) || { lastOnline: null, totalSeconds: 0 };
        const sessionEnd = p.ended_at || p.started_at;
        if (!existing.lastOnline || sessionEnd > existing.lastOnline) {
          existing.lastOnline = sessionEnd;
        }
        existing.totalSeconds += p.duration_seconds || 0;
        presenceMap.set(p.user_id, existing);
      });

      // Enrich users data
      const enrichedUsers = (usersData || []).map((user: any) => {
        const teamData = user.team_id ? teamsMapForUsers.get(user.team_id) : null;
        const actionsInfo = actionsCountMap.get(user.id);
        const presenceInfo = presenceMap.get(user.id);

        return {
          ...user,
          team_name: teamData?.name || null,
          credits: teamData?.credits || null,
          plan_id: teamData?.plan_id || null,
          plan_name: teamData?.plan_id ? plansMapForUsers.get(teamData.plan_id) || null : null,
          subscription_status: teamData?.subscription_status || null,
          role: rolesMap.get(user.id) || null,
          actions_count: actionsInfo?.count || 0,
          total_credits_used: creditsUsedMap.get(user.id) || 0,
          last_action_at: actionsInfo?.lastAction || null,
          last_online_at: presenceInfo?.lastOnline || null,
          total_session_seconds: presenceInfo?.totalSeconds || 0,
        };
      });

      setUsers(enrichedUsers);

      // Fetch credit history for charts
      const { data: historyData, error: historyError } = await supabase
        .from("credit_history")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (historyError) throw historyError;
      setCreditHistory(historyData || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        searchQuery === "" ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.admin_email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlan = planFilter === "all" || team.plan_id === planFilter;

      const matchesStatus =
        statusFilter === "all" || team.subscription_status === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [teams, searchQuery, planFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

      const matchesPlan = planFilter === "all" || user.plan_id === planFilter;

      return matchesSearch && matchesPlan;
    });
  }, [users, searchQuery, planFilter]);

  // Paginated data
  const paginatedTeams = useMemo(() => {
    const startIndex = (teamsCurrentPage - 1) * teamsPageSize;
    return filteredTeams.slice(startIndex, startIndex + teamsPageSize);
  }, [filteredTeams, teamsCurrentPage, teamsPageSize]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (usersCurrentPage - 1) * usersPageSize;
    return filteredUsers.slice(startIndex, startIndex + usersPageSize);
  }, [filteredUsers, usersCurrentPage, usersPageSize]);

  const teamsTotalPages = Math.ceil(filteredTeams.length / teamsPageSize);
  const usersTotalPages = Math.ceil(filteredUsers.length / usersPageSize);

  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalUsers = users.length;
    const totalCredits = teams.reduce((sum, team) => sum + team.credits, 0);
    const avgCreditsPerTeam = totalTeams > 0 ? Math.round(totalCredits / totalTeams) : 0;

    return { totalTeams, totalUsers, totalCredits, avgCreditsPerTeam };
  }, [teams, users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel de Administração</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os usuários e equipes da plataforma
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Total de Equipes</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Total de Usuários</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Total de Créditos</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <Coins className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{stats.totalCredits}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Média por Equipe</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.avgCreditsPerTeam}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Análises e Métricas</h2>
          <p className="text-muted-foreground">
            Visualizações gráficas dos dados do sistema
          </p>
        </div>

        <DateRangeFilter 
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />

        <div>
          <h3 className="text-xl font-semibold mb-4">Evolução Temporal</h3>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            <CreditUsageOverTimeChart 
              creditHistory={creditHistory}
              startDate={startDate}
              endDate={endDate}
            />
            <TeamGrowthChart 
              teams={teams}
              users={users}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Distribuições Gerais</h3>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
            <TeamDistributionChart teams={teams} />
            <SubscriptionStatusChart teams={teams} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
          <ActionTypeDistributionChart creditHistory={creditHistory} />
          <CreditsDistributionChart teams={teams} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TopTeamsChart teams={teams} />
          <GeminiQuotaCard />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Logs do Sistema</h2>
          <p className="text-muted-foreground">
            Monitore atividades e erros da plataforma
          </p>
        </div>
        <SystemLogsTable />
      </div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/10">
        <CardHeader>
          <CardTitle>Gerenciamento de Dados</CardTitle>
          <CardDescription>
            Visualize e filtre informações sobre equipes e usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            planFilter={planFilter}
            onPlanFilterChange={setPlanFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            plans={plans}
          />

          <Tabs defaultValue="teams" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="teams">
                Equipes ({filteredTeams.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                Usuários ({filteredUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams" className="space-y-4">
              <TeamsTable teams={paginatedTeams} />
              <PaginationControls
                currentPage={teamsCurrentPage}
                totalPages={teamsTotalPages}
                pageSize={teamsPageSize}
                totalItems={filteredTeams.length}
                onPageChange={setTeamsCurrentPage}
                onPageSizeChange={(size) => {
                  setTeamsPageSize(size);
                  setTeamsCurrentPage(1);
                }}
              />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UsersTable users={paginatedUsers} />
              <PaginationControls
                currentPage={usersCurrentPage}
                totalPages={usersTotalPages}
                pageSize={usersPageSize}
                totalItems={filteredUsers.length}
                onPageChange={setUsersCurrentPage}
                onPageSizeChange={(size) => {
                  setUsersPageSize(size);
                  setUsersCurrentPage(1);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
