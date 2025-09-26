import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, MapPin, Lock } from "lucide-react";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    state: "",
    city: "",
    termsAccepted: false
  });
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate registration - in real app would create account
    navigate("/dashboard");
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-accent/5 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Register card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-8">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <CreatorLogo className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Acelere Seu Marketing.</h1>
            <p className="text-muted-foreground">Crie, revise e planeje conteúdo inteligente em minutos</p>
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </Button>
                </div>
              </div>
            </div>

            {formData.password && formData.confirmPassword && (
              <div className="flex items-center gap-4 text-sm p-3 bg-background/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${formData.password.length >= 6 ? 'bg-success' : 'bg-destructive'}`}></div>
                  <span className={formData.password.length >= 6 ? 'text-success' : 'text-destructive'}>
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${formData.password === formData.confirmPassword ? 'bg-success' : 'bg-destructive'}`}></div>
                  <span className={formData.password === formData.confirmPassword ? 'text-success' : 'text-destructive'}>
                    Senhas coincidem
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Telefone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Estado</Label>
                <Select onValueChange={(value) => updateFormData("state", value)}>
                  <SelectTrigger className="h-12 bg-background/50 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sp">São Paulo</SelectItem>
                    <SelectItem value="rj">Rio de Janeiro</SelectItem>
                    <SelectItem value="mg">Minas Gerais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Cidade</Label>
                <Select onValueChange={(value) => updateFormData("city", value)}>
                  <SelectTrigger className="h-12 bg-background/50 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sao-paulo">São Paulo</SelectItem>
                    <SelectItem value="rio-janeiro">Rio de Janeiro</SelectItem>
                    <SelectItem value="belo-horizonte">Belo Horizonte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-background/30 rounded-lg">
              <Checkbox 
                id="terms" 
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
                Li e concordo com a{" "}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                  Política de Privacidade
                </a>{" "}
                e os{" "}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                  Termos de Uso
                </a>
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-secondary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              Criar Conta
            </Button>
          </form>

          {/* Login link */}
          <div className="text-center mt-6">
            <span className="text-muted-foreground text-sm">Já tem uma conta? </span>
            <a 
              href="/login" 
              className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
            >
              Fazer login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;