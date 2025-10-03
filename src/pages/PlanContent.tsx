import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowLeft, MessageSquareQuote, Zap, Clipboard, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  brand: string;
  theme: string[];
  platform: string;
  quantity: number | '';
  objective: string;
  additionalInfo: string;
}

const PlanContent = () => {
  const { user, team } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    brand: '',
    theme: [],
    platform: '',
    quantity: 1,
    objective: '',
    additionalInfo: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [team]);

  const loadData = async () => {
    if (!team?.id) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    
    try {
      // Carregar todos os dados em paralelo
      const [
        { data: brandsData, error: brandsError },
        { data: themesData, error: themesError },
        { data: teamData, error: teamError }
      ] = await Promise.all([
        supabase
          .from('brands')
          .select('id, name')
          .eq('team_id', team.id),
        supabase
          .from('strategic_themes')
          .select('id, title, brand_id')
          .eq('team_id', team.id),
        supabase
          .from('teams')
          .select('credits_plans')
          .eq('id', team.id)
          .maybeSingle()
      ]);
      
      if (brandsError) throw brandsError;
      if (themesError) throw themesError;
      if (teamError) throw teamError;
      
      // Atualizar todos os estados de uma vez para evitar múltiplas renderizações
      setBrands(brandsData || []);
      setThemes(themesData || []);
      setCreditsRemaining(teamData?.credits_plans || 0);
      setIsLoadingData(false);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
      setBrands([]);
      setThemes([]);
      setCreditsRemaining(0);
      setIsLoadingData(false);
    }
  };

  const filteredThemes = formData.brand 
    ? themes.filter(t => t.brand_id === formData.brand)
    : [];

  const handleBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, brand: value, theme: [] }));
  };

  const handleThemeSelect = (value: string) => {
    const theme = themes.find(t => t.id === value);
    if (theme && !formData.theme.includes(theme.id)) {
      setFormData(prev => ({ ...prev, theme: [...prev.theme, theme.id] }));
    }
  };

  const handleThemeRemove = (themeId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      theme: prev.theme.filter(t => t !== themeId) 
    }));
  };

  const handlePlatformChange = (value: string) => {
    setFormData(prev => ({ ...prev, platform: value }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({ ...prev, quantity: '' }));
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num <= 7) {
      setFormData(prev => ({ ...prev, quantity: num }));
    } else if (!isNaN(num) && num > 7) {
      setFormData(prev => ({ ...prev, quantity: 7 }));
    }
  };

  const handleQuantityBlur = () => {
    if (formData.quantity === '' || formData.quantity < 1) {
      setFormData(prev => ({ ...prev, quantity: 1 }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const generatePlan = async () => {
    if (!formData.brand || formData.theme.length === 0 || !formData.platform || !formData.objective) {
      toast.error('Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }

    if (creditsRemaining <= 0) {
      toast.error('Você não possui créditos suficientes para planejamento');
      return;
    }

    setLoading(true);

    try {
      // Validate session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error('Sessão expirada. Faça login novamente.');
        setLoading(false);
        navigate('/login');
        return;
      }

      console.log('Calling generate-plan with valid session');
      
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          brand: formData.brand,
          themes: formData.theme,
          platform: formData.platform,
          quantity: formData.quantity,
          objective: formData.objective,
          additionalInfo: formData.additionalInfo,
          userId: user?.id,
          teamId: team?.id
        }
      });

      if (error) {
        console.error('Function invocation error:', error);
        
        // Handle specific error cases
        if (error.message?.includes('JWT')) {
          toast.error('Sessão inválida. Fazendo login novamente...');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }
        
        throw error;
      }

      if (data.error) {
        console.error('Business logic error:', data.error);
        
        if (data.error.includes('Créditos insuficientes')) {
          toast.error('Créditos insuficientes para planejamento');
        } else if (data.error.includes('Rate limit')) {
          toast.error('Muitas requisições. Aguarde um momento.');
        } else {
          toast.error('Erro ao gerar planejamento: ' + data.error);
        }
        return;
      }

      // Navigate to result page with the generated plan
      navigate('/plan-result', { 
        state: { 
          plan: data.plan,
          actionId: data.actionId
        } 
      });

      // Update local credits
      setCreditsRemaining(data.creditsRemaining);
      toast.success('Planejamento gerado com sucesso!');

    } catch (err: any) {
      console.error('Error generating plan:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('network')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else if (err.message?.includes('timeout')) {
        toast.error('Tempo esgotado. Tente novamente.');
      } else {
        toast.error('Erro ao gerar planejamento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full w-full p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2 sm:p-3">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl lg:text-3xl font-bold truncate">Planejar Conteúdo</h1>
                  <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
                    Preencha os campos para gerar seu planejamento de posts
                  </p>
                </div>
              </div>
              
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 flex-shrink-0 w-full sm:w-auto">
                <CardContent className="p-3 sm:p-4">
                  {isLoadingData ? (
                    <Skeleton className="h-12 w-40" />
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-left gap-4 flex justify-center items-center">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {creditsRemaining}
                        </span>
                        <p className="text-md text-muted-foreground font-medium leading-tight">
                          Revisões Restantes
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardHeader>
        </Card>

          {/* Configuration Form */}
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Configuração Básica
              </h2>
              <p className="text-muted-foreground text-sm">Defina marca, tema e plataforma</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-8">
              <div className="space-y-8">
                {/* Primary Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="brand" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Marca *
                    </Label>
                    {isLoadingData ? (
                      <Skeleton className="h-12 w-full rounded-2xl" />
                    ) : (
                      <Select onValueChange={handleBrandChange} value={formData.brand}>
                        <SelectTrigger className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors">
                          <SelectValue placeholder="Selecione a marca" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/20 bg-background/95 backdrop-blur-sm">
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id} className="rounded-xl">
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="platform" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                      Plataforma *
                    </Label>
                    {isLoadingData ? (
                      <Skeleton className="h-12 w-full rounded-2xl" />
                    ) : (
                      <Select onValueChange={handlePlatformChange} value={formData.platform}>
                        <SelectTrigger className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-secondary/30 transition-colors">
                          <SelectValue placeholder="Selecione a plataforma" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/20 bg-background/95 backdrop-blur-sm">
                          <SelectItem value="instagram" className="rounded-xl">📷 Instagram</SelectItem>
                          <SelectItem value="facebook" className="rounded-xl">👥 Facebook</SelectItem>
                          <SelectItem value="linkedin" className="rounded-xl">💼 LinkedIn</SelectItem>
                          <SelectItem value="twitter" className="rounded-xl">🐦 Twitter (X)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      Quantidade de Posts *
                    </Label>
                    {isLoadingData ? (
                      <Skeleton className="h-12 w-full rounded-2xl" />
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
                        className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-accent/30 transition-colors text-center font-semibold"
                      />
                    )}
                  </div>
                </div>

                {/* Theme Selection Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Temas Estratégicos *
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                      {formData.theme.length} selecionados
                    </span>
                  </div>
                  
                  {isLoadingData ? (
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  ) : (
                    <Select onValueChange={handleThemeSelect} value="" disabled={!formData.brand || filteredThemes.length === 0}>
                      <SelectTrigger className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors disabled:opacity-50">
                        <SelectValue placeholder={!formData.brand ? "Primeiro, escolha a marca" : "Adicionar tema estratégico"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/20 bg-background/95 backdrop-blur-sm">
                        {filteredThemes.map((t) => (
                          <SelectItem 
                            key={t.id} 
                            value={t.id} 
                            disabled={formData.theme.includes(t.id)} 
                            className="rounded-xl"
                          >
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Selected Themes Display */}
                  <div className="relative">
                    {formData.theme.length === 0 ? (
                      <div className="flex items-center justify-center min-h-[80px] rounded-2xl border-2 border-dashed border-border/30 bg-muted/10 transition-all hover:bg-muted/20">
                        <div className="text-center space-y-2">
                          <div className="w-8 h-8 rounded-full bg-muted/40 mx-auto flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
                          </div>
                          <p className="text-sm text-muted-foreground">Nenhum tema selecionado</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                        {formData.theme.map((themeId, index) => {
                          const theme = themes.find(t => t.id === themeId);
                          return (
                            <div 
                              key={themeId} 
                              className="group flex items-center justify-between bg-background/80 backdrop-blur-sm border border-primary/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all hover:scale-105 animate-fade-in"
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">{theme?.title || themeId}</span>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Planning Details */}
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-accent/5">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                Detalhes do Planejamento
              </h2>
              <p className="text-muted-foreground text-sm">Descreva os objetivos e informações adicionais</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <Label htmlFor="objective" className="text-sm font-semibold text-foreground">Objetivo dos Posts *</Label>
                  <Textarea 
                    id="objective" 
                    placeholder="Ex: Gerar engajamento, educar o público, aumentar vendas..." 
                    value={formData.objective} 
                    onChange={handleInputChange} 
                    className="h-32 sm:h-48 lg:h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="additionalInfo" className="text-sm font-semibold text-foreground">Informações Adicionais</Label>
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
          <div className="mt-4 sm:mt-8">
            <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border border-border/20 rounded-2xl shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center gap-4">
                  <Button 
                    onClick={generatePlan} 
                    disabled={loading || !formData.brand || formData.theme.length === 0 || !formData.platform || !formData.objective} 
                    className="w-full max-w-lg h-12 sm:h-14 rounded-2xl text-base sm:text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-secondary hover:from-primary/90 shadow-xl transition-all duration-500 disabled:opacity-50"
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
        </div>
      </div>
    );
};

export default PlanContent;