import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

const OnboardingCanceled = () => {
  const navigate = useNavigate();

  const handleBackToOnboarding = () => {
    navigate('/onboarding');
  };

  const handleGoToLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <CreatorLogo />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            
            <CardTitle>Pagamento Cancelado</CardTitle>
            <CardDescription>
              Você cancelou o processo de pagamento
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">ℹ️ O que aconteceu:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>O pagamento não foi processado</li>
                <li>Sua equipe permanece com o plano FREE</li>
                <li>Você ainda tem os 20 créditos de boas-vindas</li>
                <li>Você pode tentar novamente a qualquer momento</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleBackToOnboarding} 
                className="w-full"
                variant="default"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
              
              <Button 
                onClick={handleGoToLogin} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir para Login
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-muted-foreground">
                Você pode fazer upgrade do seu plano a qualquer momento através do menu "Planos" após fazer login.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingCanceled;
