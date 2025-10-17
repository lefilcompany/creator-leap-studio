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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, X, Info, ImageIcon, Video, Type, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Brand, BrandSummary } from "@/types/brand";
import type { StrategicTheme, StrategicThemeSummary } from "@/types/theme";
import type { Persona, PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";
import { getPlatformImageSpec, getCaptionGuidelines, platformSpecs } from "@/lib/platformSpecs";

enum GenerationStep {
  IDLE = "IDLE",
  GENERATING_IMAGE = "GENERATING_IMAGE",
  GENERATING_CAPTION = "GENERATING_CAPTION",
  SAVING = "SAVING",
  COMPLETE = "COMPLETE"
}

// Interfaces
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
  // Advanced configurations
  negativePrompt?: string;
  colorPalette?: string;
  lighting?: string;
  composition?: string;
  cameraAngle?: string;
  detailLevel?: number;
  mood?: string;
  width?: string;
  height?: string;
  // Video text configurations
  videoIncludeText?: boolean;
  videoTextContent?: string;
  videoTextPosition?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  // Image text configurations
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

export default function CreateContent() {
  const { user, session, reloadUserData } = useAuth();
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
    // Advanced configurations with smart defaults
    negativePrompt: "",
    colorPalette: "auto",
    lighting: "natural",
    composition: "auto",
    cameraAngle: "eye_level",
    detailLevel: 7,
    mood: "auto",
    // Video text defaults
    videoIncludeText: false,
    videoTextContent: "",
    videoTextPosition: "center",
    // Image text defaults
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
  const [isVideoMode, setIsVideoMode] = useState<boolean>(false);
  const [transformationType, setTransformationType] = useState<
    "image_to_video" | "video_to_video"
  >("image_to_video");
  const [ratio, setRatio] = useState<string>("768:1280");
  const [duration, setDuration] = useState<string>("5");
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"organic" | "ads">("organic");
  const [platformGuidelines, setPlatformGuidelines] = useState<string[]>([]);
  const [recommendedAspectRatio, setRecommendedAspectRatio] = useState<string>("");
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);

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
      setReferenceFiles((prev) => [...prev, ...files].slice(0, 10));
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
    
    // Atualizar índices de preservação (remover o índice e ajustar os maiores)
    setPreserveImageIndices(prev => 
      prev
        .filter(idx => idx !== indexToRemove)
        .map(idx => idx > indexToRemove ? idx - 1 : idx)
    );
    
    // Limpa o input se não houver mais arquivos
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
        // Buscar todos os dados em paralelo para melhor performance
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

        // Mapear team
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
            displayName: teamData.plan.name,
            price: Number(teamData.plan.price_monthly || 0),
            trialDays: teamData.plan.trial_days,
            maxMembers: teamData.plan.max_members,
            maxBrands: teamData.plan.max_brands,
            maxStrategicThemes: teamData.plan.max_strategic_themes,
            maxPersonas: teamData.plan.max_personas,
            quickContentCreations: teamData.plan.credits_quick_content,
            customContentSuggestions: teamData.plan.credits_suggestions,
            contentPlans: teamData.plan.credits_plans,
            contentReviews: teamData.plan.credits_reviews,
            isActive: teamData.plan.is_active,
            stripePriceId: teamData.plan.stripe_price_id_monthly,
          } : null,
          credits: {
            quickContentCreations: teamData.credits_quick_content,
            contentSuggestions: teamData.credits_suggestions,
            contentReviews: teamData.credits_reviews,
            contentPlans: teamData.credits_plans,
          }
        };

        // Mapear dados
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

        // Atualizar todos os estados de uma vez para evitar múltiplas renderizações
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
    
    // Filtrar temas e personas baseado na marca selecionada
    setFilteredThemes(
      selectedBrand ? themes.filter((t) => t.brandId === selectedBrand.id) : []
    );
    setFilteredPersonas(
      selectedBrand ? personas.filter((p) => p.brandId === selectedBrand.id) : []
    );

    // Carregar imagens da marca apenas quando necessário (quando for gerar conteúdo)
    if (selectedBrand) {
      // Limpar imagens anteriores imediatamente
      setBrandImages([]);
      
      // Buscar imagens em background
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "brand") {
      setFormData((prev) => ({ 
        ...prev,
        brand: value,
        theme: "",
        persona: ""
      }));
    }
    
    // Se for plataforma, atualizar diretrizes e sugerir aspect ratio
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

  const handleVideoModeChange = (checked: boolean) => {
    setIsVideoMode(checked);
    if (checked) {
      toast.info("Geração de Vídeo (Beta) Ativada", {
        description:
          "Este recurso está em desenvolvimento e a geração pode levar mais tempo.",
        duration: 4000,
        icon: <Info className="h-5 w-5 text-accent" />,
      });
    }
  };

  // Memorizar se o formulário é válido
  const isFormValid = useMemo(() => {
    const baseValid =
      formData.brand &&
      formData.objective &&
      formData.platform &&
      formData.description &&
      formData.tone.length > 0 &&
      referenceFiles.length > 0;
    
    if (isVideoMode) {
      return (
        baseValid &&
        ratio &&
        (transformationType !== "image_to_video" || duration)
      );
    }
    return baseValid;
  }, [
    formData.brand,
    formData.objective,
    formData.platform,
    formData.description,
    formData.tone.length,
    referenceFiles.length,
    isVideoMode,
    ratio,
    transformationType,
    duration
  ]);

  // Função auxiliar para construir prompt de vídeo
  const buildVideoPrompt = () => {
    const selectedBrand = brands.find(b => b.id === formData.brand);
    let prompt = `${formData.objective}. ${formData.description}. Tom: ${formData.tone.join(", ")}. Marca: ${selectedBrand?.name}.`;
    
    if (formData.additionalInfo) {
      prompt += ` ${formData.additionalInfo}`;
    }
    
    // CRITICAL: Instruções explícitas sobre texto
    if (formData.videoIncludeText && formData.videoTextContent?.trim()) {
      const positionMap = {
        'top': 'no topo do vídeo',
        'center': 'centralizado no vídeo',
        'bottom': 'na parte inferior do vídeo',
        'top-left': 'no canto superior esquerdo',
        'top-right': 'no canto superior direito',
        'bottom-left': 'no canto inferior esquerdo',
        'bottom-right': 'no canto inferior direito'
      };
      
      prompt += ` IMPORTANTE: Incluir o seguinte texto ${positionMap[formData.videoTextPosition || 'center']}: "${formData.videoTextContent}". O texto deve ser legível e bem visível.`;
    } else {
      // Instrução CRÍTICA para prevenir texto indesejado
      prompt += ` CRÍTICO: NÃO incluir NENHUM texto, palavra, letra, número, símbolo ou caractere escrito visível no vídeo. O vídeo deve ser puramente visual, sem qualquer elemento de texto sobreposto. Absolutamente SEM TEXTO.`;
    }
    
    return prompt;
  };

  // Função para validar e atualizar campos faltantes (com efeitos colaterais)
  const validateForm = () => {
    const missing: string[] = [];
    
    if (!formData.brand) missing.push('brand');
    if (!formData.objective) missing.push('objective');
    if (!formData.platform) missing.push('platform');
    if (!formData.description) missing.push('description');
    if (formData.tone.length === 0) missing.push('tone');
    if (referenceFiles.length === 0) missing.push('referenceFiles');
    
    if (isVideoMode) {
      if (!ratio) missing.push('ratio');
      if (transformationType === "image_to_video" && !duration) missing.push('duration');
      // NOVA VALIDAÇÃO: Texto obrigatório quando toggle ativado
      if (formData.videoIncludeText && !formData.videoTextContent?.trim()) {
        missing.push('videoTextContent');
        toast.error("Por favor, digite o texto que deseja exibir no vídeo");
      }
    }
    
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleGenerateContent = async () => {
    if (!team) return toast.error("Equipe não encontrada.");
    
    const availableCredits = team?.credits?.contentSuggestions || 0;
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
      // Converter imagens de referência (upload do usuário) para base64
      const referenceImagesBase64: string[] = [];
      for (const file of referenceFiles) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        referenceImagesBase64.push(base64);
      }

      setGenerationProgress(10);
      toast.loading("🎨 Preparando geração...", {
        id: toastId,
        description: "Analisando referências (10%)",
      });

      // Estratégia de priorização de imagens:
      // 1. Sempre incluir TODAS as imagens da marca (logo, moodboard, reference)
      // 2. Adicionar imagens de upload do usuário até o limite total de 5
      // 3. Se ultrapassar 5, priorizar imagens da marca
      const maxTotalImages = 5;
      const brandImagesCount = brandImages.length;
      const userImagesCount = referenceImagesBase64.length;
      
      let finalBrandImages = brandImages;
      let finalUserImages = referenceImagesBase64;
      
      // Se o total ultrapassar o limite, ajustar imagens do usuário
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
      
      // Combinar: primeiro imagens da marca, depois do usuário
      const allReferenceImages = [...finalBrandImages, ...finalUserImages];

      // Buscar dados completos de brand, theme e persona
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
        referenceImages: allReferenceImages,
        brandImagesCount: finalBrandImages.length, // Informar quantas são da marca
        userImagesCount: finalUserImages.length,   // Informar quantas são do usuário
        negativePrompt: formData.negativePrompt,
        colorPalette: formData.colorPalette,
        lighting: formData.lighting,
        composition: formData.composition,
        cameraAngle: formData.cameraAngle,
        detailLevel: formData.detailLevel,
        mood: formData.mood,
        width: formData.width,
        height: formData.height,
        // Image text configurations
        includeText: formData.imageIncludeText || false,
        textContent: formData.imageTextContent?.trim() || "",
        textPosition: formData.imageTextPosition || "center",
      };

      // Validar que brand é UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!formData.brand || !uuidRegex.test(formData.brand)) {
        toast.error("Por favor, selecione uma marca válida", { id: toastId });
        return;
      }
      
      // Theme e persona são opcionais, mas se fornecidos devem ser válidos
      if (formData.theme && !uuidRegex.test(formData.theme)) {
        toast.error("Tema estratégico inválido", { id: toastId });
        return;
      }
      
      if (formData.persona && !uuidRegex.test(formData.persona)) {
        toast.error("Persona inválida", { id: toastId });
        return;
      }

      // Se estiver em modo vídeo, gerar vídeo
      if (isVideoMode) {
        toast.loading("Iniciando geração de vídeo...", {
          id: toastId,
          description: "Criando registro e iniciando processamento com Veo3.",
        });

        const videoPrompt = buildVideoPrompt();
        
        // Criar registro de action primeiro com status pending
        const { data: actionData, error: actionError } = await supabase
          .from('actions')
          .insert({
            type: 'GERAR_VIDEO',
            brand_id: formData.brand,
            team_id: user?.teamId,
            user_id: user?.id,
            status: 'pending',
            approved: false,
            revisions: 0,
            details: {
              prompt: videoPrompt,
              objective: requestData.objective,
              platform: requestData.platform,
              tone: requestData.tone,
              brand: requestData.brand,
              theme: requestData.theme,
              persona: requestData.persona,
              additionalInfo: requestData.additionalInfo,
              aspectRatio: ratio,
              // NOVOS CAMPOS DE METADATA
              includeText: formData.videoIncludeText || false,
              textContent: formData.videoTextContent?.trim() || "",
              textPosition: formData.videoTextPosition || "center"
            },
            result: null
          })
          .select()
          .single();

        if (actionError || !actionData) {
          throw new Error(`Erro ao criar registro: ${actionError?.message}`);
        }

        // Iniciar geração de vídeo em background
        const videoResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              prompt: videoPrompt,
              referenceImage: allReferenceImages[0],
              actionId: actionData.id,
              includeText: formData.videoIncludeText || false,
              textContent: formData.videoTextContent?.trim() || "",
              textPosition: formData.videoTextPosition || "center"
            }),
          }
        );

        if (!videoResponse.ok) {
          const errorText = await videoResponse.text();
          // Atualizar action como failed
          await supabase
            .from('actions')
            .update({ status: 'failed', result: { error: errorText } })
            .eq('id', actionData.id);
          throw new Error(`Erro ao iniciar geração: ${errorText}`);
        }

        const { status: genStatus, message } = await videoResponse.json();
        
        toast.success("Vídeo sendo gerado!", {
          id: toastId,
          description: message || "Aguarde enquanto processamos seu vídeo...",
          duration: 3000,
        });
        
        // Navegar para a tela de resultado de vídeo
        navigate("/video-result", {
          state: {
            contentData: {
              mediaUrl: "", // Será atualizado quando o vídeo estiver pronto
              caption: videoPrompt || formData.description || "Legenda sendo gerada...",
              platform: formData.platform,
              brand: selectedBrand?.name || "Marca não especificada",
              title: "",
              body: "",
              hashtags: [],
              originalFormData: formData,
              actionId: actionData.id,
              isProcessing: true, // Flag para indicar que está processando
            }
          }
        });
        return;
      }

      // Modo imagem (código existente)
      toast.loading("Gerando imagem com IA...", {
        id: toastId,
        description: `Usando ${finalBrandImages.length} imagem(ns) da marca + ${finalUserImages.length} sua(s) imagem(ns) de referência.`,
      });

      // 1. Gerar imagem com Gemini 2.5
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
            teamId: user?.teamId, // Enviar teamId para controle de créditos
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

      // 2. Gerar legenda com Gemini 2.5
      const captionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
        // Verificar se é um fallback da API
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

      // Fallback local robusto e estruturado
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

      // Validar dados completos antes de criar o objeto
      if (!imageUrl || !captionData?.title || !captionData?.body) {
        throw new Error("Dados incompletos na geração");
      }

      // Manter dados ESTRUTURADOS - não concatenar
      const generatedContent = {
        type: "image" as const,
        mediaUrl: imageUrl,
        platform: formData.platform,
        brand: selectedBrand?.name || formData.brand,
        // Dados estruturados da legenda
        title: captionData.title,
        body: captionData.body,
        hashtags: captionData.hashtags,
        originalFormData: {
          ...requestData,
          brandId: formData.brand,
        },
        actionId: undefined,
        isLocalFallback, // Informar se usou fallback
      };
      
      // Recarregar dados do usuário para atualizar créditos no header
      if (reloadUserData) {
        await reloadUserData();
      }
      
      setGenerationStep(GenerationStep.COMPLETE);
      setGenerationProgress(100);
      
      toast.success("✅ Conteúdo gerado com sucesso!", {
        id: toastId,
        description: "Imagem e legenda criados com Gemini 2.5 🚀",
        duration: 1500,
      });
      
      // Navegação imediata para melhor performance
      navigate("/result", { 
        state: { contentData: generatedContent },
        replace: false 
      });
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo:", err);
      
      // Tratar erro de violação de compliance de forma amigável
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
      
      // Mensagens de erro mais específicas
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
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                    Criar Conteúdo
                  </h1>
                  <p className="text-muted-foreground text-xs md:text-sm lg:text-base">
                    Preencha os campos para gerar um post com IA
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center space-x-1 rounded-full bg-muted p-1 border flex-1 xl:flex-initial xl:w-auto">
                  <Button
                    variant={!isVideoMode ? "default" : "ghost"}
                    onClick={() => handleVideoModeChange(false)}
                    className="w-full rounded-full font-semibold transition-all duration-200 ease-in-out hover:bg-background/50 hover:text-muted-foreground"
                  >
                    Imagem
                  </Button>
                  <Button
                    variant={isVideoMode ? "default" : "ghost"}
                    onClick={() => handleVideoModeChange(true)}
                    className="w-full rounded-full font-semibold transition-all duration-200 ease-in-out hover:bg-background/50 hover:text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Vídeo
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none transition-colors duration-200 ${
                          isVideoMode
                            ? "bg-background text-primary"
                            : "border border-primary/50 bg-primary/20 text-primary"
                        }`}
                      >
                        BETA
                      </span>
                    </div>
                  </Button>
                </div>
                {isLoadingData ? (
                  <Skeleton className="h-12 md:h-14 w-full sm:w-48 xl:w-52 rounded-xl flex-shrink-0" />
                ) : (
                  team && (
                    <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex-shrink-0">
                      <CardContent className="p-2.5 md:p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                            <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                              <Zap className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                              {team?.credits?.contentSuggestions || 0}
                            </span>
                            <p className="text-sm text-muted-foreground font-medium leading-tight whitespace-nowrap">
                              Criações Restantes
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* Configuração Básica */}
          <div className="space-y-4 md:space-y-6">
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
              <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-2xl">
                <h2 className="text-lg md:text-xl font-semibold flex items-center gap-3 text-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Configuração Básica
                </h2>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Defina marca, tema e público
                </p>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-5 p-4 md:p-6">
                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="brand"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Marca <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        handleSelectChange("brand", value)
                      }
                      value={formData.brand}
                      disabled={brands.length === 0}
                    >
                      <SelectTrigger className={`h-10 md:h-11 rounded-xl border-2 bg-background/50 text-sm hover:border-border/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        missingFields.includes('brand') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                      }`}>
                        <SelectValue 
                          placeholder={
                            brands.length === 0
                              ? "Nenhuma marca cadastrada"
                              : "Selecione a marca"
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/20">
                        {brands.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={b.id}
                            className="rounded-lg"
                          >
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!isLoadingData && brands.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Você precisa cadastrar uma marca antes de criar conteúdo.{" "}
                      <button
                        onClick={() => navigate("/marcas")}
                        className="text-primary hover:underline font-medium"
                      >
                        Ir para Marcas
                      </button>
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="theme"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Tema Estratégico
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        handleSelectChange("theme", value)
                      }
                      value={formData.theme}
                      disabled={!formData.brand || filteredThemes.length === 0}
                    >
                      <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 disabled:opacity-50 text-sm hover:border-border/70 transition-colors">
                        <SelectValue
                          placeholder={
                            !formData.brand
                              ? "Primeiro, escolha a marca"
                              : filteredThemes.length === 0
                              ? "Nenhum tema disponível"
                              : "Selecione um tema (opcional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/20">
                        {filteredThemes.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.id}
                            className="rounded-lg"
                          >
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="persona"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Persona
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-10 md:h-11 w-full rounded-xl" />
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        handleSelectChange("persona", value)
                      }
                      value={formData.persona}
                      disabled={!formData.brand || filteredPersonas.length === 0}
                    >
                      <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 disabled:opacity-50 text-sm hover:border-border/70 transition-colors">
                        <SelectValue
                          placeholder={
                            !formData.brand
                              ? "Primeiro, escolha a marca"
                              : "Adicionar persona"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/20">
                        {filteredPersonas.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="rounded-lg"
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="platform"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Plataforma <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleSelectChange("platform", value)
                    }
                    value={formData.platform}
                  >
                    <SelectTrigger className={`h-10 md:h-11 rounded-xl border-2 bg-background/50 text-sm hover:border-border/70 transition-colors ${
                      missingFields.includes('platform') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                    }`}>
                      <SelectValue placeholder="Onde será postado?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/20">
                      <SelectItem value="Instagram" className="rounded-lg">
                        Instagram
                      </SelectItem>
                      <SelectItem value="Facebook" className="rounded-lg">
                        Facebook
                      </SelectItem>
                      <SelectItem value="TikTok" className="rounded-lg">
                        TikTok
                      </SelectItem>
                      <SelectItem value="Twitter/X" className="rounded-lg">
                        Twitter (X)
                      </SelectItem>
                      <SelectItem value="LinkedIn" className="rounded-lg">
                        LinkedIn
                      </SelectItem>
                      <SelectItem value="Comunidades" className="rounded-lg">
                        Comunidades
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type Selection */}
                <div className="space-y-2 md:space-y-3">
                  <Label className="text-xs md:text-sm font-semibold text-foreground">
                    Tipo de Conteúdo <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center space-x-1 rounded-xl bg-muted p-1 border-2 border-border/30">
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
                      className="flex-1 rounded-lg font-semibold transition-all duration-200 ease-in-out hover:bg-accent/20 hover:border-accent hover:text-accent"
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
                      className="flex-1 rounded-lg font-semibold transition-all duration-200 ease-in-out hover:bg-accent/20 hover:border-accent hover:text-accent"
                    >
                      Anúncio
                    </Button>
                  </div>
                </div>

                {/* Platform Guidelines Display */}
                {platformGuidelines.length > 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3 md:p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-xs md:text-sm font-semibold text-primary">
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

                {isVideoMode && (
                  <>
                    <div className="space-y-2 md:space-y-3">
                      <Label
                        htmlFor="transformation"
                        className="text-xs md:text-sm font-semibold text-foreground"
                      >
                        Tipo de Transformação <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={transformationType}
                        onValueChange={(value) =>
                          setTransformationType(value as any)
                        }
                      >
                        <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image_to_video">
                            Imagem para Vídeo
                          </SelectItem>
                          <SelectItem value="video_to_video">
                            Vídeo para Vídeo
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-2 md:space-y-3">
                        <Label
                          htmlFor="ratio"
                          className="text-xs md:text-sm font-semibold text-foreground"
                        >
                          Proporção <span className="text-destructive">*</span>
                        </Label>
                        <Select value={ratio} onValueChange={setRatio}>
                          <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="768:1280">
                              Vertical (9:16)
                            </SelectItem>
                            <SelectItem value="1280:768">
                              Horizontal (16:9)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {transformationType === "image_to_video" && (
                        <div className="space-y-2 md:space-y-3">
                          <Label
                            htmlFor="duration"
                            className="text-xs md:text-sm font-semibold text-foreground"
                          >
                            Duração (s) <span className="text-destructive">*</span>
                          </Label>
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5s</SelectItem>
                              <SelectItem value="10">10s</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="referenceFile"
                      className="text-xs md:text-sm font-semibold text-foreground"
                    >
                      {isVideoMode
                        ? transformationType === "image_to_video"
                          ? "Imagem de Referência"
                          : "Vídeo de Referência"
                        : "Imagem de Referência"} <span className="text-destructive">*</span>
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

                  <div className="space-y-2 md:space-y-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={isVideoMode && transformationType === "video_to_video" ? "video/*" : "image/*"}
                      multiple
                      disabled={referenceFiles.length >= 5}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remainingSlots = 5 - referenceFiles.length;
                        const filesToAdd = files.slice(0, remainingSlots);
                        
                        if (files.length > remainingSlots) {
                          toast.error(`Você pode adicionar no máximo 5 imagens. ${filesToAdd.length} imagem(ns) adicionada(s).`);
                        }
                        
                        setReferenceFiles((prev) => [...prev, ...filesToAdd]);
                      }}
                      className={`h-12 md:h-14 rounded-xl border-2 bg-background/50 flex items-center file:mr-3 md:file:mr-4 file:h-full file:py-0 file:px-4 md:file:px-5 file:rounded-l-[10px] file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 hover:border-primary/30 transition-all cursor-pointer ${
                        missingFields.includes('referenceFiles') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                      }`}
                    />

                    <div
                      ref={pasteAreaRef}
                      tabIndex={0}
                      onPaste={handlePaste}
                      className={`border-2 border-dashed rounded-xl p-3 md:p-4 text-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 ${
                        missingFields.includes('referenceFiles') 
                          ? 'border-destructive ring-destructive/50' 
                          : 'border-border/50 focus:ring-primary/50'
                      }`}
                    >
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Cole sua imagem aqui (Ctrl+V)
                      </p>
                    </div>

                    {referenceFiles.length > 0 && (
                      <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">
                          {referenceFiles.length} imagem(ns) selecionada(s):
                        </p>
                        <div className="space-y-2">
                          {referenceFiles.map((file, idx) => (
                            <div key={idx} className="bg-background/50 rounded-lg p-3 group hover:bg-background transition-colors">
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
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0 ml-2"
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
          <div className="space-y-4 md:space-y-6">
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
              <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-t-2xl">
                <h2 className="text-lg md:text-xl font-semibold flex items-center gap-3 text-foreground">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Detalhes do Conteúdo
                </h2>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Descreva o objetivo e características do post
                </p>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="objective"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Objetivo do Post <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="objective"
                    placeholder="Qual a principal meta? (ex: gerar engajamento, anunciar um produto, educar)"
                    value={formData.objective}
                    onChange={handleInputChange}
                    className={`min-h-[80px] md:min-h-[100px] rounded-xl border-2 bg-background/50 resize-none text-sm hover:border-border/70 transition-colors ${
                      missingFields.includes('objective') 
                        ? 'border-destructive ring-2 ring-destructive/20 focus:border-destructive' 
                        : 'border-border/50 focus:border-primary/50'
                    }`}
                  />
                </div>

                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="description"
                      className="text-xs md:text-sm font-semibold text-foreground"
                    >
                      {isVideoMode
                        ? "Descrição Visual do Vídeo"
                        : "Descrição Visual da Imagem"} <span className="text-destructive">*</span>
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
                    placeholder={
                      isVideoMode
                        ? "Como um roteirista: descreva a ação, câmera e atmosfera..."
                        : "Como um diretor de arte: descreva a cena, iluminação e emoção..."
                    }
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={5000}
                    className={`min-h-[100px] md:min-h-[120px] rounded-xl border-2 bg-background/50 resize-none text-sm hover:border-border/70 transition-colors ${
                      missingFields.includes('description') 
                        ? 'border-destructive ring-2 ring-destructive/20 focus:border-destructive' 
                        : 'border-border/50 focus:border-primary/50'
                    }`}
                  />
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="tone"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Tom de Voz <span className="text-destructive">*</span> (máximo 4)
                  </Label>
                  <Select onValueChange={handleToneSelect} value="">
                    <SelectTrigger className={`h-10 md:h-11 rounded-xl border-2 bg-background/50 text-sm hover:border-border/70 transition-colors ${
                      missingFields.includes('tone') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                    }`}>
                      <SelectValue placeholder="Adicionar tom de voz..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/20">
                      {toneOptions.map((option) => (
                        <SelectItem
                          key={option}
                          value={option}
                          disabled={formData.tone.includes(option)}
                          className="rounded-lg"
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className={`flex flex-wrap gap-2 min-h-[40px] p-3 rounded-xl border-2 border-dashed bg-muted/20 ${
                    missingFields.includes('tone') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                  }`}>
                    {formData.tone.length === 0 ? (
                      <span className={`text-xs md:text-sm italic self-center ${
                        missingFields.includes('tone') ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        Nenhum tom selecionado
                      </span>
                    ) : (
                      formData.tone.map((tone) => (
                        <div
                          key={tone}
                          className="flex items-center gap-2 bg-gradient-to-r from-primary/15 to-primary/5 border-2 border-primary/30 text-primary text-xs md:text-sm font-semibold px-3 py-1.5 rounded-xl"
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                          <button
                            onClick={() => handleToneRemove(tone)}
                            className="ml-1 text-primary hover:text-destructive p-0.5 rounded-full hover:bg-destructive/10 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="additionalInfo"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    Informações Extras
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Detalhes cruciais (ex: usar a cor #FF5733, incluir nosso logo...)"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    className="min-h-[80px] md:min-h-[100px] rounded-xl border-2 border-border/50 bg-background/50 resize-none text-sm hover:border-border/70 focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Configurações de Texto no Vídeo - NOVO BLOCO */}
                {isVideoMode && (
                  <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl">
                    <CardContent className="space-y-4 p-4">
                      {/* Toggle Switch */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Type className="h-4 w-4 text-primary" />
                            Incluir Texto no Vídeo?
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Escolha se deseja adicionar texto visível no vídeo gerado
                          </p>
                        </div>
                        <Switch
                          checked={formData.videoIncludeText || false}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ 
                              ...prev, 
                              videoIncludeText: checked,
                              videoTextContent: checked ? prev.videoTextContent : "",
                              videoTextPosition: checked ? prev.videoTextPosition : "center"
                            }))
                          }
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>

                      {/* Campos condicionais quando toggle está ativado */}
                      {formData.videoIncludeText && (
                        <div className="space-y-4 pt-2 border-t border-primary/20">
                          {/* Campo de Texto */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor="videoTextContent"
                              className="text-xs md:text-sm font-semibold text-foreground"
                            >
                              Texto a Exibir <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="videoTextContent"
                              placeholder="Digite o texto que deseja exibir no vídeo..."
                              value={formData.videoTextContent || ""}
                              onChange={(e) => 
                                setFormData(prev => ({ 
                                  ...prev, 
                                  videoTextContent: e.target.value 
                                }))
                              }
                              className={`min-h-[80px] rounded-xl border-2 bg-background/50 resize-none text-sm hover:border-border/70 transition-colors ${
                                formData.videoIncludeText && !formData.videoTextContent?.trim()
                                  ? 'border-destructive ring-2 ring-destructive/20 focus:border-destructive' 
                                  : 'border-border/50 focus:border-primary/50'
                              }`}
                              maxLength={200}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {formData.videoTextContent?.length || 0}/200 caracteres
                            </p>
                          </div>

                          {/* Select de Posição */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor="videoTextPosition"
                              className="text-xs md:text-sm font-semibold text-foreground"
                            >
                              Posição do Texto
                            </Label>
                            <Select 
                              value={formData.videoTextPosition || "center"}
                              onValueChange={(value) =>
                                setFormData(prev => ({ 
                                  ...prev, 
                                  videoTextPosition: value as any
                                }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl border-2 border-border/50 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Topo</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="bottom">Inferior</SelectItem>
                                <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                                <SelectItem value="top-right">Superior Direito</SelectItem>
                                <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                                <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Preview Visual do Texto no Vídeo */}
                          {formData.videoTextContent?.trim() && (
                            <div className="space-y-2 pt-2">
                              <Label className="text-xs font-medium text-muted-foreground">
                                Preview do Texto
                              </Label>
                              <div className="relative w-full aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-primary/30 overflow-hidden flex items-center justify-center">
                                <div 
                                  className={`absolute px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg ${
                                    formData.videoTextPosition === 'top' ? 'top-4 left-1/2 -translate-x-1/2' :
                                    formData.videoTextPosition === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2' :
                                    formData.videoTextPosition === 'top-left' ? 'top-4 left-4' :
                                    formData.videoTextPosition === 'top-right' ? 'top-4 right-4' :
                                    formData.videoTextPosition === 'bottom-left' ? 'bottom-4 left-4' :
                                    formData.videoTextPosition === 'bottom-right' ? 'bottom-4 right-4' :
                                    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                                  }`}
                                >
                                  <p className="text-white font-bold text-sm md:text-base text-center leading-tight">
                                    {formData.videoTextContent}
                                  </p>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 pointer-events-none" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Configurações de Texto na Imagem - NOVO BLOCO */}
                {!isVideoMode && (
                  <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl">
                    <CardContent className="space-y-4 p-4">
                      {/* Toggle Switch */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Type className="h-4 w-4 text-primary" />
                            Incluir Texto na Imagem?
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Escolha se deseja adicionar texto visível na imagem gerada
                          </p>
                        </div>
                        <Switch
                          checked={formData.imageIncludeText || false}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ 
                              ...prev, 
                              imageIncludeText: checked,
                              imageTextContent: checked ? prev.imageTextContent : "",
                              imageTextPosition: checked ? prev.imageTextPosition : "center"
                            }))
                          }
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>

                      {/* Campos condicionais quando toggle está ativado */}
                      {formData.imageIncludeText && (
                        <div className="space-y-4 pt-2 border-t border-primary/20">
                          {/* Campo de Texto */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor="imageTextContent"
                              className="text-xs md:text-sm font-semibold text-foreground"
                            >
                              Texto a Exibir <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="imageTextContent"
                              placeholder="Digite o texto que deseja exibir na imagem..."
                              value={formData.imageTextContent || ""}
                              onChange={(e) => 
                                setFormData(prev => ({ 
                                  ...prev, 
                                  imageTextContent: e.target.value 
                                }))
                              }
                              className={`min-h-[80px] rounded-xl border-2 bg-background/50 resize-none text-sm hover:border-border/70 transition-colors ${
                                formData.imageIncludeText && !formData.imageTextContent?.trim()
                                  ? 'border-destructive ring-2 ring-destructive/20 focus:border-destructive' 
                                  : 'border-border/50 focus:border-primary/50'
                              }`}
                              maxLength={200}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {formData.imageTextContent?.length || 0}/200 caracteres
                            </p>
                          </div>

                          {/* Select de Posição */}
                          <div className="space-y-2">
                            <Label 
                              htmlFor="imageTextPosition"
                              className="text-xs md:text-sm font-semibold text-foreground"
                            >
                              Posição do Texto
                            </Label>
                            <Select 
                              value={formData.imageTextPosition || "center"}
                              onValueChange={(value) =>
                                setFormData(prev => ({ 
                                  ...prev, 
                                  imageTextPosition: value as any
                                }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl border-2 border-border/50 bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Topo</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="bottom">Inferior</SelectItem>
                                <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                                <SelectItem value="top-right">Superior Direito</SelectItem>
                                <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                                <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Preview Visual da Posição */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Preview da Posição
                            </Label>
                            <div className="relative w-full aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border-2 border-dashed border-border/50 overflow-hidden">
                              <div 
                                 className={`absolute text-xs font-bold bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md shadow-lg ${
                                  formData.imageTextPosition === 'top' ? 'top-4 left-1/2 -translate-x-1/2' :
                                  formData.imageTextPosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                  formData.imageTextPosition === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2' :
                                  formData.imageTextPosition === 'top-left' ? 'top-4 left-4' :
                                  formData.imageTextPosition === 'top-right' ? 'top-4 right-4' :
                                  formData.imageTextPosition === 'bottom-left' ? 'bottom-4 left-4' :
                                  formData.imageTextPosition === 'bottom-right' ? 'bottom-4 right-4' :
                                  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                                }`}
                              >
                                {formData.imageTextContent?.trim() || "Seu texto aqui"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Alerta quando toggle ativo mas sem texto */}
                      {formData.imageIncludeText && !formData.imageTextContent?.trim() && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <p className="text-xs text-destructive font-medium">
                            Por favor, digite o texto que deseja exibir na imagem
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Advanced Configuration Accordion */}
                {!isVideoMode && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced" className="border border-border/20 rounded-xl px-4 bg-muted/10">
                      <AccordionTrigger className="text-xs md:text-sm font-semibold text-foreground hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Configurações Avançadas (Opcional)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2 pb-4">
                        <p className="text-xs text-muted-foreground mb-4">
                          Controles profissionais para designers. Deixe em "Auto" para resultados inteligentes.
                        </p>

                        {/* Negative Prompt */}
                        <div className="space-y-2">
                          <Label htmlFor="negativePrompt" className="text-xs font-medium flex items-center gap-2">
                            Prompt Negativo
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Label>
                          <Textarea
                            id="negativePrompt"
                            placeholder="O que NÃO incluir (ex: texto, pessoas, fundo branco...)"
                            value={formData.negativePrompt}
                            onChange={handleInputChange}
                            className="min-h-[60px] rounded-lg border-2 border-border/50 bg-background/50 resize-none text-xs"
                          />
                        </div>

                        {/* Color Palette */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Paleta de Cores</Label>
                          <Select
                            value={formData.colorPalette}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, colorPalette: value }))}
                          >
                            <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
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
                            <SelectTrigger className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-xs">
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
                                  {platformSpecs[formData.platform][formData.contentType === 'ads' ? 'ads' : 'organic']?.image.dimensions.map((dim) => (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botão Gerar Conteúdo */}
        <div className="pt-4 md:pt-6 pb-6 md:pb-8">
          <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border border-border/20 rounded-2xl shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <Button
                  onClick={handleGenerateContent}
                  disabled={loading || !isFormValid}
                  className="w-full max-w-sm md:max-w-md h-12 md:h-14 rounded-2xl text-base md:text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary hover:from-primary/90 hover:via-accent/90 hover:to-secondary/90 shadow-xl transition-all duration-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base">Gerando conteúdo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base">Gerar Conteúdo</span>
                    </>
                  )}
                </Button>
                {!isFormValid && !loading && (
                  <div className="text-center bg-muted/30 p-3 rounded-xl border border-border/30 max-w-sm md:max-w-md">
                    <p className="text-muted-foreground text-xs md:text-sm">
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