import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { UsersTable } from "@/components/admin/UsersTable";
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

const Admin = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch teams with complete data
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          credits,
          plan_id,
          subscription_status,
          created_at,
          subscription_period_end,
          admin_id
        `)
        .order("created_at", { ascending: false });

      if (teamsError) throw teamsError;

      // Enrich teams data with plan info and admin info
      const enrichedTeams = await Promise.all(
        (teamsData || []).map(async (team) => {
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

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          email,
          team_id,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Enrich users data
      const enrichedUsers = await Promise.all(
        (usersData || []).map(async (user) => {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Créditos</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCredits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Equipe</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCreditsPerTeam}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
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

          <Tabs defaultValue="teams">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="teams">
                Equipes ({filteredTeams.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                Usuários ({filteredUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams">
              <TeamsTable teams={filteredTeams} />
            </TabsContent>

            <TabsContent value="users">
              <UsersTable users={filteredUsers} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
