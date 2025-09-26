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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
      
      {/* Left side - Marketing content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <CreatorLogo className="mb-8" />
          <h1 className="text-4xl font-bold text-foreground mb-6 leading-tight">
            Crie Mais.<br />
            Pense Menos.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Transforme suas ideias em conteúdo<br />
            profissional com inteligência artificial
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Criação Inteligente</h3>
                <p className="text-muted-foreground">Gere conteúdo otimizado em segundos com IA avançada</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-secondary rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Revisão Automática</h3>
                <p className="text-muted-foreground">Melhore e refine seu conteúdo automaticamente</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-accent rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Planejamento Estratégico</h3>
                <p className="text-muted-foreground">Organize campanhas com calendário inteligente</p>
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
              <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta</h1>
              <p className="text-muted-foreground">Entre na sua conta para continuar</p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Entrar na conta</h2>
              <p className="text-muted-foreground">Acesse sua plataforma de criação</p>
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
                className="h-12 border-border/50 hover:bg-accent/5 transition-colors"
              >
                <Chrome className="w-5 h-5 mr-2" />
                Google
              </Button>
              <Button 
                variant="outline" 
                className="h-12 border-border/50 hover:bg-accent/5 transition-colors"
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