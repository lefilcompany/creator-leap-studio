import { useState, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, Image as ImageIcon, FileText, Type, Sparkles, CheckCircle, Zap } from 'lucide-react';
import type { Brand } from '@/types/brand';
import type { StrategicTheme, Team } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Tipos para os dados leves do formulário
type LightBrand = Pick<Brand, 'id' | 'name'>;
type LightTheme = Pick<StrategicTheme, 'id' | 'title' | 'brandId'>;

type ReviewType = 'image' | 'caption' | 'text-for-image';

const ReviewContent = () => {
  const navigate = useNavigate();
  const { user, team: authTeam } = useAuth();
  const [reviewType, setReviewType] = useState<ReviewType | null>(null);
  const [brand, setBrand] = useState('');
  const [theme, setTheme] = useState('');
  const [adjustmentsPrompt, setAdjustmentsPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [textForImage, setTextForImage] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<LightBrand[]>([]);
  const [themes, setThemes] = useState<LightTheme[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredThemes, setFilteredThemes] = useState<LightTheme[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !authTeam) return;
      
      try {
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name')
          .eq('team_id', authTeam.id);

        if (brandsError) throw brandsError;
        setBrands(brandsData || []);

        const { data: themesData, error: themesError } = await supabase
          .from('strategic_themes')
          .select('id, title, brand_id')
          .eq('team_id', authTeam.id);

        if (themesError) throw themesError;
        setThemes(themesData?.map(t => ({ id: t.id, title: t.title, brandId: t.brand_id })) || []);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user, authTeam]);

  useEffect(() => {
    if (brand) {
      const selectedBrand = brands.find(b => b.id === brand);
      setFilteredThemes(selectedBrand ? themes.filter(t => t.brandId === selectedBrand.id) : []);
    } else {
      setFilteredThemes([]);
    }
  }, [brand, brands, themes]);

  const handleBrandChange = (value: string) => {
    setBrand(value);
    setTheme('');
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("O arquivo de imagem não pode exceder 4MB.");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!user || !authTeam) return;
    if (!brand) return setError('Por favor, selecione uma marca');
    
    if ((authTeam.credits?.contentReviews || 0) <= 0) {
      return toast.error('Seus créditos para revisões de conteúdo acabaram.');
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      const selectedBrand = brands.find(b => b.id === brand);
      const selectedTheme = theme ? themes.find(t => t.id === theme) : null;

      if (reviewType === 'image') {
        if (!imageFile || !adjustmentsPrompt) {
          setError('Por favor, envie uma imagem e descreva os ajustes');
          setLoading(false);
          return;
        }

        const base64Image = await convertImageToBase64(imageFile);
        
        const { data, error: functionError } = await supabase.functions.invoke('review-image', {
          body: {
            image: base64Image,
            prompt: adjustmentsPrompt,
            brandName: selectedBrand?.name,
            themeName: selectedTheme?.title,
          }
        });

        if (functionError) throw functionError;
        result = data;

      } else if (reviewType === 'caption') {
        if (!captionText || !adjustmentsPrompt) {
          setError('Por favor, insira a legenda e descreva o que deseja melhorar');
          setLoading(false);
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('review-caption', {
          body: {
            caption: captionText,
            prompt: adjustmentsPrompt,
            brandName: selectedBrand?.name,
            themeName: selectedTheme?.title,
          }
        });

        if (functionError) throw functionError;
        result = data;

      } else if (reviewType === 'text-for-image') {
        if (!textForImage || !adjustmentsPrompt) {
          setError('Por favor, insira o texto e descreva o contexto desejado');
          setLoading(false);
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('review-text-for-image', {
          body: {
            text: textForImage,
            prompt: adjustmentsPrompt,
            brandName: selectedBrand?.name,
            themeName: selectedTheme?.title,
          }
        });

        if (functionError) throw functionError;
        result = data;
      }

      if (result?.review) {
        navigate('/review-result', {
          state: {
            reviewType,
            review: result.review,
            originalContent: reviewType === 'image' ? previewUrl : reviewType === 'caption' ? captionText : textForImage,
            brandName: selectedBrand?.name,
            themeName: selectedTheme?.title,
            actionId: result.actionId
          }
        });
      }

    } catch (err: any) {
      console.error('Error during review:', err);
      toast.error('Erro ao processar revisão');
      setError('Erro ao processar revisão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReviewType(null);
    setBrand('');
    setTheme('');
    setAdjustmentsPrompt('');
    setImageFile(null);
    setPreviewUrl(null);
    setCaptionText('');
    setTextForImage('');
    setError(null);
  };

  return (
    <div className="min-h-full w-full p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Revisar Conteúdo</h1>
                  <p className="text-muted-foreground text-base">
                    {!reviewType ? 'Escolha o tipo de revisão que deseja fazer' : 
                     reviewType === 'image' ? 'Receba sugestões da IA para aprimorar sua imagem' :
                     reviewType === 'caption' ? 'Melhore sua legenda com sugestões da IA' :
                     'Otimize seu texto para gerar imagens impactantes'}
                  </p>
                </div>
              </div>
              {isLoadingData ? (
                <Skeleton className="h-14 w-full sm:w-40 rounded-xl" />
              ) : authTeam && (
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 flex-shrink-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-left gap-4 flex justify-center items-center">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {authTeam.credits?.contentReviews || 0}
                        </span>
                        <p className="text-md text-muted-foreground font-medium leading-tight">
                          Revisões Restantes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        {!reviewType && (
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Tipo de Revisão
              </h2>
              <p className="text-muted-foreground text-sm">Selecione o que você deseja revisar com IA</p>
            </CardHeader>
            <CardContent className="p-6">
              <RadioGroup value={reviewType || ''} onValueChange={(value) => setReviewType(value as ReviewType)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label htmlFor="image" className="cursor-pointer h-full">
                    <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                      <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                        <RadioGroupItem value="image" id="image" className="sr-only" />
                        <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Revisar Imagem</h3>
                            <p className="text-sm text-muted-foreground">Envie uma imagem e receba sugestões de melhorias visuais</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>

                  <label htmlFor="caption" className="cursor-pointer h-full">
                    <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                      <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                        <RadioGroupItem value="caption" id="caption" className="sr-only" />
                        <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-8 w-8 text-secondary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Revisar Legenda</h3>
                            <p className="text-sm text-muted-foreground">Melhore legendas existentes com sugestões da IA</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>

                  <label htmlFor="text-for-image" className="cursor-pointer h-full">
                    <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                      <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                        <RadioGroupItem value="text-for-image" id="text-for-image" className="sr-only" />
                        <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Type className="h-8 w-8 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Revisar Texto para Imagem</h3>
                            <p className="text-sm text-muted-foreground">Otimize textos descritivos para geração de imagens</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {reviewType && (
          <>

            <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Configuração Básica
                </h2>
                <p className="text-muted-foreground text-sm">Defina marca e tema para contextualizar a IA</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="brand" className="text-sm font-semibold text-foreground">Marca <span className="text-red-600">*</span></Label>
                    {isLoadingData ? <Skeleton className="h-11 w-full rounded-xl" /> : (
                      <Select onValueChange={handleBrandChange} value={brand}>
                        <SelectTrigger className="h-11 rounded-xl border-2 border-border/50 bg-background/50">
                          <SelectValue placeholder="Selecione a marca" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/20">
                          {brands.map((b) => <SelectItem key={b.id} value={b.id} className="rounded-lg">{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="theme" className="text-sm font-semibold text-foreground">Tema Estratégico (Opcional)</Label>
                    {isLoadingData ? <Skeleton className="h-11 w-full rounded-xl" /> : (
                      <Select onValueChange={setTheme} value={theme} disabled={!brand || filteredThemes.length === 0}>
                        <SelectTrigger className="h-11 rounded-xl border-2 border-border/50 bg-background/50 disabled:opacity-50">
                          <SelectValue placeholder={!brand ? "Primeiro, escolha a marca" : "Selecione o tema"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/20">
                          {filteredThemes.map((t) => <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-accent/5">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  {reviewType === 'image' && 'Análise da Imagem'}
                  {reviewType === 'caption' && 'Revisão da Legenda'}
                  {reviewType === 'text-for-image' && 'Revisão de Texto para Imagem'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {reviewType === 'image' && 'Envie a imagem e descreva o que precisa melhorar'}
                  {reviewType === 'caption' && 'Cole a legenda e descreva como quer melhorá-la'}
                  {reviewType === 'text-for-image' && 'Cole o texto e descreva o contexto da imagem desejada'}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {reviewType === 'image' && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="file-upload" className="text-sm font-semibold text-foreground">Sua Imagem *</Label>
                        <div className="relative mt-2 flex justify-center rounded-xl border-2 border-dashed border-border/50 p-8 h-64 items-center">
                          <div className="text-center w-full">
                            {previewUrl ? (
                              <img src={previewUrl} alt="Pré-visualização" className="mx-auto h-48 w-auto rounded-lg object-contain" />
                            ) : (
                              <>
                                <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground/50" />
                                <p className="mt-4 text-base text-muted-foreground">Arraste e solte ou clique para enviar</p>
                              </>
                            )}
                            <input id="file-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/png, image/jpeg" onChange={handleImageChange} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="adjustmentsPrompt" className="text-sm font-semibold text-foreground">O que você gostaria de ajustar? *</Label>
                        <Textarea 
                          id="adjustmentsPrompt" 
                          placeholder="Descreva o objetivo e o que você espera da imagem. Ex: 'Quero que a imagem transmita mais energia e seja mais vibrante'" 
                          value={adjustmentsPrompt} 
                          onChange={(e) => setAdjustmentsPrompt(e.target.value)} 
                          className="h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                        />
                      </div>
                    </>
                  )}

                  {reviewType === 'caption' && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="captionText" className="text-sm font-semibold text-foreground">Sua Legenda *</Label>
                        <Textarea 
                          id="captionText" 
                          placeholder="Cole aqui a legenda que você quer melhorar..." 
                          value={captionText} 
                          onChange={(e) => setCaptionText(e.target.value)} 
                          className="h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="adjustmentsPrompt" className="text-sm font-semibold text-foreground">O que você quer melhorar? *</Label>
                        <Textarea 
                          id="adjustmentsPrompt" 
                          placeholder="Descreva como quer melhorar a legenda. Ex: 'Tornar mais engajadora e adicionar call-to-action'" 
                          value={adjustmentsPrompt} 
                          onChange={(e) => setAdjustmentsPrompt(e.target.value)} 
                          className="h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                        />
                      </div>
                    </>
                  )}

                  {reviewType === 'text-for-image' && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="textForImage" className="text-sm font-semibold text-foreground">Texto Descritivo *</Label>
                        <Textarea 
                          id="textForImage" 
                          placeholder="Cole o texto que será usado para gerar a imagem..." 
                          value={textForImage} 
                          onChange={(e) => setTextForImage(e.target.value)} 
                          className="h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="adjustmentsPrompt" className="text-sm font-semibold text-foreground">Contexto da Imagem *</Label>
                        <Textarea 
                          id="adjustmentsPrompt" 
                          placeholder="Descreva o tipo de imagem que você quer gerar. Ex: 'Imagem para Instagram, estilo moderno e minimalista'" 
                          value={adjustmentsPrompt} 
                          onChange={(e) => setAdjustmentsPrompt(e.target.value)} 
                          className="h-64 rounded-xl border-2 border-border/50 bg-background/50 resize-none" 
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border border-border/20 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-4 w-full max-w-lg">
                      <Button 
                        onClick={handleReset} 
                        variant="outline"
                        className="flex-1 h-14 rounded-2xl text-lg font-bold border-2 hover:bg-accent/20 hover:text-accent hover:border-accent"
                      >
                        Voltar
                      </Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !brand || !adjustmentsPrompt || 
                          (reviewType === 'image' && !imageFile) ||
                          (reviewType === 'caption' && !captionText) ||
                          (reviewType === 'text-for-image' && !textForImage)
                        } 
                        className="flex-1 h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-secondary hover:from-primary/90 shadow-xl transition-all duration-500 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader className="animate-spin mr-3 h-5 w-5" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-3 h-5 w-5" />
                            <span>Gerar Revisão</span>
                          </>
                        )}
                      </Button>
                    </div>
                    {error && <p className="text-destructive mt-4 text-center text-base">{error}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewContent;