import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen flex">
      {/* Left side - Hero content */}
      <div className="flex-1 bg-creator-gradient flex flex-col justify-center items-center p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-2xl rotate-12"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-white/5 rounded-full"></div>
        
        {/* Hero content */}
        <div className="max-w-md text-center text-white z-10">
          <h1 className="text-4xl font-bold mb-4">
            Aqui, suas ideias ganham forma com a força da inteligência artificial.
          </h1>
          <p className="text-lg text-white/90">
            Crie, planeje e transforme conteúdos com autonomia e estratégia.
          </p>
        </div>

        {/* Mockup dashboard preview */}
        <div className="absolute top-8 right-8 w-80 h-52 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-white/30 rounded"></div>
              <div className="h-2 bg-white/30 rounded flex-1"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-white/20 rounded"></div>
              <div className="h-3 bg-white/15 rounded w-3/4"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full max-w-md flex flex-col justify-center p-8 bg-white">
        <div className="mb-8">
          <CreatorLogo className="text-primary mb-8" />
          <h2 className="text-2xl font-semibold mb-2">Acesse sua Conta</h2>
          <p className="text-muted-foreground">Bem-vindo de volta! Por favor, insira seus dados</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm">Mantenha-me conectado</Label>
            </div>
            <a href="#" className="text-sm text-primary hover:underline">
              Esqueceu a senha?
            </a>
          </div>

          <Button type="submit" className="w-full creator-button-primary">
            LOGIN
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <a href="/register" className="text-primary hover:underline font-medium">
            Registre-se
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;