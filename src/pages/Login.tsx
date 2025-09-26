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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <CreatorLogo className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Crie Mais. Pense Menos.</h1>
            <p className="text-muted-foreground">Transforme suas ideias em conteúdo com IA</p>
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
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
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
                  className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
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
  );
};

export default Login;