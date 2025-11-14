import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  Search, 
  Filter, 
  TrendingUp, 
  Activity, 
  Zap, 
  FileText, 
  CheckCircle, 
  Lightbulb, 
  Loader2, 
  Users, 
  Video,
  ChevronDown 
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

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

  const filteredAndSortedStats = useMemo(() => {
    return memberStats
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
  }, [memberStats, searchTerm, actionTypeFilter, sortBy]);

  const totalTeamActions = useMemo(() => memberStats.reduce((sum, member) => sum + member.totalActions, 0), [memberStats]);
  const activeMembers = useMemo(() => memberStats.filter(m => m.totalActions > 0).length, [memberStats]);

  const actionTypeData = useMemo(() => [
    { name: 'Criação Rápida', value: memberStats.reduce((sum, m) => sum + m.quickContent, 0), color: 'hsl(var(--primary))' },
    { name: 'Criar Conteúdo', value: memberStats.reduce((sum, m) => sum + m.createContent, 0), color: 'hsl(var(--accent))' },
    { name: 'Revisar', value: memberStats.reduce((sum, m) => sum + m.reviewContent, 0), color: 'hsl(var(--success))' },
    { name: 'Planejar', value: memberStats.reduce((sum, m) => sum + m.planContent, 0), color: 'hsl(var(--secondary))' },
    { name: 'Gerar Vídeo', value: memberStats.reduce((sum, m) => sum + m.videoContent, 0), color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0), [memberStats]);

  const topMembersData = useMemo(() => 
    [...memberStats]
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, 5)
      .map(member => ({
        name: member.name.split(' ')[0],
        total: member.totalActions,
        avatar: member.avatar_url,
      })),
    [memberStats]
  );

  const mostActiveMember = useMemo(() => 
    memberStats.length > 0 ? memberStats.reduce((max, member) => member.totalActions > max.totalActions ? member : max, memberStats[0]) : null,
    [memberStats]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} {payload[0].value === 1 ? 'ação' : 'ações'}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--foreground))" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
    <div className="min-h-full space-y-6 animate-fade-in p-4 md:p-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:scale-105">
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

        <Card className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-background border-2 border-secondary/20 shadow-lg hover:shadow-xl hover:border-secondary/30 transition-all duration-300 hover:scale-105">
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

        <Card className="bg-gradient-to-br from-accent/10 via-accent/5 to-background border-2 border-accent/20 shadow-lg hover:shadow-xl hover:border-accent/30 transition-all duration-300 hover:scale-105">
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

        <Card className="bg-gradient-to-br from-chart-4/10 via-chart-4/5 to-background border-2 border-chart-4/20 shadow-lg hover:shadow-xl hover:border-chart-4/30 transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-chart-4" />
              Mais Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg font-bold text-chart-4 dark:text-chart-4 line-clamp-2 leading-tight">
              {mostActiveMember?.name.split(' ').slice(0, 2).join(' ') || '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {mostActiveMember?.totalActions || 0} ações
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
              <ResponsiveContainer width="100%" height={280} className="md:h-[350px]">
                <PieChart>
                  <Pie
                    data={actionTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius="65%"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {actionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={60}
                    iconType="circle"
                    wrapperStyle={{ 
                      paddingTop: '10px',
                      fontSize: '11px'
                    }}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
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
              <ResponsiveContainer width="100%" height={280} className="md:h-[350px]">
                <BarChart data={topMembersData} layout="horizontal" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="total" 
                    fill="url(#colorTotal)" 
                    radius={[8, 8, 0, 0]}
                    animationBegin={0}
                    animationDuration={800}
                  />
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

      {/* Members Accordion */}
      <Card className="shadow-lg border-2 border-secondary/10 bg-gradient-to-br from-card via-secondary/5 to-background hover:shadow-xl hover:border-secondary/20 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-t-lg">
          <CardTitle className="text-secondary">Estatísticas Detalhadas</CardTitle>
          <CardDescription>Uso individual de cada membro da equipe</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredAndSortedStats.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum membro encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {filteredAndSortedStats.map((member) => (
                <AccordionItem 
                  key={member.id} 
                  value={member.id}
                  className="border-2 border-secondary/10 rounded-lg overflow-hidden hover:border-secondary/30 transition-all duration-300"
                >
                  <AccordionTrigger className="hover:no-underline px-3 md:px-4 py-3 md:py-4 hover:bg-secondary/5 transition-colors duration-200">
                    <div className="flex items-center justify-between w-full pr-2 md:pr-4 gap-2">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <Avatar className="h-9 w-9 md:h-11 md:w-11 ring-2 ring-secondary/20 flex-shrink-0">
                          <AvatarImage src={member.avatar_url} alt={member.name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-sm md:text-base">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-sm md:text-base truncate">{member.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border border-primary/20 text-xs md:text-sm px-2 md:px-2.5 py-0.5 md:py-1 whitespace-nowrap flex-shrink-0">
                        {member.totalActions}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="px-4 pb-4 pt-2"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg border border-yellow-500/20">
                          <Zap className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Criação Rápida</span>
                          <span className="text-lg md:text-xl font-bold text-foreground">{member.quickContent}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                          <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Criar Conteúdo</span>
                          <span className="text-lg md:text-xl font-bold text-foreground">{member.createContent}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                          <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Revisar</span>
                          <span className="text-lg md:text-xl font-bold text-foreground">{member.reviewContent}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
                          <Lightbulb className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Planejar</span>
                          <span className="text-lg md:text-xl font-bold text-foreground">{member.planContent}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-lg border border-pink-500/20">
                          <Video className="h-5 w-5 md:h-6 md:w-6 text-pink-500" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Gerar Vídeo</span>
                          <span className="text-lg md:text-xl font-bold text-foreground">{member.videoContent}</span>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg border border-secondary/20">
                          <Calendar className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center leading-tight">Última Atividade</span>
                          <span className="text-[10px] md:text-xs font-medium text-foreground text-center leading-tight">
                            {member.lastActivity ? (
                              new Date(member.lastActivity).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            ) : (
                              'Sem atividade'
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
