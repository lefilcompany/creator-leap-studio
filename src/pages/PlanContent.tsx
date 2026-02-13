import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, X, Loader2, Coins, Info } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { TourSelector } from "@/components/onboarding/TourSelector";
import { planContentSteps, navbarSteps } from "@/components/onboarding/tourSteps";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import planBanner from "@/assets/plan-banner.jpg";

interface FormData {
  brand: string;
  theme: string[];
  platform: string;
  quantity: number | "";
  objective: string;
  additionalInfo: string;
}

const PlanContent = () => {
  const { user, refreshTeamCredits } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    brand: "",
    theme: [],
    platform: "",
    quantity: 1,
    objective: "",
    additionalInfo: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Persistência de formulário
  const { loadPersistedData, clearPersistedData } = useFormPersistence({
    key: 'plan-content-form',
    formData,
    excludeFields: []
  });

  // Carregar dados persistidos na montagem
  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setFormData(prev => ({ ...prev, ...persisted }));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.teamId || !user?.id) {
        if (user) setIsLoadingData(false);
        return;
      }

      try {
        const [
          { data: brandsData, error: brandsError },
          { data: themesData, error: themesError },
          { data: teamData, error: teamError },
        ] = await Promise.all([
          supabase.from("brands").select("id, name").eq("team_id", user.teamId),
          supabase.from("strategic_themes").select("id, title, brand_id").eq("team_id", user.teamId),
          supabase.from("teams").select("credits").eq("id", user.teamId).maybeSingle(),
        ]);

        if (brandsError) throw brandsError;
        if (themesError) throw themesError;
        if (teamError) throw teamError;

        setBrands(brandsData || []);
        setThemes(themesData || []);
        setCreditsRemaining((teamData as any)?.credits || 0);
        setIsLoadingData(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Erro ao carregar dados");
        setBrands([]);
        setThemes([]);
        setCreditsRemaining(0);
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const filteredThemes = formData.brand ? themes.filter((t) => t.brand_id === formData.brand) : [];

  const handleBrandChange = (value: string) => {
    setFormData((prev) => ({ ...prev, brand: value, theme: [] }));
  };

  const handleThemeSelect = (value: string) => {
    const theme = themes.find((t) => t.id === value);
    if (theme && !formData.theme.includes(theme.id)) {
      setFormData((prev) => ({ ...prev, theme: [...prev.theme, theme.id] }));
    }
  };

  const handleThemeRemove = (themeId: string) => {
    setFormData((prev) => ({
      ...prev,
      theme: prev.theme.filter((t) => t !== themeId),
    }));
  };

  const handlePlatformChange = (value: string) => {
    setFormData((prev) => ({ ...prev, platform: value }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setFormData((prev) => ({ ...prev, quantity: "" }));
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num <= 7) {
      setFormData((prev) => ({ ...prev, quantity: num }));
    } else if (!isNaN(num) && num > 7) {
      setFormData((prev) => ({ ...prev, quantity: 7 }));
    }
  };

  const handleQuantityBlur = () => {
    if (formData.quantity === "" || formData.quantity < 1) {
      setFormData((prev) => ({ ...prev, quantity: 1 }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const generatePlan = async () => {
    if (!formData.brand || formData.theme.length === 0 || !formData.platform || !formData.objective) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    if (creditsRemaining <= 0) {
      toast.error("Você não possui créditos suficientes para planejamento");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        navigate("/");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: {
          brand: formData.brand,
          themes: formData.theme,
          platform: formData.platform,
          quantity: formData.quantity,
          objective: formData.objective,
          additionalInfo: formData.additionalInfo,
          userId: user?.id,
          teamId: user?.teamId,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        if (error.message?.includes("JWT")) {
          toast.error("Sessão inválida. Fazendo login novamente...");
          await supabase.auth.signOut();
          navigate("/");
          return;
        }
        throw error;
      }

      if (data.error) {
        console.error("Business logic error:", data.error);
        if (data.error.includes("Créditos insuficientes")) {
          toast.error("Créditos insuficientes para planejamento");
        } else if (data.error.includes("Rate limit")) {
          toast.error("Muitas requisições. Aguarde um momento.");
        } else {
          toast.error("Erro ao gerar planejamento: " + data.error);
        }
        return;
      }

      clearPersistedData();
      
      try {
        await refreshTeamCredits();
      } catch (error) {
        console.error('Erro ao atualizar créditos:', error);
      }
      
      navigate("/plan-result", {
        state: {
          plan: data.plan,
          actionId: data.actionId,
        },
      });

      setCreditsRemaining(data.creditsRemaining);
      toast.success("Planejamento gerado com sucesso!");
    } catch (err: any) {
      console.error("Error generating plan:", err);
      if (err.message?.includes("network")) {
        toast.error("Erro de conexão. Verifique sua internet.");
      } else if (err.message?.includes("timeout")) {
        toast.error("Tempo esgotado. Tente novamente.");
      } else {
        toast.error("Erro ao gerar planejamento. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'plan_content',
            steps: planContentSteps,
            label: 'Tour de Planejar Conteúdo',
            targetElement: '#plan-header'
          }
        ]}
        startDelay={500}
      />

      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 lg:h-72 flex-shrink-0 overflow-hidden">
        <PageBreadcrumb
          items={[{ label: "Planejar Conteúdo" }]}
          variant="overlay"
        />
        <img
          src={planBanner}
          alt="Planejar Conteúdo"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0 z-10">
        <div
          id="plan-header"
          className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 border border-primary/20 text-primary shadow-sm rounded-2xl p-3 lg:p-4">
              <Calendar className="h-8 w-8 lg:h-10 lg:w-10" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Planejar Conteúdo</h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Preencha os campos para gerar seu planejamento de posts
              </p>
            </div>
          </div>

          {isLoadingData ? (
            <Skeleton className="h-14 w-40 rounded-xl" />
          ) : (
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 flex-shrink-0">
              <CardContent className="p-3">
                <div className="flex items-center justify-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                    <div className="relative bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-2">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-left gap-4 flex justify-center items-center">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {creditsRemaining}
                    </span>
                    <p className="text-xs text-muted-foreground font-medium leading-tight">Créditos Restantes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

          {/* Card: Configuração Básica */}
          <Card id="plan-filters" className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-xl font-semibold">Configuração Básica</h2>
              <p className="text-muted-foreground text-sm">Defina marca, plataforma e quantidade de posts</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div id="plan-brand-field" className="space-y-2">
                  <Label htmlFor="brand" className="text-xs md:text-sm font-semibold text-foreground">
                    Marca <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <>
                      <NativeSelect
                        value={formData.brand}
                        onValueChange={handleBrandChange}
                        options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                        placeholder={brands.length === 0 ? "Nenhuma marca cadastrada" : "Selecione a marca"}
                        disabled={brands.length === 0}
                        triggerClassName="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors"
                      />
                      {brands.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>Cadastre uma marca antes de criar conteúdo planejado</span>
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div id="plan-platform-field" className="space-y-2">
                  <Label htmlFor="platform" className="text-xs md:text-sm font-semibold text-foreground">
                    Plataforma <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <NativeSelect
                      value={formData.platform}
                      onValueChange={handlePlatformChange}
                      options={[
                        { value: "instagram", label: "Instagram" },
                        { value: "facebook", label: "Facebook" },
                        { value: "linkedin", label: "LinkedIn" },
                        { value: "twitter", label: "Twitter (X)" },
                      ]}
                      placeholder="Selecione a plataforma"
                      triggerClassName="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-secondary/30 transition-colors"
                    />
                  )}
                </div>

                <div id="plan-quantity-field" className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs md:text-sm font-semibold text-foreground">
                    Quantidade de Posts <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="7"
                      placeholder="1-7"
                      value={formData.quantity}
                      onChange={handleQuantityChange}
                      onBlur={handleQuantityBlur}
                      className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-accent/30 transition-colors text-center font-semibold"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Temas Estratégicos */}
          <Card id="plan-themes-field" className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-accent/5 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Temas Estratégicos</h2>
                  <p className="text-muted-foreground text-sm">Selecione os temas para o planejamento</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                  {formData.theme.length} selecionados
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-xs md:text-sm font-semibold text-foreground">
                  Adicionar Tema <span className="text-destructive">*</span>
                </Label>
                {isLoadingData ? (
                  <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                ) : (
                  <NativeSelect
                    value=""
                    onValueChange={handleThemeSelect}
                    options={filteredThemes
                      .filter((t) => !formData.theme.includes(t.id))
                      .map((t) => ({ value: t.id, label: t.title }))}
                    placeholder={!formData.brand ? "Primeiro, escolha a marca" : "Adicionar tema estratégico"}
                    disabled={!formData.brand || filteredThemes.length === 0}
                    triggerClassName="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors disabled:opacity-50"
                  />
                )}
              </div>

              {/* Selected Themes Display */}
              <div className="relative">
                {formData.theme.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[80px] rounded-xl border-2 border-dashed border-border/30 bg-muted/10 transition-all hover:bg-muted/20">
                    <p className="text-sm text-muted-foreground">Nenhum tema selecionado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    {formData.theme.map((themeId, index) => {
                      const theme = themes.find((t) => t.id === themeId);
                      return (
                        <div
                          key={themeId}
                          className="group flex items-center justify-between bg-background/80 backdrop-blur-sm border border-primary/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all hover:scale-105 animate-fade-in"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">
                            {theme?.title || themeId}
                          </span>
                          <button
                            onClick={() => handleThemeRemove(themeId)}
                            className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center group-hover:scale-110"
                            aria-label={`Remover tema ${theme?.title || themeId}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Detalhes do Planejamento */}
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-accent/5">
              <h2 className="text-xl font-semibold">Detalhes do Planejamento</h2>
              <p className="text-muted-foreground text-sm">Descreva os objetivos e informações adicionais</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <div id="plan-objective-field" className="space-y-2">
                  <Label htmlFor="objective" className="text-xs md:text-sm font-semibold text-foreground">
                    Objetivo dos Posts <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="objective"
                    placeholder="Ex: Gerar engajamento, educar o público, aumentar vendas..."
                    value={formData.objective}
                    onChange={handleInputChange}
                    className="h-32 sm:h-48 lg:h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none"
                  />
                </div>
                <div id="plan-additional-info-field" className="space-y-2">
                  <Label htmlFor="additionalInfo" className="text-xs md:text-sm font-semibold text-foreground">
                    Informações Adicionais
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Ex: Usar cores da marca, focar em jovens de 18-25 anos..."
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    className="h-32 sm:h-48 lg:h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border border-border/20 rounded-2xl shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col items-center gap-4">
                <Button
                  id="create-plan-button"
                  onClick={generatePlan}
                  disabled={
                    loading ||
                    !formData.brand ||
                    formData.theme.length === 0 ||
                    !formData.platform ||
                    !formData.objective
                  }
                  className="w-full max-w-lg h-12 sm:h-14 rounded-2xl text-base sm:text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-secondary hover:from-primary/90 shadow-xl transition-all duration-500 disabled:opacity-50 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Gerar Planejamento</span>
                      <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1">
                        <Coins className="h-3 w-3" />
                        {CREDIT_COSTS.CONTENT_PLAN}
                      </Badge>
                    </>
                  )}
                </Button>
                {(!formData.brand || formData.theme.length === 0 || !formData.platform || !formData.objective) && (
                  <div className="text-center bg-muted/30 p-3 rounded-xl border border-border/30 w-full max-w-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Preencha todos os campos obrigatórios (*) para continuar
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PlanContent;
