import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Coins, Sparkles } from "lucide-react";
import { TourSelector } from "@/components/onboarding/TourSelector";
import { creditsSteps, navbarSteps } from "@/components/onboarding/tourSteps";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  credits: number;
  stripe_price_id_monthly: string;
  stripe_product_id: string;
}

const Credits = () => {
  const { user, refreshUserCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customCredits, setCustomCredits] = useState(20);
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    loadPlans();
    handlePaymentCallback();
  }, [searchParams]);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .like('id', 'pack_%')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    
    if (data) {
      setPlans(data);
    }
  };

  const handlePaymentCallback = async () => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      setVerifyingPayment(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          }
        });

        if (error) throw error;

        if (data.success) {
          toast.success(
            data.already_processed 
              ? "Pagamento já processado anteriormente!" 
              : `✅ ${data.credits_added} créditos adicionados! Novo saldo: ${data.new_balance} créditos`,
            { duration: 5000 }
          );
          await refreshUserCredits();
          // Limpar query params
          navigate('/credits', { replace: true });
        } else {
          toast.error("Pagamento não foi concluído");
        }
      } catch (error: any) {
        console.error("Error verifying payment:", error);
        toast.error("Erro ao verificar pagamento: " + error.message);
      } finally {
        setVerifyingPayment(false);
      }
    } else if (searchParams.get('canceled') === 'true') {
      toast.info("Compra cancelada");
      navigate('/credits', { replace: true });
    }
  };

  const handleBuyPlan = async (planId: string, priceId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          type: 'plan',
          price_id: priceId,
          plan_id: planId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao criar checkout: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCustom = async () => {
    if (!user || customCredits < 20) {
      toast.error("Quantidade mínima: 20 créditos");
      return;
    }
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          type: 'custom',
          credits: customCredits
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao criar checkout: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const customTotal = customCredits * 2;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {verifyingPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-auto">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg font-medium">Verificando pagamento...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div id="credits-balance" className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Comprar Créditos</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coins className="h-5 w-5" />
          <p className="text-lg">
            Saldo atual: <span className="font-bold text-foreground">{user?.credits || 0}</span> créditos
          </p>
        </div>
      </div>

      {/* Planos Fixos */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Pacotes de Créditos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card key={plan.id} className={plan.id === 'pack_pro' ? 'border-primary shadow-lg' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </div>
                  {plan.id === 'pack_pro' && (
                    <Badge variant="default" className="ml-2">
                      Mais Popular
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-4xl font-bold mb-2">
                    R$ {plan.price_monthly.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 text-lg text-muted-foreground">
                    <Coins className="h-5 w-5" />
                    <span className="font-semibold">{plan.credits} créditos</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    R$ {(plan.price_monthly / plan.credits).toFixed(2)} por crédito
                  </div>
                </div>
                <Button 
                  id="buy-credits-button"
                  onClick={() => handleBuyPlan(plan.id, plan.stripe_price_id_monthly)}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                  variant={plan.id === 'pack_pro' ? 'default' : 'outline'}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Comprar Agora
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Compra Avulsa */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Compra Personalizada</h2>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Escolha a quantidade de créditos</CardTitle>
            <CardDescription>
              Compre a quantidade exata que você precisa (mínimo 20 créditos)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="custom-credits">Quantidade de Créditos</Label>
              <Input 
                id="custom-credits"
                type="number" 
                min={20}
                step={10}
                value={customCredits}
                onChange={(e) => setCustomCredits(Math.max(20, parseInt(e.target.value) || 20))}
                className="text-lg mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Cada crédito custa R$ 2,00
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Quantidade:</span>
                <span className="font-semibold">{customCredits} créditos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-3xl font-bold text-primary">
                  R$ {customTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <Button 
              onClick={handleBuyCustom}
              disabled={loading || customCredits < 20}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Comprar {customCredits} Créditos
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </section>

      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'credits',
            steps: creditsSteps,
            label: 'Tour de Créditos',
            targetElement: '#credits-balance'
          }
        ]}
        startDelay={500}
      />
    </div>
  );
};

export default Credits;
