import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CheckCircle, Loader2, ArrowRight, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import planBanner from "@/assets/plan-banner.jpg";

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
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-56 lg:h-72">
        <img
          src={planBanner}
          alt="Pagamento Confirmado"
          className="w-full h-full object-cover object-[center_55%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        
        {/* Logo overlay */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <CreatorLogo />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 pb-12">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-12 relative z-10 bg-card rounded-2xl shadow-lg p-6 lg:p-8 text-center"
        >
          <div className="flex justify-center mb-5">
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

          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {isVerifying && "Verificando Pagamento..."}
            {!isVerifying && verificationSuccess && "Pagamento Confirmado!"}
            {!isVerifying && !verificationSuccess && "Processando..."}
          </h1>
          
          <p className="text-sm lg:text-base text-muted-foreground">
            {isVerifying && "Aguarde enquanto confirmamos seu pagamento"}
            {!isVerifying && verificationSuccess && "Bem-vindo ao Creator!"}
            {!isVerifying && !verificationSuccess && "Seu pagamento está sendo processado"}
          </p>
        </motion.div>

        {/* Credits card */}
        {verificationSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 bg-card rounded-2xl shadow-sm p-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-primary" />
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 bg-card rounded-2xl shadow-sm p-6 space-y-4"
          >
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OnboardingSuccess;
