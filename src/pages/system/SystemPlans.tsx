import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Users, CreditCard, Building2 } from "lucide-react";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  credits: number;
  max_members: number;
  max_brands: number;
  max_personas: number;
  max_strategic_themes: number;
  trial_days: number;
  is_active: boolean;
  can_subscribe_online: boolean;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  teams_count?: number;
}

interface TeamSubscription {
  id: string;
  name: string;
  plan_id: string;
  plan_name: string;
  subscription_status: string | null;
  credits: number;
  subscription_period_end: string | null;
  stripe_subscription_id: string | null;
  admin_name: string;
  admin_email: string;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<TeamSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("plans");
  
  // Filters for subscriptions
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (plansError) throw plansError;

      // Fetch teams with subscriptions
      const { data: teamsData, error: teamsError } = await supabase
        .rpc("get_all_teams_admin");

      if (teamsError) throw teamsError;

      // Count teams per plan
      const planCounts: Record<string, number> = {};
      teamsData?.forEach((team: any) => {
        planCounts[team.plan_id] = (planCounts[team.plan_id] || 0) + 1;
      });

      // Add counts to plans
      const plansWithCounts = plansData?.map(plan => ({
        ...plan,
        teams_count: planCounts[plan.id] || 0
      })) || [];

      setPlans(plansWithCounts);

      // Fetch admin profiles for teams
      const adminIds = [...new Set(teamsData?.map((t: any) => t.admin_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", adminIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const plansMap = new Map(plansData?.map(p => [p.id, p.name]) || []);

      // Build subscriptions list
      const subs: TeamSubscription[] = teamsData?.map((team: any) => {
        const admin = profilesMap.get(team.admin_id);
        return {
          id: team.id,
          name: team.name,
          plan_id: team.plan_id,
          plan_name: plansMap.get(team.plan_id) || team.plan_id,
          subscription_status: team.subscription_status,
          credits: team.credits || 0,
          subscription_period_end: team.subscription_period_end,
          stripe_subscription_id: team.stripe_subscription_id,
          admin_name: admin?.name || "N/A",
          admin_email: admin?.email || "N/A"
        };
      }) || [];

      setSubscriptions(subs);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "trialing":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "canceled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "past_due":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "trialing":
        return "Trial";
      case "canceled":
        return "Cancelado";
      case "past_due":
        return "Atrasado";
      default:
        return status || "Sem assinatura";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchQuery === "" || 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.admin_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = planFilter === "all" || sub.plan_id === planFilter;
    
    const matchesStatus = statusFilter === "all" || sub.subscription_status === statusFilter;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Stats
  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.is_active).length;
  const totalSubscriptions = subscriptions.filter(s => s.subscription_status === "active" || s.subscription_status === "trialing").length;
  const totalRevenue = subscriptions
    .filter(s => s.subscription_status === "active")
    .reduce((acc, sub) => {
      const plan = plans.find(p => p.id === sub.plan_id);
      return acc + (plan?.price_monthly || 0);
    }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-muted-foreground">{activePlans} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">equipes assinantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">recorrente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">cadastradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos Disponíveis</CardTitle>
              <CardDescription>Gerencie os planos de assinatura da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Preço Mensal</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Equipes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {plan.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(plan.price_monthly)}
                      </TableCell>
                      <TableCell>{plan.credits}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p>{plan.max_members} membros</p>
                          <p>{plan.max_brands} marcas</p>
                          <p>{plan.max_personas} personas</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{plan.teams_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={plan.is_active ? "default" : "secondary"}>
                            {plan.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          {plan.can_subscribe_online && (
                            <Badge variant="outline" className="text-xs">Online</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.stripe_product_id ? (
                          <Badge variant="outline" className="text-xs font-mono">
                            {plan.stripe_product_id.slice(0, 12)}...
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Assinaturas das Equipes</CardTitle>
              <CardDescription>Visualize todas as assinaturas ativas e históricas</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                planFilter={planFilter}
                onPlanFilterChange={setPlanFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                plans={plans.map(p => ({ id: p.id, name: p.name }))}
                showStatusFilter={true}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{sub.admin_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.admin_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan_name}</Badge>
                      </TableCell>
                      <TableCell>{sub.credits}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(sub.subscription_status)}>
                          {getStatusLabel(sub.subscription_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.subscription_period_end ? (
                          <span className="text-sm">
                            {format(new Date(sub.subscription_period_end), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
