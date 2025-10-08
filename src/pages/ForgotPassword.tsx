import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Mail, ArrowLeft, Sun, Moon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar se o email existe na base de dados
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        console.error('Erro ao verificar email:', profileError);
        toast.error("Erro ao verificar email. Tente novamente.");
        return;
      }

      if (!profile) {
        toast.error("Este email não está cadastrado no sistema. Verifique o email digitado ou crie uma nova conta.");
        return;
      }

      // Se o email existe, enviar o link de recuperação
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setEmailSent(true);
      toast.success("Email de recuperação enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar email de recuperação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
      {/* Theme toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Alternar tema</span>
      </Button>
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>
      
      {/* Center content */}
      <div className="w-full flex items-center justify-center p-8 relative">
        {/* Mobile header */}
        <div className="lg:hidden absolute top-8 left-8">
          <CreatorLogo />
        </div>

        {/* Forgot password card */}
        <div className="w-full max-w-md">
          <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
            {!emailSent ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Recuperar Senha</h2>
                  <p className="text-muted-foreground">
                    Digite o email cadastrado na sua conta para receber o link de recuperação de senha
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email cadastrado na sua conta"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      "Enviar Link de Recuperação"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="text-muted-foreground hover:text-accent hover:bg-accent/20 border hover:border-accent"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Email Enviado!</h2>
                  <p className="text-muted-foreground">
                    Enviamos um link de recuperação para <strong>{email}</strong>
                  </p>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Verifique sua caixa de entrada e spam. O link expira em 1 hora.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="w-full h-12"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
