import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { UsersTable } from "@/components/admin/UsersTable";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { toast } from "sonner";

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

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

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

      // Fetch all profiles
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch all teams
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, credits, plan_id, subscription_status");

      // Fetch all user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Fetch actions count per user
      const { data: actionsData } = await supabase
        .from("actions")
        .select("user_id, created_at");

      // Fetch credit history per user
      const { data: creditHistoryData } = await supabase
        .from("credit_history")
        .select("user_id, credits_used");

      // Fetch presence history per user
      const { data: presenceData } = await supabase
        .from("user_presence_history")
        .select("user_id, started_at, ended_at, duration_seconds");

      // Create lookup maps for efficient access
      const teamsMap = new Map(teamsData?.map(t => [t.id, t]) || []);
      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      const plansMap = new Map(plansData?.map(p => [p.id, p.name]) || []);

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
      creditHistoryData?.forEach(ch => {
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

      // Enrich users with all data
      const enrichedUsers = (usersData || []).map((user: any) => {
        const teamData = user.team_id ? teamsMap.get(user.team_id) : null;
        const actionsInfo = actionsCountMap.get(user.id);
        const presenceInfo = presenceMap.get(user.id);

        return {
          ...user,
          team_name: teamData?.name || null,
          credits: teamData?.credits || null,
          plan_id: teamData?.plan_id || null,
          plan_name: teamData?.plan_id ? plansMap.get(teamData.plan_id) || null : null,
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
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

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

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie todos os usuários da plataforma
        </p>
      </div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/10">
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuários encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            planFilter={planFilter}
            onPlanFilterChange={setPlanFilter}
            statusFilter="all"
            onStatusFilterChange={() => {}}
            plans={plans}
            showStatusFilter={false}
          />

          <UsersTable users={paginatedUsers} />
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredUsers.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
