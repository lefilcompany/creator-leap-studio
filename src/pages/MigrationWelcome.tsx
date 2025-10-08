import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Mail, Lock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export default function MigrationWelcome() {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        toast.error("Usuário não encontrado");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email de recuperação reenviado com sucesso!");
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast.error("Erro ao reenviar email: " + error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Bem-vindo ao Novo Sistema!</CardTitle>
          <CardDescription className="text-base">
            Atualizamos nossa plataforma para melhor atendê-lo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Migração Concluída:</strong> Seus dados foram transferidos com segurança para nossa nova infraestrutura.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Como Acessar Sua Conta
            </h3>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <p>
                  <strong>Verifique seu email:</strong> Enviamos um link de recuperação de senha para o email cadastrado.
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <p>
                  <strong>Crie sua nova senha:</strong> Clique no link recebido e defina uma nova senha segura.
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <p>
                  <strong>Faça login:</strong> Use seu email e a nova senha para acessar a plataforma.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm">
              <strong>Seus dados estão seguros:</strong> Todas as suas marcas, personas e temas estratégicos foram preservados.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm">Perguntas Frequentes</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <details className="group">
                <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
                  Não recebi o email de recuperação
                </summary>
                <p className="mt-2 pl-4">
                  Verifique sua caixa de spam ou lixo eletrônico. Se não encontrar, use o botão abaixo para reenviar.
                </p>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
                  Quanto tempo o link é válido?
                </summary>
                <p className="mt-2 pl-4">
                  O link de recuperação é válido por 24 horas. Após esse período, solicite um novo envio.
                </p>
              </details>
              
              <details className="group">
                <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
                  Preciso de ajuda adicional
                </summary>
                <p className="mt-2 pl-4">
                  Entre em contato com nosso suporte através do email suporte@creator.com.br
                </p>
              </details>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => navigate("/login")} 
              className="flex-1"
            >
              Ir para Login
            </Button>
            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
              className="flex-1"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Reenviar Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}