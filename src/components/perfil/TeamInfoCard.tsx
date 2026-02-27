import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, Activity, LogOut, Shield, History } from 'lucide-react';
import LeaveTeamDialog from './LeaveTeamDialog';
import { useNavigate } from 'react-router-dom';

interface TeamInfoCardProps {
  team: any;
  userRole: 'admin' | 'member';
  // Créditos individuais do usuário (opcional para exibição)
  userCredits?: number;
  userMaxCredits?: number;
  userPlanCredits?: number;
}

export default function TeamInfoCard({ team, userRole, userCredits, userMaxCredits, userPlanCredits }: TeamInfoCardProps) {
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const navigate = useNavigate();

  if (!team) {
    return (
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-secondary/[0.02] to-accent/[0.03] backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-secondary/8 via-accent/5 to-primary/8 border-b border-secondary/10 p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative p-2 sm:p-3 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl shadow-md">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-secondary relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent mb-2 truncate">
                Informações da Equipe
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Você não está em uma equipe
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Usar créditos do usuário individual (passados via props) ou fallback para team
  const remainingCredits = userCredits ?? team.credits ?? 0;
  const totalCredits = Math.max(userMaxCredits ?? userPlanCredits ?? team.plan?.credits ?? 0, remainingCredits);
  const usedCredits = Math.max(0, totalCredits - remainingCredits);
  
  // Progress bar decrescente - mostra créditos restantes
  const progressPercentage = totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0;

  return (
    <>
      <Card className="h-full group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-secondary/[0.02] to-accent/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <CardHeader className="relative bg-gradient-to-r from-secondary/8 via-accent/5 to-primary/8 border-b border-secondary/10 p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative p-2 sm:p-3 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
              <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-secondary relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent mb-2 truncate">
                Informações da Equipe
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Dados da sua equipe e função
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 md:px-8 md:py-6 lg:py-5 relative">
          {/* Team Name Section */}
          <div className="group/section space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-secondary/15 to-accent/15 rounded-xl shadow-sm group-hover/section:shadow-md group-hover/section:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent opacity-0 group-hover/section:opacity-10 rounded-xl transition-opacity duration-300" />
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary relative z-10" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</span>
                  <p className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent mt-1 truncate">
                    {team.name}
                  </p>
                </div>
              </div>
            </div>
            
            {userRole !== 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="group/btn w-full sm:w-auto h-10 bg-gradient-to-r from-destructive/5 to-destructive/10 border-2 border-destructive/30 hover:border-destructive/60 hover:bg-gradient-to-r hover:from-destructive/15 hover:to-destructive/20 text-destructive font-semibold rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                <span>Sair da Equipe</span>
              </Button>
            )}
          </div>

          {/* Role Section */}
          <div className="group/section space-y-3 border-t border-secondary/10 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative p-2 bg-gradient-to-br from-primary/15 to-accent/15 rounded-lg shadow-sm group-hover/section:shadow-md transition-all duration-300">
                  {userRole === 'admin' ? (
                    <Crown className="h-4 w-4 text-primary relative z-10" />
                  ) : (
                    <Shield className="h-4 w-4 text-accent relative z-10" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Função</span>
                </div>
              </div>
              
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                userRole === 'admin' 
                  ? 'bg-primary/10 border-primary/30 text-primary' 
                  : 'bg-accent/10 border-accent/30 text-accent'
              }`}>
                {userRole === 'admin' ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                <span className="text-sm font-semibold">
                  {userRole === 'admin' ? 'Administrador' : 'Membro'}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pl-8">
              {userRole === 'admin' 
                ? 'Controle total sobre a equipe e configurações' 
                : 'Acesso aos projetos e recursos da equipe'}
            </p>
          </div>

          {/* Credits Section */}
          <div className="group/section space-y-5 border-t border-secondary/10 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative p-2.5 bg-gradient-to-br from-accent/15 to-primary/15 rounded-xl shadow-sm group-hover/section:shadow-md group-hover/section:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary opacity-0 group-hover/section:opacity-10 rounded-xl transition-opacity duration-300" />
                  <Activity className="h-5 w-5 text-accent relative z-10" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Créditos</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Credit Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4 backdrop-blur-sm">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Disponíveis</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      {remainingCredits.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="relative overflow-hidden rounded-xl border border-muted bg-gradient-to-br from-muted/20 to-muted/5 p-4 backdrop-blur-sm">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-muted/20 rounded-full blur-2xl" />
                  <div className="relative">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Utilizados</p>
                    <p className="text-3xl font-bold text-foreground">
                      {usedCredits.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Progress 
                    value={progressPercentage} 
                    className="h-3 rounded-full shadow-inner bg-muted/50 overflow-hidden" 
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent/5 to-primary/5 pointer-events-none" />
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent to-primary" />
                    <span className="font-medium text-foreground">
                      {progressPercentage.toFixed(1)}% disponível
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <span className="text-muted-foreground">
                      {(100 - progressPercentage).toFixed(1)}% usado
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-center text-muted-foreground pt-1">
                  Total do plano: <span className="font-semibold text-foreground">{totalCredits.toLocaleString()}</span> créditos
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/credit-history")}
                className="w-full gap-2 mt-1 hover:bg-accent/10 hover:border-accent transition-all duration-300"
              >
                <History className="h-4 w-4" />
                Ver Histórico Completo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LeaveTeamDialog
        open={isLeaveDialogOpen}
        onOpenChange={setIsLeaveDialogOpen}
        teamName={team.name}
      />
    </>
  );
}
