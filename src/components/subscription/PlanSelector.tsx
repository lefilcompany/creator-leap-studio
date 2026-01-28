import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Crown,
  Zap,
  Sparkles,
  Star,
  CheckCircle,
  Loader2,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  stripePriceId: string | null;
  isEnterprise?: boolean;
}

interface PackageSelectorProps {
  onPackageSelected?: (packageId: string) => void;
  onCheckoutComplete?: () => void;
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

export function PlanSelector({ onPackageSelected, onCheckoutComplete }: PackageSelectorProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      const { data: packagesData, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;

      if (packagesData) {
        const formattedPackages: CreditPackage[] = packagesData
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
        
        setPackages(formattedPackages);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      toast.error("Erro ao carregar pacotes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleSelectPackage = async (pkg: CreditPackage) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    // Enterprise - WhatsApp
    if (pkg.isEnterprise) {
      const message = encodeURIComponent("Olá! Tenho interesse no pacote Enterprise do Creator. Gostaria de mais informações.");
      window.open(`https://wa.me/${ENTERPRISE_WHATSAPP}?text=${message}`, '_blank');
      return;
    }

    if (!pkg.stripePriceId) {
      toast.error("Pacote sem configuração de preço");
      return;
    }

    setLoadingPackageId(pkg.id);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'credits',
          price_id: pkg.stripePriceId,
          package_id: pkg.id,
          return_url: '/credits'
        }
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error("URL de checkout não retornada");
      }

      window.open(data.url, '_blank');
      
      toast.info("Abrindo checkout...", {
        description: "Complete o pagamento na janela que acabou de abrir.",
        duration: 10000,
      });

      if (onPackageSelected) {
        onPackageSelected(pkg.id);
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setLoadingPackageId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {packages.map((pkg) => {
        const Icon = packageIcons[pkg.id] || Zap;
        const colorClass = packageColors[pkg.id] || "from-blue-500 to-blue-600";
        const isEnterprise = pkg.isEnterprise;
        const isPopular = pkg.id === 'pack_pro';

        return (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="h-full"
          >
            <Card
              className={cn(
                "relative h-full transition-all duration-300 overflow-hidden group cursor-pointer",
                "border-2 hover:shadow-2xl",
                isPopular && "ring-2 ring-primary/30 shadow-xl",
                isEnterprise && "border-amber-500/50"
              )}
              onClick={() => handleSelectPackage(pkg)}
            >
              {isPopular && (
                <div className="absolute -right-8 top-6 rotate-45 bg-primary px-10 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                  Popular
                </div>
              )}

              {isEnterprise && (
                <div className="absolute -right-8 top-6 rotate-45 bg-amber-500 px-10 py-1 text-xs font-semibold text-white shadow-lg">
                  Sob consulta
                </div>
              )}

              <CardHeader className="relative pb-2">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                  "bg-gradient-to-br shadow-lg",
                  colorClass
                )}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                <CardDescription className="text-sm">{pkg.description}</CardDescription>
                
                <div className="mt-3 flex items-baseline gap-1">
                  {isEnterprise ? (
                    <span className="text-lg font-bold text-amber-600">Entre em contato</span>
                  ) : (
                    <span className="text-3xl font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="relative space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <span className="text-xl font-bold text-primary">
                      {isEnterprise ? '∞' : pkg.credits.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">créditos</span>
                  </div>
                </div>

                <Button
                  className={cn(
                    "w-full transition-all duration-300",
                    isEnterprise 
                      ? "bg-amber-500 hover:bg-amber-600 text-white" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                  disabled={loadingPackageId === pkg.id}
                >
                  {loadingPackageId === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : isEnterprise ? (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </>
                  ) : (
                    <>
                      Comprar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
