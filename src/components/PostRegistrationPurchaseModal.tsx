import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Zap, Crown, Sparkles, Star, Loader2, ArrowRight, ArrowLeft,
  MessageCircle, ShoppingCart, Plus, Minus, RefreshCw, CreditCard,
  Coins, Gift, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  stripePriceId: string | null;
  isEnterprise?: boolean;
}

const packageIcons: Record<string, any> = {
  pack_basic: Zap,
  pack_pro: Crown,
  pack_premium: Sparkles,
  pack_enterprise: Star,
};

const packageColors: Record<string, string> = {
  pack_basic: "from-blue-500 to-blue-600",
  pack_pro: "from-purple-500 to-purple-600",
  pack_premium: "from-pink-500 to-pink-600",
  pack_enterprise: "from-amber-500 to-orange-600",
};

const ENTERPRISE_WHATSAPP = "5581996600072";
const CREDIT_PRICE = 2.5;
const CREDIT_STEP = 5;
const MIN_CREDITS = 5;
const MAX_CREDITS = 500;

type Step = "select-package" | "select-mode";

interface Props {
  open: boolean;
  onComplete: () => void;
}

export function PostRegistrationPurchaseModal({ open, onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("select-package");
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  
  // Custom purchase state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCredits, setCustomCredits] = useState(20);
  const [creditInputValue, setCreditInputValue] = useState("20");

  const loadPackages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;

      if (data) {
        const formatted: CreditPackage[] = data
          .filter((p) => p.id !== 'pack_trial' && p.id !== 'starter' && p.id !== 'free' && p.id !== 'pack_business')
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.price_monthly || 0,
            credits: p.credits || 0,
            stripePriceId: p.stripe_price_id_monthly,
            isEnterprise: p.id === 'pack_enterprise',
          }));
        setPackages(formatted);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadPackages();
  }, [open, loadPackages]);

  const handleSelectPackage = (pkg: CreditPackage) => {
    if (pkg.isEnterprise) {
      const message = encodeURIComponent("Olá! Tenho interesse no pacote Enterprise do Creator. Gostaria de mais informações.");
      window.open(`https://wa.me/${ENTERPRISE_WHATSAPP}?text=${message}`, '_blank');
      return;
    }
    setSelectedPackage(pkg);
    setIsCustomMode(false);
    setStep("select-mode");
  };

  const handleSelectCustom = () => {
    setSelectedPackage(null);
    setIsCustomMode(true);
    setStep("select-mode");
  };

  const handleCheckout = async (mode: "payment" | "subscription") => {
    if (!user) return;

    // Custom purchase is always one-time
    if (isCustomMode) {
      setLoadingCheckout("custom");
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            type: 'custom',
            credits: customCredits,
            return_url: '/dashboard',
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.info("Complete o pagamento na aba que foi aberta.", { duration: 10000 });
          onComplete();
        }
      } catch (error: any) {
        toast.error("Erro ao criar checkout: " + error.message);
      } finally {
        setLoadingCheckout(null);
      }
      return;
    }

    if (!selectedPackage?.stripePriceId) {
      toast.error("Pacote sem configuração de preço");
      return;
    }

    setLoadingCheckout(mode);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'credits',
          price_id: selectedPackage.stripePriceId,
          package_id: selectedPackage.id,
          payment_mode: mode,
          return_url: '/dashboard',
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info("Complete o pagamento na aba que foi aberta.", { duration: 10000 });
        onComplete();
      }
    } catch (error: any) {
      toast.error("Erro ao criar checkout: " + error.message);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const incrementCredits = () => {
    setCustomCredits(prev => {
      const next = Math.min(prev + CREDIT_STEP, MAX_CREDITS);
      setCreditInputValue(String(next));
      return next;
    });
  };

  const decrementCredits = () => {
    setCustomCredits(prev => {
      const next = Math.max(prev - CREDIT_STEP, MIN_CREDITS);
      setCreditInputValue(String(next));
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* Cannot close */}}>
      <DialogContent
        className="max-w-6xl min-h-[70vh] max-h-[92vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 bg-primary/10 text-primary rounded-2xl p-3 w-fit">
            <Gift className="h-8 w-8" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {step === "select-package" ? "Bem-vindo ao Creator! 🎉" : "Como deseja pagar?"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {step === "select-package"
              ? "Escolha um pacote de créditos para começar a criar conteúdo com IA"
              : isCustomMode
                ? `${customCredits} créditos avulsos — R$ ${(customCredits * CREDIT_PRICE).toFixed(2)}`
                : `${selectedPackage?.name} — ${selectedPackage?.credits} créditos por R$ ${selectedPackage?.price.toLocaleString('pt-BR')}`
            }
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "select-package" && (
            <motion.div
              key="select-package"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {packages.map((pkg) => {
                      const Icon = packageIcons[pkg.id] || Zap;
                      const colorClass = packageColors[pkg.id] || "from-blue-500 to-blue-600";
                      const isPopular = pkg.id === 'pack_pro';

                      return (
                        <Card
                          key={pkg.id}
                          className={cn(
                            "relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
                            "border-2 hover:border-primary/30",
                            isPopular && "ring-2 ring-primary/30",
                            pkg.isEnterprise && "border-amber-500/30"
                          )}
                          onClick={() => handleSelectPackage(pkg)}
                        >
                          {isPopular && (
                            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                              Popular
                            </Badge>
                          )}
                          <CardHeader className="pb-2 pt-4 px-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                              "bg-gradient-to-br shadow",
                              colorClass
                            )}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-base">{pkg.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-2">{pkg.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="px-3 pb-3 space-y-2">
                            <div className="text-center p-2 rounded-lg bg-primary/5">
                              <span className="text-lg font-bold text-primary">
                                {pkg.isEnterprise ? '∞' : pkg.credits}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">créditos</span>
                            </div>
                            <div className="text-center">
                              {pkg.isEnterprise ? (
                                <span className="text-sm font-semibold text-amber-600">Sob consulta</span>
                              ) : (
                                <span className="text-xl font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Custom purchase option */}
                  <Card
                    className="cursor-pointer transition-all duration-200 hover:shadow-md border-2 border-dashed hover:border-primary/30"
                    onClick={handleSelectCustom}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Compra Avulsa</p>
                          <p className="text-xs text-muted-foreground">
                            Escolha a quantidade • R$ {CREDIT_PRICE.toFixed(2)} por crédito
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {step === "select-mode" && (
            <motion.div
              key="select-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select-package")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              {isCustomMode && (
                <Card className="border-0 shadow-sm bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={decrementCredits}
                        disabled={customCredits <= MIN_CREDITS}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="text-center min-w-[100px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={creditInputValue}
                          onChange={(e) => setCreditInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                          onBlur={() => {
                            const val = parseInt(creditInputValue);
                            if (isNaN(val) || val < MIN_CREDITS) {
                              setCustomCredits(MIN_CREDITS);
                              setCreditInputValue(String(MIN_CREDITS));
                            } else {
                              const clamped = Math.min(val, MAX_CREDITS);
                              const rounded = Math.round(clamped / CREDIT_STEP) * CREDIT_STEP || MIN_CREDITS;
                              setCustomCredits(rounded);
                              setCreditInputValue(String(rounded));
                            }
                          }}
                          className="w-20 text-center text-4xl font-bold text-primary bg-transparent border-none outline-none"
                        />
                        <p className="text-xs text-muted-foreground">créditos</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={incrementCredits}
                        disabled={customCredits >= MAX_CREDITS}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-center mt-2 text-lg font-bold text-primary">
                      R$ {(customCredits * CREDIT_PRICE).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* One-time payment */}
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/30",
                    loadingCheckout === "payment" && "opacity-70 pointer-events-none"
                  )}
                  onClick={() => handleCheckout("payment")}
                >
                  <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">Compra Avulsa</h3>
                    <p className="text-sm text-muted-foreground">
                      Pagamento único. Sem compromisso recorrente.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {loadingCheckout === "payment" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Pagar agora</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recurring subscription - only for packages, not custom */}
                {!isCustomMode && (
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/30",
                      loadingCheckout === "subscription" && "opacity-70 pointer-events-none"
                    )}
                    onClick={() => handleCheckout("subscription")}
                  >
                    <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                      <div className="p-3 rounded-xl bg-green-500/10">
                        <RefreshCw className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold">Compra Recorrente</h3>
                      <p className="text-sm text-muted-foreground">
                        Renovação automática mensal. Cancele quando quiser.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {loadingCheckout === "subscription" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Assinar mensal</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Custom mode: only one-time */}
                {isCustomMode && (
                  <Card className="border-2 border-dashed opacity-50 pointer-events-none">
                    <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                      <div className="p-3 rounded-xl bg-muted">
                        <RefreshCw className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-muted-foreground">Compra Recorrente</h3>
                      <p className="text-sm text-muted-foreground">
                        Disponível apenas para pacotes pré-definidos
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
