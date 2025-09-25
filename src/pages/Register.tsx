import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, MapPin } from "lucide-react";

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
    <div className="min-h-screen flex">
      {/* Left side - Registration form */}
      <div className="w-full max-w-lg flex flex-col justify-center p-8 bg-white">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Crie sua Conta</h2>
          <p className="text-muted-foreground">É rápido e fácil. Vamos começar!</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Nome Completo"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="emanuel.rodrigues@lefil.com.br"
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className="pr-10"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar Senha"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {formData.password && formData.confirmPassword && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Mínimo 6 caracteres</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${formData.password === formData.confirmPassword ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}>
                  {formData.password === formData.confirmPassword ? 'Senhas coincidem' : 'Senhas coincidem'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select onValueChange={(value) => updateFormData("state", value)}>
                <SelectTrigger>
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
              <Label>Cidade</Label>
              <Select onValueChange={(value) => updateFormData("city", value)}>
                <SelectTrigger>
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

          <div className="flex items-start space-x-2">
            <Checkbox 
              id="terms" 
              checked={formData.termsAccepted}
              onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              Li e concordo com a{" "}
              <a href="#" className="text-primary hover:underline">
                Política de Privacidade
              </a>
            </Label>
          </div>

          <Button type="submit" className="w-full creator-button-primary">
            CRIAR CONTA
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-muted-foreground">Já tem uma conta? </span>
          <a href="/login" className="text-primary hover:underline font-medium">
            Conecte-se
          </a>
        </div>
      </div>

      {/* Right side - Hero content */}
      <div className="flex-1 bg-creator-gradient flex flex-col justify-center items-center p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-32 right-20 w-28 h-28 bg-white/10 rounded-xl rotate-45"></div>
        <div className="absolute bottom-20 left-16 w-20 h-20 bg-white/5 rounded-full"></div>
        
        <div className="max-w-md text-center text-white z-10">
          <CreatorLogo className="justify-center mb-8" />
          <h1 className="text-4xl font-bold mb-4">
            Transforme Ideias em Conteúdo
          </h1>
          <p className="text-lg text-white/90">
            Junte-se a nossa comunidade e comece a criar posts incríveis com o poder da inteligência artificial.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;