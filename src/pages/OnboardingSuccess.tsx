import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CheckCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const OnboardingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUserCredits } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        toast.error("Session ID não encontrado");
        setIsVerifying(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`,
          } : undefined
        });

        if (error) throw error;

        if (data?.success) {
          setVerificationSuccess(true);
          setCreditsAdded(data.credits_added || 0);
          setNewBalance(data.new_balance || 0);
          
          await refreshUserCredits();
          
          if (data.already_processed) {
            toast.info("Pagamento já foi processado!");
          } else {
            toast.success(`✅ ${data.credits_added} créditos adicionados!`);
          }

          // Redirecionar para dashboard após 3 segundos
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        } else {
          toast.error("Pagamento não confirmado: " + (data?.payment_status || 'desconhecido'));
        }
      } catch (error: any) {
        console.error("Erro na verificação:", error);
        toast.error("Erro ao verificar pagamento");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, refreshUserCredits]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex justify-center">
          <CreatorLogo />
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isVerifying ? (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
              ) : verificationSuccess ? (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                >
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </motion.div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {isVerifying && "Verificando Pagamento..."}
              {!isVerifying && verificationSuccess && "Pagamento Confirmado!"}
              {!isVerifying && !verificationSuccess && "Processando..."}
            </CardTitle>
            
            <CardDescription className="text-base">
              {isVerifying && "Aguarde enquanto confirmamos seu pagamento"}
              {!isVerifying && verificationSuccess && "Bem-vindo ao Creator!"}
              {!isVerifying && !verificationSuccess && "Seu pagamento está sendo processado"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {verificationSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
              >
                {creditsAdded > 0 && (
                  <p className="text-sm text-green-600/80 mb-1">
                    +{creditsAdded} créditos adicionados
                  </p>
                )}
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {newBalance} créditos
                </p>
                <p className="text-sm text-green-600/80 mt-1">
                  disponíveis para usar
                </p>
              </motion.div>
            )}

            {!isVerifying && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {verificationSuccess 
                    ? 'Redirecionando para o dashboard...'
                    : 'Clique abaixo para continuar'}
                </p>
                
                <Button 
                  onClick={() => navigate('/dashboard', { replace: true })} 
                  className="w-full h-12"
                  size="lg"
                >
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OnboardingSuccess;
