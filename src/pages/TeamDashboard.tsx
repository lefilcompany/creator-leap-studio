import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, BarChart3, Calendar, Search, Filter, TrendingUp, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface MemberStats {
  id: string;
  name: string;
  email: string;
  totalActions: number;
  quickContent: number;
  createContent: number;
  reviewContent: number;
  planContent: number;
  lastActivity: string | null;
}

export default function TeamDashboard() {
  const { user, team } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('totalActions');

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Apenas administradores podem acessar o dashboard');
      navigate('/team');
      return;
    }
    loadMemberStats();
  }, [user, team, navigate]);

  const loadMemberStats = async () => {
    if (!team) return;

    setIsLoading(true);
    try {
      // Buscar todos os membros da equipe
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('team_id', team.id);

      if (membersError) throw membersError;

      // Buscar ações de todos os membros
      const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('user_id, type, created_at')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (actionsError) throw actionsError;

      // Processar estatísticas por membro
      const stats: MemberStats[] = (members || []).map(member => {
        const memberActions = actions?.filter(a => a.user_id === member.id) || [];
        
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          totalActions: memberActions.length,
          quickContent: memberActions.filter(a => a.type === 'CRIACAO_RAPIDA').length,
          createContent: memberActions.filter(a => a.type === 'CRIAR_CONTEUDO').length,
          reviewContent: memberActions.filter(a => a.type === 'REVISAR_CONTEUDO').length,
          planContent: memberActions.filter(a => a.type === 'PLANEJAR_CONTEUDO').length,
          lastActivity: memberActions[0]?.created_at || null,
        };
      });

      setMemberStats(stats);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas dos membros');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedStats = memberStats
    .filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (actionTypeFilter === 'all') return matchesSearch;
      
      const hasActions = actionTypeFilter === 'quick' ? member.quickContent > 0 :
                        actionTypeFilter === 'create' ? member.createContent > 0 :
                        actionTypeFilter === 'review' ? member.reviewContent > 0 :
                        actionTypeFilter === 'plan' ? member.planContent > 0 :
                        member.totalActions > 0;
      
      return matchesSearch && hasActions;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'lastActivity') {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      }
      return b.totalActions - a.totalActions;
    });

  const totalTeamActions = memberStats.reduce((sum, member) => sum + member.totalActions, 0);
  const activeMembers = memberStats.filter(m => m.totalActions > 0).length;

  return (
    <div className="min-h-full space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/team')}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">
                    Dashboard de Membros
                  </CardTitle>
                  <p className="text-muted-foreground">Acompanhe o uso e atividade dos membros da equipe</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">{totalTeamActions}</div>
              <Activity className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-secondary">{activeMembers}/{memberStats.length}</div>
              <TrendingUp className="h-8 w-8 text-secondary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média por Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-accent">
                {memberStats.length > 0 ? Math.round(totalTeamActions / memberStats.length) : 0}
              </div>
              <BarChart3 className="h-8 w-8 text-accent/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="quick">Criação Rápida</SelectItem>
                <SelectItem value="create">Criar Conteúdo</SelectItem>
                <SelectItem value="review">Revisar Conteúdo</SelectItem>
                <SelectItem value="plan">Planejar Conteúdo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalActions">Mais ações</SelectItem>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
                <SelectItem value="lastActivity">Última atividade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Detalhadas</CardTitle>
          <CardDescription>Uso individual de cada membro da equipe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Criação Rápida</TableHead>
                  <TableHead className="text-center">Criar Conteúdo</TableHead>
                  <TableHead className="text-center">Revisar</TableHead>
                  <TableHead className="text-center">Planejar</TableHead>
                  <TableHead>Última Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando estatísticas...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum membro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedStats.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{member.totalActions}</TableCell>
                      <TableCell className="text-center">{member.quickContent}</TableCell>
                      <TableCell className="text-center">{member.createContent}</TableCell>
                      <TableCell className="text-center">{member.reviewContent}</TableCell>
                      <TableCell className="text-center">{member.planContent}</TableCell>
                      <TableCell>
                        {member.lastActivity ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(member.lastActivity).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem atividade</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
