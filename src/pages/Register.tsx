import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, ArrowRight, CheckCircle, Sparkles, Target, User, Mail, Phone } from "lucide-react";

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
    <div className="min-h-screen flex lg:flex-row flex-col-reverse">
      {/* Left side - Registration form */}
      <div className="w-full lg:max-w-xl flex flex-col justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Criar sua conta</h2>
            <p className="text-muted-foreground">Comece sua jornada criativa hoje mesmo</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className="h-12 pl-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    className="h-12 pl-12"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => updateFormData("password", e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                      className="h-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {formData.password && formData.confirmPassword && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formData.password.length >= 6 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={formData.password.length >= 6 ? 'text-green-600' : 'text-red-600'}>
                      Mínimo 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formData.password === formData.confirmPassword ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}>
                      {formData.password === formData.confirmPassword ? 'Senhas coincidem' : 'Senhas não coincidem'}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    className="h-12 pl-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estado</Label>
                  <Select onValueChange={(value) => updateFormData("state", value)}>
                    <SelectTrigger className="h-12">
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
                  <Label className="text-sm font-medium">Cidade</Label>
                  <Select onValueChange={(value) => updateFormData("city", value)}>
                    <SelectTrigger className="h-12">
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
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed">
                Li e concordo com a{" "}
                <a href="#" className="text-primary hover:text-primary/80 font-medium">
                  Política de Privacidade
                </a>{" "}
                e{" "}
                <a href="#" className="text-primary hover:text-primary/80 font-medium">
                  Termos de Uso
                </a>
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-medium text-base group transition-all duration-200"
              disabled={!formData.termsAccepted}
            >
              Criar conta gratuita
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

          {/* Login link */}
          <div className="text-center">
            <span className="text-muted-foreground">Já tem uma conta? </span>
            <a href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Fazer login
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Hero content */}
      <div className="flex-1 bg-gradient-to-bl from-primary via-secondary to-accent flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-white/5 rounded-2xl rotate-45 animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 right-1/3 w-20 h-20 bg-accent/20 rounded-full blur-lg animate-pulse delay-500"></div>
        </div>
        
        {/* Logo at top */}
        <div className="absolute top-8 left-8">
          <CreatorLogo size="large" className="text-white" />
        </div>

        {/* Hero content */}
        <div className="max-w-lg text-center text-white z-10 space-y-8">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Comece sua{" "}
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                jornada criativa
              </span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Junte-se a milhares de criadores que já transformam suas ideias em realidade usando nossa plataforma.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-4 mt-12">
            {[
              { icon: <CheckCircle className="w-5 h-5" />, text: "Criação de conteúdo com IA", desc: "Gere textos, imagens e vídeos automaticamente" },
              { icon: <Target className="w-5 h-5" />, text: "Planejamento estratégico", desc: "Organize suas campanhas de forma inteligente" },
              { icon: <Sparkles className="w-5 h-5" />, text: "Resultados comprovados", desc: "Milhares de criadores satisfeitos" }
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 text-left">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.text}</h3>
                  <p className="text-white/80 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;