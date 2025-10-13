import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Sparkles, Zap, X, ImageIcon, Settings2, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Brand } from "@/types/brand";
import { getPlatformImageSpec } from "@/lib/platformSpecs";
export default function QuickContent() {
  const navigate = useNavigate();
  const {
    user,
    team
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [credits, setCredits] = useState(0);
  const [formData, setFormData] = useState({
    prompt: "",
    brandId: "",
    platform: "",
    aspectRatio: "1:1",
    style: "auto",
    quality: "standard"
  });
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      setReferenceFiles(prev => [...prev, ...files].slice(0, 5));
      toast.success(`${files.length} imagem(ns) adicionada(s)`);
    }
  };
  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = referenceFiles.filter((_, index) => index !== indexToRemove);
    setReferenceFiles(updatedFiles);

    // Atualizar índices de preservação
    setPreserveImageIndices(prev => prev.filter(idx => idx !== indexToRemove).map(idx => idx > indexToRemove ? idx - 1 : idx));
    if (updatedFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleTogglePreserve = (index: number) => {
    setPreserveImageIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(idx => idx !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  useEffect(() => {
    if (team) {
      loadData();
    }
  }, [team]);
  const loadData = async () => {
    try {
      setLoadingData(true);

      // Carregar todos os dados em paralelo
      const [{
        data: brandsData,
        error: brandsError
      }, {
        data: teamData,
        error: teamError
      }] = await Promise.all([supabase.from("brands").select("*").eq("team_id", team?.id).order("name"), supabase.from("teams").select("credits_quick_content").eq("id", team?.id).single()]);
      if (brandsError) throw brandsError;
      if (teamError) throw teamError;
      setBrands((brandsData || []) as any);
      setCredits(teamData?.credits_quick_content || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoadingData(false);
    }
  };
  const generateQuickContent = async () => {
    if (!formData.prompt.trim()) {
      toast.error("Por favor, descreva o que deseja criar");
      return;
    }
    if (credits <= 0) {
      toast.error("Você não possui créditos suficientes para criação rápida");
      return;
    }
    try {
      setLoading(true);
      const toastId = toast.loading("Preparando criação...", {
        description: "Processando suas configurações."
      });

      // Convert reference images to base64 if any
      const referenceImagesBase64: string[] = [];
      const preserveImages: string[] = [];
      const styleReferenceImages: string[] = [];
      if (referenceFiles.length > 0) {
        toast.loading("Processando imagens de referência...", {
          id: toastId,
          description: `${referenceFiles.length} imagem(ns) sendo processadas.`
        });
        for (let i = 0; i < referenceFiles.length; i++) {
          const file = referenceFiles[i];
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          referenceImagesBase64.push(base64);

          // Separar imagens a preservar de imagens de referência de estilo
          if (preserveImageIndices.includes(i)) {
            preserveImages.push(base64);
          } else {
            styleReferenceImages.push(base64);
          }
        }
      }
      toast.loading("Gerando conteúdo com IA...", {
        id: toastId,
        description: "Criando sua imagem personalizada."
      });
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-quick-content", {
        body: {
          prompt: formData.prompt,
          brandId: formData.brandId || null,
          platform: formData.platform || null,
          referenceImages: referenceImagesBase64,
          preserveImages,
          styleReferenceImages,
          aspectRatio: formData.aspectRatio,
          style: formData.style,
          quality: formData.quality
        }
      });
      if (error) {
        console.error("Error generating content:", error);
        throw error;
      }

      // Update credits
      setCredits(data.creditsRemaining);
      toast.success("Conteúdo gerado com sucesso!", {
        id: toastId
      });

      // Navigate to result page
      navigate("/quick-content-result", {
        state: {
          imageUrl: data.imageUrl,
          description: data.description,
          actionId: data.actionId,
          prompt: formData.prompt
        }
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao gerar conteúdo");
    } finally {
      setLoading(false);
    }
  };
  if (loadingData) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                  <Zap className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                    Criação Rápida
                  </h1>
                  <p className="text-muted-foreground text-xs md:text-sm lg:text-base">
                    Gere imagens rapidamente com IA
                  </p>
                </div>
              </div>
              {!loadingData && <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex-shrink-0">
                  <CardContent className="p-2.5 md:p-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                          {credits}
                        </span>
                        <p className="text-sm text-muted-foreground font-medium leading-tight whitespace-nowrap">
                          Créditos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>}
            </div>
          </CardHeader>
        </Card>

        {/* Main Form */}
        <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-2xl">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-3 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Configure sua criação
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">
              Descreva o que deseja criar e personalize as opções
            </p>
          </CardHeader>
          <CardContent className="space-y-5 md:space-y-6 p-4 md:p-6">
            {/* Brand Selection (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm font-semibold text-foreground">
                Marca <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={formData.brandId} onValueChange={value => setFormData({
              ...formData,
              brandId: value
            })}>
                <SelectTrigger id="brand" className="h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors">
                  <SelectValue placeholder="Nenhuma marca selecionada" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/20">
                  {brands.map(brand => <SelectItem key={brand.id} value={brand.id} className="rounded-lg">
                      {brand.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Selecionar uma marca ajuda a IA a criar conteúdo alinhado com sua identidade visual</span>
              </p>
            </div>

            {/* Platform Selection (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-sm font-semibold text-foreground">
                Plataforma <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={formData.platform} onValueChange={value => {
              setFormData({
                ...formData,
                platform: value
              });

              // Auto-sugerir aspect ratio baseado na plataforma
              const imageSpec = getPlatformImageSpec(value, "feed", "organic");
              if (imageSpec) {
                setFormData(prev => ({
                  ...prev,
                  aspectRatio: imageSpec.aspectRatio
                }));
                toast.info(`Proporção ajustada para ${value}`, {
                  description: `${imageSpec.aspectRatio} (${imageSpec.width}x${imageSpec.height}px)`,
                  duration: 3000
                });
              }
            }}>
                <SelectTrigger id="platform" className="h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors">
                  <SelectValue placeholder="Nenhuma plataforma selecionada" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/20">
                  <SelectItem value="Instagram" className="rounded-lg">Instagram</SelectItem>
                  <SelectItem value="Facebook" className="rounded-lg">Facebook</SelectItem>
                  <SelectItem value="TikTok" className="rounded-lg">TikTok</SelectItem>
                  <SelectItem value="Twitter/X" className="rounded-lg">Twitter/X</SelectItem>
                  <SelectItem value="LinkedIn" className="rounded-lg">LinkedIn</SelectItem>
                  <SelectItem value="Comunidades" className="rounded-lg">Comunidades</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Selecionar plataforma ajusta automaticamente a proporção ideal</span>
              </p>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-semibold text-foreground">
                Descreva o que você quer criar <span className="text-destructive">*</span>
              </Label>
              <Textarea id="prompt" placeholder="Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com uma estética minimalista e moderna. Cores quentes, iluminação natural suave..." value={formData.prompt} onChange={e => setFormData({
              ...formData,
              prompt: e.target.value
            })} rows={6} className="resize-none rounded-xl border-2 border-border/50 bg-background/50 hover:border-border/70 focus:border-primary/50 transition-colors" />
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Seja específico sobre cena, iluminação, cores e estilo desejado</span>
              </p>
            </div>

            {/* Reference Images (Optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagens de Referência <span className="text-muted-foreground font-normal">(opcional, máx. 5)</span>
              </Label>
              
              <div className="space-y-3">
                <Input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => {
                const files = Array.from(e.target.files || []);
                setReferenceFiles(prev => [...prev, ...files].slice(0, 5));
              }} className="h-12 rounded-xl border-2 border-border/50 bg-background/50 file:mr-4 file:h-full file:py-0 file:px-5 file:rounded-l-[10px] file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 hover:border-primary/30 transition-all cursor-pointer" />

                <div ref={pasteAreaRef} tabIndex={0} onPaste={handlePaste} className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Cole suas imagens aqui (Ctrl+V)
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    ou clique para selecionar arquivos
                  </p>
                </div>

                {referenceFiles.length > 0 && <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-xs font-semibold text-primary mb-2">
                      {referenceFiles.length} imagem(ns) selecionada(s):
                    </p>
                    <div className="space-y-2">
                      {referenceFiles.map((file, idx) => <div key={idx} className="bg-background/50 rounded-lg p-3 group hover:bg-background transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-foreground font-medium flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                              <span className="truncate">{file.name}</span>
                            </span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveFile(idx)} className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 pl-4">
                            <input type="checkbox" id={`preserve-${idx}`} checked={preserveImageIndices.includes(idx)} onChange={() => handleTogglePreserve(idx)} className="h-4 w-4 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/50" />
                            <Label htmlFor={`preserve-${idx}`} className="text-xs text-muted-foreground cursor-pointer">Preservar traços desta imagem na geração final</Label>
                          </div>
                        </div>)}
                    </div>
                  </div>}
              </div>
              <div className="bg-accent/30 border border-accent/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  Como usar imagens de referência:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                  <li><strong>Sem marcação:</strong> A IA usa apenas como inspiração de estilo, cores e composição</li>
                  <li><strong>Com marcação "Preservar traços":</strong> A IA mantém os elementos visuais originais da imagem no resultado final</li>
                </ul>
              </div>
            </div>

            {/* Advanced Options (Accordion) */}
            <Accordion type="single" collapsible className="border-2 border-border/30 rounded-xl overflow-hidden">
              <AccordionItem value="advanced" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <span>Opções Avançadas</span>
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4 bg-muted/20">
                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio" className="text-sm font-medium text-foreground">
                      Proporção da Imagem
                    </Label>
                    <Select value={formData.aspectRatio} onValueChange={value => setFormData({
                    ...formData,
                    aspectRatio: value
                  })}>
                      <SelectTrigger id="aspectRatio" className="h-10 rounded-lg border-border/50 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="1:1">Quadrado (1:1) - Instagram Post</SelectItem>
                        <SelectItem value="4:5">Retrato (4:5) - Instagram Feed</SelectItem>
                        <SelectItem value="9:16">Vertical (9:16) - Stories/Reels</SelectItem>
                        <SelectItem value="16:9">Horizontal (16:9) - YouTube/Desktop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Style */}
                  <div className="space-y-2">
                    <Label htmlFor="style" className="text-sm font-medium text-foreground">
                      Estilo Visual
                    </Label>
                    <Select value={formData.style} onValueChange={value => setFormData({
                    ...formData,
                    style: value
                  })}>
                      <SelectTrigger id="style" className="h-10 rounded-lg border-border/50 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="auto">Automático (baseado no prompt)</SelectItem>
                        <SelectItem value="photorealistic">Fotorrealista</SelectItem>
                        <SelectItem value="illustration">Ilustração</SelectItem>
                        <SelectItem value="minimalist">Minimalista</SelectItem>
                        <SelectItem value="artistic">Artístico/Abstrato</SelectItem>
                        <SelectItem value="vintage">Vintage/Retrô</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quality */}
                  <div className="space-y-2">
                    <Label htmlFor="quality" className="text-sm font-medium text-foreground">
                      Qualidade da Geração
                    </Label>
                    <Select value={formData.quality} onValueChange={value => setFormData({
                    ...formData,
                    quality: value
                  })}>
                      <SelectTrigger id="quality" className="h-10 rounded-lg border-border/50 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="standard">Padrão (mais rápido)</SelectItem>
                        <SelectItem value="hd">Alta Definição (melhor qualidade)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Alta definição leva mais tempo mas produz resultados mais detalhados
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex justify-end pb-6">
          <Button onClick={generateQuickContent} disabled={loading || !formData.prompt.trim() || credits <= 0} size="lg" className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg">
            {loading ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando...
              </> : <>
                <Zap className="mr-2 h-5 w-5" />
                Gerar Conteúdo
              </>}
          </Button>
        </div>
      </div>
    </div>;
}