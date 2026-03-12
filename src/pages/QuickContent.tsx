import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagSelect } from "@/components/ui/tag-select";
import { NativeSelect } from "@/components/ui/native-select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap, Info, Coins, HelpCircle, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Brand } from "@/types/brand";
import type { Persona } from "@/types/persona";
import type { StrategicTheme } from "@/types/theme";
import { platformSpecs } from "@/lib/platformSpecs";
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { TourSelector } from "@/components/onboarding/TourSelector";
import { quickContentSteps, navbarSteps } from "@/components/onboarding/tourSteps";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { UnifiedPromptBox } from "@/components/quick-content/UnifiedPromptBox";
import { PlatformSelector } from "@/components/quick-content/PlatformSelector";
import createBanner from "@/assets/create-banner.jpg";

export default function QuickContent() {
  const navigate = useNavigate();
  const { user, refreshUserCredits } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    prompt: "",
    brandId: "",
    themeId: "",
    personaId: "",
    platform: "",
    aspectRatio: "1:1",
    visualStyle: "realistic",
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
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);

  // React Query for brands, themes, personas
  const teamId = user?.teamId;
  const userId = user?.id;

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['brands', teamId],
    queryFn: async () => {
      const query = supabase.from("brands").select("*").order("name");
      if (teamId) { query.eq("team_id", teamId); } else { query.eq("user_id", userId!); }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as Brand[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ['themes', teamId],
    queryFn: async () => {
      const query = supabase.from("strategic_themes").select("*").order("title");
      if (teamId) { query.eq("team_id", teamId); } else { query.eq("user_id", userId!); }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as StrategicTheme[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas', teamId],
    queryFn: async () => {
      const query = supabase.from("personas").select("*").order("name");
      if (teamId) { query.eq("team_id", teamId); } else { query.eq("user_id", userId!); }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as Persona[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const loadingData = loadingBrands || loadingThemes || loadingPersonas;

  const filteredThemes = formData.brandId
    ? themes.filter((t: any) => t.brand_id === formData.brandId || t.brandId === formData.brandId)
    : [];
  const filteredPersonas = formData.brandId
    ? personas.filter((p: any) => p.brand_id === formData.brandId || p.brandId === formData.brandId)
    : [];

  const { loadPersistedData, clearPersistedData } = useFormPersistence({
    key: 'quick-content-form',
    formData,
    excludeFields: ['referenceFiles']
  });

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) setFormData(prev => ({ ...prev, ...persisted }));
  }, []);

  useEffect(() => {
    if (!formData.brandId) setFormData(prev => ({ ...prev, themeId: "", personaId: "" }));
  }, [formData.brandId]);

  const generateQuickContent = async () => {
    if (!formData.prompt.trim()) {
      toast.error("Por favor, descreva o que deseja criar");
      return;
    }
    if ((user?.credits || 0) <= 0) {
      toast.error("Você não possui créditos suficientes para criação rápida");
      return;
    }
    try {
      setLoading(true);
      const toastId = toast.loading("Preparando criação...", { description: "Processando suas configurações." });

      const referenceImagesBase64: string[] = [];
      const preserveImages: string[] = [];
      const styleReferenceImages: string[] = [];
      if (referenceFiles.length > 0) {
        toast.loading("Processando imagens de referência...", { id: toastId, description: `${referenceFiles.length} imagem(ns) sendo processadas.` });
        for (let i = 0; i < referenceFiles.length; i++) {
          const file = referenceFiles[i];
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          referenceImagesBase64.push(base64);
          if (preserveImageIndices.includes(i)) { preserveImages.push(base64); } else { styleReferenceImages.push(base64); }
        }
      }
      toast.loading("Gerando conteúdo com IA...", { id: toastId, description: "Criando sua imagem personalizada." });
      const { data, error } = await supabase.functions.invoke("generate-quick-content", {
        body: {
          prompt: formData.prompt,
          brandId: formData.brandId || null,
          themeId: formData.themeId || null,
          personaId: formData.personaId || null,
          platform: formData.platform || null,
          referenceImages: referenceImagesBase64,
          preserveImages,
          styleReferenceImages,
          aspectRatio: formData.aspectRatio,
          visualStyle: formData.visualStyle,
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
      if (error) throw error;
      toast.success("Conteúdo gerado com sucesso!", { id: toastId });
      clearPersistedData();
      try { await refreshUserCredits(); } catch {}

      navigate("/quick-content-result", {
        state: {
          imageUrl: data.imageUrl, description: data.description, actionId: data.actionId,
          prompt: formData.prompt, brandName: data.brandName, themeName: data.themeName,
          personaName: data.personaName, platform: formData.platform
        }
      });
    } catch (error: any) {
      console.error("Error:", error);
      if (error.message?.includes('compliance_violation')) {
        try {
          const errorMatch = error.message.match(/\{.*\}/);
          if (errorMatch) {
            const errorData = JSON.parse(errorMatch[0]);
            toast.error("Solicitação não permitida", { description: errorData.message || "A solicitação viola regulamentações publicitárias brasileiras", duration: 8000 });
            if (errorData.recommendation) {
              setTimeout(() => { toast.info("Sugestão", { description: errorData.recommendation, duration: 10000 }); }, 500);
            }
            return;
          }
        } catch {}
      }
      toast.error(error.message || "Erro ao gerar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  const SelectSkeleton = () => (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      <TourSelector tours={[
        { tourType: 'navbar', steps: navbarSteps, label: 'Tour da Navegação', targetElement: '#sidebar-logo' },
        { tourType: 'quick_content', steps: quickContentSteps, label: 'Tour da Criação Rápida', targetElement: '#quick-content-form' }
      ]} startDelay={500} />

      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-72 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo", href: "/create" }, { label: "Criação Rápida" }]} variant="overlay" />
        <img src={createBanner} alt="Criação Rápida" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                  <Zap className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Criação Rápida</h1>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="text-sm w-72" side="bottom">
                        <p className="font-medium mb-1">Criação Rápida</p>
                        <p className="text-muted-foreground text-xs">
                          Gere imagens rapidamente com IA. Descreva o que deseja criar, selecione opcionalmente uma marca, persona e tema estratégico para personalizar o resultado.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm">Gere imagens rapidamente com IA</p>
                </div>
              </div>
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex-shrink-0">
                <CardContent className="p-2.5 md:p-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                      <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                        <Zap className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">{user?.credits || 0}</span>
                        <p className="text-sm text-muted-foreground font-medium leading-tight whitespace-nowrap">Créditos</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Disponíveis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-4 mt-4">
          <CreationProgressBar currentStep={loading ? "generating" : "config"} className="max-w-xs mx-auto" />

          <div id="quick-content-form" className="space-y-4">
            {/* 1. Unified Prompt Box (Gemini-style) */}
            <UnifiedPromptBox
              prompt={formData.prompt}
              onPromptChange={value => setFormData(prev => ({ ...prev, prompt: value }))}
              visualStyle={formData.visualStyle}
              onVisualStyleChange={value => setFormData(prev => ({ ...prev, visualStyle: value }))}
              referenceFiles={referenceFiles}
              onReferenceFilesChange={setReferenceFiles}
              preserveImageIndices={preserveImageIndices}
              onPreserveImageIndicesChange={setPreserveImageIndices}
            />

            {/* 2. Creative Context & Platform */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-4 md:p-5 space-y-5">
                {/* Platform with icons */}
                <PlatformSelector
                  value={formData.platform}
                  onChange={(value, aspectRatio) => {
                    setFormData(prev => ({
                      ...prev,
                      platform: value,
                      ...(aspectRatio ? { aspectRatio } : {})
                    }));
                  }}
                />

                {/* Brand, Persona, Theme */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/30">
                  {loadingData ? <SelectSkeleton /> : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-foreground">
                        Marca <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                      </Label>
                      <TagSelect
                        value={formData.brandId}
                        onValueChange={value => setFormData(prev => ({ ...prev, brandId: value }))}
                        options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                        placeholder={brands.length === 0 ? "Nenhuma marca" : "Selecionar marca"}
                        disabled={brands.length === 0}
                        triggerClassName="h-10 rounded-lg border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors"
                      />
                    </div>
                  )}

                  {loadingData ? <SelectSkeleton /> : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-foreground">
                        Persona <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                      </Label>
                      <TagSelect
                        value={formData.personaId}
                        onValueChange={value => setFormData(prev => ({ ...prev, personaId: value }))}
                        options={filteredPersonas.map(p => ({ value: p.id, label: p.name }))}
                        placeholder={!formData.brandId ? "Selecione marca" : filteredPersonas.length === 0 ? "Nenhuma" : "Selecionar"}
                        disabled={!formData.brandId || filteredPersonas.length === 0}
                        triggerClassName="h-10 rounded-lg border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors"
                      />
                    </div>
                  )}

                  {loadingData ? <SelectSkeleton /> : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-foreground">
                        Tema <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                      </Label>
                      <TagSelect
                        value={formData.themeId}
                        onValueChange={value => setFormData(prev => ({ ...prev, themeId: value }))}
                        options={filteredThemes.map(t => ({ value: t.id, label: t.title }))}
                        placeholder={!formData.brandId ? "Selecione marca" : filteredThemes.length === 0 ? "Nenhum" : "Selecionar"}
                        disabled={!formData.brandId || filteredThemes.length === 0}
                        triggerClassName="h-10 rounded-lg border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Generate Button */}
          <div className="flex justify-end pb-6">
            <Button
              id="quick-generate-button"
              onClick={generateQuickContent}
              disabled={loading || !formData.prompt.trim() || (user?.credits || 0) < CREDIT_COSTS.QUICK_IMAGE}
              size="lg"
              className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg gap-2"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando...</>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Gerar Imagem Rápida
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1">
                    <Coins className="h-3 w-3" />{CREDIT_COSTS.QUICK_IMAGE}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
