import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, X, Info, ImagePlus, Coins, Image as ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { BrandSummary } from "@/types/brand";
import type { StrategicThemeSummary } from "@/types/theme";
import type { PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";
import { getPlatformImageSpec, getCaptionGuidelines } from "@/lib/platformSpecs";
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { createContentSteps, navbarSteps } from '@/components/onboarding/tourSteps';

enum GenerationStep {
  IDLE = "IDLE",
  GENERATING_IMAGE = "GENERATING_IMAGE",
  GENERATING_CAPTION = "GENERATING_CAPTION",
  SAVING = "SAVING",
  COMPLETE = "COMPLETE"
}

interface FormData {
  brand: string;
  theme: string;
  persona: string;
  objective: string;
  platform: string;
  description: string;
  tone: string[];
  additionalInfo: string;
  contentType: 'organic' | 'ads';
  negativePrompt?: string;
  colorPalette?: string;
  lighting?: string;
  composition?: string;
  cameraAngle?: string;
  detailLevel?: number;
  mood?: string;
  width?: string;
  height?: string;
  imageIncludeText?: boolean;
  imageTextContent?: string;
  imageTextPosition?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const toneOptions = [
  "inspirador",
  "motivacional", 
  "profissional",
  "casual",
  "elegante",
  "moderno",
  "tradicional",
  "divertido",
  "sério",
];

export default function CreateImage() {
  const { user, session, refreshUserCredits } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    brand: "",
    theme: "",
    persona: "",
    objective: "",
    platform: "",
    description: "",
    tone: [],
    additionalInfo: "",
    contentType: "organic",
    negativePrompt: "",
    colorPalette: "auto",
    lighting: "natural",
    composition: "auto",
    cameraAngle: "eye_level",
    detailLevel: 7,
    mood: "auto",
    imageIncludeText: false,
    imageTextContent: "",
    imageTextPosition: "center",
  });

  const [team, setTeam] = useState<Team | null>(null);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [themes, setThemes] = useState<StrategicThemeSummary[]>([]);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredThemes, setFilteredThemes] = useState<StrategicThemeSummary[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [brandImages, setBrandImages] = useState<string[]>([]);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"organic" | "ads">("organic");
  const [platformGuidelines, setPlatformGuidelines] = useState<string[]>([]);
  const [recommendedAspectRatio, setRecommendedAspectRatio] = useState<string>("");
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);

  const { loadPersistedData, clearPersistedData } = useFormPersistence({
    key: 'create-image-form',
    formData,
    excludeFields: ['referenceFiles']
  });

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setFormData(prev => ({ ...prev, ...persisted }));
      toast.info('Rascunho recuperado');
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
      setReferenceFiles((prev) => [...prev, ...files].slice(0, 5));
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

  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = referenceFiles.filter((_, index) => index !== indexToRemove);
    setReferenceFiles(updatedFiles);
    
    setPreserveImageIndices(prev => 
      prev
        .filter(idx => idx !== indexToRemove)
        .map(idx => idx > indexToRemove ? idx - 1 : idx)
    );
    
    if (updatedFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.teamId || !user?.id) {
        if (user) setIsLoadingData(false);
        return;
      }

      try {
        const [
          { data: teamData, error: teamError },
          { data: brandsData, error: brandsError },
          { data: themesData, error: themesError },
          { data: personasData, error: personasError }
        ] = await Promise.all([
          supabase
            .from('teams')
            .select('*, plan:plans(*)')
            .eq('id', user.teamId)
            .single(),
          supabase
            .from('brands')
            .select('id, name, responsible, created_at, updated_at')
            .eq('team_id', user.teamId)
            .order('created_at', { ascending: false }),
          supabase
            .from('strategic_themes')
            .select('id, brand_id, title, created_at')
            .eq('team_id', user.teamId)
            .order('created_at', { ascending: false }),
          supabase
            .from('personas')
            .select('id, brand_id, name, created_at')
            .eq('team_id', user.teamId)
            .order('created_at', { ascending: false })
        ]);

        if (teamError) throw teamError;
        if (brandsError) throw brandsError;
        if (themesError) throw themesError;
        if (personasError) throw personasError;

        const mappedTeam: Team = {
          id: teamData.id,
          name: teamData.name,
          code: teamData.code,
          admin: teamData.admin_id,
          admin_id: teamData.admin_id,
          members: [],
          pending: [],
          plan: teamData.plan ? {
            id: teamData.plan.id,
            name: teamData.plan.name,
            description: teamData.plan.description || '',
            price: Number(teamData.plan.price_monthly || 0),
            credits: (teamData.plan as any).credits || 0,
            maxMembers: teamData.plan.max_members,
            maxBrands: teamData.plan.max_brands,
            maxStrategicThemes: teamData.plan.max_strategic_themes,
            maxPersonas: teamData.plan.max_personas,
            trialDays: teamData.plan.trial_days || 0,
            isActive: teamData.plan.is_active,
            stripePriceId: teamData.plan.stripe_price_id_monthly,
          } : null,
          credits: (teamData as any).credits || 0,
          free_brands_used: (teamData as any).free_brands_used || 0,
          free_personas_used: (teamData as any).free_personas_used || 0,
          free_themes_used: (teamData as any).free_themes_used || 0,
        };

        const mappedBrands: BrandSummary[] = (brandsData || []).map((brand) => ({
          id: brand.id,
          name: brand.name,
          responsible: brand.responsible,
          createdAt: brand.created_at,
          updatedAt: brand.updated_at,
        }));

        const mappedThemes: StrategicThemeSummary[] = (themesData || []).map((theme) => ({
          id: theme.id,
          brandId: theme.brand_id,
          title: theme.title,
          createdAt: theme.created_at,
        }));

        const mappedPersonas: PersonaSummary[] = (personasData || []).map((persona) => ({
          id: persona.id,
          brandId: persona.brand_id,
          name: persona.name,
          createdAt: persona.created_at,
        }));

        setTeam(mappedTeam);
        setBrands(mappedBrands);
        setThemes(mappedThemes);
        setPersonas(mappedPersonas);
        setIsLoadingData(false);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do formulário");
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const selectedBrand = brands.find((b) => b.id === formData.brand);
    
    setFilteredThemes(
      selectedBrand ? themes.filter((t) => t.brandId === selectedBrand.id) : []
    );
    setFilteredPersonas(
      selectedBrand ? personas.filter((p) => p.brandId === selectedBrand.id) : []
    );

    if (selectedBrand) {
      setBrandImages([]);
      
      supabase
        .from('brands')
        .select('logo, moodboard, reference_image')
        .eq('id', selectedBrand.id)
        .single()
        .then(({ data: fullBrand, error }) => {
          if (!error && fullBrand) {
            const images: string[] = [];
            const logo = fullBrand.logo as any;
            const moodboard = fullBrand.moodboard as any;
            const referenceImage = fullBrand.reference_image as any;
            
            if (logo?.content) images.push(logo.content);
            if (moodboard?.content) images.push(moodboard.content);
            if (referenceImage?.content) images.push(referenceImage.content);
            
            setBrandImages(images);
          }
        });
    } else {
      setBrandImages([]);
    }
  }, [brands, themes, personas, formData.brand, supabase]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (
    field: keyof Omit<FormData, "tone">,
    value: string
  ) => {
    try {
      if (!field || value === undefined) {
        console.error('❌ handleSelectChange: Invalid field or value', { field, value });
        toast.error("Erro ao atualizar campo", {
          description: "Por favor, tente novamente.",
        });
        return;
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
      if (field === "brand") {
        setFormData((prev) => ({ 
          ...prev,
          brand: value,
          theme: "",
          persona: ""
        }));
      }
    
      if (field === "platform") {
        const guidelines = getCaptionGuidelines(value, contentType);
        setPlatformGuidelines(guidelines);
        
        const imageSpec = getPlatformImageSpec(value, "feed", contentType);
        if (imageSpec) {
          setRecommendedAspectRatio(imageSpec.aspectRatio);
          toast.info(`Proporção recomendada para ${value}`, {
            description: `${imageSpec.aspectRatio} (${imageSpec.width}x${imageSpec.height}px)`,
            duration: 4000
          });
        }
      }
    } catch (error) {
      console.error('❌ handleSelectChange error:', error);
      toast.error("Erro ao atualizar campo", {
        description: "Por favor, tente novamente.",
      });
    }
  };

  const handleToneSelect = (tone: string) => {
    if (!formData.tone.includes(tone)) {
      if (formData.tone.length >= 4) {
        toast.error("Limite atingido", {
          description: "Você pode selecionar no máximo 4 tons de voz.",
        });
        return;
      }
      setFormData((prev) => ({ ...prev, tone: [...prev.tone, tone] }));
    }
  };

  const handleToneRemove = (toneToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tone: prev.tone.filter((t) => t !== toneToRemove),
    }));
  };

  const isFormValid = useMemo(() => {
    return (
      formData.brand &&
      formData.objective &&
      formData.platform &&
      formData.description &&
      formData.tone.length > 0 &&
      referenceFiles.length > 0
    );
  }, [
    formData.brand,
    formData.objective,
    formData.platform,
    formData.description,
    formData.tone.length,
    referenceFiles.length
  ]);

  const validateForm = () => {
    const missing: string[] = [];
    
    if (!formData.brand) missing.push('brand');
    if (!formData.objective) missing.push('objective');
    if (!formData.platform) missing.push('platform');
    if (!formData.description) missing.push('description');
    if (formData.tone.length === 0) missing.push('tone');
    if (referenceFiles.length === 0) missing.push('referenceFiles');
    
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleGenerateContent = async () => {
    if (!user) return toast.error("Usuário não encontrado.");
    
    const availableCredits = user?.credits || 0;
    if (availableCredits <= 0)
      return toast.error("Seus créditos para criação de conteúdo acabaram.");
      
    if (!validateForm())
      return toast.error(
        "Por favor, preencha todos os campos obrigatórios (*)."
      );

    setLoading(true);
    setGenerationStep(GenerationStep.GENERATING_IMAGE);
    setGenerationProgress(0);
    
    const toastId = toast.loading("🎨 Processando imagens de referência...", {
      description: "Convertendo arquivos para análise (0%)",
    });

    try {
      const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              
              const MAX_WIDTH = 1024;
              const MAX_HEIGHT = 1024;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const referenceImagesBase64: string[] = [];
      for (let i = 0; i < referenceFiles.length; i++) {
        const file = referenceFiles[i];
        toast.loading("🎨 Processando imagens de referência...", {
          id: toastId,
          description: `Comprimindo imagem ${i + 1}/${referenceFiles.length}...`,
        });
        
        const base64 = await compressImage(file);
        referenceImagesBase64.push(base64);
      }

      setGenerationProgress(10);
      toast.loading("🎨 Preparando geração...", {
        id: toastId,
        description: "Analisando referências (10%)",
      });

      const maxTotalImages = 5;
      const brandImagesCount = brandImages.length;
      const userImagesCount = referenceImagesBase64.length;
      
      let finalBrandImages = brandImages;
      let finalUserImages = referenceImagesBase64;
      
      if (brandImagesCount + userImagesCount > maxTotalImages) {
        const availableSlots = Math.max(0, maxTotalImages - brandImagesCount);
        finalUserImages = referenceImagesBase64.slice(0, availableSlots);
        
        if (availableSlots < userImagesCount) {
          toast.warning(
            `Limite de imagens atingido. Usando ${brandImagesCount} imagens da marca + ${availableSlots} suas imagens (total: ${brandImagesCount + availableSlots})`,
            { duration: 5000 }
          );
        }
      }
      
      const allReferenceImages = [...finalBrandImages, ...finalUserImages];

      const selectedBrand = brands.find(b => b.id === formData.brand);
      const selectedTheme = themes.find(t => t.id === formData.theme);
      const selectedPersona = personas.find(p => p.id === formData.persona);

      const requestData = {
        brand: selectedBrand?.name || formData.brand,
        theme: selectedTheme?.title || formData.theme,
        persona: selectedPersona?.name || formData.persona,
        objective: formData.objective,
        description: formData.description,
        tone: formData.tone,
        platform: formData.platform,
        contentType: contentType,
        additionalInfo: formData.additionalInfo,
        preserveImages: finalBrandImages,
        styleReferenceImages: finalUserImages,
        brandImagesCount: finalBrandImages.length,
        userImagesCount: finalUserImages.length,
        negativePrompt: formData.negativePrompt,
        colorPalette: formData.colorPalette,
        lighting: formData.lighting,
        composition: formData.composition,
        cameraAngle: formData.cameraAngle,
        detailLevel: formData.detailLevel,
        mood: formData.mood,
        width: formData.width,
        height: formData.height,
        includeText: formData.imageIncludeText || false,
        textContent: formData.imageTextContent?.trim() || "",
        textPosition: formData.imageTextPosition || "center",
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!formData.brand || !uuidRegex.test(formData.brand)) {
        toast.error("Por favor, selecione uma marca válida", { id: toastId });
        return;
      }
      
      if (formData.theme && !uuidRegex.test(formData.theme)) {
        toast.error("Tema estratégico inválido", { id: toastId });
        return;
      }
      
      if (formData.persona && !uuidRegex.test(formData.persona)) {
        toast.error("Persona inválida", { id: toastId });
        return;
      }

      toast.loading("Gerando imagem com IA...", {
        id: toastId,
        description: `Usando ${finalBrandImages.length} imagem(ns) da marca + ${finalUserImages.length} sua(s) imagem(ns) de referência.`,
      });

      const imageResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ...requestData,
            teamId: user?.teamId,
          }),
        }
      );

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        throw new Error(`Erro ao gerar imagem: ${errorText}`);
      }

      const { imageUrl, attempt } = await imageResponse.json();
      
      setGenerationStep(GenerationStep.GENERATING_CAPTION);
      setGenerationProgress(60);
      
      toast.loading("✍️ Gerando legenda profissional...", {
        id: toastId,
        description: `Imagem criada em ${attempt} tentativa(s) | Escrevendo copy criativa (60%)`,
      });

      const captionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            formData: {
              ...requestData,
              imageDescription: requestData.description,
              audience: selectedPersona?.name || "",
            }
          }),
        }
      );

      let captionData;
      let isLocalFallback = false;
      
      if (captionResponse.ok) {
        const responseData = await captionResponse.json();
        if (responseData.fallback) {
          console.warn("⚠️ API retornou fallback:", responseData.error);
          isLocalFallback = true;
          toast.warning("Legenda gerada localmente", {
            description: "Usando fallback local devido a erro na API de legenda.",
            duration: 4000,
          });
        }
        captionData = responseData.fallback ? null : responseData;
      } else {
        const errorText = await captionResponse.text();
        console.error("❌ Erro na geração de legenda:", errorText);
        isLocalFallback = true;
        
        toast.error("Erro ao gerar legenda", {
          description: "Usando legenda padrão. Você pode editá-la depois.",
          duration: 4000,
        });
      }

      if (!captionData || isLocalFallback) {
        const brandName = selectedBrand?.name || formData.brand;
        const themeName = selectedTheme?.title || formData.theme || "Nossa proposta";
        const platform = formData.platform;
        
        const platformSpecs = {
          Instagram: { maxLength: 2200, recommendedHashtags: 10 },
          Facebook: { maxLength: 250, recommendedHashtags: 3 },
          LinkedIn: { maxLength: 600, recommendedHashtags: 5 },
          TikTok: { maxLength: 150, recommendedHashtags: 5 },
          Twitter: { maxLength: 280, recommendedHashtags: 2 },
        }[platform] || { maxLength: 500, recommendedHashtags: 5 };

        const fallbackBody = `🌟 ${brandName} apresenta: ${themeName}

${formData.description}

💡 ${formData.objective}

🎯 Tom: ${formData.tone.join(", ")}

💬 Comente o que achou!`;

        captionData = {
          title: `${brandName} | ${themeName} 🚀`,
          body: fallbackBody.substring(0, platformSpecs.maxLength - 100),
          hashtags: [
            brandName.toLowerCase().replace(/\s+/g, ""),
            themeName.toLowerCase().replace(/\s+/g, ""),
            platform.toLowerCase(),
            "marketingdigital",
            "conteudocriativo",
            ...formData.tone.map(t => t.toLowerCase())
          ].filter((tag, index, self) => 
            tag && tag.length > 2 && self.indexOf(tag) === index
          ).slice(0, platformSpecs.recommendedHashtags)
        };
      }

      setGenerationStep(GenerationStep.SAVING);
      setGenerationProgress(80);
      
      toast.loading("💾 Preparando resultado...", {
        id: toastId,
        description: "Finalizando geração (80%)",
      });

      if (!imageUrl || !captionData?.title || !captionData?.body) {
        throw new Error("Dados incompletos na geração");
      }

      const generatedContent = {
        type: "image" as const,
        mediaUrl: imageUrl,
        platform: formData.platform,
        brand: selectedBrand?.name || formData.brand,
        title: captionData.title,
        body: captionData.body,
        hashtags: captionData.hashtags,
        originalFormData: {
          ...requestData,
          brandId: formData.brand,
        },
        actionId: undefined,
        isLocalFallback,
      };
      
      if (refreshUserCredits) {
        await refreshUserCredits();
      }
      
      setGenerationStep(GenerationStep.COMPLETE);
      setGenerationProgress(100);
      
      toast.success("✅ Conteúdo gerado com sucesso!", {
        id: toastId,
        description: "Imagem e legenda criados com Gemini 2.5 🚀",
        duration: 1500,
      });
      
      clearPersistedData();
      
      navigate("/result", { 
        state: { contentData: generatedContent },
        replace: false 
      });
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo:", err);
      
      if (err.message?.includes('compliance_violation')) {
        try {
          const errorMatch = err.message.match(/\{.*\}/);
          if (errorMatch) {
            const errorData = JSON.parse(errorMatch[0]);
            toast.error("Solicitação não permitida", {
              id: toastId,
              description: errorData.message || "A solicitação viola regulamentações publicitárias brasileiras",
              duration: 8000,
            });
            
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
      
      let errorMessage = "Erro ao gerar o conteúdo.";
      let errorDescription = "Por favor, tente novamente.";
      
      if (err.message?.includes("Network")) {
        errorMessage = "Erro de conexão";
        errorDescription = "Verifique sua internet e tente novamente.";
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Tempo esgotado";
        errorDescription = "A geração demorou muito. Tente novamente.";
      } else if (err.message?.includes("API")) {
        errorMessage = "Erro na API";
        errorDescription = "Serviço temporariamente indisponível.";
      } else if (err.message) {
        errorDescription = err.message;
      }
      
      toast.error(errorMessage, { 
        id: toastId,
        description: errorDescription,
        duration: 5000
      });
    } finally {
      setLoading(false);
      setGenerationStep(GenerationStep.IDLE);
      setGenerationProgress(0);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-pink-50/50 dark:from-background dark:via-background dark:to-muted/20">
      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'create_content',
            steps: createContentSteps,
            label: 'Tour de Criar Conteúdo',
            targetElement: '#select-brand'
          }
        ]}
        startDelay={500}
      />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-purple-200/50 dark:border-purple-500/20 bg-gradient-to-r from-pink-50/80 via-purple-50/60 to-pink-50/80 dark:from-purple-500/10 dark:via-purple-500/5 dark:to-purple-500/10 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-3 shadow-md">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Criar Imagem
                  </h1>
                  <p className="text-muted-foreground text-sm mt-0.5">Gere imagens profissionais com IA</p>
                </div>
              </div>
              {user && (
                <Card className="bg-gradient-to-br from-purple-100/80 to-pink-100/80 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-300/50 dark:border-purple-500/20 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full p-2 shadow-sm">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {user?.credits || 0}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">Créditos</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Disponíveis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Configuração Básica */}
          <div className="space-y-6">
            <Card className="backdrop-blur-sm bg-card/90 border-2 border-border/50 shadow-xl rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl border-b-2 border-border/30">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Configuração Básica
                </h2>
                <p className="text-muted-foreground text-sm">
                  Defina marca, tema e público-alvo
                </p>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="brand"
                    className="text-sm font-semibold text-foreground"
                  >
                    Marca <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <NativeSelect
                      value={formData.brand}
                      onValueChange={(value) => handleSelectChange("brand", value)}
                      options={brands.map((b) => ({ value: b.id, label: b.name }))}
                      placeholder={brands.length === 0 ? "Nenhuma marca cadastrada" : "Selecione a marca"}
                      disabled={brands.length === 0}
                      triggerClassName={`h-11 rounded-xl border-2 bg-background/50 text-sm hover:border-primary/50 transition-all ${
                        missingFields.includes('brand') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                      }`}
                    />
                  )}
                  {!isLoadingData && brands.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Você precisa cadastrar uma marca antes.{" "}
                      <button
                        onClick={() => navigate("/brands")}
                        className="text-primary hover:underline font-medium"
                      >
                        Ir para Marcas
                      </button>
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="theme"
                    className="text-sm font-semibold text-foreground"
                  >
                    Tema Estratégico
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <NativeSelect
                      value={formData.theme}
                      onValueChange={(value) => handleSelectChange("theme", value)}
                      options={filteredThemes.map((t) => ({ value: t.id, label: t.title }))}
                      placeholder={
                        !formData.brand
                          ? "Primeiro, escolha a marca"
                          : filteredThemes.length === 0
                          ? "Nenhum tema disponível"
                          : "Selecione um tema (opcional)"
                      }
                      disabled={!formData.brand || filteredThemes.length === 0}
                      triggerClassName="h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-primary/50 transition-all"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="persona"
                    className="text-sm font-semibold text-foreground"
                  >
                    Persona
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <NativeSelect
                      value={formData.persona}
                      onValueChange={(value) => handleSelectChange("persona", value)}
                      options={filteredPersonas.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder={
                        !formData.brand
                          ? "Primeiro, escolha a marca"
                          : "Adicionar persona"
                      }
                      disabled={!formData.brand || filteredPersonas.length === 0}
                      triggerClassName="h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-primary/50 transition-all"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="platform"
                    className="text-sm font-semibold text-foreground"
                  >
                    Plataforma <span className="text-destructive">*</span>
                  </Label>
                  <NativeSelect
                    value={formData.platform}
                    onValueChange={(value) => handleSelectChange("platform", value)}
                    options={[
                      { value: "Instagram", label: "Instagram" },
                      { value: "Facebook", label: "Facebook" },
                      { value: "TikTok", label: "TikTok" },
                      { value: "Twitter/X", label: "Twitter (X)" },
                      { value: "LinkedIn", label: "LinkedIn" },
                      { value: "Comunidades", label: "Comunidades" },
                    ]}
                    placeholder="Onde será postado?"
                    triggerClassName={`h-11 rounded-xl border-2 bg-background/50 text-sm hover:border-primary/50 transition-all ${
                      missingFields.includes('platform') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                    }`}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Tipo de Conteúdo <span className="text-destructive">*</span>
                  </Label>
                  <div id="content-type-selector" className="flex items-center space-x-1 rounded-xl bg-muted p-1 border-2 border-border/30">
                    <Button
                      type="button"
                      variant={contentType === "organic" ? "default" : "ghost"}
                      onClick={() => {
                        setContentType("organic");
                        if (formData.platform) {
                          const guidelines = getCaptionGuidelines(formData.platform, "organic");
                          setPlatformGuidelines(guidelines);
                        }
                      }}
                      className="flex-1 rounded-lg font-semibold"
                    >
                      Orgânico
                    </Button>
                    <Button
                      type="button"
                      variant={contentType === "ads" ? "default" : "ghost"}
                      onClick={() => {
                        setContentType("ads");
                        if (formData.platform) {
                          const guidelines = getCaptionGuidelines(formData.platform, "ads");
                          setPlatformGuidelines(guidelines);
                        }
                      }}
                      className="flex-1 rounded-lg font-semibold"
                    >
                      Anúncio
                    </Button>
                  </div>
                </div>

                {platformGuidelines.length > 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-sm font-semibold text-primary">
                          Diretrizes para {formData.platform} ({contentType === "organic" ? "Orgânico" : "Anúncio"})
                        </p>
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {platformGuidelines.map((guideline, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{guideline}</span>
                          </li>
                        ))}
                      </ul>
                      {recommendedAspectRatio && (
                        <p className="text-xs text-primary/80 font-medium mt-2 pt-2 border-t border-primary/20">
                          💡 Proporção recomendada: {recommendedAspectRatio}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="referenceFile"
                      className="text-sm font-semibold text-foreground"
                    >
                      Imagem de Referência <span className="text-destructive">*</span>
                    </Label>
                    <span className={`text-xs font-medium ${
                      referenceFiles.length >= 5
                        ? 'text-destructive' 
                        : referenceFiles.length >= 4
                          ? 'text-orange-500' 
                          : 'text-muted-foreground'
                    }`}>
                      {referenceFiles.length}/5 imagens
                    </span>
                  </div>

                  <div className="space-y-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={referenceFiles.length >= 5}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const maxFiles = 5;
                        const remainingSlots = maxFiles - referenceFiles.length;
                        const filesToAdd = files.slice(0, remainingSlots);
                        
                        if (files.length > remainingSlots) {
                          toast.error(`Você pode adicionar no máximo 5 imagens. ${filesToAdd.length} imagem(ns) adicionada(s).`);
                        }
                        
                        setReferenceFiles((prev) => [...prev, ...filesToAdd]);
                      }}
                      className={`h-14 rounded-xl border-2 bg-background/50 transition-all hover:border-primary/50 ${
                        missingFields.includes('referenceFiles') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                      }`}
                    />

                    <div
                      ref={pasteAreaRef}
                      tabIndex={0}
                      onPaste={handlePaste}
                      className={`border-2 border-dashed rounded-xl p-4 text-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer ${
                        missingFields.includes('referenceFiles') 
                          ? 'border-destructive ring-destructive/50' 
                          : 'border-border/50'
                      }`}
                    >
                      <ImagePlus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Cole sua imagem aqui (Ctrl+V)
                      </p>
                    </div>

                    {referenceFiles.length > 0 && (
                      <div className="space-y-2 p-3 bg-primary/5 rounded-xl border-2 border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">
                          {referenceFiles.length} imagem(ns) selecionada(s):
                        </p>
                        <div className="space-y-2">
                          {referenceFiles.map((file, idx) => (
                            <div key={idx} className="bg-background/60 rounded-lg p-3 hover:bg-background transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-foreground font-medium flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                  <span className="truncate">{file.name}</span>
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFile(idx)}
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0 ml-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border/20">
                                <Checkbox
                                  id={`preserve-${idx}`}
                                  checked={preserveImageIndices.includes(idx)}
                                  onCheckedChange={() => handleTogglePreserve(idx)}
                                  className="mt-0.5"
                                />
                                <Label
                                  htmlFor={`preserve-${idx}`}
                                  className="text-xs text-muted-foreground cursor-pointer leading-tight"
                                >
                                  Preservar traços desta imagem (cores, estilo, elementos visuais)
                                </Label>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 p-2 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-accent" />
                            <span>
                              <strong className="text-accent">Dica:</strong> Marque "Preservar traços" nas imagens da sua marca/identidade visual. 
                              As outras servirão apenas como referência de estilo.
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do Conteúdo */}
          <div className="space-y-6">
            <Card className="backdrop-blur-sm bg-card/90 border-2 border-border/50 shadow-xl rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-accent/5 to-primary/5 rounded-t-2xl border-b-2 border-border/30">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  Detalhes do Conteúdo
                </h2>
                <p className="text-muted-foreground text-sm">
                  Descreva o objetivo e características do post
                </p>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="objective"
                    className="text-sm font-semibold text-foreground"
                  >
                    Objetivo do Post <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="objective"
                    placeholder="Qual a principal meta? (ex: gerar engajamento, anunciar um produto)"
                    value={formData.objective}
                    onChange={handleInputChange}
                    className={`min-h-[100px] rounded-xl border-2 bg-background/50 resize-none text-sm transition-all ${
                      missingFields.includes('objective') 
                        ? 'border-destructive ring-2 ring-destructive/20' 
                        : 'border-border/50 hover:border-primary/50'
                    }`}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="description"
                      className="text-sm font-semibold text-foreground"
                    >
                      Descrição Visual da Imagem <span className="text-destructive">*</span>
                    </Label>
                    <span className={`text-xs font-medium ${
                      formData.description.length > 5000 
                        ? 'text-destructive' 
                        : formData.description.length > 4500 
                          ? 'text-orange-500' 
                          : 'text-muted-foreground'
                    }`}>
                      {formData.description.length}/5000
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Descreva a cena, iluminação e emoção desejada..."
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={5000}
                    className={`min-h-[120px] rounded-xl border-2 bg-background/50 resize-none text-sm transition-all ${
                      missingFields.includes('description') 
                        ? 'border-destructive ring-2 ring-destructive/20' 
                        : 'border-border/50 hover:border-primary/50'
                    }`}
                  />
                </div>

                <div id="tone-of-voice" className="space-y-3">
                  <Label
                    htmlFor="tone"
                    className="text-sm font-semibold text-foreground"
                  >
                    Tom de Voz <span className="text-destructive">*</span> (máximo 4)
                  </Label>
                  <Select onValueChange={handleToneSelect} value="">
                    <SelectTrigger className={`h-11 rounded-xl border-2 bg-background/50 text-sm transition-all ${
                      missingFields.includes('tone') ? 'border-destructive ring-2 ring-destructive/20 hover:border-destructive' : 'border-border/50 hover:border-primary/50'
                    }`}>
                      <SelectValue placeholder="Selecione um tom de voz" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/20">
                      {toneOptions.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-lg capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.tone.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-xl border-2 border-primary/20">
                      {formData.tone.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/30 pr-1 text-xs font-medium gap-2 hover:bg-primary/20 transition-colors"
                        >
                          {t}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToneRemove(t)}
                            className="h-4 w-4 p-0 hover:bg-destructive/20 rounded-full"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="additionalInfo"
                    className="text-sm font-semibold text-foreground"
                  >
                    Informações Adicionais
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Outras instruções ou contexto relevante..."
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    className="min-h-[80px] rounded-xl border-2 border-border/50 bg-background/50 resize-none text-sm hover:border-primary/50 transition-all"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botão Gerar Conteúdo */}
        <div className="pt-6 pb-8">
          <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-2 border-primary/20 rounded-2xl shadow-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <Button
                  id="generate-button"
                  onClick={handleGenerateContent}
                  disabled={loading || !isFormValid}
                  className="w-full max-w-md h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Gerando imagem...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Gerar Imagem</span>
                      <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                        <Coins className="h-3 w-3 mr-1" />
                        {CREDIT_COSTS.COMPLETE_IMAGE}
                      </Badge>
                    </>
                  )}
                </Button>
                {!isFormValid && !loading && (
                  <div className="text-center bg-muted/40 p-3 rounded-xl border-2 border-border/30 max-w-md">
                    <p className="text-muted-foreground text-sm">
                      Complete todos os campos obrigatórios (*) para gerar
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
}
