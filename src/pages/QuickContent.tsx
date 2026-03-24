import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CategorySelector } from "@/components/CategorySelector";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap, Coins, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import type { Brand } from "@/types/brand";
import type { Persona } from "@/types/persona";
import type { StrategicTheme } from "@/types/theme";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { TourSelector } from "@/components/onboarding/TourSelector";
import { quickContentSteps, navbarSteps } from "@/components/onboarding/tourSteps";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { UnifiedPromptBox } from "@/components/quick-content/UnifiedPromptBox";
import { VisualStyleGrid } from "@/components/quick-content/VisualStyleGrid";
import { FormatPreview } from "@/components/quick-content/FormatPreview";
import createBanner from "@/assets/create-banner.jpg";

export default function QuickContent() {
  const navigate = useNavigate();
  const { user, refreshUserCredits } = useAuth();
  const { addTask } = useBackgroundTasks();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
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
    width: "1080",
    height: "1080",
  });
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);

  const teamId = user?.teamId;
  const userId = user?.id;

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ["brands", teamId],
    queryFn: async () => {
      const query = supabase.from("brands").select("*").order("name");
      if (teamId) query.eq("team_id", teamId); else query.eq("user_id", userId!);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as Brand[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ["themes", teamId],
    queryFn: async () => {
      const query = supabase.from("strategic_themes").select("*").order("title");
      if (teamId) query.eq("team_id", teamId); else query.eq("user_id", userId!);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as StrategicTheme[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery({
    queryKey: ["personas", teamId],
    queryFn: async () => {
      const query = supabase.from("personas").select("*").order("name");
      if (teamId) query.eq("team_id", teamId); else query.eq("user_id", userId!);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as Persona[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const filteredThemes = formData.brandId
    ? themes.filter((t: any) => t.brand_id === formData.brandId || t.brandId === formData.brandId)
    : [];
  const filteredPersonas = formData.brandId
    ? personas.filter((p: any) => p.brand_id === formData.brandId || p.brandId === formData.brandId)
    : [];

  const { loadPersistedData, clearPersistedData } = useFormPersistence({
    key: "quick-content-form",
    formData,
    excludeFields: ["referenceFiles"],
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

    setLoading(true);
    try {
      const referenceImagesBase64: string[] = [];
      const preserveImages: string[] = [];
      const styleReferenceImages: string[] = [];
      if (referenceFiles.length > 0) {
        for (let i = 0; i < referenceFiles.length; i++) {
          const file = referenceFiles[i];
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          referenceImagesBase64.push(base64);
          if (preserveImageIndices.includes(i)) preserveImages.push(base64);
          else styleReferenceImages.push(base64);
        }
      }

      const payload = {
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
        height: formData.height,
      };

      clearPersistedData();
      const selectedCategoryId = categoryId;

      addTask(
        "Criação Rápida",
        "quick_content",
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
              imageUrl: data.imageUrl, description: data.description, actionId: data.actionId,
              prompt: formData.prompt, brandName: data.brandName, themeName: data.themeName,
              personaName: data.personaName, platform: formData.platform,
            },
          };
        },
        () => refreshUserCredits?.()
      );

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error preparing payload:", error);
      toast.error(error.message || "Erro ao preparar criação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      <TourSelector tours={[
        { tourType: "navbar", steps: navbarSteps, label: "Tour da Navegação", targetElement: "#sidebar-logo" },
        { tourType: "quick_content", steps: quickContentSteps, label: "Tour da Criação Rápida", targetElement: "#quick-content-form" },
      ]} startDelay={500} />

      {/* Banner */}
      <div className="relative h-20 md:h-24 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo", href: "/create" }, { label: "Criação Rápida" }]} variant="overlay" />
        <img src={createBanner} alt="Criação Rápida" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center gap-3">
          {/* Title card */}
          <div className="bg-card rounded-2xl shadow-lg p-2.5 lg:p-3 flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
              <Zap className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">Criação Rápida</h1>
              <p className="text-muted-foreground text-[11px] lg:text-xs">Gere imagens rapidamente com IA</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl px-3 py-1.5 flex-shrink-0 border border-primary/20">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-1.5">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.credits || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">créditos</span>
            </div>
          </div>

          {/* Progress bar card */}
          <div className="bg-card rounded-2xl shadow-lg p-2.5 lg:p-3 flex-shrink-0">
            <CreationProgressBar currentStep={loading ? "generating" : "config"} className="max-w-xs" />
          </div>
        </div>
      </div>

      {/* Main Form — Two columns on desktop */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-4 mt-4">

          <div id="quick-content-form" className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Left column */}
            <div className="space-y-5">
              {/* 1. Prompt + References */}
              <UnifiedPromptBox
                prompt={formData.prompt}
                onPromptChange={value => setFormData(prev => ({ ...prev, prompt: value }))}
                referenceFiles={referenceFiles}
                onReferenceFilesChange={setReferenceFiles}
                preserveImageIndices={preserveImageIndices}
                onPreserveImageIndicesChange={setPreserveImageIndices}
              />

              {/* Visual Style + Customizations side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual Style Grid */}
                <VisualStyleGrid
                  value={formData.visualStyle}
                  onChange={value => setFormData(prev => ({ ...prev, visualStyle: value }))}
                />

                {/* Customizations */}
                <CustomizationCards
                  brands={brands}
                  personas={filteredPersonas}
                  themes={filteredThemes}
                  formData={formData}
                  onFormChange={updates => setFormData(prev => ({ ...prev, ...updates }))}
                  loadingBrands={loadingBrands}
                  loadingPersonas={loadingPersonas}
                  loadingThemes={loadingThemes}
                />
              </div>

              {/* Category Selector */}
              <CategorySelector value={categoryId} onChange={setCategoryId} />
            </div>

            {/* Right column — Format Preview */}
            <div className="lg:sticky lg:top-4 self-start">
              <div className="bg-card rounded-2xl shadow-lg p-5 flex flex-col items-center">
                <FormatPreview
                  platform={formData.platform}
                  aspectRatio={formData.aspectRatio}
                  onPlatformChange={(platform, aspectRatio, width, height) =>
                    setFormData(prev => ({
                      ...prev,
                      platform,
                      aspectRatio,
                      width: String(width),
                      height: String(height),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Generate Button — full width */}
          <div className="flex justify-center pb-6">
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
