import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle, ArrowRight, Sparkles } from "lucide-react";
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
        // Fallback: verificar perfil diretamente
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
          
          // Auto-redirect após 3 segundos
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

        // Aguardar processamento
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-lg shadow-xl border-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold">
              {isVerifying ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <span>Verificando...</span>
                </div>
              ) : verificationStatus === 'success' ? (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <span className="text-green-600">Pagamento Confirmado!</span>
                </motion.div>
              ) : verificationStatus === 'error' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <span className="text-red-600">Erro na Verificação</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
                  <span className="text-amber-600">Processando...</span>
                </div>
              )}
            </CardTitle>
            <CardDescription className="text-lg mt-4">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {verificationStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
              >
                {creditsAdded > 0 && (
                  <p className="text-lg text-green-600/80 dark:text-green-400/80 mb-2">
                    +{creditsAdded} créditos adicionados
                  </p>
                )}
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {newBalance} créditos
                </p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                  disponíveis agora
                </p>
              </motion.div>
            )}
            
            {!isVerifying && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {verificationStatus === 'success' 
                    ? 'Redirecionando para o dashboard em 3 segundos...'
                    : 'Clique abaixo para continuar'}
                </p>
                
                <Button 
                  onClick={() => navigate('/dashboard', { replace: true })} 
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                {verificationStatus !== 'success' && (
                  <Button 
                    onClick={() => navigate('/credits')} 
                    variant="outline"
                    className="w-full"
                  >
                    Ver Créditos
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
