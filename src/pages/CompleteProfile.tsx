import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Phone, ChevronDown, Loader2, Ticket, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useExtensionProtection, useFormProtection } from "@/hooks/useExtensionProtection";
import { motion } from "framer-motion";
import decorativeElement from "@/assets/decorative-element.png";

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

const CompleteProfile = () => {
  useExtensionProtection();
  const formRef = useRef<HTMLFormElement>(null);
  useFormProtection(formRef);

  const navigate = useNavigate();
  const { user, reloadUserData } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    state: "",
    city: "",
  });

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [isValidCouponFormat, setIsValidCouponFormat] = useState(false);

  const isPromoCoupon = (code: string): boolean => {
    return /^[a-z]+200$/i.test(code.replace(/\s/g, ''));
  };

  const isChecksumFormat = (code: string): boolean => {
    return /^(B4|P7|C2|C1|C4)-[A-Z0-9]{6}-[A-Z0-9]{2}$/.test(code);
  };

  const handleCouponInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (/[a-z]/.test(value) || value.toLowerCase().endsWith('200')) {
      value = value.replace(/\s/g, '').toLowerCase();
      setCouponCode(value);
      setIsValidCouponFormat(isPromoCoupon(value));
    } else {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      value = value.slice(0, 10);
      let formatted = value;
      if (value.length > 2) formatted = value.slice(0, 2) + '-' + value.slice(2);
      if (value.length > 8) formatted = value.slice(0, 2) + '-' + value.slice(2, 8) + '-' + value.slice(8);
      setCouponCode(formatted);
      setIsValidCouponFormat(isChecksumFormat(formatted));
    }
  };

  // Pre-fill name from Google profile
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user?.name]);

  // Redirect if profile is already complete
  useEffect(() => {
    const checkProfile = async () => {
      if (!user?.id) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, state, city')
        .eq('id', user.id)
        .single();
      if (profile?.phone && profile?.state && profile?.city) {
        navigate('/dashboard', { replace: true });
      }
    };
    checkProfile();
  }, [user?.id, navigate]);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: State[]) => {
        setStates(data);
        setLoadingStates(false);
      })
      .catch(() => setLoadingStates(false));
  }, []);

  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      setCities([]);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
        .then((res) => res.json())
        .then((data: City[]) => {
          setCities(data);
          setLoadingCities(false);
        })
        .catch(() => setLoadingCities(false));
    }
  }, [formData.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === "phone") {
      const cleaned = value.replace(/\D/g, "");
      let formatted = cleaned;
      if (cleaned.length >= 1) formatted = `(${cleaned.substring(0, 2)}`;
      if (cleaned.length >= 3) formatted += `) ${cleaned.substring(2, 7)}`;
      if (cleaned.length >= 8) formatted += `-${cleaned.substring(7, 11)}`;
      setFormData(prev => ({ ...prev, phone: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "state") setFormData(prev => ({ ...prev, [field]: value, city: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.state || !formData.city) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (!privacyChecked || !privacyAccepted) {
      toast.error("É necessário aceitar a Política de Privacidade para continuar.");
      return;
    }

    if (!user?.id) {
      toast.error("Sessão não encontrada. Faça login novamente.");
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          state: formData.state,
          city: formData.city,
        })
        .eq('id', user.id);

      if (error) throw error;

      // RD Station integration
      try {
        await supabase.functions.invoke("rd-station-integration", {
          body: {
            eventType: "user_registered",
            userData: {
              email: user.email,
              name: formData.name,
              phone: formData.phone,
              city: formData.city,
              state: formData.state,
              tags: ["novo_usuario", "criador_conta", "google_oauth"],
            },
          },
        });
      } catch (rdError) {
        console.error("Erro ao enviar para RD Station:", rdError);
      }

      // Redeem coupon if provided
      if (couponCode && isValidCouponFormat) {
        try {
          await supabase.functions.invoke("redeem-coupon", {
            body: { couponCode, userId: user.id },
          });
          toast.success("Cupom resgatado com sucesso!");
        } catch (couponError) {
          console.error("Erro ao resgatar cupom:", couponError);
        }
      }

      await reloadUserData();
      toast.success("Cadastro completado com sucesso! Bem-vindo ao Creator!");
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error("Erro ao completar perfil:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-y-auto p-4 sm:p-6"
        style={{
          background: 'linear-gradient(135deg, hsl(330 70% 92%) 0%, hsl(310 50% 93%) 20%, hsl(280 55% 94%) 40%, hsl(330 60% 95%) 60%, hsl(200 60% 93%) 80%, hsl(270 50% 92%) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-background dark:block hidden" />

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -left-20 w-[550px] h-[550px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.08) 45%, transparent 70%)",
              filter: "blur(60px)",
            }}
            animate={{ x: [0, 70, 0], y: [0, -40, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--secondary) / 0.2) 0%, hsl(var(--secondary) / 0.06) 45%, transparent 70%)",
              filter: "blur(60px)",
            }}
            animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Decorative image */}
        <img
          src={decorativeElement}
          alt=""
          className="absolute top-0 right-0 w-48 sm:w-72 opacity-30 dark:opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <CreatorLogo className="h-10 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Complete seu Cadastro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Precisamos de mais algumas informações para finalizar sua conta.
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-border/40">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações Pessoais
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Nome Completo"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações de Contato
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="Telefone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10 h-11 text-sm"
                    maxLength={15}
                  />
                </div>

                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={formData.state}
                    onChange={(e) => handleSelectChange("state", e.target.value)}
                    disabled={loadingStates}
                    className="w-full h-11 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Estado</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.sigla}>{state.nome}</option>
                    ))}
                  </select>
                </div>

                <div className={`transition-all duration-300 ${formData.state ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={formData.city}
                      onChange={(e) => handleSelectChange("city", e.target.value)}
                      disabled={loadingCities || !formData.state}
                      className="w-full h-11 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Cidade</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.nome}>{city.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cupom */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cupom (Opcional)
                </Label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="couponCode"
                    placeholder="Digite seu cupom"
                    value={couponCode}
                    onChange={handleCouponInput}
                    className="pl-10 h-11 text-sm font-mono tracking-wider"
                    maxLength={30}
                  />
                </div>
                <p className={`text-xs transition-all duration-200 ${couponCode ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                  {isValidCouponFormat ? (
                    <span className="text-green-600 font-medium">✓ Formato válido</span>
                  ) : (
                    <span className="text-amber-600">Ex: nome200 ou XX-YYYYYY-CC</span>
                  )}
                </p>
              </div>

              {/* Privacy */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy"
                    checked={privacyChecked}
                    onCheckedChange={() => setPrivacyModalOpen(true)}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="privacy"
                    className="text-xs text-muted-foreground select-none cursor-pointer leading-relaxed"
                    onClick={(e) => {
                      e.preventDefault();
                      setPrivacyModalOpen(true);
                    }}
                  >
                    Li e concordo com a{" "}
                    <button
                      type="button"
                      className="underline text-primary hover:text-secondary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrivacyModalOpen(true);
                      }}
                    >
                      Política de Privacidade
                    </button>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                  disabled={
                    loading ||
                    !formData.name ||
                    !formData.phone ||
                    !formData.state ||
                    !formData.city ||
                    !privacyChecked ||
                    !privacyAccepted
                  }
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "COMPLETAR CADASTRO"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Privacy Modal */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Política de Privacidade</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-4 py-4">
            <p>
              A Creator coleta e utiliza seus dados pessoais (nome, e-mail, telefone e localização) 
              exclusivamente para fins de operação da plataforma, personalização de experiência e 
              comunicação sobre nossos serviços.
            </p>
            <p>
              Seus dados são protegidos e não serão compartilhados com terceiros sem seu consentimento, 
              exceto quando exigido por lei. Você pode solicitar a exclusão de seus dados a qualquer 
              momento através das configurações de sua conta.
            </p>
            <p>
              Para mais detalhes, acesse nossa{" "}
              <a href="/privacy" target="_blank" className="text-primary underline">
                Política de Privacidade completa
              </a>.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPrivacyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setPrivacyChecked(true);
                setPrivacyAccepted(true);
                setPrivacyModalOpen(false);
              }}
            >
              Li e Aceito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompleteProfile;
