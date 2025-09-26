import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
      {/* Background gradient for entire screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>
      
      {/* Left side - Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Mobile header */}
        <div className="lg:hidden absolute top-8 left-8">
          <CreatorLogo />
        </div>

        {/* Register card */}
        <div className="w-full max-w-lg">
          <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6">
            {/* Mobile title */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Creator</h1>
              <p className="text-muted-foreground">Acelere seu marketing estratégico</p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Comece no Creator</h2>
              <p className="text-muted-foreground">Teste grátis por 7 dias</p>
            </div>

            {/* Registration form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="E-mail"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha"
                      value={formData.password}
                      onChange={(e) => updateFormData("password", e.target.value)}
                      className="pl-10 pr-10 h-12"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirmar"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                      className="pl-10 pr-10 h-12"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Telefone"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select onValueChange={(value) => updateFormData("state", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sp">São Paulo</SelectItem>
                    <SelectItem value="rj">Rio de Janeiro</SelectItem>
                    <SelectItem value="mg">Minas Gerais</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => updateFormData("city", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sao-paulo">São Paulo</SelectItem>
                    <SelectItem value="rio-janeiro">Rio de Janeiro</SelectItem>
                    <SelectItem value="belo-horizonte">Belo Horizonte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-background/30 rounded-lg">
                <Checkbox 
                  id="terms" 
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
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
                Começar grátis
              </Button>
            </form>

            {/* Login link */}
            <div className="text-center mt-4">
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

      {/* Right side - Marketing content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 right-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <CreatorLogo className="mb-8" />
          <h1 className="text-4xl font-bold text-foreground mb-6 leading-tight">
            Revolucione seu<br />
            marketing de conteúdo
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Muito mais que criação de posts:<br />
            organização estratégica completa
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Posts para redes sociais</h3>
                <p className="text-muted-foreground">Conteúdo otimizado para cada plataforma</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-secondary rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">E-mails marketing e newsletters</h3>
                <p className="text-muted-foreground">Comunicação direta com seu público</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-accent rounded-full mt-3"></div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Roteiros e diretrizes</h3>
                <p className="text-muted-foreground">Conteúdo para vídeos e diretrizes visuais</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;