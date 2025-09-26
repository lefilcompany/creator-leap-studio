import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, ArrowRight, Shield, Zap, Users } from "lucide-react";

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
    <div className="min-h-screen flex lg:flex-row flex-col">
      {/* Left side - Hero content */}
      <div className="flex-1 bg-gradient-to-br from-primary via-secondary to-accent flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white/5 rounded-2xl rotate-45 animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-accent/20 rounded-full blur-lg animate-pulse delay-500"></div>
        </div>
        
        {/* Logo at top */}
        <div className="absolute top-8 left-8">
          <CreatorLogo size="large" className="text-white" />
        </div>

        {/* Hero content */}
        <div className="max-w-lg text-center text-white z-10 space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Transforme ideias em{" "}
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                realidade
              </span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Crie, planeje e transforme conteúdos com autonomia e estratégia usando o poder da inteligência artificial.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4 mt-12">
            {[
              { icon: <Zap className="w-5 h-5" />, text: "Criação Instantânea" },
              { icon: <Shield className="w-5 h-5" />, text: "100% Seguro" },
              { icon: <Users className="w-5 h-5" />, text: "Colaboração em Equipe" }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  {feature.icon}
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating dashboard preview */}
        <div className="absolute bottom-8 right-8 w-72 h-44 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-lg shadow-2xl hidden lg:block">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-white/30 to-white/10 rounded-lg"></div>
              <div className="h-3 bg-white/30 rounded-full flex-1"></div>
            </div>
            <div className="space-y-3">
              <div className="h-2 bg-white/25 rounded-full"></div>
              <div className="h-2 bg-white/20 rounded-full w-4/5"></div>
              <div className="h-2 bg-white/15 rounded-full w-3/5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:max-w-md xl:max-w-lg flex flex-col justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Entre na sua conta para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground">
                  Lembrar de mim
                </Label>
              </div>
              <a href="#" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Esqueceu a senha?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-medium text-base group transition-all duration-200"
            >
              Entrar
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Register link */}
          <div className="text-center">
            <span className="text-muted-foreground">Ainda não tem uma conta? </span>
            <a href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Criar conta gratuita
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;