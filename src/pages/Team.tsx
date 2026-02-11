import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket, Users, ClipboardCopy, Check, X, Crown, Loader2, UserPlus, UserMinus, 
  Tag, Palette, UsersRound, Sparkles, FolderOpen, Plus, Eye
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreateTeamDialog } from '@/components/auth/CreateTeamDialog';
import { JoinTeamDialog } from '@/components/auth/JoinTeamDialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
}

interface TeamData {
  id: string;
  name: string;
  code: string;
  admin_id: string;
  plan_id: string;
  isMyTeam: boolean;
}

interface SharedContent {
  brands: { id: string; name: string; segment: string }[];
  personas: { id: string; name: string; brand_name: string }[];
  themes: { id: string; title: string; brand_name: string }[];
  actions: { id: string; type: string; created_at: string; brand_name: string }[];
}

export default function Team() {
  const { user, team, reloadUserData } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 5;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [accessibleTeams, setAccessibleTeams] = useState<TeamData[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [sharedContent, setSharedContent] = useState<SharedContent>({
    brands: [],
    personas: [],
    themes: [],
    actions: []
  });
  const [activeTab, setActiveTab] = useState('members');

  // Resetar página quando membros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [members.length]);

  const isTeamAdmin = team?.admin_id === user?.id;

  // Carregar equipes acessíveis
  useEffect(() => {
    if (user) {
      loadAccessibleTeams();
    }
  }, [user]);

  // Carregar dados da equipe selecionada
  useEffect(() => {
    if (selectedTeam) {
      loadTeamContent(selectedTeam.id);
      if (selectedTeam.isMyTeam && isTeamAdmin) {
        loadTeamManagementData();
      }
    }
  }, [selectedTeam, isTeamAdmin]);

  // Definir equipe selecionada inicial
  useEffect(() => {
    if (team && accessibleTeams.length > 0) {
      const myTeam = accessibleTeams.find(t => t.id === team.id);
      if (myTeam) {
        setSelectedTeam(myTeam);
      }
    } else if (accessibleTeams.length > 0 && !selectedTeam) {
      setSelectedTeam(accessibleTeams[0]);
    }
  }, [team, accessibleTeams]);

  const loadAccessibleTeams = async () => {
    if (!user) return;

    try {
      // Buscar equipe própria
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      const teams: TeamData[] = [];

      if (myProfile?.team_id) {
        const { data: myTeamData } = await supabase
          .from('teams')
          .select('id, name, code, admin_id, plan_id')
          .eq('id', myProfile.team_id)
          .single();

        if (myTeamData) {
          teams.push({
            ...myTeamData,
            isMyTeam: true
          });
        }
      }

      // Buscar outras equipes que o usuário é membro (team_members)
      const { data: memberOf } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams:team_id (
            id, name, code, admin_id, plan_id
          )
        `)
        .eq('user_id', user.id);

      if (memberOf) {
        for (const membership of memberOf) {
          const teamData = membership.teams as unknown as TeamData;
          if (teamData && !teams.find(t => t.id === teamData.id)) {
            teams.push({
              ...teamData,
              isMyTeam: false
            });
          }
        }
      }

      setAccessibleTeams(teams);
    } catch (error: any) {
      console.error('Erro ao carregar equipes:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadTeamManagementData = async () => {
    if (!team) return;

    setIsLoading(true);
    try {
      // Carregar membros da equipe
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('team_id', team.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Buscar solicitações pendentes
      const { data: requestsData, error: requestsError } = await supabase
        .from('team_join_requests')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('team_id', team.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Buscar dados dos usuários separadamente
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map((req: any) => req.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const formattedRequests = requestsData.map((req: any) => {
          const profile = profilesMap.get(req.user_id);
          return {
            id: req.id,
            name: profile?.name || 'Usuário',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url || '',
            created_at: req.created_at,
          };
        });

        setPendingRequests(formattedRequests);
      } else {
        setPendingRequests([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados da equipe:', error);
      toast.error('Erro ao carregar dados da equipe');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamContent = async (teamId: string) => {
    try {
      // Carregar marcas da equipe
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, segment')
        .eq('team_id', teamId)
        .order('name');

      // Carregar personas da equipe
      const { data: personasData } = await supabase
        .from('personas')
        .select('id, name, brand_id, brands(name)')
        .eq('team_id', teamId)
        .order('name');

      // Carregar temas estratégicos da equipe
      const { data: themesData } = await supabase
        .from('strategic_themes')
        .select('id, title, brand_id, brands(name)')
        .eq('team_id', teamId)
        .order('title');

      // Carregar ações/criações da equipe
      const { data: actionsData } = await supabase
        .from('actions')
        .select('id, type, created_at, brand_id, brands(name)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20);

      setSharedContent({
        brands: brandsData || [],
        personas: (personasData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          brand_name: p.brands?.name || 'Sem marca'
        })),
        themes: (themesData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          brand_name: t.brands?.name || 'Sem marca'
        })),
        actions: (actionsData || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          created_at: a.created_at,
          brand_name: a.brands?.name || 'Sem marca'
        }))
      });
    } catch (error: any) {
      console.error('Erro ao carregar conteúdo da equipe:', error);
    }
  };

  const copyToClipboard = () => {
    if (team?.code) {
      navigator.clipboard.writeText(team.code);
      toast.success('Código copiado para a área de transferência!');
    }
  };

  const handleApproveRequest = async (requestId: string, userName: string) => {
    if (team?.plan && members.length >= team.plan.maxMembers) {
      toast.error('Limite de membros do plano atingido.');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_join_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success(`${userName} foi adicionado à equipe!`);
      
      // Recarregar membros
      loadTeamManagementData();
    } catch (error: any) {
      console.error('Erro ao aprovar solicitação:', error);
      toast.error('Erro ao aprovar solicitação');
    }
  };

  const handleRejectRequest = async (requestId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('team_join_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      toast.info(`Solicitação de ${userName} foi recusada.`);
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error);
      toast.error('Erro ao rejeitar solicitação');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (memberId === user?.id) {
      toast.error("Você não pode remover a si mesmo da equipe.");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success(`${memberName} foi removido da equipe!`);
    } catch (error: any) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'CRIAR_CONTEUDO': 'Criação de Conteúdo',
      'CRIAR_CONTEUDO_RAPIDO': 'Criação Rápida',
      'REVISAR_CONTEUDO': 'Revisão de Conteúdo',
      'PLANEJAR_CONTEUDO': 'Planejamento',
      'GERAR_VIDEO': 'Geração de Vídeo'
    };
    return labels[type] || type;
  };

  if (isInitialLoading || isLoading) {
    return (
      <div className="min-h-full space-y-6 animate-fade-in">
        <PageBreadcrumb items={[{ label: "Equipes" }]} />
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sem equipe - mostrar opções para criar/entrar
  if (!team && accessibleTeams.length === 0) {
    return (
      <div className="min-h-full space-y-6 animate-fade-in">
        {/* Breadcrumb Navigation */}
        <PageBreadcrumb items={[{ label: "Equipes" }]} />

        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                <UsersRound className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">
                  Equipes
                </CardTitle>
                <p className="text-muted-foreground">Colabore com outros usuários compartilhando marcas, personas e temas.</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-lg border-0 p-8 text-center">
          <UsersRound className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Você não está em nenhuma equipe</h3>
          <p className="text-muted-foreground mb-6">
            Equipes permitem compartilhar marcas, personas e temas com outros membros, além de visualizar as criações de todos.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button onClick={() => setShowCreateDialog(true)} variant="default" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Criar Equipe
            </Button>
            <Button onClick={() => setShowJoinDialog(true)} variant="outline" size="lg">
              <UserPlus className="h-5 w-5 mr-2" />
              Entrar em uma Equipe
            </Button>
          </div>
        </Card>

        {/* Dialogs */}
        <CreateTeamDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            reloadUserData();
          }}
          context="login"
        />
        <JoinTeamDialog
          open={showJoinDialog}
          onClose={() => setShowJoinDialog(false)}
          onBack={() => setShowJoinDialog(false)}
          onSuccess={() => {
            setShowJoinDialog(false);
            reloadUserData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <PageBreadcrumb items={[{ label: "Equipes" }]} />

      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                <UsersRound className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">
                  Equipes
                </CardTitle>
                <p className="text-muted-foreground">
                  {accessibleTeams.length === 1 
                    ? 'Gerencie sua equipe e conteúdo compartilhado'
                    : `Você tem acesso a ${accessibleTeams.length} equipes`}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Equipe
              </Button>
              <Button onClick={() => setShowJoinDialog(true)} variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Entrar em Equipe
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Seletor de Equipes */}
      {accessibleTeams.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {accessibleTeams.map((t) => (
            <Button
              key={t.id}
              variant={selectedTeam?.id === t.id ? 'default' : 'outline'}
              onClick={() => setSelectedTeam(t)}
              className="flex items-center gap-2"
            >
              {t.isMyTeam && <Crown className="h-4 w-4" />}
              {t.name}
            </Button>
          ))}
        </div>
      )}

      {selectedTeam && (
        <>
          {/* Info da Equipe Selecionada */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-2">
                    <Rocket className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {selectedTeam.name}
                      {selectedTeam.isMyTeam && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Minha Equipe
                        </span>
                      )}
                    </CardTitle>
                    {selectedTeam.isMyTeam && isTeamAdmin && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">Código:</span>
                        <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                          {team?.code}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                          <ClipboardCopy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs de Conteúdo */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-4">
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Marcas ({sharedContent.brands.length})
              </TabsTrigger>
              <TabsTrigger value="personas" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personas ({sharedContent.personas.length})
              </TabsTrigger>
              <TabsTrigger value="themes" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Temas ({sharedContent.themes.length})
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Criações ({sharedContent.actions.length})
              </TabsTrigger>
              {selectedTeam.isMyTeam && isTeamAdmin && (
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4" />
                  Membros ({members.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Marcas */}
            <TabsContent value="brands">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Marcas da Equipe
                  </CardTitle>
                  <CardDescription>Marcas compartilhadas com os membros da equipe</CardDescription>
                </CardHeader>
                <CardContent>
                  {sharedContent.brands.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedContent.brands.map((brand) => (
                        <Card 
                          key={brand.id} 
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                          onClick={() => navigate(`/brands`)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-semibold">{brand.name}</h4>
                            <p className="text-sm text-muted-foreground">{brand.segment}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma marca compartilhada nesta equipe</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Personas */}
            <TabsContent value="personas">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Personas da Equipe
                  </CardTitle>
                  <CardDescription>Personas compartilhadas com os membros da equipe</CardDescription>
                </CardHeader>
                <CardContent>
                  {sharedContent.personas.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedContent.personas.map((persona) => (
                        <Card 
                          key={persona.id} 
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                          onClick={() => navigate(`/personas`)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-semibold">{persona.name}</h4>
                            <p className="text-sm text-muted-foreground">{persona.brand_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma persona compartilhada nesta equipe</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Temas */}
            <TabsContent value="themes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Temas Estratégicos da Equipe
                  </CardTitle>
                  <CardDescription>Temas compartilhados com os membros da equipe</CardDescription>
                </CardHeader>
                <CardContent>
                  {sharedContent.themes.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedContent.themes.map((theme) => (
                        <Card 
                          key={theme.id} 
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                          onClick={() => navigate(`/themes`)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-semibold">{theme.title}</h4>
                            <p className="text-sm text-muted-foreground">{theme.brand_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum tema compartilhado nesta equipe</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Criações */}
            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Criações Recentes da Equipe
                  </CardTitle>
                  <CardDescription>Últimas criações feitas pelos membros da equipe</CardDescription>
                </CardHeader>
                <CardContent>
                  {sharedContent.actions.length > 0 ? (
                    <div className="space-y-3">
                      {sharedContent.actions.map((action) => (
                        <Card 
                          key={action.id} 
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                          onClick={() => navigate(`/action/${action.id}`)}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{getActionTypeLabel(action.type)}</h4>
                              <p className="text-sm text-muted-foreground">{action.brand_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {new Date(action.created_at).toLocaleDateString('pt-BR')}
                              </p>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma criação nesta equipe ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Membros (apenas admin) */}
            {selectedTeam.isMyTeam && isTeamAdmin && (
              <TabsContent value="members">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Solicitações Pendentes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Solicitações Pendentes
                        {pendingRequests.length > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {pendingRequests.length}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pendingRequests.length > 0 ? (
                        <div className="space-y-3">
                          {pendingRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={request.avatar_url} />
                                  <AvatarFallback>{request.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{request.name}</p>
                                  <p className="text-sm text-muted-foreground">{request.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleRejectRequest(request.id, request.name)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:bg-green-600 hover:text-white"
                                  onClick={() => handleApproveRequest(request.id, request.name)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhuma solicitação pendente
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lista de Membros */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UsersRound className="h-5 w-5" />
                        Membros da Equipe ({members.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {members.length > 0 ? (
                        <div className="space-y-3">
                          {members.slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage).map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={member.avatar_url} />
                                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium flex items-center gap-2">
                                    {member.name}
                                    {member.id === team?.admin_id && (
                                      <Crown className="h-4 w-4 text-amber-500" />
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              {member.id !== team?.admin_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          {members.length > membersPerPage && (
                            <Pagination className="mt-4">
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                                {Array.from({ length: Math.ceil(members.length / membersPerPage) }, (_, i) => i + 1).map((page) => (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(page)}
                                      isActive={currentPage === page}
                                      className="cursor-pointer"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext 
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(members.length / membersPerPage), prev + 1))}
                                    className={currentPage === Math.ceil(members.length / membersPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum membro na equipe
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <CreateTeamDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          reloadUserData();
          loadAccessibleTeams();
        }}
        context="login"
      />
      <JoinTeamDialog
        open={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onBack={() => setShowJoinDialog(false)}
        onSuccess={() => {
          setShowJoinDialog(false);
          reloadUserData();
        }}
      />
    </div>
  );
}
