import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, X, ImageIcon, Settings2, Info, Coins } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Brand } from "@/types/brand";
import { getPlatformImageSpec, platformSpecs, ASPECT_RATIO_DIMENSIONS } from "@/lib/platformSpecs";
import { processImageToAspectRatio } from "@/lib/imageProcessing";
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { TourSelector } from "@/components/onboarding/TourSelector";
import { quickContentSteps, navbarSteps } from "@/components/onboarding/tourSteps";
import { AspectRatioPreview } from "@/components/AspectRatioPreview";
import { CreationStep } from "@/types/canvas";
import { CreationStepper } from "@/components/canvas/CreationStepper";
import { ImageAdjustment } from "@/components/canvas/ImageAdjustment";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { FinalizeView } from "@/components/canvas/FinalizeView";

export default function QuickContent() {
  const navigate = useNavigate();
  const {
    user,
    team,
    refreshTeamCredits
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    prompt: "",
    brandId: "",
    platform: "",
    aspectRatio: "1:1",
    style: "auto",
    quality: "standard",
    // Advanced configurations
    negativePrompt: "",
    colorPalette: "auto",
    lighting: "natural",
    composition: "auto",
    cameraAngle: "eye_level",
    detailLevel: 7,
    mood: "auto",
    width: "",
    height: ""
  });
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  
  // Multi-step canvas flow states
  const [currentStep, setCurrentStep] = useState<CreationStep>(CreationStep.INFORMATIONS);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [adjustedImages, setAdjustedImages] = useState<string[]>([]);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [captionData, setCaptionData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Persistência de formulário
  const { loadPersistedData, clearPersistedData, hasRelevantData } = useFormPersistence({
    key: 'quick-content-form',
    formData,
    excludeFields: ['referenceFiles'] // Não persistir arquivos
  });

  // Carregar dados persistidos na montagem
  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setFormData(prev => ({ ...prev, ...persisted }));
      
      // Só mostrar toast se houver dados realmente relevantes
      if (hasRelevantData(persisted)) {
        toast.info('Rascunho recuperado', {
          description: 'Continuando de onde você parou'
        });
      }
    }
  }, []);

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

      // Carregar marcas
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .eq("team_id", team?.id)
        .order("name");
        
      if (brandsError) throw brandsError;
      setBrands((brandsData || []) as any);
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
    if ((team?.credits || 0) <= 0) {
      toast.error("Você não possui créditos suficientes para criação rápida");
      return;
    }
    try {
      setLoading(true);
      setCurrentStep(CreationStep.GENERATE_IMAGE);
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
          quality: formData.quality,
          negativePrompt: formData.negativePrompt,
          colorPalette: formData.colorPalette,
          lighting: formData.lighting,
          composition: formData.composition,
          cameraAngle: formData.cameraAngle,
          detailLevel: formData.detailLevel,
          mood: formData.mood,
          width: formData.width,
          height: formData.height
        }
      });
      if (error) {
        console.error("Error generating content:", error);
        throw error;
      }

      toast.success("Conteúdo gerado com sucesso!", {
        id: toastId
      });

      // NOVO: Processar imagem para aspect ratio exato
      let processedImageUrl = data.imageUrl;
      try {
        toast.loading("Ajustando proporções da imagem...", {
          id: toastId,
          description: "Garantindo qualidade e formato perfeitos."
        });

        processedImageUrl = await processImageToAspectRatio({
          imageUrl: data.imageUrl,
          aspectRatio: formData.aspectRatio,
          mode: 'cover',
          quality: 0.95,
          outputFormat: 'image/png'
        });

        toast.success("Imagem otimizada!", { id: toastId });
      } catch (processError) {
        console.error("Error processing image:", processError);
        // Fallback para imagem original se falhar
        toast.warning("Usando imagem original", {
          description: "Não foi possível otimizar a proporção"
        });
      }

      // Salvar imagem gerada e caption
      setGeneratedImageUrl(processedImageUrl);
      setCaptionData({
        title: data.description?.title || "",
        body: data.description?.body || "",
        hashtags: data.description?.hashtags || ""
      });

      // Atualizar créditos
      try {
        await refreshTeamCredits();
        console.log('✅ Créditos atualizados no contexto');
      } catch (error) {
        console.error('Erro ao atualizar créditos:', error);
      }

      // Avançar para step de ajuste de imagem
      setCurrentStep(CreationStep.ADJUST_IMAGE);
      toast.success("Imagem gerada! Ajuste se necessário ou continue para o canvas", { id: toastId });
    } catch (error: any) {
      console.error("Error:", error);
      
      // Tratar erro de violação de compliance de forma amigável
      if (error.message?.includes('compliance_violation')) {
        try {
          const errorMatch = error.message.match(/\{.*\}/);
          if (errorMatch) {
            const errorData = JSON.parse(errorMatch[0]);
            toast.error("Solicitação não permitida", {
              description: errorData.message || "A solicitação viola regulamentações publicitárias brasileiras",
              duration: 8000,
            });
            
            // Mostrar recomendação separadamente se houver
            if (errorData.recommendation) {
              setTimeout(() => {
                toast.info("Sugestão", {
                  description: errorData.recommendation,
                  duration: 10000,
                });
              }, 500);
            }
            return;
          }
        } catch (parseError) {
          console.error("Erro ao parsear erro de compliance:", parseError);
        }
      }
      
      toast.error(error.message || "Erro ao gerar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  const handleImageAdjust = async (adjustmentPrompt: string) => {
    // Validar créditos (1 crédito por ajuste)
    if ((team?.credits || 0) < CREDIT_COSTS.IMAGE_EDIT) {
      toast.error("Créditos insuficientes para ajuste de imagem");
      return;
    }

    const toastId = toast.loading("Ajustando imagem com IA...");
    
    try {
      const currentImage = adjustedImages[adjustedImages.length - 1] || generatedImageUrl;
      
      const { data, error } = await supabase.functions.invoke('adjust-image', {
        body: {
          imageUrl: currentImage,
          adjustmentPrompt,
          brandId: formData.brandId || null,
        }
      });

      // Tratamento de erros específicos
      if (error) {
        console.error("Adjust image error:", error);
        
        if (error.message?.includes("402") || error.message?.includes("LOVABLE_AI_CREDITS_DEPLETED")) {
          toast.error("Créditos do Lovable AI esgotados", { 
            id: toastId,
            description: "Adicione créditos em Settings → Workspace → Usage" 
          });
          return;
        }
        
        if (error.message?.includes("429") || error.message?.includes("RATE_LIMIT_EXCEEDED")) {
          toast.error("Limite de requisições excedido", { 
            id: toastId,
            description: "Aguarde alguns instantes e tente novamente" 
          });
          return;
        }
        
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.adjustedImageUrl) {
        throw new Error("Imagem ajustada não foi retornada pela IA");
      }

      // Processar imagem ajustada para aspect ratio
      const processedImage = await processImageToAspectRatio({
        imageUrl: data.adjustedImageUrl,
        aspectRatio: formData.aspectRatio,
        mode: 'cover',
        quality: 0.95,
        outputFormat: 'image/png'
      });

      setAdjustedImages(prev => [...prev, processedImage]);
      toast.success("Imagem ajustada com sucesso!", { id: toastId });
      
      // Recarregar créditos
      await refreshTeamCredits();
      
    } catch (error: any) {
      console.error("Error adjusting image:", error);
      toast.error(error.message || "Erro ao ajustar imagem", { id: toastId });
    }
  };

  const handleCanvasComplete = async (canvasJSON: any, exportedImageURL: string) => {
    const toastId = toast.loading("Processando imagem final...");
    
    try {
      // 1. Converter imagem para blob
      const response = await fetch(exportedImageURL);
      if (!response.ok) throw new Error("Falha ao processar imagem do canvas");
      
      const blob = await response.blob();
      const fileName = `quick-content-${Date.now()}.png`;
      
      console.log("🔐 User auth status:", (await supabase.auth.getSession()).data.session?.user.id);
      console.log("📦 Uploading to:", `edited-images/${fileName}`);
      console.log("💾 Blob size:", blob.size, "bytes");
      
      // 2. Upload para Supabase Storage com estrutura padronizada
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(`edited-images/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png'
        });
        
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }
      
      console.log("✅ Upload result:", uploadData);
      
      // 3. Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path);
      
      if (!publicUrlData?.publicUrl) {
        throw new Error("Falha ao obter URL pública da imagem");
      }
        
      // 4. Salvar estados e avançar
      setCanvasData(canvasJSON);
      setFinalImageUrl(publicUrlData.publicUrl);
      setCurrentStep(CreationStep.FINALIZE);
      
      toast.success("Canvas finalizado!", { id: toastId });
      
    } catch (error: any) {
      console.error("Error completing canvas:", error);
      
      // Mensagens de erro específicas
      if (error.message?.includes('row-level security')) {
        toast.error("Erro de permissão ao salvar imagem", { 
          id: toastId,
          description: "Entre em contato com o suporte." 
        });
      } else if (error.message?.includes('upload')) {
        toast.error("Erro ao fazer upload da imagem", { 
          id: toastId,
          description: error.message 
        });
      } else {
        toast.error("Erro ao processar imagem final", { 
          id: toastId,
          description: error.message || "Tente novamente." 
        });
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Salvando no histórico...");
    
    try {
      // Validar dados antes de salvar
      if (!finalImageUrl) {
        throw new Error("Imagem final não encontrada");
      }
      
      if (!canvasData) {
        throw new Error("Dados do canvas não encontrados");
      }
      
      // Validar que canvasData tem objetos (se houver edições)
      const parsedCanvas = typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData;
      console.log('💾 Saving action with canvas data:', {
        objectCount: parsedCanvas.objects?.length || 0,
        hasBackgroundImage: !!parsedCanvas.backgroundImage,
        adjustments: adjustedImages.length
      });
      
      const { error } = await supabase
        .from('actions')
        .insert({
          team_id: team!.id,
          user_id: user!.id,
          type: 'CRIAR_CONTEUDO_RAPIDO',
          status: 'approved',
          result: {
            imageUrl: finalImageUrl,
            title: captionData?.title || "",
            body: captionData?.body || "",
            hashtags: captionData?.hashtags || "",
            canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
            adjustmentHistory: adjustedImages,
            objectCount: parsedCanvas.objects?.length || 0
          },
          details: {
            prompt: formData.prompt,
            platform: formData.platform,
            aspectRatio: formData.aspectRatio,
            brandId: formData.brandId || null,
          }
        });

      if (error) throw error;

      toast.success("Conteúdo salvo no histórico com sucesso!", { id: toastId });
      
      // Resetar formulário e voltar ao início
      setTimeout(() => {
        setCurrentStep(CreationStep.INFORMATIONS);
        setGeneratedImageUrl(null);
        setAdjustedImages([]);
        setCanvasData(null);
        setFinalImageUrl(null);
        setCaptionData(null);
        setFormData({
          prompt: "",
          brandId: "",
          platform: "",
          aspectRatio: "1:1",
          style: "auto",
          quality: "standard",
          negativePrompt: "",
          colorPalette: "auto",
          lighting: "natural",
          composition: "auto",
          cameraAngle: "eye_level",
          detailLevel: 7,
          mood: "auto",
          width: "",
          height: ""
        });
        clearPersistedData();
        toast.info("Pronto para criar novo conteúdo!");
      }, 1500);
      
    } catch (error: any) {
      console.error("Error saving action:", error);
      toast.error(error.message || "Erro ao salvar no histórico", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!finalImageUrl) return;
    
    const link = document.createElement('a');
    link.href = finalImageUrl;
    link.download = `quick-content-${Date.now()}.png`;
    link.click();
    
    toast.success("Download iniciado!");
  };

  const renderContent = () => {
    switch (currentStep) {
      case CreationStep.INFORMATIONS:
        // Formulário atual (renderizado no return principal)
        return null;

      case CreationStep.GENERATE_IMAGE:
        return (
          <Card className="p-12 text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Gerando sua imagem...</h3>
            <p className="text-muted-foreground">Isso pode levar alguns segundos</p>
          </Card>
        );

      case CreationStep.ADJUST_IMAGE:
        return (
          <ImageAdjustment
            imageUrl={generatedImageUrl!}
            brandId={formData.brandId}
            themeId={null}
            credits={team?.credits || 0}
            onAdjust={handleImageAdjust}
            onContinue={() => setCurrentStep(CreationStep.EDIT_CANVAS)}
            onCreditsUpdate={refreshTeamCredits}
          />
        );

      case CreationStep.EDIT_CANVAS:
        const imageToUse = adjustedImages[adjustedImages.length - 1] || generatedImageUrl!;
        return (
          <CanvasEditor
            backgroundImage={imageToUse}
            aspectRatio={formData.aspectRatio}
            onBack={() => setCurrentStep(CreationStep.ADJUST_IMAGE)}
            onComplete={handleCanvasComplete}
          />
        );

      case CreationStep.FINALIZE:
        return (
          <FinalizeView
            imageUrl={finalImageUrl!}
            caption={captionData}
            onSave={handleSave}
            onDownload={handleDownload}
            isSaving={isSaving}
          />
        );

      default:
        return null;
    }
  };

  if (loadingData) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20">
      {currentStep === CreationStep.INFORMATIONS && (
        <TourSelector
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'quick_content',
            steps: quickContentSteps,
            label: 'Tour da Criação Rápida',
            targetElement: '#quick-content-form'
          }
        ]}
        startDelay={500}
      />
      )}
      
      {/* Stepper - mostrar quando não estiver no step de informações */}
      {currentStep !== CreationStep.INFORMATIONS && (
        <CreationStepper 
          currentStep={currentStep} 
          credits={team?.credits || 0} 
        />
      )}

      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* Renderização condicional baseada no step */}
        {currentStep !== CreationStep.INFORMATIONS && renderContent()}

        {/* Header - só mostrar no step de informações */}
        {currentStep === CreationStep.INFORMATIONS && (
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
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                            {team?.credits || 0}
                          </span>
                          <p className="text-sm text-muted-foreground font-medium leading-tight whitespace-nowrap">
                            Créditos
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">Disponíveis</p>
                      </div>
                    </div>
                  </CardContent>
                 </Card>}
            </div>
          </CardHeader>
        </Card>
        )}

        {/* Main Form - só mostrar no step de informações */}
        {currentStep === CreationStep.INFORMATIONS && (
          <Card id="quick-content-form" className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
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
              <Select 
                value={formData.brandId} 
                onValueChange={value => setFormData({
                  ...formData,
                  brandId: value
                })}
                disabled={brands.length === 0}
              >
                <SelectTrigger id="quick-brand-select" className="h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors">
                  <SelectValue 
                    placeholder={
                      brands.length === 0 
                        ? "Nenhuma marca cadastrada" 
                        : "Nenhuma marca selecionada"
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/20">
                  {brands.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhuma marca cadastrada ainda
                    </div>
                  ) : (
                    brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id} className="rounded-lg">
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {brands.length === 0 
                    ? "Cadastre uma marca para conteúdo personalizado com sua identidade visual" 
                    : "Selecionar uma marca ajuda a IA a criar conteúdo alinhado com sua identidade visual"
                  }
                </span>
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
                <SelectTrigger id="quick-platform-select" className="h-11 rounded-xl border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors">
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
              <Textarea id="quick-description" placeholder="Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com uma estética minimalista e moderna. Cores quentes, iluminação natural suave..." value={formData.prompt} onChange={e => setFormData({
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
              
              <div id="quick-reference-images" className="space-y-3">
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
                            <input type="checkbox" id={idx === 0 ? "quick-preserve-traits" : `preserve-${idx}`} checked={preserveImageIndices.includes(idx)} onChange={() => handleTogglePreserve(idx)} className="h-4 w-4 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/50" />
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
                <AccordionTrigger id="advanced-options" className="px-4 py-3 hover:bg-muted/50 transition-colors hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <span>Opções Avançadas</span>
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-4">
                    Controles profissionais para designers. Deixe em "Auto" para resultados inteligentes.
                  </p>

                  {/* Negative Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="advanced-negative-prompt" className="text-xs font-medium flex items-center gap-2">
                      Prompt Negativo
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <Textarea
                      id="advanced-negative-prompt"
                      placeholder="O que NÃO incluir (ex: texto, pessoas, fundo branco...)"
                      value={formData.negativePrompt}
                      onChange={(e) => setFormData({...formData, negativePrompt: e.target.value})}
                      className="min-h-[60px] rounded-lg border-2 border-border/50 bg-background/50 resize-none text-xs"
                    />
                  </div>

                  {/* Aspect Ratio - NOVO COM DIMENSÕES */}
                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio" className="text-xs font-medium">Proporção da Imagem</Label>
                    <Select value={formData.aspectRatio} onValueChange={value => setFormData({ ...formData, aspectRatio: value })}>
                      <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue placeholder="Selecionar proporção" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Object.entries(ASPECT_RATIO_DIMENSIONS).map(([ratio, data]) => (
                          <SelectItem key={ratio} value={ratio} className="rounded-lg">
                            <div className="flex flex-col items-start py-0.5">
                              <span className="font-medium text-xs">{ratio}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {data.width}x{data.height}px - {data.label}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.aspectRatio && (
                    <AspectRatioPreview aspectRatio={formData.aspectRatio} />
                  )}

                  {/* Color Palette */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Paleta de Cores</Label>
                    <Select
                      value={formData.colorPalette}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, colorPalette: value }))}
                    >
                      <SelectTrigger id="advanced-color-palette" className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="warm">Quente (Laranja, Vermelho, Amarelo)</SelectItem>
                        <SelectItem value="cool">Frio (Azul, Verde, Roxo)</SelectItem>
                        <SelectItem value="monochrome">Monocromático</SelectItem>
                        <SelectItem value="vibrant">Vibrante</SelectItem>
                        <SelectItem value="pastel">Pastel</SelectItem>
                        <SelectItem value="earth">Tons Terrosos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lighting */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Iluminação</Label>
                    <Select
                      value={formData.lighting}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, lighting: value }))}
                    >
                      <SelectTrigger id="advanced-lighting" className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural (Luz do Dia)</SelectItem>
                        <SelectItem value="studio">Estúdio (Controlada)</SelectItem>
                        <SelectItem value="golden_hour">Golden Hour (Dourada)</SelectItem>
                        <SelectItem value="dramatic">Dramática (Alto Contraste)</SelectItem>
                        <SelectItem value="soft">Suave (Difusa)</SelectItem>
                        <SelectItem value="backlight">Contraluz</SelectItem>
                        <SelectItem value="neon">Neon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Image Dimensions */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      Dimensões da Imagem
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <Select
                      value={formData.width && formData.height ? `${formData.width}x${formData.height}` : ''}
                      onValueChange={(value) => {
                        const [width, height] = value.split('x');
                        setFormData(prev => ({ ...prev, width, height }));
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue placeholder="Selecione as dimensões" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.platform && platformSpecs[formData.platform] && (
                          <>
                            {platformSpecs[formData.platform].organic?.image.dimensions.map((dim) => (
                              <SelectItem 
                                key={`${dim.width}x${dim.height}`} 
                                value={`${dim.width}x${dim.height}`}
                              >
                                {dim.width}x{dim.height} ({dim.aspectRatio}) - {dim.description}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {!formData.platform && (
                          <SelectItem value="1080x1080" disabled>
                            Selecione uma plataforma primeiro
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formData.width && formData.height && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecionado: {formData.width}x{formData.height}px
                      </p>
                    )}
                  </div>

                  {/* Composition */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Composição</Label>
                    <Select
                      value={formData.composition}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, composition: value }))}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="center">Centralizado</SelectItem>
                        <SelectItem value="rule_of_thirds">Regra dos Terços</SelectItem>
                        <SelectItem value="symmetric">Simétrico</SelectItem>
                        <SelectItem value="asymmetric">Assimétrico</SelectItem>
                        <SelectItem value="dynamic">Dinâmico</SelectItem>
                        <SelectItem value="minimalist">Minimalista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Camera Angle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Ângulo da Câmera</Label>
                    <Select
                      value={formData.cameraAngle}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cameraAngle: value }))}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eye_level">Nível dos Olhos</SelectItem>
                        <SelectItem value="top_down">Vista Superior</SelectItem>
                        <SelectItem value="low_angle">Ângulo Baixo</SelectItem>
                        <SelectItem value="high_angle">Ângulo Alto</SelectItem>
                        <SelectItem value="close_up">Close-up</SelectItem>
                        <SelectItem value="wide_shot">Plano Geral</SelectItem>
                        <SelectItem value="dutch_angle">Ângulo Holandês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mood */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Atmosfera</Label>
                    <Select
                      value={formData.mood}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="elegant">Elegante</SelectItem>
                        <SelectItem value="playful">Divertido</SelectItem>
                        <SelectItem value="serious">Sério</SelectItem>
                        <SelectItem value="mysterious">Misterioso</SelectItem>
                        <SelectItem value="energetic">Energético</SelectItem>
                        <SelectItem value="calm">Calmo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Detail Level Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">Nível de Detalhes</Label>
                      <span className="text-xs text-muted-foreground font-medium">{formData.detailLevel}/10</span>
                    </div>
                    <Slider
                      id="advanced-detail-level"
                      value={[formData.detailLevel || 7]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, detailLevel: value[0] }))}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Minimalista</span>
                      <span>Equilibrado</span>
                      <span>Muito Detalhado</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        )}

        {/* Generate Button - só mostrar no step de informações */}
        {currentStep === CreationStep.INFORMATIONS && (
          <div className="flex justify-end pb-6">
          <Button id="quick-generate-button" onClick={generateQuickContent} disabled={loading || !formData.prompt.trim() || (team?.credits || 0) < CREDIT_COSTS.QUICK_IMAGE} size="lg" className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg gap-2">
            {loading ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando...
              </> : <>
                <Zap className="mr-2 h-5 w-5" />
                Gerar Imagem Rápida
                <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1">
                  <Coins className="h-3 w-3" />
                  {CREDIT_COSTS.QUICK_IMAGE}
                </Badge>
              </>}
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}