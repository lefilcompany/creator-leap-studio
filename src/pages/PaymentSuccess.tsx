import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [message, setMessage] = useState('Verificando seu pagamento...');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setVerificationStatus('error');
          setMessage('Usuário não autenticado');
          return;
        }

        // Aguardar alguns segundos para o webhook do Stripe processar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verificar se os créditos foram adicionados ao perfil do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits, plan_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCredits(profile.credits || 0);
          if ((profile.credits || 0) > 0) {
            setVerificationStatus('success');
            setMessage(`Pagamento confirmado! Você tem ${profile.credits} créditos disponíveis.`);
            toast.success('Créditos adicionados com sucesso!');
          } else {
            setVerificationStatus('pending');
            setMessage('Seu pagamento está sendo processado. Você receberá uma notificação quando os créditos forem adicionados.');
          }
        } else {
          setVerificationStatus('error');
          setMessage('Erro ao verificar perfil. Entre em contato com o suporte.');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        setVerificationStatus('error');
        setMessage('Erro ao verificar pagamento. Entre em contato com o suporte.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold">
            {isVerifying ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span>Verificando...</span>
              </div>
            ) : verificationStatus === 'success' ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
                <span className="text-green-600">Pagamento Confirmado!</span>
              </div>
            ) : verificationStatus === 'error' ? (
              <div className="flex flex-col items-center gap-3">
                <XCircle className="h-16 w-16 text-red-600" />
                <span className="text-red-600">Erro na Verificação</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
                <span className="text-yellow-600">Processando...</span>
              </div>
            )}
          </CardTitle>
          <CardDescription className="text-lg mt-4">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {credits} créditos
              </p>
              <p className="text-sm text-green-600/80 dark:text-green-400/80">
                disponíveis agora
              </p>
            </div>
          )}
          
          {!isVerifying && (
            <>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full"
                  size="lg"
                >
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  onClick={() => navigate('/historico')} 
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Ver Histórico
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Se você não vir seus créditos imediatamente, aguarde alguns minutos. 
                O processamento pode levar até 5 minutos.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
