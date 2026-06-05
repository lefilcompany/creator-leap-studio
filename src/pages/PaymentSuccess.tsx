import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CheckCircle, Loader2, XCircle, ArrowRight, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUserCredits } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [message, setMessage] = useState('Verificando seu pagamento...');
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        await verifyProfileCredits();
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setVerificationStatus('error');
          setMessage('Sessão expirada. Faça login novamente.');
          setIsVerifying(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        if (error) throw error;

        if (data.success) {
          setVerificationStatus('success');
          setCreditsAdded(data.credits_added || 0);
          setNewBalance(data.new_balance || 0);
          
          await refreshUserCredits();
          
          if (data.already_processed) {
            setMessage('Pagamento já foi processado! Seus créditos estão disponíveis.');
          } else {
            setMessage(`${data.credits_added} créditos adicionados com sucesso!`);
            toast.success(`✅ ${data.credits_added} créditos adicionados!`);
          }
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        } else {
          setVerificationStatus('pending');
          setMessage('Seu pagamento está sendo processado. Aguarde alguns instantes.');
        }
      } catch (error: any) {
        console.error('Erro ao verificar pagamento:', error);
        setVerificationStatus('error');
        setMessage('Erro ao verificar pagamento. Entre em contato com o suporte.');
      } finally {
        setIsVerifying(false);
      }
    };

    const verifyProfileCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setVerificationStatus('error');
          setMessage('Usuário não autenticado');
          setIsVerifying(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single();

        if (profile && (profile.credits || 0) > 0) {
          setVerificationStatus('success');
          setNewBalance(profile.credits || 0);
          setMessage(`Você tem ${profile.credits} créditos disponíveis!`);
          await refreshUserCredits();
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        } else {
          setVerificationStatus('pending');
          setMessage('Processando pagamento... Aguarde alguns instantes.');
        }
      } catch (error) {
        console.error('Erro:', error);
        setVerificationStatus('error');
        setMessage('Erro ao verificar. Tente acessar o dashboard.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, refreshUserCredits]);

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
              ) : verificationStatus === 'success' ? (
                <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              ) : verificationStatus === 'error' ? (
                <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-sm">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
                  <Loader2 className="h-7 w-7 text-amber-600 animate-spin" />
                </div>
              )}
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isVerifying ? 'Verificando...' : 
                 verificationStatus === 'success' ? 'Pagamento Confirmado!' :
                 verificationStatus === 'error' ? 'Erro na Verificação' : 'Processando...'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {message}
              </p>
            </div>
          </div>

          {/* Credits inner card */}
          {verificationStatus === 'success' && (
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
              
              {verificationStatus !== 'success' && (
                <Button 
                  onClick={() => navigate('/credits')} 
                  variant="outline"
                  className="w-full h-11"
                  size="lg"
                >
                  Ver Créditos
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {verificationStatus === 'success' 
                  ? 'Redirecionando automaticamente em 3 segundos...'
                  : 'Clique acima para continuar'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
