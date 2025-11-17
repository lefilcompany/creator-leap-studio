import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CreateTeamDialog } from "@/components/auth/CreateTeamDialog";
import { PlanSelector } from "@/components/subscription/PlanSelector";
import { Loader2, AlertTriangle, CheckCircle, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function Subscribe() {
  const { user, team, isLoading: authLoading, reloadUserData } = useAuth();
  const navigate = useNavigate();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [currentStep, setCurrentStep] = useState<'auth' | 'team' | 'plan'>('auth');

  // Determinar o passo atual baseado no estado da autenticação
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCurrentStep('auth');
    } else if (!team) {
      setCurrentStep('team');
      setShowCreateTeam(true);
    } else {
      setCurrentStep('plan');
    }
  }, [user, team, authLoading]);

  // Verificar se usuário é admin da equipe
  const isAdmin = user && team && team.admin_id === user.id;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Caso 1: Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo ao Creator
            </h1>
            <p className="text-muted-foreground">
              Para assinar um plano, você precisa ter uma conta.
            </p>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Começar Agora</CardTitle>
              <CardDescription>
                Escolha uma opção para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full h-12 text-base"
                onClick={() => navigate(`/register?returnUrl=/subscribe`)}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Criar Nova Conta
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    ou
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => navigate(`/login?returnUrl=/subscribe`)}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Já Tenho Conta
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Caso 2: Usuário autenticado mas sem equipe
  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight">
              Criar Sua Equipe
            </h1>
            <p className="text-muted-foreground">
              Para assinar um plano, você precisa criar uma equipe primeiro.
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Mais Um Passo</AlertTitle>
            <AlertDescription>
              Crie sua equipe para gerenciar créditos, membros e conteúdos de forma organizada.
            </AlertDescription>
          </Alert>
        </motion.div>

        <CreateTeamDialog
          open={showCreateTeam}
          onClose={() => {
            setShowCreateTeam(false);
            navigate('/dashboard');
          }}
          onSuccess={async () => {
            await reloadUserData();
            setShowCreateTeam(false);
            setCurrentStep('plan');
          }}
          context="onboarding"
        />
      </div>
    );
  }

  // Caso 3: Usuário tem equipe mas não é admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Restrito</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Apenas o administrador da equipe pode assinar planos.
              </p>
              <p className="text-sm">
                Entre em contato com o administrador da sua equipe para fazer upgrade.
              </p>
            </AlertDescription>
          </Alert>

          <Button
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Ir para o Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  // Caso 4: Equipe já tem plano ativo
  if (team.subscription_status === 'active' && team.plan.id !== 'free') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Plano Ativo</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Sua equipe já possui o plano {team.plan.name} ativo.
              </p>
              <Button
                className="w-full mt-4"
                onClick={() => navigate('/plans')}
              >
                Ver Meu Plano
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Ir para o Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  // Caso 5: Usuário autenticado, tem equipe, é admin - mostrar seleção de planos
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-4xl font-bold tracking-tight">
              Escolha Seu Plano
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Selecione o plano ideal para sua equipe e comece a criar conteúdo incrível.
            </p>
          </div>

          <PlanSelector
            onCheckoutComplete={() => {
              navigate('/dashboard?payment_success=true');
            }}
            showCurrentPlan={false}
          />
        </motion.div>
      </div>
    </div>
  );
}
