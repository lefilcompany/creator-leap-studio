import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, Activity, LogOut, Shield } from 'lucide-react';
import LeaveTeamDialog from './LeaveTeamDialog';

interface TeamInfoCardProps {
  team: any;
  userRole: 'admin' | 'member';
}

export default function TeamInfoCard({ team, userRole }: TeamInfoCardProps) {
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  if (!team) {
    return (
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-secondary/[0.02] to-accent/[0.03] backdrop-blur-sm">
        <CardHeader className="relative bg-gradient-to-r from-secondary/8 via-accent/5 to-primary/8 border-b border-secondary/10 p-8">
          <div className="flex items-start gap-4">
            <div className="relative p-3 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl shadow-md">
              <Users className="h-7 w-7 text-secondary relative z-10" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent mb-2">
                Informações da Equipe
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm md:text-base">
                Você não está em uma equipe
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const totalCredits = team.plan?.quickContentCreations || 30000;
  const usedCredits = 338;
  const remainingCredits = totalCredits - usedCredits;
  const progressPercentage = (usedCredits / totalCredits) * 100;

  return (
    <>
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-secondary/[0.02] to-accent/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <CardHeader className="relative bg-gradient-to-r from-secondary/8 via-accent/5 to-primary/8 border-b border-secondary/10 p-8">
          <div className="flex items-start gap-4">
            <div className="relative p-3 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-2xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
              <Users className="h-7 w-7 text-secondary relative z-10" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent mb-2">
                Informações da Equipe
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm md:text-base">
                Dados da sua equipe e função
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-8 relative">
          {/* Team Name Section */}
          <div className="group/section space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative p-2.5 bg-gradient-to-br from-secondary/15 to-accent/15 rounded-xl shadow-sm group-hover/section:shadow-md group-hover/section:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent opacity-0 group-hover/section:opacity-10 rounded-xl transition-opacity duration-300" />
                  <Users className="h-5 w-5 text-secondary relative z-10" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe</span>
                  <p className="text-xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent mt-1">
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
          <div className="group/section space-y-4 border-t border-secondary/10 pt-6">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl shadow-sm group-hover/section:shadow-md group-hover/section:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 opacity-0 group-hover/section:opacity-10 rounded-xl transition-opacity duration-300" />
                {userRole === 'admin' ? (
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-500 relative z-10" />
                ) : (
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500 relative z-10" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Função</span>
              </div>
            </div>
            
            <div className="relative">
              <div className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
                userRole === 'admin' 
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/10 dark:to-amber-800/20 border-amber-300 dark:border-amber-700' 
                  : 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/20 border-blue-300 dark:border-blue-700'
              }`}>
                {userRole === 'admin' ? (
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                ) : (
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                )}
                <span className={`text-lg font-bold ${
                  userRole === 'admin' 
                    ? 'text-amber-700 dark:text-amber-500' 
                    : 'text-blue-700 dark:text-blue-500'
                }`}>
                  {userRole === 'admin' ? 'Administrador' : 'Membro'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 ml-1">
                {userRole === 'admin' 
                  ? '👑 Controle total sobre a equipe e configurações' 
                  : '🛡️ Acesso aos projetos e recursos da equipe'}
              </p>
            </div>
          </div>

          {/* Remaining Actions Section */}
          <div className="group/section space-y-4 border-t border-secondary/10 pt-6">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl shadow-sm group-hover/section:shadow-md group-hover/section:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 opacity-0 group-hover/section:opacity-10 rounded-xl transition-opacity duration-300" />
                <Activity className="h-5 w-5 text-green-600 dark:text-green-500 relative z-10" />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações Restantes</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {remainingCredits.toLocaleString()}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">créditos disponíveis</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-muted-foreground">
                    de {totalCredits.toLocaleString()}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usedCredits} utilizados
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-4 rounded-full shadow-inner bg-muted/50" 
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none" />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600 dark:text-green-500 font-medium">
                  ⚡ {progressPercentage.toFixed(1)}% utilizado
                </span>
                <span className="text-muted-foreground">
                  {(100 - progressPercentage).toFixed(1)}% restante
                </span>
              </div>
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
