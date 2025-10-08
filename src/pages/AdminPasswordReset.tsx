import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Users, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPasswordReset() {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSendResetEmails = async () => {
    setIsSending(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-migration-password-reset");

      if (error) throw error;

      setResults(data);
      
      if (data.success) {
        toast.success(`${data.results.success} emails enviados com sucesso!`);
      } else {
        toast.error("Erro ao enviar emails");
      }
    } catch (error: any) {
      console.error("Error sending reset emails:", error);
      toast.error("Erro ao enviar emails: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Envio em Massa - Recuperação de Senha
              </CardTitle>
              <CardDescription className="mt-2">
                Envie emails de recuperação para todos os usuários migrados
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Voltar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Atenção:</strong> Esta ação enviará emails de recuperação de senha para todos os usuários 
              que foram migrados e ainda não receberam o link de reset.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold">O que acontecerá:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>O sistema buscará todos os usuários marcados como migrados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Será gerado um link seguro de recuperação de senha para cada usuário</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>O email será enviado automaticamente através do sistema de autenticação</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>O sistema registrará o envio para evitar duplicações</span>
              </li>
            </ul>
          </div>

          {results && (
            <Alert className={results.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {results.message}
                  </p>
                  {results.results && (
                    <div className="text-sm space-y-1">
                      <p>Total de usuários: {results.results.total}</p>
                      <p className="text-green-600">✓ Enviados com sucesso: {results.results.success}</p>
                      {results.results.failed > 0 && (
                        <p className="text-red-600">✗ Falhas: {results.results.failed}</p>
                      )}
                      {results.results.errors && results.results.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">Ver erros</summary>
                          <ul className="mt-2 space-y-1 pl-4">
                            {results.results.errors.map((error: string, index: number) => (
                              <li key={index} className="text-xs text-red-600">
                                {error}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSendResetEmails}
              disabled={isSending}
              className="flex-1"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando emails...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Emails de Recuperação
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            💡 Dica: Os usuários receberão um email com instruções para criar uma nova senha. 
            O link será válido por 24 horas.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}