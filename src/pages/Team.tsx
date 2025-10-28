import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Rocket, Users, ClipboardCopy, Check, X, Crown, Loader2, UserPlus, UserMinus, BarChart3, CreditCard, Gift } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import TeamInfoCard from '@/components/perfil/TeamInfoCard';
import RedeemCouponDialog from '@/components/team/RedeemCouponDialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

export default function Team() {
  const { user, team } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 5;
  const [showCouponDialog, setShowCouponDialog] = useState(false);

  // Resetar página quando membros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [members.length]);

  useEffect(() => {
    if (user && team) {
      // Apenas admins carregam dados de gerenciamento
      if (user.isAdmin) {
        loadTeamData();
      }
    }
  }, [user, team]);

  const loadTeamData = async () => {
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
      loadTeamData();
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

  if (isLoading || !team) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  // Se não é admin, mostra visualização de membro
  if (!user?.isAdmin) {
    return (
      <div className="min-h-full space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">
                  Minha Equipe
                </CardTitle>
                <p className="text-muted-foreground">Informações sobre a sua equipe e créditos disponíveis.</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Team Info Card */}
        <TeamInfoCard team={team} userRole="member" />
      </div>
    );
  }

  // Se é admin, mostra painel completo de gerenciamento
  return (
    <div className="min-h-full space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
              <Rocket className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">
                Gerenciar Equipe
              </CardTitle>
              <p className="text-muted-foreground">Veja os detalhes do seu plano, membros e solicitações.</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Button
          onClick={() => navigate('/plans')}
          variant="default"
          size="lg"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 text-base font-semibold"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Planos e Uso
        </Button>
        
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCouponDialog(true)}
            variant="outline"
            size="default"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary/50"
          >
            <Gift className="h-4 w-4 mr-2" />
            Resgatar Cupom
          </Button>
          
          <Button
            onClick={() => navigate('/team-dashboard')}
            variant="outline"
            size="default"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary/50"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Dashboard de Membros
          </Button>
        </div>
      </div>

      {/* Coupon Dialog */}
      <RedeemCouponDialog
        open={showCouponDialog}
        onOpenChange={setShowCouponDialog}
        currentPlanId={team?.plan_id || 'free'}
        onSuccess={() => {
          loadTeamData();
          toast.success('Benefícios aplicados com sucesso!');
        }}
      />

      {/* Main Content */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column - Team Info and Requests */}
        <div className="w-full xl:w-1/2 space-y-6 flex flex-col">
          {/* Team Information Card */}
          <TeamInfoCard team={team} userRole="admin" />
          
          {/* Access Code Card - Visível apenas em telas menores que xl */}
          <Card className="xl:hidden shadow-lg border-2 border-primary/20 bg-gradient-to-br from-card via-primary/5 to-secondary/10 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg pb-3">
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Código de Acesso
              </CardTitle>
              <CardDescription>
                Compartilhe para novos membros solicitarem entrada
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Input
                  value={team.code || 'TIMELEFIL'}
                  readOnly
                  className="bg-gradient-to-r from-muted/50 to-primary/5 cursor-not-allowed border-primary/20 font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <ClipboardCopy className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests Card */}
          <Card className="flex flex-col bg-gradient-to-br from-card via-accent/5 to-primary/5 border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300 h-fit max-h-[500px]">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-lg pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-accent text-xl">
                <UserPlus className="h-5 w-5" />
                Solicitações para Aprovação
                {pendingRequests.length > 0 && (
                  <span className="bg-gradient-to-r from-accent to-primary text-white text-xs px-2.5 py-1 rounded-full animate-pulse">
                    {pendingRequests.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>Aprove ou recuse as solicitações para entrar na sua equipe.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1">
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-background/70 to-accent/5 rounded-lg shadow-sm border border-accent/10 hover:border-accent/30 hover:shadow-md transition-all duration-200">
                      <div className='flex items-center gap-3 flex-1 min-w-0'>
                        <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-accent/20">
                          <AvatarImage src={request.avatar_url} alt={request.name} />
                          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/20 text-accent font-bold">
                            {request.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{request.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{request.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Solicitado em {new Date(request.created_at).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:scale-105 active:scale-95 transition-all duration-200"
                          onClick={() => handleRejectRequest(request.id, request.name)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/50 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 hover:scale-105 active:scale-95 transition-all duration-200"
                          onClick={() => handleApproveRequest(request.id, request.name)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma solicitação pendente</p>
                  <p className="text-muted-foreground text-sm mt-1">As solicitações aparecerão aqui quando enviadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team Members */}
        <div className="w-full xl:w-1/2 flex flex-col space-y-6">
          {/* Access Code Card - Visível apenas em desktop xl */}
          <Card className="hidden xl:block shadow-lg border-2 border-primary/20 bg-gradient-to-br from-card via-primary/5 to-secondary/10 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg pb-3">
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Código de Acesso
              </CardTitle>
              <CardDescription>
                Compartilhe para novos membros solicitarem entrada
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Input
                  value={team.code || 'TIMELEFIL'}
                  readOnly
                  className="bg-gradient-to-r from-muted/50 to-primary/5 cursor-not-allowed border-primary/20 font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <ClipboardCopy className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Team Members Card */}
          <Card className="flex flex-col overflow-hidden bg-gradient-to-br from-card via-secondary/5 to-accent/5 border-secondary/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-t-lg pb-4 flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-secondary text-xl">
                  <Users className="h-6 w-6" />
                  Membros Aceitos
                </div>
                <span className="bg-gradient-to-r from-secondary to-accent text-white text-sm px-3 py-1.5 rounded-full font-medium shadow-sm">
                  {members.length}
                </span>
              </CardTitle>
              <CardDescription>
                Usuários que foram aprovados e fazem parte da equipe
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col flex-1">
              {members.length > 0 ? (
                <>
                  <div className="space-y-4 flex-1">
                    {members.slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage).map(member => (
                    <div
                      key={member.id}
                      className="group relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-background/90 via-background/70 to-secondary/5 border border-secondary/10 hover:border-secondary/30 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    >
                      <Avatar className="h-14 w-14 ring-2 ring-secondary/15 group-hover:ring-secondary/30 transition-all duration-300 flex-shrink-0">
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                        <AvatarFallback className="bg-gradient-to-br from-secondary/20 to-accent/20 text-secondary font-bold text-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-foreground group-hover:text-secondary transition-colors duration-200 truncate pr-2">
                            {member.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-green-600 font-medium hidden sm:inline">Ativo</span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground truncate mb-3">
                          {member.email}
                        </p>

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* Role Badge */}
                          {member.id === team.admin_id ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-gradient-to-r from-amber-100 to-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                              <Crown className="h-3.5 w-3.5" />
                              <span className="font-semibold">Administrador</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-gradient-to-r from-blue-100 to-blue-50 px-3 py-1.5 rounded-full border border-blue-200 shadow-sm">
                              <Users className="h-3.5 w-3.5" />
                              <span className="font-semibold">Membro</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-gradient-to-r from-green-100 to-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                              <Check className="h-3.5 w-3.5" />
                              <span className="font-semibold">Aprovado</span>
                            </div>

                            {member.id !== team.admin_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive hover:scale-110 active:scale-95 transition-all duration-200 h-8 w-8 p-0"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                title={`Remover ${member.name} da equipe`}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Paginação */}
                {members.length > membersPerPage && (
                  <div className="mt-6 pt-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
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
                            disabled={currentPage === Math.ceil(members.length / membersPerPage)}
                            className={currentPage === Math.ceil(members.length / membersPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum membro aprovado ainda</p>
                  <p className="text-muted-foreground text-sm mt-1">Aprove as solicitações para adicionar membros</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
