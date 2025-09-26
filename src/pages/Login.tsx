import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Chrome, Facebook, Mail, Lock } from "lucide-react";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login - in real app would validate credentials
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
      {/* Background gradient for entire screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>
      
      {/* Left side - Marketing content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-lg">
          <div className="mb-12">
            <CreatorLogo className="mb-8" />
          </div>
          
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              IA para planejar e criar conteúdo estratégico
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Organize sua comunicação em torno de Equipes, Marcas, Temas e Personas
            </p>
          </div>
          
          <div className="space-y-5">
            <div className="flex items-start gap-4 p-5 bg-card/30 backdrop-blur-sm rounded-xl border border-primary/20 transition-all duration-300 hover:bg-card/40 hover:border-primary/30">
              <div className="w-4 h-4 bg-primary rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-base mb-1">Organização Estratégica</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Estruture sua comunicação de forma clara e integrada</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 bg-card/30 backdrop-blur-sm rounded-xl border border-secondary/20 transition-all duration-300 hover:bg-card/40 hover:border-secondary/30">
              <div className="w-4 h-4 bg-secondary rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-base mb-1">Segmentação por Personas</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Conteúdos personalizados para diferentes públicos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 bg-card/30 backdrop-blur-sm rounded-xl border border-accent/20 transition-all duration-300 hover:bg-card/40 hover:border-accent/30">
              <div className="w-4 h-4 bg-accent rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-base mb-1">Campanhas Completas</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Calendários completos, não apenas posts isolados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Mobile header */}
        <div className="lg:hidden absolute top-8 left-8">
          <CreatorLogo />
        </div>

        {/* Login card */}
        <div className="w-full max-w-md">
          <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
            {/* Mobile title */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">Creator</h1>
              <p className="text-muted-foreground">IA para planejar e criar conteúdo estratégico</p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Acesse o Creator</h2>
              <p className="text-muted-foreground">Sua plataforma de marketing estratégico</p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="E-mail"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground hover:bg-accent/60" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground">
                    Lembrar de mim
                  </Label>
                </div>
                <a href="#" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                Entrar
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">ou continue com</span>
              </div>
            </div>

            {/* Social login */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button 
                variant="outline" 
                className="h-12 border-border/50 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-200"
              >
                <Chrome className="w-5 h-5 mr-2" />
                Google
              </Button>
              <Button 
                variant="outline" 
                className="h-12 border-border/50 hover:bg-secondary/5 hover:border-secondary/30 hover:text-secondary transition-all duration-200"
              >
                <Facebook className="w-5 h-5 mr-2" />
                Facebook
              </Button>
            </div>

            {/* Register link */}
            <div className="text-center">
              <span className="text-muted-foreground text-sm">Não tem uma conta? </span>
              <a 
                href="/register" 
                className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                Criar conta
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;