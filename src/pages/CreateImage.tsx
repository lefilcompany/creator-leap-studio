import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { TagSelect } from "@/components/ui/tag-select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, X, Info, ImagePlus, Coins, Image as ImageIcon, HelpCircle, Paintbrush, ChevronDown, Plus, Settings2, Mic, ClipboardPaste, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { BrandSummary } from "@/types/brand";
import type { StrategicThemeSummary } from "@/types/theme";
import type { PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { getPlatformImageSpec, getCaptionGuidelines, platformSpecs } from "@/lib/platformSpecs";
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { createContentSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { PlatformSelector } from "@/components/quick-content/PlatformSelector";
import createBanner from "@/assets/create-banner.jpg";

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
  prompt: string;
  platform: string;
  tone: string[];
  additionalInfo: string;
  contentType: 'organic' | 'ads';
  visualStyle: string;
  negativePrompt?: string;
  colorPalette?: string;
  lighting?: string;
  composition?: string;
  cameraAngle?: string;
  detailLevel?: number;
  mood?: string;
  width?: string;
  height?: string;
  aspectRatio?: string;
  imageIncludeText?: boolean;
  imageTextContent?: string;
  imageTextPosition?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontStyle?: string;
  textDesignStyle?: string;
  ctaText?: string;
  adMode?: 'standard' | 'professional';
  priceText?: string;
  includeBrandLogo?: boolean;
}

// Aspect ratio to dimensions mapping (must match backend)
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '5:4': { width: 1080, height: 864 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '3:4': { width: 1080, height: 1440 },
  '4:3': { width: 1080, height: 810 },
  '2:3': { width: 1080, height: 1620 },
  '3:2': { width: 1080, height: 720 },
  '21:9': { width: 1920, height: 823 },
  '1.91:1': { width: 1200, height: 630 },
};

const TEXT_POSITIONS = [
  { value: 'top-left', label: 'Topo Esq.', icon: '↖' },
  { value: 'top', label: 'Topo', icon: '↑' },
  { value: 'top-right', label: 'Topo Dir.', icon: '↗' },
  { value: 'center', label: 'Centro', icon: '⊕' },
  { value: 'bottom-left', label: 'Inferior Esq.', icon: '↙' },
  { value: 'bottom', label: 'Inferior', icon: '↓' },
  { value: 'bottom-right', label: 'Inferior Dir.', icon: '↘' },
] as const;

const FONT_STYLE_OPTIONS = [
  { value: 'modern', label: 'Moderno', desc: 'Sans-serif limpa e minimalista' },
  { value: 'elegant', label: 'Elegante', desc: 'Serifa clássica e refinada' },
  { value: 'fun', label: 'Divertido', desc: 'Script casual e expressiva' },
  { value: 'impactful', label: 'Impactante', desc: 'Bold condensada, alto impacto' },
] as const;

const TEXT_DESIGN_OPTIONS = [
  { value: 'clean', label: 'Clean', desc: 'Texto sobre espaço negativo, sem overlay' },
  { value: 'overlay', label: 'Overlay', desc: 'Texto sobre faixa semitransparente' },
  { value: 'gradient_bar', label: 'Barra Gradiente', desc: 'Texto sobre barra com gradiente da marca' },
  { value: 'cutout', label: 'Recorte', desc: 'Texto recortado revelando a imagem por dentro' },
  { value: 'shadow_drop', label: 'Sombra', desc: 'Texto com sombra projetada forte' },
  { value: 'neon_glow', label: 'Neon', desc: 'Texto com brilho neon luminoso' },
  { value: 'boxed', label: 'Emoldurado', desc: 'Texto dentro de caixa com borda e fundo sólido' },
  { value: 'badge', label: 'Badge/Selo', desc: 'Texto dentro de selo/etiqueta colorida com destaque' },
  { value: 'plaquinha', label: 'Plaquinha', desc: 'Texto em placa de madeira/metal com textura' },
  { value: 'card_overlay', label: 'Card Overlay', desc: 'Painel com informações sobrepostas na foto' },
] as const;

const toneOptions = [
  "inspirador", "motivacional", "profissional", "casual",
  "elegante", "moderno", "tradicional", "divertido", "sério",
];

const VISUAL_STYLES = [
  { value: "realistic", label: "Fotorealístico" },
  { value: "animated", label: "Animado / 3D" },
  { value: "cartoon", label: "Cartoon" },
  { value: "anime", label: "Anime" },
  { value: "watercolor", label: "Aquarela" },
  { value: "oil_painting", label: "Pintura a Óleo" },
  { value: "digital_art", label: "Arte Digital" },
  { value: "sketch", label: "Esboço" },
  { value: "minimalist", label: "Minimalista" },
  { value: "vintage", label: "Vintage" },
] as const;

export default function CreateImage() {
  const { user, session, refreshUserCredits } = useAuth();
  const { addTask } = useBackgroundTasks();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    brand: "", theme: "", persona: "", prompt: "", platform: "",
    tone: [], additionalInfo: "", contentType: "organic",
    visualStyle: "realistic", negativePrompt: "", colorPalette: "auto",
    lighting: "natural", composition: "auto", cameraAngle: "eye_level",
    detailLevel: 7, mood: "auto", imageIncludeText: false,
    imageTextContent: "", imageTextPosition: "center",
    fontStyle: "modern", textDesignStyle: "clean", ctaText: "",
    adMode: "standard", priceText: "", includeBrandLogo: false,
  });

  const [loading, setLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState(GenerationStep.IDLE);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [brandImages, setBrandImages] = useState<string[]>([]);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"organic" | "ads">("organic");
  const [platformGuidelines, setPlatformGuidelines] = useState<string[]>([]);
  const [recommendedAspectRatio, setRecommendedAspectRatio] = useState("");
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);
  const [showStyles, setShowStyles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const teamId = user?.teamId;
  const userId = user?.id;

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['brands', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase.from('brands').select('id, name, responsible, created_at, updated_at').eq('team_id', teamId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((brand: any) => ({ id: brand.id, name: brand.name, responsible: brand.responsible, brandColor: null, avatarUrl: null, createdAt: brand.created_at, updatedAt: brand.updated_at })) as BrandSummary[];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ['themes', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase.from('strategic_themes').select('id, brand_id, title, created_at').eq('team_id', teamId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((theme: any) => ({ id: theme.id, brandId: theme.brand_id, title: theme.title, createdAt: theme.created_at })) as StrategicThemeSummary[];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase.from('personas').select('id, brand_id, name, created_at').eq('team_id', teamId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((persona: any) => ({ id: persona.id, brandId: persona.brand_id, name: persona.name, createdAt: persona.created_at })) as PersonaSummary[];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: team = null } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const { data: teamData, error } = await supabase.from('teams').select('*, plan:plans(*)').eq('id', teamId).single();
      if (error) throw error;
      return {
        id: teamData.id, name: teamData.name, code: teamData.code,
        admin: teamData.admin_id, admin_id: teamData.admin_id, members: [], pending: [],
        plan: teamData.plan ? {
          id: teamData.plan.id, name: teamData.plan.name, description: teamData.plan.description || '',
          price: Number(teamData.plan.price_monthly || 0), credits: (teamData.plan as any).credits || 0,
          maxMembers: teamData.plan.max_members, maxBrands: teamData.plan.max_brands,
          maxStrategicThemes: teamData.plan.max_strategic_themes, maxPersonas: teamData.plan.max_personas,
          trialDays: teamData.plan.trial_days || 0, isActive: teamData.plan.is_active,
          stripePriceId: teamData.plan.stripe_price_id_monthly,
        } : null,
        credits: (teamData as any).credits || 0,
        free_brands_used: (teamData as any).free_brands_used || 0,
        free_personas_used: (teamData as any).free_personas_used || 0,
        free_themes_used: (teamData as any).free_themes_used || 0,
      } as Team;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });

  const isLoadingData = loadingBrands || loadingThemes || loadingPersonas;

  const { loadPersistedData, clearPersistedData } = useFormPersistence({
    key: 'create-image-form', formData, excludeFields: ['referenceFiles']
  });

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) setFormData(prev => ({ ...prev, ...persisted }));
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
    if (files.length > 0) setReferenceFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const handleTogglePreserve = (index: number) => {
    setPreserveImageIndices(prev => prev.includes(index) ? prev.filter(idx => idx !== index) : [...prev, index]);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = referenceFiles.filter((_, index) => index !== indexToRemove);
    setReferenceFiles(updatedFiles);
    setPreserveImageIndices(prev => prev.filter(idx => idx !== indexToRemove).map(idx => idx > indexToRemove ? idx - 1 : idx));
    if (updatedFiles.length === 0 && fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredThemes = useMemo(() => formData.brand ? themes.filter(t => t.brandId === formData.brand) : [], [themes, formData.brand]);
  const filteredPersonas = useMemo(() => formData.brand ? personas.filter(p => p.brandId === formData.brand) : [], [personas, formData.brand]);

  useEffect(() => {
    const selectedBrand = brands.find(b => b.id === formData.brand);
    if (selectedBrand) {
      setBrandImages([]);
      supabase.from('brands').select('logo, moodboard, reference_image').eq('id', selectedBrand.id).single()
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
  }, [brands, formData.brand]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (field: keyof Omit<FormData, "tone">, value: string) => {
    try {
      if (!field || value === undefined) {
        toast.error("Erro ao atualizar campo"); return;
      }
      setFormData(prev => ({ ...prev, [field]: value }));
      if (field === "brand") {
        setFormData(prev => ({ ...prev, brand: value, theme: "", persona: "" }));
      }
      if (field === "platform") {
        const guidelines = getCaptionGuidelines(value, contentType);
        setPlatformGuidelines(guidelines);
        const imageSpec = getPlatformImageSpec(value, "feed", contentType);
        if (imageSpec) {
          setRecommendedAspectRatio(imageSpec.aspectRatio);
          toast.info(`Proporção recomendada para ${value}`, {
            description: `${imageSpec.aspectRatio} (${imageSpec.width}x${imageSpec.height}px)`, duration: 4000
          });
        }
      }
    } catch (error) {
      toast.error("Erro ao atualizar campo");
    }
  };

  const handleToneSelect = (tone: string) => {
    if (!formData.tone.includes(tone)) {
      if (formData.tone.length >= 4) { toast.error("Limite atingido", { description: "Máximo 4 tons de voz." }); return; }
      setFormData(prev => ({ ...prev, tone: [...prev.tone, tone] }));
    }
  };

  const handleToneRemove = (toneToRemove: string) => {
    setFormData(prev => ({ ...prev, tone: prev.tone.filter(t => t !== toneToRemove) }));
  };

  const isFormValid = useMemo(() => {
    return formData.brand && formData.prompt && formData.platform && formData.tone.length > 0 && referenceFiles.length > 0;
  }, [formData.brand, formData.prompt, formData.platform, formData.tone.length, referenceFiles.length]);

  const validateForm = () => {
    const missing: string[] = [];
    if (!formData.brand) missing.push('brand');
    if (!formData.prompt) missing.push('prompt');
    if (!formData.platform) missing.push('platform');
    if (formData.tone.length === 0) missing.push('tone');
    if (referenceFiles.length === 0) missing.push('referenceFiles');
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleGenerateContent = async () => {
    if (!user) return toast.error("Usuário não encontrado.");
    const availableCredits = user?.credits || 0;
    if (availableCredits <= 0) return toast.error("Seus créditos para criação de conteúdo acabaram.");
    if (!validateForm()) return toast.error("Por favor, preencha todos os campos obrigatórios (*).");

    setLoading(true);

    try {
      // Compress images (this is the only blocking step)
      const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              const MAX_WIDTH = 1024; const MAX_HEIGHT = 1024;
              let width = img.width; let height = img.height;
              if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
              else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
              canvas.width = width; canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
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
        referenceImagesBase64.push(await compressImage(referenceFiles[i]));
      }

      const maxTotalImages = 5;
      const safePreserveIndices = preserveImageIndices
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < referenceImagesBase64.length);

      const userImageEntries = referenceImagesBase64.map((image, index) => ({
        image,
        preserve: safePreserveIndices.includes(index),
      }));

      const finalBrandImages = brandImages.slice(0, 3);
      const availableUserSlots = Math.max(0, maxTotalImages - finalBrandImages.length);
      const prioritizedUserEntries = [...userImageEntries].sort((a, b) => Number(b.preserve) - Number(a.preserve));
      const limitedUserEntries = prioritizedUserEntries.slice(0, availableUserSlots);

      const finalPreservedUserImages = limitedUserEntries.filter(entry => entry.preserve).map(entry => entry.image);
      const finalStyleUserImages = limitedUserEntries.filter(entry => !entry.preserve).map(entry => entry.image);
      const finalUserImages = [...finalPreservedUserImages, ...finalStyleUserImages];

      const selectedBrand = brands.find(b => b.id === formData.brand);
      const selectedTheme = themes.find(t => t.id === formData.theme);
      const selectedPersona = personas.find(p => p.id === formData.persona);

      let effectiveAspectRatio = formData.aspectRatio || '';
      if (!effectiveAspectRatio && formData.width && formData.height) {
        const w = Number(formData.width); const h = Number(formData.height);
        if (w > 0 && h > 0) {
          const targetRatio = w / h; let bestMatch = '1:1'; let bestDiff = Infinity;
          for (const [ar, dims] of Object.entries(ASPECT_RATIO_DIMENSIONS)) {
            const diff = Math.abs((dims.width / dims.height) - targetRatio);
            if (diff < bestDiff) { bestDiff = diff; bestMatch = ar; }
          }
          effectiveAspectRatio = bestMatch;
        }
      }
      if (!effectiveAspectRatio) {
        const platformImageSpec = formData.platform ? getPlatformImageSpec(formData.platform, "feed", contentType) : null;
        effectiveAspectRatio = platformImageSpec?.aspectRatio || '1:1';
      }

      const targetDims = ASPECT_RATIO_DIMENSIONS[effectiveAspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

      const requestData = {
        brandId: formData.brand, themeId: formData.theme, personaId: formData.persona,
        brand: selectedBrand?.name || formData.brand, theme: selectedTheme?.title || formData.theme,
        persona: selectedPersona?.name || formData.persona, objective: formData.prompt,
        description: formData.prompt, tone: formData.tone, platform: formData.platform,
        contentType, visualStyle: formData.visualStyle || 'realistic', additionalInfo: formData.additionalInfo,
        aspectRatio: effectiveAspectRatio, width: targetDims.width, height: targetDims.height,
        referenceRole: 'style',
        preserveImages: [...finalBrandImages, ...finalPreservedUserImages],
        styleReferenceImages: finalStyleUserImages,
        brandReferenceImages: finalBrandImages,
        userReferenceImages: finalUserImages,
        preserveImageIndices: safePreserveIndices,
        brandImagesCount: finalBrandImages.length,
        userImagesCount: finalUserImages.length,
        preservedUserImagesCount: finalPreservedUserImages.length,
        styleUserImagesCount: finalStyleUserImages.length,
        negativePrompt: formData.negativePrompt, colorPalette: formData.colorPalette,
        lighting: formData.lighting, composition: formData.composition, cameraAngle: formData.cameraAngle,
        detailLevel: formData.detailLevel, mood: formData.mood,
        includeText: formData.imageIncludeText || false,
        textContent: formData.imageTextContent?.trim() || "",
        textPosition: formData.imageTextPosition || "center",
        fontStyle: formData.fontStyle || "modern",
        textDesignStyle: formData.textDesignStyle || "clean",
        ctaText: formData.ctaText?.trim() || "",
        adMode: contentType === 'ads' ? (formData.adMode || 'standard') : undefined,
        priceText: formData.priceText?.trim() || "",
        includeBrandLogo: formData.includeBrandLogo || false,
        teamId: user?.teamId,
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!formData.brand || !uuidRegex.test(formData.brand)) { toast.error("Selecione uma marca válida"); return; }
      if (formData.theme && !uuidRegex.test(formData.theme)) { toast.error("Tema inválido"); return; }
      if (formData.persona && !uuidRegex.test(formData.persona)) { toast.error("Persona inválida"); return; }

      const capturedSession = session;
      clearPersistedData();

      addTask(
        "Criando Imagem",
        "create_image",
        async () => {
          // Generate image
          const imageResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${capturedSession?.access_token}` },
            body: JSON.stringify(requestData),
          });
          if (!imageResponse.ok) throw new Error(`Erro ao gerar imagem: ${await imageResponse.text()}`);
          const { imageUrl, attempt, legenda } = await imageResponse.json();

          // Handle caption
          let captionData: any = null;
          let isLocalFallback = false;

          if (legenda && typeof legenda === 'string' && legenda.trim().length > 20) {
            const hashtagRegex = /#[\wÀ-ÿ]+/g;
            const allHashtags = legenda.match(hashtagRegex) || [];
            const hashtags = allHashtags.map((h: string) => h.replace('#', ''));
            const legendaBody = legenda.replace(/\n*(?:#[\wÀ-ÿ]+\s*)+$/g, '').trim();
            const lines = legendaBody.split('\n').filter((l: string) => l.trim());
            captionData = { title: lines[0] || '', body: lines.slice(1).join('\n').trim() || legendaBody, hashtags };
          } else {
            const captionResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${capturedSession?.access_token}` },
              body: JSON.stringify({ formData: { ...requestData, imageDescription: requestData.description, audience: selectedPersona?.name || "" } }),
            });
            if (captionResponse.ok) {
              const responseData = await captionResponse.json();
              if (responseData.fallback) isLocalFallback = true;
              captionData = responseData.fallback ? null : responseData;
            } else { isLocalFallback = true; }
          }

          if (!captionData || isLocalFallback) {
            const brandName = selectedBrand?.name || formData.brand;
            const themeName = selectedTheme?.title || formData.theme || "Nossa proposta";
            const specs = { Instagram: { maxLength: 2200, recommendedHashtags: 10 }, Facebook: { maxLength: 250, recommendedHashtags: 3 }, LinkedIn: { maxLength: 600, recommendedHashtags: 5 }, TikTok: { maxLength: 150, recommendedHashtags: 5 }, Twitter: { maxLength: 280, recommendedHashtags: 2 } }[formData.platform] || { maxLength: 500, recommendedHashtags: 5 };
            captionData = {
              title: `${brandName} | ${themeName} 🚀`,
              body: `🌟 ${brandName} apresenta: ${themeName}\n\n${formData.prompt}\n\n🎯 Tom: ${formData.tone.join(", ")}\n\n💬 Comente!`.substring(0, specs.maxLength - 100),
              hashtags: [brandName.toLowerCase().replace(/\s+/g, ""), themeName.toLowerCase().replace(/\s+/g, ""), formData.platform.toLowerCase(), "marketingdigital", "conteudocriativo", ...formData.tone.map(t => t.toLowerCase())].filter((tag, i, self) => tag && tag.length > 2 && self.indexOf(tag) === i).slice(0, specs.recommendedHashtags)
            };
          }

          if (!imageUrl || !captionData?.title || !captionData?.body) throw new Error("Dados incompletos");

          if (refreshUserCredits) await refreshUserCredits();

          return {
            route: "/result",
            state: {
              contentData: {
                type: "image", mediaUrl: imageUrl, platform: formData.platform,
                brand: selectedBrand?.name || formData.brand,
                title: captionData.title, body: captionData.body, hashtags: captionData.hashtags,
                originalFormData: { ...requestData, brandId: formData.brand },
                actionId: undefined, isLocalFallback
              }
            }
          };
        },
        () => refreshUserCredits?.()
      );

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error("Erro ao preparar geração", { description: err.message || "Tente novamente." });
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

  const selectedStyleLabel = VISUAL_STYLES.find(s => s.value === formData.visualStyle);

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      <TourSelector tours={[
        { tourType: 'navbar', steps: navbarSteps, label: 'Tour da Navegação', targetElement: '#sidebar-logo' },
        { tourType: 'create_content', steps: createContentSteps, label: 'Tour de Criar Conteúdo', targetElement: '#select-brand' }
      ]} startDelay={500} />

      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-72 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo", href: "/create" }, { label: "Criar Imagem" }]} variant="overlay" />
        <img src={createBanner} alt="Criar Imagem" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                  <ImageIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Criar Imagem</h1>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors"><HelpCircle className="h-4 w-4" /></button>
                      </PopoverTrigger>
                      <PopoverContent className="text-sm w-72" side="bottom">
                        <p className="font-medium mb-1">Criar Imagem</p>
                        <p className="text-muted-foreground text-xs">Gere imagens profissionais com IA. Selecione marca, tema e persona para personalizar o resultado.</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-muted-foreground text-xs md:text-sm">Gere imagens profissionais com IA</p>
                </div>
              </div>
              {user && (
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex-shrink-0">
                  <CardContent className="p-2.5 md:p-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2"><Zap className="h-4 w-4" /></div>
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-4 mt-4">
          <CreationProgressBar currentStep={loading ? "generating" : "config"} className="max-w-xs mx-auto" />

          <div className="space-y-4">

            {/* ── SEÇÃO 1: CAMPOS OBRIGATÓRIOS ── */}
            <div className="rounded-2xl shadow-lg border-0 bg-card p-4 md:p-5 space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-bold text-foreground">Configuração obrigatória</p>
              </div>

              {/* Marca + Tipo de conteúdo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoadingData ? <SelectSkeleton /> : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Marca <span className="text-destructive">*</span></Label>
                    <TagSelect id="select-brand" value={formData.brand} onValueChange={value => handleSelectChange("brand", value)}
                      options={brands.map(b => ({ value: b.id, label: b.name }))}
                      placeholder={brands.length === 0 ? "Nenhuma marca" : "Selecionar marca"}
                      disabled={brands.length === 0}
                      triggerClassName={`h-9 rounded-lg border-2 bg-background/50 hover:border-border/70 transition-colors text-xs ${missingFields.includes('brand') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`}
                    />
                    {!isLoadingData && brands.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        <button onClick={() => navigate("/brands")} className="text-primary hover:underline font-medium">Cadastre uma marca</button>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo de Conteúdo</Label>
                  <div className="flex items-center space-x-1 rounded-lg bg-muted p-1 h-9">
                    <Button type="button" variant={contentType === "organic" ? "default" : "ghost"}
                      onClick={() => { setContentType("organic"); if (formData.platform) setPlatformGuidelines(getCaptionGuidelines(formData.platform, "organic")); }}
                      className="flex-1 rounded-md font-semibold h-7 text-xs">Orgânico</Button>
                    <Button type="button" variant={contentType === "ads" ? "default" : "ghost"}
                      onClick={() => { 
                        setContentType("ads"); 
                        if (formData.platform) setPlatformGuidelines(getCaptionGuidelines(formData.platform, "ads")); 
                        // Anúncios sempre incluem texto/CTA na imagem
                        setFormData(prev => ({ ...prev, imageIncludeText: true }));
                      }}
                      className="flex-1 rounded-md font-semibold h-7 text-xs">Anúncio</Button>
                  </div>

                  {/* Modo Anúncio Profissional - aparece apenas quando tipo = Anúncio */}
                  {contentType === "ads" && (
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center space-x-1 rounded-lg bg-accent/20 p-1">
                        <Button type="button" variant={formData.adMode === "standard" ? "default" : "ghost"}
                          onClick={() => setFormData(prev => ({ ...prev, adMode: "standard" }))}
                          className="flex-1 rounded-md font-semibold h-7 text-xs">Padrão</Button>
                        <Button type="button" variant={formData.adMode === "professional" ? "default" : "ghost"}
                          onClick={() => setFormData(prev => ({
                            ...prev, adMode: "professional",
                            imageIncludeText: true, fontStyle: "impactful", textDesignStyle: "badge",
                          }))}
                          className="flex-1 rounded-md font-semibold h-7 text-xs">🎯 Profissional</Button>
                      </div>

                      {formData.adMode === "professional" && (
                        <div className="space-y-3 p-3 rounded-xl bg-accent/10 border border-accent/20 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-[10px] text-muted-foreground">Modo otimizado para peças publicitárias profissionais com hierarquia visual, badges e CTAs destacados.</p>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Preço / Oferta <span className="font-normal">(opcional)</span></Label>
                            <Input
                              placeholder="Ex: R$ 29,90 · 50% OFF · A partir de R$ 19"
                              value={formData.priceText || ""}
                              onChange={e => setFormData(prev => ({ ...prev, priceText: e.target.value }))}
                              className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-sm"
                              maxLength={30}
                            />
                            <p className="text-[10px] text-muted-foreground">{formData.priceText?.length || 0}/30 · Será exibido em destaque com badge</p>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.includeBrandLogo || false}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeBrandLogo: !!checked }))}
                            />
                            <span className="text-xs text-foreground">Incluir logo da marca no canto</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Persona + Tema */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoadingData ? <SelectSkeleton /> : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Persona <span className="font-normal">(opcional)</span></Label>
                    <TagSelect value={formData.persona} onValueChange={value => handleSelectChange("persona", value)}
                      options={filteredPersonas.map(p => ({ value: p.id, label: p.name }))}
                      placeholder={!formData.brand ? "Selecione marca" : filteredPersonas.length === 0 ? "Nenhuma" : "Selecionar"}
                      disabled={!formData.brand || filteredPersonas.length === 0}
                      triggerClassName="h-9 rounded-lg border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors text-xs"
                    />
                  </div>
                )}

                {isLoadingData ? <SelectSkeleton /> : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Tema <span className="font-normal">(opcional)</span></Label>
                    <TagSelect value={formData.theme} onValueChange={value => handleSelectChange("theme", value)}
                      options={filteredThemes.map(t => ({ value: t.id, label: t.title }))}
                      placeholder={!formData.brand ? "Selecione marca" : filteredThemes.length === 0 ? "Nenhum" : "Selecionar"}
                      disabled={!formData.brand || filteredThemes.length === 0}
                      triggerClassName="h-9 rounded-lg border-2 border-border/50 bg-background/50 hover:border-border/70 transition-colors text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Plataforma */}
              <div>
                <PlatformSelector
                  value={formData.platform}
                  onChange={(value, aspectRatio) => {
                    handleSelectChange("platform", value);
                    if (aspectRatio) setFormData(prev => ({ ...prev, aspectRatio }));
                  }}
                />
                {missingFields.includes('platform') && !formData.platform && (
                  <p className="text-xs text-destructive font-medium mt-1">Selecione uma plataforma</p>
                )}
                {/* Format badge */}
                {(() => {
                  const ar = formData.aspectRatio || (formData.platform ? getPlatformImageSpec(formData.platform, "feed", contentType)?.aspectRatio : null) || '1:1';
                  const dims = ASPECT_RATIO_DIMENSIONS[ar] || ASPECT_RATIO_DIMENSIONS['1:1'];
                  return (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                        📐 Formato final: {dims.width}×{dims.height} ({ar})
                      </Badge>
                    </div>
                  );
                })()}
              </div>

              {/* Tom de Voz */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Tom de Voz <span className="text-destructive">*</span> <span className="font-normal">(máx. 4)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {toneOptions.map(t => (
                    <button key={t} type="button"
                      onClick={() => formData.tone.includes(t) ? handleToneRemove(t) : handleToneSelect(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] capitalize ${
                        formData.tone.includes(t)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {missingFields.includes('tone') && formData.tone.length === 0 && (
                  <span className="text-[10px] text-destructive font-medium">Selecione ao menos 1 tom</span>
                )}
              </div>

              {/* Estilo Visual */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Estilo Visual</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VISUAL_STYLES.map(style => (
                    <button key={style.value} type="button"
                      onClick={() => handleSelectChange("visualStyle" as any, style.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                        formData.visualStyle === style.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform guidelines */}
            {platformGuidelines.length > 0 && (
              <div className="rounded-2xl shadow-md bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-sm font-semibold text-primary">Diretrizes para {formData.platform} ({contentType === "organic" ? "Orgânico" : "Anúncio"})</p>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {platformGuidelines.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>{g}</span></li>
                  ))}
                </ul>
                {recommendedAspectRatio && (
                  <p className="text-xs text-primary/80 font-medium mt-2 pt-2 border-t border-primary/20">💡 Proporção recomendada: {recommendedAspectRatio}</p>
                )}
              </div>
            )}

            {/* ── SEÇÃO 2: PROMPT DO AGENTE (descrição + imagens) ── */}
            <div className="rounded-2xl shadow-lg border-0 bg-card p-4 md:p-5 space-y-4" onPaste={handlePaste}>
              <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-bold text-foreground">Prompt do agente</p>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Descrição da imagem <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Descreva o que você quer criar... Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com estética minimalista e cores quentes. Objetivo: gerar engajamento no Instagram."
                  value={formData.prompt}
                  onChange={handleInputChange}
                  maxLength={5000}
                  rows={5}
                  className={`resize-none rounded-xl border-2 bg-background/50 text-base placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 min-h-[120px] ${
                    missingFields.includes('prompt') ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'
                  }`}
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-muted-foreground">{formData.prompt.length}/5000</span>
                </div>
              </div>

              {/* Imagens de Referência */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Imagens de Referência <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">{referenceFiles.length}/5 · Cole com Ctrl+V</span>
                </div>

                <div className="flex gap-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 ${
                      missingFields.includes('referenceFiles') && referenceFiles.length === 0
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-border/50 bg-muted/10'
                    }`}
                  >
                    <ImagePlus className="h-7 w-7 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      Clique para adicionar imagens
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">Máximo 5 · JPG, PNG, WebP</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipboardItems = await navigator.clipboard.read();
                        const files: File[] = [];
                        for (const item of clipboardItems) {
                          const imageType = item.types.find(t => t.startsWith('image/'));
                          if (imageType) {
                            const blob = await item.getType(imageType);
                            const ext = imageType.split('/')[1] || 'png';
                            const file = new File([blob], `colado-${Date.now()}.${ext}`, { type: imageType });
                            files.push(file);
                          }
                        }
                        if (files.length > 0) {
                          const remaining = 5 - referenceFiles.length;
                          const toAdd = files.slice(0, remaining);
                          setReferenceFiles(prev => [...prev, ...toAdd]);
                          toast.success(`${toAdd.length} imagem(ns) colada(s)`);
                        } else {
                          toast.error('Nenhuma imagem encontrada na área de transferência');
                        }
                      } catch {
                        toast.error('Não foi possível acessar a área de transferência. Use Ctrl+V no campo.');
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 min-w-[100px] ${
                      missingFields.includes('referenceFiles') && referenceFiles.length === 0
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-border/50 bg-muted/10'
                    }`}
                  >
                    <ClipboardPaste className="h-6 w-6 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground text-center font-medium">Colar imagem</p>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  disabled={referenceFiles.length >= 5}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const remaining = 5 - referenceFiles.length;
                    const toAdd = files.slice(0, remaining);
                    if (files.length > remaining) toast.error(`Máximo 5 imagens. ${toAdd.length} adicionada(s).`);
                    setReferenceFiles(prev => [...prev, ...toAdd]);
                  }}
                />

                {referenceFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {referenceFiles.map((file, idx) => (
                      <div key={idx} className="relative group flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[120px] text-foreground">{file.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleTogglePreserve(idx); }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${preserveImageIndices.includes(idx) ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"}`}
                        >
                          {preserveImageIndices.includes(idx) ? "Preservando" : "Preservar"}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {missingFields.includes('referenceFiles') && referenceFiles.length === 0 && (
                  <p className="text-xs text-destructive font-medium">Adicione ao menos 1 imagem de referência</p>
                )}
              </div>
            </div>

            {/* ── SEÇÃO 3: TEXTO NA IMAGEM ── */}
            <div className="rounded-2xl shadow-lg border-0 bg-card p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">Texto na Imagem</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, imageIncludeText: !prev.imageIncludeText }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.imageIncludeText ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    formData.imageIncludeText ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {formData.imageIncludeText && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Text content */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Texto para renderizar <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Descubra o sabor da tradição"
                      value={formData.imageTextContent}
                      onChange={e => setFormData(prev => ({ ...prev, imageTextContent: e.target.value }))}
                      className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-sm"
                      maxLength={80}
                    />
                    <p className="text-[10px] text-muted-foreground">{formData.imageTextContent?.length || 0}/80 caracteres · Português Brasileiro</p>
                  </div>

                  {/* CTA Text */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      CTA (Call-to-Action) <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ex: Saiba mais · Compre agora · Garanta o seu"
                      value={formData.ctaText}
                      onChange={e => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                      className="h-9 rounded-lg border-2 border-border/50 bg-background/50 text-sm"
                      maxLength={40}
                    />
                    <p className="text-[10px] text-muted-foreground">{formData.ctaText?.length || 0}/40 caracteres · Texto do botão ou chamada para ação</p>
                  </div>

                  {/* Position selector - icon grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Posição do Texto</Label>
                    <div className="grid grid-cols-4 gap-1.5 max-w-[220px]">
                      {TEXT_POSITIONS.map(pos => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageTextPosition: pos.value as any }))}
                          className={`h-10 rounded-lg text-sm font-medium transition-all active:scale-[0.95] flex flex-col items-center justify-center gap-0.5 ${
                            formData.imageTextPosition === pos.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/50 text-foreground hover:bg-primary/10 hover:text-primary'
                          }`}
                          title={pos.label}
                        >
                          <span className="text-base leading-none">{pos.icon}</span>
                          <span className="text-[8px] leading-none opacity-70">{pos.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font style */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Tipografia</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {FONT_STYLE_OPTIONS.map(font => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, fontStyle: font.value }))}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] text-center ${
                            formData.fontStyle === font.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary'
                          }`}
                          title={font.desc}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text design/layout style */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Design do Texto</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {TEXT_DESIGN_OPTIONS.map(design => (
                        <button
                          key={design.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, textDesignStyle: design.value }))}
                          className={`px-3 py-2.5 rounded-lg text-xs transition-all active:scale-[0.97] text-left space-y-0.5 ${
                            formData.textDesignStyle === design.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary'
                          }`}
                        >
                          <span className="font-semibold block">{design.label}</span>
                          <span className={`text-[10px] block leading-tight ${
                            formData.textDesignStyle === design.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>{design.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── SEÇÃO 4: CAMPOS OPCIONAIS (colapsável) ── */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group w-full"
            >
              <Settings2 className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              <span className="font-medium text-foreground/70 group-hover:text-primary">Informações adicionais</span>
              <ChevronDown className={`h-3 w-3 transition-transform ml-1 ${showSettings ? "rotate-180" : ""}`} />
            </button>

            {showSettings && (
              <div className="rounded-2xl shadow-lg overflow-hidden border-0 bg-card p-4 md:p-5 space-y-4">
                {/* Informações Adicionais */}
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo" className="text-sm font-bold text-foreground">
                    Informações Adicionais <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Outras instruções ou contexto relevante..."
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    rows={3}
                    className="resize-none rounded-xl border-0 bg-muted/30 text-sm p-3 focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pb-6">
            <Button id="generate-button" onClick={handleGenerateContent} disabled={loading || !isFormValid} size="lg"
              className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg gap-2">
              {loading ? (<><Loader2 className="animate-spin h-5 w-5" /><span>Gerando imagem...</span></>) : (
                <>
                  <Sparkles className="h-5 w-5" /><span>Gerar Imagem</span>
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                    <Coins className="h-3 w-3 mr-1" />{CREDIT_COSTS.COMPLETE_IMAGE}
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
