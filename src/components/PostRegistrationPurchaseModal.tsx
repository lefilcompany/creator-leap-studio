import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowRight, ArrowLeft, Plus, Minus, RefreshCw, CreditCard, Check, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorLogo } from "@/components/CreatorLogo";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  stripePriceId: string | null;
  isEnterprise?: boolean;
}

const ENTERPRISE_WHATSAPP = "5581996600072";
const CREDIT_PRICE = 2.5;
const CREDIT_STEP = 5;
const MIN_CREDITS = 5;
const MAX_CREDITS = 500;

const packageAccent: Record<string, string> = {
  pack_basic: "border-blue-500/40 hover:border-blue-500",
  pack_pro: "border-primary/40 hover:border-primary ring-2 ring-primary/20",
  pack_premium: "border-pink-500/40 hover:border-pink-500",
  pack_enterprise: "border-amber-500/40 hover:border-amber-500",
};

const packagePriceColor: Record<string, string> = {
  pack_basic: "text-blue-600 dark:text-blue-400",
  pack_pro: "text-primary",
  pack_premium: "text-pink-600 dark:text-pink-400",
  pack_enterprise: "text-amber-600 dark:text-amber-400",
};

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

    if (isCustomMode) {
      setLoadingCheckout("custom");
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { type: 'custom', credits: customCredits, return_url: '/dashboard' },
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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl min-h-[75vh] max-h-[94vh] overflow-y-auto [&>button]:hidden p-0 gap-0 border-0 shadow-2xl rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Visually hidden description for accessibility */}
        <DialogDescription className="sr-only">
          Modal de compra de créditos pós-cadastro
        </DialogDescription>

        {/* Header with logo */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 bg-gradient-to-b from-muted/40 to-transparent">
          <CreatorLogo className="mb-4" />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {step === "select-package" ? "Escolha seu pacote de créditos" : "Como deseja pagar?"}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1.5 max-w-lg mx-auto">
                {step === "select-package"
                  ? "Selecione o pacote ideal para começar a criar conteúdo com IA"
                  : isCustomMode
                    ? `${customCredits} créditos avulsos — R$ ${(customCredits * CREDIT_PRICE).toFixed(2)}`
                    : `${selectedPackage?.name} — ${selectedPackage?.credits} créditos por R$ ${selectedPackage?.price.toLocaleString('pt-BR')}`
                }
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="px-6 sm:px-8 pb-8 pt-2">
          <AnimatePresence mode="wait">
            {step === "select-package" && (
              <motion.div
                key="select-package"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Plan cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {packages.map((pkg, i) => {
                        const isPopular = pkg.id === 'pack_pro';
                        const accentClass = packageAccent[pkg.id] || "border-border hover:border-primary/30";
                        const priceColor = packagePriceColor[pkg.id] || "text-foreground";

                        return (
                          <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.35 }}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectPackage(pkg)}
                              className={cn(
                                "relative w-full text-left rounded-xl border-2 p-5 transition-all duration-200",
                                "bg-card hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                accentClass,
                                isPopular && "shadow-md"
                              )}
                            >
                              {isPopular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-sm">
                                  Mais popular
                                </span>
                              )}

                              {/* Plan name */}
                              <p className="text-lg font-bold text-foreground mb-1">{pkg.name}</p>

                              {/* Credits highlight */}
                              <div className="mb-3">
                                <span className={cn("text-4xl font-extrabold tracking-tight", priceColor)}>
                                  {pkg.isEnterprise ? '∞' : pkg.credits}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground ml-1.5">créditos</span>
                              </div>

                              {/* Price */}
                              <div className="mb-3">
                                {pkg.isEnterprise ? (
                                  <p className="text-base font-semibold text-amber-600 dark:text-amber-400">Sob consulta</p>
                                ) : (
                                  <p className="text-2xl font-bold text-foreground">
                                    R$ {pkg.price.toLocaleString('pt-BR')}
                                  </p>
                                )}
                                {!pkg.isEnterprise && pkg.credits > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    R$ {(pkg.price / pkg.credits).toFixed(2)} por crédito
                                  </p>
                                )}
                              </div>

                              {/* Description */}
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {pkg.description}
                              </p>

                              {/* CTA hint */}
                              <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-primary">
                                {pkg.isEnterprise ? (
                                  <>
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>WhatsApp</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Selecionar</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </>
                                )}
                              </div>
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Custom purchase */}
                    <motion.button
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      onClick={handleSelectCustom}
                      className="w-full flex items-center justify-between rounded-xl border-2 border-dashed border-border hover:border-primary/40 p-4 transition-all duration-200 hover:shadow-sm bg-card text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div>
                        <p className="font-semibold text-sm text-foreground">Compra Avulsa</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Escolha a quantidade exata • R$ {CREDIT_PRICE.toFixed(2)} por crédito
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}

            {step === "select-mode" && (
              <motion.div
                key="select-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select-package")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar aos pacotes
                </Button>

                {/* Custom credits selector */}
                {isCustomMode && (
                  <div className="rounded-xl bg-muted/30 border border-border p-5">
                    <p className="text-sm font-medium text-center text-muted-foreground mb-3">
                      Quantos créditos deseja comprar?
                    </p>
                    <div className="flex items-center justify-center gap-5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full"
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
                          className="w-24 text-center text-5xl font-extrabold text-primary bg-transparent border-none outline-none"
                        />
                        <p className="text-xs text-muted-foreground -mt-1">créditos</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full"
                        onClick={incrementCredits}
                        disabled={customCredits >= MAX_CREDITS}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-center mt-3 text-xl font-bold text-primary">
                      R$ {(customCredits * CREDIT_PRICE).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Payment mode options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {/* One-time */}
                  <button
                    type="button"
                    onClick={() => handleCheckout("payment")}
                    disabled={!!loadingCheckout}
                    className={cn(
                      "relative rounded-xl border-2 border-border hover:border-primary/40 p-6 text-center transition-all duration-200",
                      "bg-card hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      loadingCheckout === "payment" && "opacity-70 pointer-events-none"
                    )}
                  >
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Pagamento Único</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Pague uma vez, sem compromisso recorrente.
                    </p>
                    <div className="mt-4">
                      {loadingCheckout === "payment" || loadingCheckout === "custom" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <Check className="h-4 w-4" />
                          Pagar agora
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Recurring */}
                  <button
                    type="button"
                    onClick={() => !isCustomMode && handleCheckout("subscription")}
                    disabled={isCustomMode || !!loadingCheckout}
                    className={cn(
                      "relative rounded-xl border-2 p-6 text-center transition-all duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isCustomMode
                        ? "border-dashed border-border opacity-50 cursor-not-allowed bg-muted/20"
                        : "border-border hover:border-primary/40 bg-card hover:shadow-lg",
                      loadingCheckout === "subscription" && "opacity-70 pointer-events-none"
                    )}
                  >
                    <div className={cn(
                      "mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4",
                      isCustomMode ? "bg-muted" : "bg-emerald-500/10"
                    )}>
                      <RefreshCw className={cn("h-6 w-6", isCustomMode ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")} />
                    </div>
                    <h3 className={cn("text-lg font-bold mb-1", isCustomMode ? "text-muted-foreground" : "text-foreground")}>
                      Assinatura Mensal
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isCustomMode
                        ? "Disponível apenas para pacotes pré-definidos."
                        : "Renovação automática. Cancele quando quiser."
                      }
                    </p>
                    {!isCustomMode && (
                      <div className="mt-4">
                        {loadingCheckout === "subscription" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto" />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            Assinar mensal
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
