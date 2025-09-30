import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, Activity } from 'lucide-react';
import LeaveTeamDialog from './LeaveTeamDialog';

interface TeamInfoCardProps {
  team: any;
  userRole: 'admin' | 'member';
}

export default function TeamInfoCard({ team, userRole }: TeamInfoCardProps) {
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  if (!team) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="bg-secondary/10 text-secondary rounded-lg p-2">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Informações da Equipe</CardTitle>
              <CardDescription>Você não está em uma equipe</CardDescription>
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
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 rounded-t-xl pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-secondary/10 text-secondary rounded-lg p-2">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Informações da Equipe</CardTitle>
                <CardDescription>Dados da sua equipe e função</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Team Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-secondary/10 text-secondary rounded-lg p-2">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Equipe</span>
            </div>
            <p className="text-lg font-semibold">{team.name}</p>
            {userRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setIsLeaveDialogOpen(true)}
              >
                Sair da equipe
              </Button>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 rounded-lg p-2">
                <Crown className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Função</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-500 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="text-lg font-bold">Administrador</span>
            </div>
            <p className="text-sm text-muted-foreground">Controle total sobre a equipe</p>
          </div>

          {/* Remaining Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-500 rounded-lg p-2">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Ações Restantes</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{remainingCredits.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">de {totalCredits.toLocaleString()} disponíveis</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground">{usedCredits} ações utilizadas</p>
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
