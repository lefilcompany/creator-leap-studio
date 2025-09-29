import { useState, useEffect } from "react";
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
  const [formData, setFormData] = useState<FormData>({
    brand: '',
    theme: [],
    platform: '',
    quantity: 1,
    objective: '',
    additionalInfo: '',
  });

  const [plannedContent, setPlannedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isResultView, setIsResultView] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState(false);

  // Mock brands and themes for now
  const brands = [
    { id: "1", name: "Açúcar Petribu" },
    { id: "2", name: "Cerâmica Brennand" },
    { id: "3", name: "Iclub" }
  ];

  const themes = [
    { id: "1", title: "Receitas tradicionais", brandId: "1" },
    { id: "2", title: "Momentos em família", brandId: "1" },
    { id: "3", title: "Tradição e memória", brandId: "1" },
    { id: "4", title: "Arte e Design", brandId: "2" },
    { id: "5", title: "Cultura Pernambucana", brandId: "2" },
    { id: "6", title: "Inovação e Tecnologia", brandId: "3" },
  ];

  const filteredThemes = formData.brand 
    ? themes.filter(t => t.brandId === brands.find(b => b.name === formData.brand)?.id)
    : [];

  const handleBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, brand: value, theme: [] }));
  };

  const handleThemeSelect = (value: string) => {
    if (value && !formData.theme.includes(value)) {
      setFormData(prev => ({ ...prev, theme: [...prev.theme, value] }));
    }
  };

  const handleThemeRemove = (themeToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      theme: prev.theme.filter(t => t !== themeToRemove) 
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

  const handleGoBackToForm = () => {
    setIsResultView(false);
    setPlannedContent(null);
    setError(null);
  };

  const handleCopy = () => {
    if (!plannedContent) return;
    navigator.clipboard.writeText(plannedContent).then(() => {
      setIsCopied(true);
      toast.success('Conteúdo copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => toast.error('Falha ao copiar.'));
  };

  const generatePlan = async () => {
    if (!formData.brand || formData.theme.length === 0 || !formData.platform || !formData.objective) {
      toast.error('Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }

    setLoading(true);
    setError(null);
    setPlannedContent(null);
    setIsResultView(true);

    try {
      // Simulate AI planning generation with mock content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockPlan = `
        <h2>📅 Planejamento de Conteúdo - ${formData.brand}</h2>
        <p><strong>Plataforma:</strong> ${formData.platform}</p>
        <p><strong>Quantidade:</strong> ${formData.quantity} posts</p>
        <p><strong>Temas:</strong> ${formData.theme.join(', ')}</p>
        
        <h3>🎯 Objetivo</h3>
        <p>${formData.objective}</p>
        
        ${formData.additionalInfo ? `<h3>ℹ️ Informações Adicionais</h3><p>${formData.additionalInfo}</p>` : ''}
        
        <h3>📝 Posts Sugeridos</h3>
        ${Array.from({ length: Number(formData.quantity) }, (_, i) => `
          <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #3b82f6;">
            <h4>Post ${i + 1}</h4>
            <p><strong>Tema:</strong> ${formData.theme[i % formData.theme.length]}</p>
            <p><strong>Conteúdo:</strong> Post sugerido para ${formData.brand} focado em ${formData.theme[i % formData.theme.length].toLowerCase()}. Desenvolva uma abordagem criativa que conecte com o objetivo de ${formData.objective.toLowerCase()}.</p>
            <p><strong>Hashtags:</strong> #${formData.brand.replace(/\s+/g, '').toLowerCase()} #${formData.theme[i % formData.theme.length].replace(/\s+/g, '').toLowerCase()} #conteudo</p>
          </div>
        `).join('')}
      `;
      
      setPlannedContent(mockPlan);
      toast.success('Planejamento gerado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar planejamento');
      toast.error('Erro ao gerar planejamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isResultView) {
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
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left min-w-0">
                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent block">
                          ∞
                        </span>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight">
                          Planejamentos Restantes
                        </p>
                      </div>
                    </div>
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
                    <Select onValueChange={handleBrandChange} value={formData.brand}>
                      <SelectTrigger className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors">
                        <SelectValue placeholder="Selecione a marca" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/20 bg-background/95 backdrop-blur-sm">
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.name} className="rounded-xl">
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="platform" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                      Plataforma *
                    </Label>
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
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      Quantidade de Posts *
                    </Label>
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
                  
                  <Select onValueChange={handleThemeSelect} value="" disabled={!formData.brand || filteredThemes.length === 0}>
                    <SelectTrigger className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors disabled:opacity-50">
                      <SelectValue placeholder={!formData.brand ? "Primeiro, escolha a marca" : "Adicionar tema estratégico"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/20 bg-background/95 backdrop-blur-sm">
                      {filteredThemes.map((t) => (
                        <SelectItem 
                          key={t.id} 
                          value={t.title} 
                          disabled={formData.theme.includes(t.title)} 
                          className="rounded-xl"
                        >
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
                        {formData.theme.map((t, index) => (
                          <div 
                            key={t} 
                            className="group flex items-center justify-between bg-background/80 backdrop-blur-sm border border-primary/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all hover:scale-105 animate-fade-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <span className="text-sm font-medium text-foreground truncate flex-1 mr-2">{t}</span>
                            <button 
                              onClick={() => handleThemeRemove(t)} 
                              className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center group-hover:scale-110" 
                              aria-label={`Remover tema ${t}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
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
                  {error && <p className="text-destructive mt-4 text-center text-sm sm:text-base max-w-lg">{error}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Result View
  return (
    <div className="min-h-full p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Result Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-secondary/5 via-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-3">
                  <MessageSquareQuote className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Planejar Conteúdo</h1>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Gere seu calendário de posts com IA
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleGoBackToForm} variant="outline" className="rounded-xl px-4 py-2 border-2 border-primary/30">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Criar Novo
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Result Content */}
        <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5 flex flex-row items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Resultado do Planejamento
              </h2>
              <p className="text-muted-foreground text-sm">Conteúdo gerado com base nos seus parâmetros</p>
            </div>
            {plannedContent && !loading && (
              <Button onClick={handleCopy} variant="outline" size="sm" className="rounded-lg">
                {isCopied ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Clipboard className="h-4 w-4 mr-2" />
                )}
                {isCopied ? 'Copiado!' : 'Copiar Texto'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="w-full min-h-[500px] bg-card rounded-2xl p-6 shadow-inner border border-border/20 flex flex-col overflow-hidden">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="animate-pulse">
                    <MessageSquareQuote size={64} className="text-primary" />
                  </div>
                  <p className="mt-4 text-muted-foreground text-lg">Gerando seu planejamento...</p>
                </div>
              )}
              {plannedContent && !loading && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-left overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: plannedContent }}
                />
              )}
              {error && !loading && (
                <p className="text-destructive p-4 text-center text-base">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanContent;