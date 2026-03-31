import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CategorySelector } from "@/components/CategorySelector";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShoppingBag, Coins, ImagePlus, X, ClipboardPaste, HelpCircle, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { FormatPreview } from "@/components/quick-content/FormatPreview";
import createBanner from "@/assets/create-banner.jpg";
import { useRef } from "react";

const MARKETPLACE_BACKGROUNDS = [
  { value: "white", label: "Fundo branco limpo" },
  { value: "gradient", label: "Gradiente suave" },
  { value: "lifestyle", label: "Lifestyle / Contexto de uso" },
  { value: "studio", label: "Estúdio profissional" },
  { value: "natural", label: "Cenário natural" },
  { value: "custom", label: "Personalizado" },
];

const MARKETPLACE_PLATFORMS = [
  { value: "mercadolivre", label: "Mercado Livre", ratio: "1:1" },
  { value: "shopee", label: "Shopee", ratio: "1:1" },
  { value: "amazon", label: "Amazon", ratio: "1:1" },
  { value: "instagram_shop", label: "Instagram Shopping", ratio: "1:1" },
  { value: "generic", label: "Genérico (1:1)", ratio: "1:1" },
];

export default function MarketplaceContent() {
  const navigate = useNavigate();
  const { user, refreshUserCredits } = useAuth();
  const { addTask, tasks } = useBackgroundTasks();
  const isGenerating = tasks.some(t => t.type === "marketplace" && t.status === "running");
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!generatingTaskId) return;
    const task = tasks.find(t => t.id === generatingTaskId);
    if (task?.status === "complete" && task.resultRoute) {
      navigate(task.resultRoute, { state: task.resultState });
      setGeneratingTaskId(null);
    }
  }, [tasks, generatingTaskId, navigate]);

  const [categoryId, setCategoryId] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundStyle, setBackgroundStyle] = useState("white");
  const [customBackground, setCustomBackground] = useState("");
  const [marketplacePlatform, setMarketplacePlatform] = useState("generic");
  const [productFiles, setProductFiles] = useState<File[]>([]);

  const teamId = user?.teamId;
  const userId = user?.id;

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", teamId],
    queryFn: async () => {
      const query = supabase.from("brands").select("*").order("name");
      if (teamId) query.eq("team_id", teamId); else query.eq("user_id", userId!);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const [brandId, setBrandId] = useState("");

  const handleAddFiles = (files: File[]) => {
    const remaining = 5 - productFiles.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) toast.error(`Máximo 5 imagens. ${toAdd.length} adicionada(s).`);
    setProductFiles(prev => [...prev, ...toAdd]);
  };

  const handleRemoveFile = (index: number) => {
    setProductFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      handleAddFiles(files);
      toast.success(`${files.length} imagem(ns) adicionada(s)`);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `produto-${Date.now()}.${ext}`, { type: imageType });
          files.push(file);
        }
      }
      if (files.length > 0) {
        handleAddFiles(files);
        toast.success(`${files.length} imagem(ns) colada(s)`);
      } else {
        toast.error("Nenhuma imagem encontrada na área de transferência");
      }
    } catch {
      toast.error("Não foi possível acessar a área de transferência. Use Ctrl+V no campo.");
    }
  };

  const generateMarketplaceImage = async () => {
    if (productFiles.length === 0) {
      toast.error("Envie pelo menos uma foto do produto");
      return;
    }
    if (!productName.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    if ((user?.credits || 0) < CREDIT_COSTS.MARKETPLACE_IMAGE) {
      toast.error("Créditos insuficientes");
      return;
    }

    try {
      const referenceImagesBase64: string[] = [];
      for (const file of productFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        referenceImagesBase64.push(base64);
      }

      const bgLabel = backgroundStyle === "custom"
        ? customBackground
        : MARKETPLACE_BACKGROUNDS.find(b => b.value === backgroundStyle)?.label || "Fundo branco limpo";

      const marketplacePrompt = `Crie uma foto profissional de produto para marketplace/e-commerce do produto: "${productName.trim()}". ${description.trim() ? `Detalhes: ${description.trim()}.` : ""} O produto deve ser o foco principal da imagem, com ${bgLabel}. A imagem deve parecer uma foto de catálogo profissional, com iluminação de estúdio, alta qualidade e sem texto.`;

      const payload = {
        prompt: marketplacePrompt,
        brandId: brandId || null,
        themeId: null,
        personaId: null,
        platform: null,
        referenceImages: referenceImagesBase64,
        preserveImages: referenceImagesBase64, // All product images are "preserve" - keep the product exact
        styleReferenceImages: [],
        aspectRatio: "1:1",
        visualStyle: "realistic",
        style: "auto",
        quality: "standard",
        negativePrompt: "text, watermark, typography, letters, words, labels, low quality, blurry, distorted product",
        colorPalette: "auto",
        lighting: "studio",
        composition: "centered",
        cameraAngle: "eye_level",
        detailLevel: 9,
        mood: "professional",
        width: "1080",
        height: "1080",
        mode: "marketplace",
      };

      const selectedCategoryId = categoryId;

      const newTaskId = addTask(
        "Imagem Marketplace",
        "marketplace",
        async () => {
          const { data, error } = await supabase.functions.invoke("generate-quick-content", { body: payload });
          if (error) throw error;

          if (selectedCategoryId && data.actionId) {
            try {
              await supabase.from("action_category_items").insert({
                category_id: selectedCategoryId,
                action_id: data.actionId,
                added_by: user!.id,
              });
            } catch (e) {
              console.error("Erro ao atribuir categoria:", e);
            }
          }

          try { await refreshUserCredits(); } catch {}

          return {
            route: "/quick-content-result",
            state: {
              imageUrl: data.imageUrl,
              description: data.description,
              actionId: data.actionId,
              prompt: marketplacePrompt,
              brandName: data.brandName,
              platform: "marketplace",
            },
          };
        },
        () => refreshUserCredits?.()
      );

      setGeneratingTaskId(newTaskId);
      toast.info("Sua imagem de produto está sendo gerada...");
    } catch (error: any) {
      console.error("Error preparing marketplace payload:", error);
      toast.error(error.message || "Erro ao preparar criação");
    }
  };

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      {/* Banner */}
      <div className="relative h-20 md:h-24 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo", href: "/create" }, { label: "Marketplace" }]} variant="overlay" />
        <img src={createBanner} alt="Marketplace" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-stretch gap-3">
          <div className="bg-card rounded-2xl shadow-lg p-2.5 lg:p-3 flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-emerald-500/10 text-emerald-500 rounded-xl p-2">
              <ShoppingBag className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">Marketplace</h1>
              <p className="text-muted-foreground text-[11px] lg:text-xs">Fotos profissionais de produtos para e-commerce</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl px-3 py-1.5 flex-shrink-0 border border-primary/20">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.credits || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">créditos</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4 flex-shrink-0 flex items-center min-w-[320px]">
            <CreationProgressBar currentStep={isGenerating ? "generating" : "config"} />
          </div>
        </div>
      </div>

      {/* Main Form */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Left column */}
            <div className="space-y-5">
              {/* Product Photos - MANDATORY */}
              <div className="space-y-2.5" onPaste={handlePaste}>
                <div className="flex items-center gap-2">
                  <Label className="text-base font-bold text-foreground">
                    Fotos do Produto <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 text-sm" side="bottom">
                      <p className="text-muted-foreground">
                        Envie fotos reais do seu produto. A IA usará essas imagens como base para criar fotos profissionais de catálogo,
                        preservando fielmente o produto original.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie fotos do produto real — a IA preservará a aparência exata e criará uma foto profissional.
                </p>

                <div className="rounded-2xl shadow-lg overflow-hidden border-0 bg-card">
                  {/* Product photos grid */}
                  {productFiles.length > 0 ? (
                    <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {productFiles.map((file, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border/30 bg-muted/20">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-white text-[9px] text-center py-0.5 font-medium">
                            Produto
                          </div>
                        </div>
                      ))}
                      {productFiles.length < 5 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-emerald-500/50 transition-all"
                        >
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[10px]">Adicionar</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <ImagePlus className="h-8 w-8 text-emerald-500" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-foreground text-sm">Clique para enviar fotos do produto</p>
                        <p className="text-xs text-muted-foreground mt-1">ou arraste e cole imagens aqui</p>
                      </div>
                    </button>
                  )}

                  {/* Bottom toolbar */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/20 bg-muted/10">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      <span>Selecionar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClipboardPaste}
                      className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      <span>Colar</span>
                    </button>
                    <div className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">{productFiles.length}/5</span>
                  </div>
                </div>

                {productFiles.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Envie pelo menos uma foto do produto para continuar</span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="rounded-2xl shadow-lg bg-card p-5 space-y-4">
                <h3 className="font-bold text-sm text-foreground">Detalhes do Produto</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="product-name" className="text-sm font-medium">
                      Nome do Produto <span className="text-destructive">*</span>
                    </Label>
                    <input
                      id="product-name"
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="Ex: Suco de Uva Integral 200ml"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  <div>
                    <Label htmlFor="product-desc" className="text-sm font-medium">
                      Descrição adicional
                    </Label>
                    <Textarea
                      id="product-desc"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ex: Mostrar com frutas ao redor, ambiente fresco e natural..."
                      rows={3}
                      className="mt-1 resize-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Estilo de Fundo</Label>
                      <NativeSelect
                        value={backgroundStyle}
                        onChange={e => setBackgroundStyle(e.target.value)}
                        className="mt-1"
                      >
                        {MARKETPLACE_BACKGROUNDS.map(bg => (
                          <NativeSelectOption key={bg.value} value={bg.value}>
                            {bg.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Plataforma</Label>
                      <NativeSelect
                        value={marketplacePlatform}
                        onChange={e => setMarketplacePlatform(e.target.value)}
                        className="mt-1"
                      >
                        {MARKETPLACE_PLATFORMS.map(mp => (
                          <NativeSelectOption key={mp.value} value={mp.value}>
                            {mp.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  {backgroundStyle === "custom" && (
                    <div>
                      <Label className="text-sm font-medium">Descreva o fundo desejado</Label>
                      <input
                        type="text"
                        value={customBackground}
                        onChange={e => setCustomBackground(e.target.value)}
                        placeholder="Ex: Mesa de madeira rústica com folhas verdes"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  )}

                  {/* Brand selector */}
                  <div>
                    <Label className="text-sm font-medium">Marca (opcional)</Label>
                    <NativeSelect
                      value={brandId}
                      onChange={e => setBrandId(e.target.value)}
                      className="mt-1"
                    >
                      <NativeSelectOption value="">Sem marca</NativeSelectOption>
                      {brands.map((brand: any) => (
                        <NativeSelectOption key={brand.id} value={brand.id}>
                          {brand.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>

              {/* Category Selector */}
              <CategorySelector value={categoryId} onChange={setCategoryId} />
            </div>

            {/* Right column — Preview */}
            <div className="lg:sticky lg:top-4 self-start space-y-4">
              <div className="bg-card rounded-2xl shadow-lg p-5">
                <h3 className="font-bold text-sm text-foreground mb-3">Pré-visualização</h3>
                <div className="aspect-square rounded-xl border-2 border-dashed border-border/30 bg-muted/10 flex items-center justify-center overflow-hidden">
                  {productFiles.length > 0 ? (
                    <img
                      src={URL.createObjectURL(productFiles[0])}
                      alt="Preview do produto"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Envie uma foto do produto para pré-visualizar</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                    📐 1:1 (1080×1080px)
                  </Badge>
                </div>
              </div>

              <div className="bg-card rounded-2xl shadow-lg p-4">
                <h4 className="font-semibold text-xs text-foreground mb-2">💡 Dicas para fotos melhores</h4>
                <ul className="text-[11px] text-muted-foreground space-y-1.5">
                  <li>• Use fotos com boa iluminação</li>
                  <li>• Mostre o produto em diferentes ângulos</li>
                  <li>• Evite fundos muito poluídos</li>
                  <li>• Fotos nítidas geram resultados melhores</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pb-6">
            <Button
              onClick={generateMarketplaceImage}
              disabled={isGenerating || productFiles.length === 0 || !productName.trim() || (user?.credits || 0) < CREDIT_COSTS.MARKETPLACE_IMAGE}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white hover:opacity-90 transition-opacity shadow-lg gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Gerar Foto de Produto
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30 gap-1">
                    <Coins className="h-3 w-3" />{CREDIT_COSTS.MARKETPLACE_IMAGE}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={productFiles.length >= 5}
        onChange={e => {
          const files = Array.from(e.target.files || []);
          handleAddFiles(files);
        }}
      />
    </div>
  );
}
