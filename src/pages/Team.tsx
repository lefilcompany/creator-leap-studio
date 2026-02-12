import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Rocket, Users, ClipboardCopy, Check, X, Crown, Loader2, UserPlus, UserMinus, 
  UsersRound, Plus, ChevronDown, ChevronUp, LayoutGrid, List, Mail
} from 'lucide-react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';
import teamBanner from '@/assets/team-banner.jpg';

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

export default function Team() {
  const { user, team, isLoading: isAuthLoading, reloadUserData } = useAuth();
  const navigate = useNavigate();
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isTeamsLoaded, setIsTeamsLoaded] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 12;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [accessibleTeams, setAccessibleTeams] = useState<TeamData[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [members.length, viewMode]);

  const isTeamAdmin = team?.admin_id === user?.id;
  const showSkeleton = isAuthLoading || !isTeamsLoaded;

  useEffect(() => {
    if (user) {
      loadAccessibleTeams();
    } else if (!isAuthLoading) {
      setIsTeamsLoaded(true);
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    if (selectedTeam) {
      if (selectedTeam.isMyTeam && isTeamAdmin) {
        loadTeamManagementData();
      } else {
        loadTeamMembers(selectedTeam.id);
      }
    }
  }, [selectedTeam, isTeamAdmin]);

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
      setIsTeamsLoaded(true);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    setIsContentLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('team_id', teamId);

      if (error) throw error;
      setMembers(membersData || []);
      setPendingRequests([]);
    } catch (error: any) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setIsContentLoading(false);
    }
  };

  const loadTeamManagementData = async () => {
    if (!team) return;

    setIsContentLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('team_id', team.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

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
      setIsContentLoading(false);
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

  // Sort members alphabetically, then apply view mode
  const displayedMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (viewMode === 'grid') return sorted;
    const start = (currentPage - 1) * membersPerPage;
    return sorted.slice(start, start + membersPerPage);
  }, [members, viewMode, currentPage, membersPerPage]);

  const totalPages = Math.ceil(members.length / membersPerPage);

  // --- Banner + Header Card shared component ---
  const BannerWithHeader = ({ actions }: { actions?: React.ReactNode }) => (
    <>
      <div className="relative h-40 sm:h-48 md:h-56 lg:h-64 overflow-hidden">
        <img
          src={teamBanner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
      </div>

      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 z-10">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 border border-primary/20 text-primary rounded-2xl p-3">
                <UsersRound className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Equipes
                </h1>
                <p className="text-sm text-muted-foreground">
                  {accessibleTeams.length > 1
                    ? `Você tem acesso a ${accessibleTeams.length} equipes`
                    : 'Colabore com outros usuários compartilhando marcas, personas e temas'}
                </p>
              </div>
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    </>
  );

  // --- Skeleton state ---
  if (showSkeleton || isContentLoading) {
    return (
      <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 animate-fade-in">
        <div className="relative h-48 md:h-56 overflow-hidden bg-muted" />
        <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 z-10">
          <div className="bg-card rounded-2xl shadow-lg border p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
        </div>
        <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl border p-4 space-y-3">
                <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-3 w-32 mx-auto" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- No team state ---
  if (!team && accessibleTeams.length === 0) {
    return (
      <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 animate-fade-in">
        <BannerWithHeader
          actions={
            <>
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar Equipe
              </Button>
              <Button onClick={() => setShowJoinDialog(true)} variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Entrar em Equipe
              </Button>
            </>
          }
        />

        <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
          <Card className="border-0 shadow-lg p-8 text-center">
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
        </main>

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

  // --- Main state with team ---
  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 animate-fade-in">
      <BannerWithHeader
        actions={
          <>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Equipe
            </Button>
            <Button onClick={() => setShowJoinDialog(true)} variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Entrar em Equipe
            </Button>
          </>
        }
      />

      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        {/* Team Selector */}
        {accessibleTeams.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-4">
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
          <div className="space-y-4">
            {/* Selected Team Info */}
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

            {/* Pending Requests Dropdown (admin only) */}
            {selectedTeam.isMyTeam && isTeamAdmin && (
              <div className="bg-card rounded-xl shadow-md overflow-hidden">
                <button
                  onClick={() => setRequestsExpanded(!requestsExpanded)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl p-2">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">
                        Solicitações Pendentes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {pendingRequests.length === 0
                          ? 'Nenhuma solicitação pendente'
                          : `${pendingRequests.length} solicitaç${pendingRequests.length === 1 ? 'ão' : 'ões'} pendente${pendingRequests.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingRequests.length > 0 && (
                      <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {pendingRequests.length}
                      </span>
                    )}
                    {requestsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {requestsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t px-4 pb-4 pt-2 space-y-2">
                        {pendingRequests.length > 0 ? (
                          pendingRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={request.avatar_url} />
                                  <AvatarFallback className="bg-amber-500/10 text-amber-600">
                                    {request.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{request.name}</p>
                                  <p className="text-xs text-muted-foreground">{request.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8 p-0"
                                  onClick={() => handleRejectRequest(request.id, request.name)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:bg-green-600 hover:text-white h-8 w-8 p-0"
                                  onClick={() => handleApproveRequest(request.id, request.name)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            Nenhuma solicitação pendente no momento
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Members Section */}
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-primary" />
                  Membros da Equipe ({members.length})
                </h2>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-auto">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {members.map((member) => (
                    <Card key={member.id} className="group relative border-0 shadow-md hover:shadow-lg transition-all">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <Avatar className="h-16 w-16 mb-3">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-sm flex items-center gap-1.5 truncate max-w-full">
                          {member.name}
                          {member.id === team?.admin_id && (
                            <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-full mt-0.5">
                          {member.email}
                        </p>
                        {member.id === team?.admin_id && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full mt-2 font-medium">
                            Administrador
                          </span>
                        )}
                        {isTeamAdmin && member.id !== team?.admin_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                          >
                            <UserMinus className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-2">
                  {displayedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-all hover:border-primary/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {member.id === team?.admin_id && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                      {isTeamAdmin && member.id !== team?.admin_id && (
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

                  {/* Pagination for list view */}
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}

              {members.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <UsersRound className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum membro na equipe</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

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
