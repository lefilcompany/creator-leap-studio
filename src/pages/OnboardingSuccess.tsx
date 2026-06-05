import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CheckCircle, Loader2, ArrowRight, Sparkles, Zap } from "lucide-react";
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

  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <CreatorLogo />
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-card rounded-2xl shadow-lg border border-border/50 p-6 lg:p-8 flex flex-col gap-6"
        >
          {/* Status icon + title */}
          <div className="text-center flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              {isVerifying ? (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center relative shadow-sm">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <Sparkles className="h-4 w-4 text-primary absolute -top-1.5 -right-1.5 animate-pulse" />
                </div>
              ) : verificationSuccess ? (
                <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
                  <Loader2 className="h-7 w-7 text-amber-600 animate-spin" />
                </div>
              )}
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isVerifying && "Verificando Pagamento..."}
                {!isVerifying && verificationSuccess && "Pagamento Confirmado!"}
                {!isVerifying && !verificationSuccess && "Processando..."}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isVerifying && "Aguarde enquanto confirmamos seu pagamento"}
                {!isVerifying && verificationSuccess && "Bem-vindo ao Creator!"}
                {!isVerifying && !verificationSuccess && "Seu pagamento está sendo processado"}
              </p>
            </div>
          </div>

          {/* Credits inner card */}
          {verificationSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-muted/40 rounded-xl p-5 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Seus créditos</span>
              </div>
              {creditsAdded > 0 && (
                <p className="text-sm text-green-600/80 dark:text-green-400/80 mb-1">
                  +{creditsAdded} créditos adicionados
                </p>
              )}
              <p className="text-4xl font-bold text-primary">
                {newBalance}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                créditos disponíveis
              </p>
            </motion.div>
          )}

          {/* Actions */}
          {!isVerifying && (
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/dashboard', { replace: true })} 
                className="w-full h-11"
                size="lg"
              >
                Ir para o Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {verificationSuccess 
                  ? 'Redirecionando automaticamente em 3 segundos...'
                  : 'Clique acima para continuar'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
