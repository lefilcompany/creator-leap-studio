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
  role: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  avatar_url: string | null;
  tutorial_completed: boolean | null;
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

      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

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
            .maybeSingle();

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
