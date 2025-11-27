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
import { Users, Building2, Coins, TrendingUp } from "lucide-react";
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
  role: string | null;
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

      // Fetch ALL users using admin function
      const { data: usersData, error: usersError } = await supabase.rpc(
        "get_all_users_admin"
      );

      if (usersError) throw usersError;

      // Enrich users data
      const enrichedUsers = await Promise.all(
        (usersData || []).map(async (user: any) => {
          let teamData = null;
          if (user.team_id) {
            const { data } = await supabase
              .from("teams")
              .select("name, credits, plan_id")
              .eq("id", user.team_id)
              .single();
            teamData = data;
          }

          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

          return {
            ...user,
            team_name: teamData?.name || null,
            credits: teamData?.credits || null,
            plan_id: teamData?.plan_id || null,
            role: roleData?.role || null,
          };
        })
      );

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

        <TopTeamsChart teams={teams} />
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
