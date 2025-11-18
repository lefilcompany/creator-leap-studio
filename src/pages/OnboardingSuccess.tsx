import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OnboardingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        toast.error("Session ID não encontrado");
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Verificando pagamento com session_id:", sessionId);
        
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId }
        });

        if (error) {
          console.error("Erro ao verificar pagamento:", error);
          throw error;
        }

        console.log("Resposta verify-payment:", data);

        if (data?.success) {
          setVerificationSuccess(true);
          
          if (data.already_processed) {
            toast.info("Pagamento já foi processado anteriormente");
          } else {
            toast.success("Pagamento confirmado! Seu plano foi ativado.");
          }

          // Iniciar countdown de 5 segundos
          let timeLeft = 5;
          const countdownInterval = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            
            if (timeLeft <= 0) {
              clearInterval(countdownInterval);
              
              // Redirecionar baseado no modo de onboarding
              const onboardingMode = sessionStorage.getItem('onboarding_mode');
              const redirectTo = onboardingMode === 'existing' ? '/dashboard' : '/';
              sessionStorage.removeItem('onboarding_mode');
              
              navigate(redirectTo);
            }
          }, 1000);

          return () => clearInterval(countdownInterval);
        } else {
          toast.error("Pagamento não foi confirmado. Status: " + (data?.payment_status || 'desconhecido'));
        }
      } catch (error: any) {
        console.error("Erro na verificação:", error);
        toast.error("Erro ao verificar pagamento: " + (error.message || "Erro desconhecido"));
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleGoToLogin = () => {
    const onboardingMode = sessionStorage.getItem('onboarding_mode');
    const redirectTo = onboardingMode === 'existing' ? '/dashboard' : '/';
    sessionStorage.removeItem('onboarding_mode');
    navigate(redirectTo);
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
              {isVerifying ? (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : verificationSuccess ? (
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            
            <CardTitle>
              {isVerifying && "Verificando Pagamento..."}
              {!isVerifying && verificationSuccess && "Pagamento Confirmado!"}
              {!isVerifying && !verificationSuccess && "Erro na Verificação"}
            </CardTitle>
            
            <CardDescription>
              {isVerifying && "Aguarde enquanto confirmamos seu pagamento"}
              {!isVerifying && verificationSuccess && "Seu plano foi ativado com sucesso"}
              {!isVerifying && !verificationSuccess && "Não foi possível confirmar o pagamento"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {verificationSuccess && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">✅ O que aconteceu:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Pagamento confirmado pelo Stripe</li>
                  <li>Créditos adicionados à sua equipe</li>
                  <li>Plano atualizado com sucesso</li>
                  <li>Assinatura ativada</li>
                </ul>
              </div>
            )}

            {verificationSuccess && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Redirecionando para login em {countdown} segundo{countdown !== 1 ? 's' : ''}...
                </p>
                <Button onClick={handleGoToLogin} className="w-full">
                  Ir para Login Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {!isVerifying && !verificationSuccess && (
              <div className="space-y-4">
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <p className="text-sm text-destructive">
                    Não conseguimos confirmar seu pagamento automaticamente. Entre em contato com o suporte se o pagamento foi realizado.
                  </p>
                </div>
                <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                  Voltar para Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
