import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BarChart3, Calendar, Search, Filter, TrendingUp, Activity, Zap, FileText, CheckCircle, Lightbulb, Loader2, Users, Video } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MemberStats {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  totalActions: number;
  quickContent: number;
  createContent: number;
  reviewContent: number;
  planContent: number;
  videoContent: number;
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
    const checkAccess = async () => {
      if (!user || !team) {
        console.log('Aguardando user e team...', { user, team });
        return;
      }

      // Verificar se o usuário é admin da equipe
      const isTeamAdmin = team.admin_id === user.id;
      
      console.log('Verificação de admin:', {
        userId: user.id,
        teamAdminId: team.admin_id,
        isAdmin: user.isAdmin,
        isTeamAdmin
      });

      if (!isTeamAdmin && !user.isAdmin) {
        toast.error('Apenas administradores podem acessar o dashboard');
        navigate('/team');
        return;
      }

      loadMemberStats();
    };

    checkAccess();
  }, [user, team, navigate]);

  const loadMemberStats = async () => {
    if (!team) return;

    setIsLoading(true);
    try {
      // Buscar todos os membros da equipe
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
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
          avatar_url: member.avatar_url,
          totalActions: memberActions.length,
          quickContent: memberActions.filter(a => a.type === 'CRIAR_CONTEUDO_RAPIDO').length,
          createContent: memberActions.filter(a => a.type === 'CRIAR_CONTEUDO').length,
          reviewContent: memberActions.filter(a => a.type === 'REVISAR_CONTEUDO').length,
          planContent: memberActions.filter(a => a.type === 'PLANEJAR_CONTEUDO').length,
          videoContent: memberActions.filter(a => a.type === 'GERAR_VIDEO').length,
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
                        actionTypeFilter === 'video' ? member.videoContent > 0 :
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

  // Dados para gráficos
  const actionTypeData = [
    { name: 'Criação Rápida', value: memberStats.reduce((sum, m) => sum + m.quickContent, 0), color: 'hsl(var(--primary))' },
    { name: 'Criar Conteúdo', value: memberStats.reduce((sum, m) => sum + m.createContent, 0), color: 'hsl(var(--secondary))' },
    { name: 'Revisar', value: memberStats.reduce((sum, m) => sum + m.reviewContent, 0), color: 'hsl(var(--accent))' },
    { name: 'Planejar', value: memberStats.reduce((sum, m) => sum + m.planContent, 0), color: 'hsl(var(--chart-4))' },
    { name: 'Gerar Vídeo', value: memberStats.reduce((sum, m) => sum + m.videoContent, 0), color: 'hsl(var(--chart-5))' },
  ].filter(item => item.value > 0);

  const topMembersData = [...filteredAndSortedStats]
    .sort((a, b) => b.totalActions - a.totalActions)
    .slice(0, 5)
    .map(member => ({
      name: member.name.split(' ')[0],
      total: member.totalActions,
    }));

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/team')}
                className="hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-2xl p-4">
                  <BarChart3 className="h-8 w-8 md:h-10 md:w-10" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Dashboard de Membros
                  </CardTitle>
                  <p className="text-sm md:text-base text-muted-foreground">Acompanhe o uso e atividade dos membros da equipe</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Total de Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{totalTeamActions}</div>
            <p className="text-xs text-muted-foreground mt-2">Todas as atividades</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-background border-2 border-secondary/20 shadow-lg hover:shadow-xl hover:border-secondary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Membros Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-secondary to-secondary/80 bg-clip-text text-transparent">{activeMembers}</div>
            <p className="text-xs text-muted-foreground mt-2">De {memberStats.length} membros</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 via-accent/5 to-background border-2 border-accent/20 shadow-lg hover:shadow-xl hover:border-accent/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Média por Membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
              {memberStats.length > 0 ? Math.round(totalTeamActions / memberStats.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Ações por pessoa</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-4/10 via-chart-4/5 to-background border-2 border-chart-4/20 shadow-lg hover:shadow-xl hover:border-chart-4/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-chart-4" />
              Mais Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-chart-4 to-chart-4/80 bg-clip-text text-transparent truncate">
              {topMembersData[0]?.name || '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {topMembersData[0]?.total || 0} ações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {memberStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actions Distribution Pie Chart */}
          <Card className="shadow-lg border-2 border-primary/10 bg-gradient-to-br from-card via-primary/5 to-background hover:shadow-xl hover:border-primary/20 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Activity className="h-5 w-5" />
                Distribuição de Ações
              </CardTitle>
              <CardDescription>Por tipo de conteúdo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actionTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {actionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Members Bar Chart */}
          <Card className="shadow-lg border-2 border-secondary/10 bg-gradient-to-br from-card via-secondary/5 to-background hover:shadow-xl hover:border-secondary/20 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-secondary">
                <TrendingUp className="h-5 w-5" />
                Top 5 Membros
              </CardTitle>
              <CardDescription>Por total de ações</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topMembersData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-lg border-2 border-accent/10 bg-gradient-to-br from-card via-accent/5 to-background hover:shadow-xl hover:border-accent/20 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-accent">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-accent/20 focus:border-accent/40"
              />
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px] border-accent/20">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="quick">Criação Rápida</SelectItem>
                <SelectItem value="create">Criar Conteúdo</SelectItem>
                <SelectItem value="review">Revisar Conteúdo</SelectItem>
                <SelectItem value="plan">Planejar Conteúdo</SelectItem>
                <SelectItem value="video">Gerar Vídeo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px] border-accent/20">
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
      <Card className="shadow-lg border-2 border-secondary/10 bg-gradient-to-br from-card via-secondary/5 to-background hover:shadow-xl hover:border-secondary/20 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-t-lg">
          <CardTitle className="text-secondary">Estatísticas Detalhadas</CardTitle>
          <CardDescription>Uso individual de cada membro da equipe</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border-2 border-secondary/10 overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-secondary/5 to-accent/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Membro</TableHead>
                  <TableHead className="text-center font-semibold">Total</TableHead>
                  <TableHead className="text-center font-semibold">Criação Rápida</TableHead>
                  <TableHead className="text-center font-semibold">Criar Conteúdo</TableHead>
                  <TableHead className="text-center font-semibold">Revisar</TableHead>
                  <TableHead className="text-center font-semibold">Planejar</TableHead>
                  <TableHead className="text-center font-semibold">Gerar Vídeo</TableHead>
                  <TableHead className="font-semibold">Última Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center">
                          <Users className="h-8 w-8 text-secondary" />
                        </div>
                        <p className="text-muted-foreground font-medium">Nenhum membro encontrado</p>
                        <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedStats.map((member) => (
                    <TableRow key={member.id} className="hover:bg-secondary/5 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 ring-2 ring-secondary/20">
                            <AvatarImage src={member.avatar_url} alt={member.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-base">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center font-bold text-lg px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-full border border-primary/20">
                          {member.totalActions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          {member.quickContent}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <FileText className="h-4 w-4 text-blue-500" />
                          {member.createContent}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {member.reviewContent}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <Lightbulb className="h-4 w-4 text-purple-500" />
                          {member.planContent}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <Video className="h-4 w-4 text-pink-500" />
                          {member.videoContent}
                        </span>
                      </TableCell>
                      <TableCell>
                        {member.lastActivity ? (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4 text-secondary" />
                            {new Date(member.lastActivity).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Sem atividade</span>
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
