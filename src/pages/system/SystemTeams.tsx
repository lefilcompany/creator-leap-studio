import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { PaginationControls } from "@/components/admin/PaginationControls";
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

interface Plan {
  id: string;
  name: string;
}

const AdminTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      const { data: teamsData, error: teamsError } = await supabase.rpc(
        "get_all_teams_admin"
      );

      if (teamsError) throw teamsError;

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
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar equipes");
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
      const matchesStatus = statusFilter === "all" || team.subscription_status === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [teams, searchQuery, planFilter, statusFilter]);

  const paginatedTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTeams.slice(startIndex, startIndex + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTeams.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando equipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Equipes</h1>
        <p className="text-muted-foreground">
          Gerencie todas as equipes da plataforma
        </p>
      </div>

      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/10">
        <CardHeader>
          <CardTitle>Lista de Equipes</CardTitle>
          <CardDescription>
            {filteredTeams.length} equipes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            planFilter={planFilter}
            onPlanFilterChange={setPlanFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            plans={plans}
          />

          <TeamsTable teams={paginatedTeams} />
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTeams.length}
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

export default AdminTeams;
