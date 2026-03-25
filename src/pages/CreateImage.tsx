import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { TagSelect } from "@/components/ui/tag-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, X, Info, ImagePlus, Coins, Image as ImageIcon, HelpCircle, Paintbrush, ChevronDown, Plus, Settings2, Mic, ClipboardPaste, Type, Building2, UserRound, Palette } from "lucide-react";
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
import { VisualStyleGrid } from "@/components/quick-content/VisualStyleGrid";
import { CameraAngleGrid } from "@/components/quick-content/CameraAngleGrid";
import { CategorySelector } from "@/components/CategorySelector";
import { FormatPreview } from "@/components/quick-content/FormatPreview";
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
  fontFamily?: string;
  fontWeight?: string;
  fontItalic?: boolean;
  textDesignStyle?: string;
  fontSize?: number;
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

const GOOGLE_FONT_PRESETS = [
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif', desc: 'Moderna e versátil' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif', desc: 'Elegante e sofisticada' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display', desc: 'Impactante e bold' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif', desc: 'Clean e geométrica' },
  { value: 'Lora', label: 'Lora', category: 'Serif', desc: 'Clássica e refinada' },
  { value: 'Pacifico', label: 'Pacifico', category: 'Script', desc: 'Divertida e casual' },
  { value: 'Oswald', label: 'Oswald', category: 'Display', desc: 'Condensada e forte' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'Script', desc: 'Cursiva elegante' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans-serif', desc: 'Leve e minimalista' },
  { value: 'Roboto Slab', label: 'Roboto Slab', category: 'Serif', desc: 'Slab moderna' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'Display', desc: 'Ultra bold, alto impacto' },
  { value: 'Caveat', label: 'Caveat', category: 'Script', desc: 'Manuscrita natural' },
] as const;

const TYPOGRAPHY_PRESETS = [
  { value: 'modern', label: 'Moderno', font: 'Montserrat', weight: '700', italic: false, desc: 'Sans-serif limpa e bold' },
  { value: 'elegant', label: 'Elegante', font: 'Playfair Display', weight: '600', italic: true, desc: 'Serifa clássica itálica' },
  { value: 'impactful', label: 'Impactante', font: 'Bebas Neue', weight: '400', italic: false, desc: 'Condensada de alto impacto' },
  { value: 'fun', label: 'Divertido', font: 'Pacifico', weight: '400', italic: false, desc: 'Script casual e expressiva' },
  { value: 'minimal', label: 'Minimalista', font: 'Raleway', weight: '300', italic: false, desc: 'Leve e clean' },
  { value: 'editorial', label: 'Editorial', font: 'Lora', weight: '700', italic: false, desc: 'Serifa forte para títulos' },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '900', label: 'Black' },
] as const;

// Load Google Font dynamically
const loadGoogleFont = (fontFamily: string, weights: string[] = ['300', '400', '600', '700', '900']) => {
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  const wStr = weights.map(w => `0,${w};1,${w}`).join(';');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@${wStr}&display=swap`;
  document.head.appendChild(link);
};

// Keep backward compat
const FONT_STYLE_OPTIONS = TYPOGRAPHY_PRESETS.map(p => ({ value: p.value, label: p.label, desc: p.desc }));

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

function CustomizationCardInline({
  icon, title, description, options, value, onChange, disabled, error, required, emptyAction, emptyLabel,
}: {
  icon: React.ReactNode; title: string; description: string;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
  disabled?: boolean; error?: boolean; required?: boolean;
  emptyAction?: () => void; emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find(o => o.value === value) : null;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex-1 min-w-[140px] flex flex-col rounded-xl p-3 text-left transition-all ${
            disabled ? "bg-muted/40 opacity-60 cursor-not-allowed" : "bg-card shadow-sm cursor-pointer active:scale-[0.98]"
          } ${selected ? "ring-1 ring-primary/30" : ""} ${error ? "ring-2 ring-destructive/30" : ""}`}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
            <span className="text-xs font-semibold text-foreground flex-1 min-w-0">{title}{required && <span className="text-destructive ml-0.5">*</span>}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
          <div className="mt-2 min-h-[22px]">
            {selected ? (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 max-w-full hover:bg-primary/10 cursor-default">
                <span className="truncate">{selected.label}</span>
                <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }}
                  className="flex-shrink-0 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">
                {emptyAction ? <button type="button" onClick={e => { e.stopPropagation(); emptyAction(); }} className="text-primary hover:underline">{emptyLabel}</button> : "Nenhum selecionado"}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 p-1.5 rounded-xl max-h-60 overflow-y-auto">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma opção disponível</p>
        ) : (
          options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                value === opt.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/60"
              }`}
            >
              {opt.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

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
    fontStyle: "modern", fontFamily: "Montserrat", fontWeight: "700", fontItalic: false,
    textDesignStyle: "clean", ctaText: "",
    adMode: "standard", priceText: "", includeBrandLogo: false,
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null);
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
  const [textModalOpen, setTextModalOpen] = useState(false);

  const teamId = user?.teamId;
  const userId = user?.id;

  // Load Google Fonts
  useEffect(() => {
    GOOGLE_FONT_PRESETS.forEach(f => loadGoogleFont(f.value));
  }, []);

  // Sync preset to fontFamily/weight/italic
  const applyTypographyPreset = (presetValue: string) => {
    const preset = TYPOGRAPHY_PRESETS.find(p => p.value === presetValue);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        fontStyle: preset.value,
        fontFamily: preset.font,
        fontWeight: preset.weight,
        fontItalic: preset.italic,
      }));
    }
  };

  // Get current font CSS
  const getFontStyle = (family?: string, weight?: string, italic?: boolean, sizeOverride?: number) => ({
    fontFamily: `'${family || formData.fontFamily || 'Montserrat'}', sans-serif`,
    fontWeight: weight || formData.fontWeight || '700',
    fontStyle: (italic ?? formData.fontItalic) ? 'italic' as const : 'normal' as const,
    ...(sizeOverride ? { fontSize: `${sizeOverride}px` } : formData.fontSize ? { fontSize: `${formData.fontSize}px` } : {}),
  });

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
        fontFamily: formData.fontFamily || "Montserrat",
        fontWeight: formData.fontWeight || "700",
        fontItalic: formData.fontItalic || false,
        fontSize: formData.fontSize || 48,
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

      const newTaskId = addTask(
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
                actionId: undefined, isLocalFallback,
                categoryId: selectedCategoryId || undefined,
              }
            }
          };
        },
        () => refreshUserCredits?.()
      );

      setGeneratingTaskId(newTaskId);
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
      <div className="relative h-24 md:h-28 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo", href: "/create" }, { label: "Criar Imagem" }]} variant="overlay" />
        <img src={createBanner} alt="Criar Imagem" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Cards */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-stretch gap-3">
          {/* Title card */}
          <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4 flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
              <ImageIcon className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">Criar Imagem</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors"><HelpCircle className="h-3.5 w-3.5" /></button>
                  </PopoverTrigger>
                  <PopoverContent className="text-sm w-72" side="bottom">
                    <p className="font-medium mb-1">Criar Imagem</p>
                    <p className="text-muted-foreground text-xs">Gere imagens profissionais com IA. Selecione marca, tema e persona para personalizar o resultado.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-muted-foreground text-[11px] lg:text-xs">Gere imagens profissionais com IA</p>
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
          <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4 flex-shrink-0 flex items-center min-w-[320px]">
            <CreationProgressBar currentStep={loading ? "generating" : "config"} />
          </div>
        </div>
      </div>

      {/* Main Form — Two columns on desktop */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-4 mt-4">

          <div id="create-image-form" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_400px] gap-6">
            {/* ═══ Left Column ═══ */}
            <div className="space-y-5">

              {/* 1. Prompt + References (unified card) */}
              <div className="space-y-2.5">
                <div>
                  <Label htmlFor="prompt" className="text-base font-bold text-foreground">
                    Descreva sua imagem <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quanto mais detalhes sobre cenário, cores, estilo e elementos, melhor o resultado.
                  </p>
                </div>

                <div className={`rounded-2xl shadow-lg overflow-hidden border-0 bg-card transition-shadow focus-within:shadow-xl ${missingFields.includes('prompt') ? 'ring-2 ring-destructive/30' : ''}`} onPaste={handlePaste}>
                  <div className="p-4 md:p-5 pb-2">
                    <Textarea
                      id="prompt"
                      placeholder="Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com estética minimalista e cores quentes"
                      value={formData.prompt}
                      onChange={handleInputChange}
                      maxLength={5000}
                      rows={4}
                      className="resize-none border-0 bg-transparent p-0 text-base placeholder:text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                    />
                  </div>

                  {/* Attached files thumbnails */}
                  {referenceFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 md:px-5 pb-2">
                      {referenceFiles.map((file, idx) => (
                        <div key={idx} className="relative group flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                          <ImagePlus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[120px] text-foreground">{file.name}</span>
                          <button type="button" onClick={() => handleTogglePreserve(idx)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${preserveImageIndices.includes(idx) ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"}`}
                          >
                            {preserveImageIndices.includes(idx) ? "Preservando" : "Preservar"}
                          </button>
                          <button type="button" onClick={() => handleRemoveFile(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom toolbar */}
                  <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 border-t border-border/20 bg-muted/10">
                    <span className="text-[11px] text-muted-foreground font-medium mr-1">Referências <span className="text-destructive">*</span></span>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                      <ImagePlus className="h-3.5 w-3.5" /><span>Selecionar imagem</span>
                    </button>
                    <button type="button" onClick={async () => {
                      try {
                        const clipboardItems = await navigator.clipboard.read();
                        const files: File[] = [];
                        for (const item of clipboardItems) {
                          const imageType = item.types.find(t => t.startsWith('image/'));
                          if (imageType) {
                            const blob = await item.getType(imageType);
                            const ext = imageType.split('/')[1] || 'png';
                            files.push(new File([blob], `colado-${Date.now()}.${ext}`, { type: imageType }));
                          }
                        }
                        if (files.length > 0) {
                          const remaining = 5 - referenceFiles.length;
                          const toAdd = files.slice(0, remaining);
                          setReferenceFiles(prev => [...prev, ...toAdd]);
                          toast.success(`${toAdd.length} imagem(ns) colada(s)`);
                        } else { toast.error('Nenhuma imagem encontrada na área de transferência'); }
                      } catch { toast.error('Não foi possível acessar a área de transferência. Use Ctrl+V no campo.'); }
                    }}
                      className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                      <ClipboardPaste className="h-3.5 w-3.5" /><span>Colar imagem</span>
                    </button>
                    <div className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">{referenceFiles.length}/5</span>
                  </div>
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
                {missingFields.includes('referenceFiles') && referenceFiles.length === 0 && (
                  <p className="text-xs text-destructive font-medium">Adicione ao menos 1 imagem de referência</p>
                )}
              </div>

              {/* 2. Personalizações (sem card, flex lado a lado) */}
              <div className="space-y-2.5">
                <p className="text-base font-bold text-foreground">Personalizações <span className="text-xs font-normal text-muted-foreground">(opcional)</span></p>
                <div className="flex flex-wrap gap-2">
                  {/* Tipo de Conteúdo */}
                  <div className={`flex-1 min-w-[140px] flex flex-col rounded-xl p-3 text-left bg-card shadow-sm ${contentType === "ads" ? "ring-1 ring-primary/30" : ""}`}>
                    <div className="flex items-center gap-2 w-full">
                      <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold text-foreground flex-1 min-w-0">Conteúdo</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Tipo de conteúdo</p>
                    <div className="mt-2 flex gap-1">
                      <button type="button"
                        onClick={() => { setContentType("organic"); if (formData.platform) setPlatformGuidelines(getCaptionGuidelines(formData.platform, "organic")); }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${contentType === "organic" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                        Orgânico
                      </button>
                      <button type="button"
                        onClick={() => {
                          setContentType("ads");
                          if (formData.platform) setPlatformGuidelines(getCaptionGuidelines(formData.platform, "ads"));
                          setFormData(prev => ({ ...prev, imageIncludeText: true }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${contentType === "ads" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                        Tráfego
                      </button>
                    </div>
                  </div>

                  {/* Marca */}
                  {isLoadingData ? <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" /> : (
                    <CustomizationCardInline
                      icon={<Building2 className="h-4 w-4" />}
                      title="Marca"
                      required
                      description="Vincular a uma marca"
                      options={brands.map(b => ({ value: b.id, label: b.name }))}
                      value={formData.brand}
                      onChange={v => handleSelectChange("brand", v)}
                      error={missingFields.includes('brand')}
                      emptyAction={brands.length === 0 ? () => navigate("/brands") : undefined}
                      emptyLabel="Cadastre uma marca"
                    />
                  )}

                  {/* Persona */}
                  {isLoadingData ? <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" /> : (
                    <CustomizationCardInline
                      icon={<UserRound className="h-4 w-4" />}
                      title="Persona"
                      description="Público-alvo"
                      options={filteredPersonas.map(p => ({ value: p.id, label: p.name }))}
                      value={formData.persona}
                      onChange={v => handleSelectChange("persona", v)}
                      disabled={!formData.brand}
                    />
                  )}

                  {/* Tema */}
                  {isLoadingData ? <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" /> : (
                    <CustomizationCardInline
                      icon={<Palette className="h-4 w-4" />}
                      title="Tema"
                      description="Tema estratégico"
                      options={filteredThemes.map(t => ({ value: t.id, label: t.title }))}
                      value={formData.theme}
                      onChange={v => handleSelectChange("theme", v)}
                      disabled={!formData.brand}
                    />
                  )}
                </div>
              </div>

              {/* 3. Tom de Voz */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-foreground">
                  Tom de voz <span className="text-destructive">*</span> <span className="text-xs font-normal text-muted-foreground">(máx. 4)</span>
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

              {/* 4. Texto na Imagem */}
              <div className="rounded-2xl shadow-lg border-0 bg-card p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">Texto na Imagem</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {formData.imageIncludeText && (
                      <button
                        type="button"
                        onClick={() => setTextModalOpen(true)}
                        className="text-xs font-medium text-primary hover:underline transition-colors"
                      >
                        Configurar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !formData.imageIncludeText;
                        setFormData(prev => ({ ...prev, imageIncludeText: next }));
                        if (next) setTextModalOpen(true);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.imageIncludeText ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        formData.imageIncludeText ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                {contentType === "ads" && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Info className="h-3 w-3 text-primary/60 flex-shrink-0" />
                    <span>Para <strong className="text-foreground">Tráfego</strong>, texto na imagem é recomendável.</span>
                  </div>
                )}
                {formData.imageIncludeText && formData.imageTextContent && (
                  <div className="mt-3 flex items-start gap-3">
                    {/* Mini preview */}
                    {(() => {
                      const w = Number(formData.width) || 1080;
                      const h = Number(formData.height) || 1080;
                      const ratio = w / h;
                      const maxW = 64;
                      const maxH = 80;
                      let fW: number, fH: number;
                      if (ratio >= 1) { fW = maxW; fH = maxW / ratio; }
                      else { fH = maxH; fW = maxH * ratio; if (fW > maxW) { fW = maxW; fH = maxW / ratio; } }
                      return (
                        <div
                          className="rounded-md bg-gradient-to-br from-muted/60 to-muted relative overflow-hidden border border-border/20 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                          style={{ width: fW, height: fH }}
                          onClick={() => setTextModalOpen(true)}
                        >
                          <div className={`absolute inset-0 flex p-1 ${
                            (() => {
                              const p = formData.imageTextPosition || 'center';
                              const vA = p.includes('top') ? 'items-start' : p.includes('bottom') ? 'items-end' : 'items-center';
                              const hA = p.includes('left') ? 'justify-start' : p.includes('right') ? 'justify-end' : 'justify-center';
                              return `${vA} ${hA}`;
                            })()
                          }`}>
                            <div className={`rounded px-1 py-0.5 ${
                              (() => {
                                const d = formData.textDesignStyle || 'clean';
                                switch (d) {
                                  case 'overlay': return 'bg-black/40';
                                  case 'gradient_bar': return 'bg-gradient-to-r from-primary/80 to-primary/40';
                                  case 'boxed': return 'border border-foreground/60 bg-background/80';
                                  case 'badge': return 'bg-primary rounded-full';
                                  case 'plaquinha': return 'bg-amber-900/60';
                                  case 'card_overlay': return 'bg-background/90 border border-border/50';
                                  default: return '';
                                }
                              })()
                            }`}>
                              <p className={`text-[6px] leading-tight truncate max-w-[55px] ${
                                (['overlay', 'gradient_bar', 'badge', 'plaquinha'].includes(formData.textDesignStyle || ''))
                                  ? 'text-white' : 'text-foreground'
                              }`} style={{ fontFamily: `'${formData.fontFamily || 'Montserrat'}', sans-serif`, fontWeight: formData.fontWeight || '700', fontStyle: formData.fontItalic ? 'italic' : 'normal' }}>
                                {formData.imageTextContent}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium truncate">"{formData.imageTextContent}"</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {formData.ctaText && <span className="text-[10px] text-muted-foreground">CTA: {formData.ctaText}</span>}
                        <span className="text-[10px] text-muted-foreground">
                          {formData.fontFamily || 'Montserrat'} · {TEXT_DESIGN_OPTIONS.find(d => d.value === formData.textDesignStyle)?.label || 'Clean'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Text on Image Modal — side-by-side cards like CategoryDialog */}
              <Dialog open={textModalOpen} onOpenChange={setTextModalOpen}>
                <DialogContent className="sm:max-w-[68rem] p-0 gap-0 bg-transparent border-none shadow-none [&>button]:hidden" style={{ maxHeight: '90vh' }}>
                  <div className="flex items-stretch gap-4 h-[85vh]">
                    {/* Left: Controls Panel */}
                    <div className="flex flex-col bg-background rounded-xl shadow-lg border border-border overflow-hidden w-full sm:w-[36rem] flex-shrink-0 h-full">
                      <DialogHeader className="px-6 pt-6 pb-0">
                        <DialogTitle className="flex items-center gap-2">
                          <Type className="h-5 w-5 text-primary" />
                          Texto na Imagem
                        </DialogTitle>
                        <DialogDescription>
                          Configure o texto e veja o resultado em tempo real.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold">
                            Texto principal <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="Ex: Descubra o sabor da tradição"
                            value={formData.imageTextContent}
                            onChange={e => setFormData(prev => ({ ...prev, imageTextContent: e.target.value }))}
                            className="h-10 rounded-lg"
                            maxLength={50}
                          />
                          <div className="flex items-center justify-between">
                            {(formData.imageTextContent?.length || 0) > 35 && (
                              <p className="text-[10px] text-amber-500">Textos curtos ficam mais legíveis</p>
                            )}
                            <p className={`text-[10px] ml-auto ${(formData.imageTextContent?.length || 0) > 35 ? 'text-amber-500' : 'text-muted-foreground'}`}>{formData.imageTextContent?.length || 0}/50</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold">
                            CTA <span className="font-normal text-muted-foreground">(opcional)</span>
                          </Label>
                          <Input
                            placeholder="Ex: Saiba mais · Compre agora"
                            value={formData.ctaText}
                            onChange={e => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                            className="h-10 rounded-lg"
                            maxLength={40}
                          />
                          <p className="text-[10px] text-muted-foreground text-right">{formData.ctaText?.length || 0}/40</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Posição</Label>
                          <div className="grid grid-cols-4 gap-2 w-full">
                            {TEXT_POSITIONS.map(pos => (
                              <button key={pos.value} type="button"
                                onClick={() => setFormData(prev => ({ ...prev, imageTextPosition: pos.value as any }))}
                                className={`h-14 rounded-xl text-sm font-medium transition-all active:scale-[0.95] flex flex-col items-center justify-center gap-1.5 ${
                                  formData.imageTextPosition === pos.value
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/50 text-foreground hover:bg-primary/10 hover:text-primary'
                                }`}
                              >
                                <span className="text-lg leading-none">{pos.icon}</span>
                                <span className="text-[10px] leading-none opacity-70">{pos.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Tipografia</Label>
                          
                          {/* Presets rápidos */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Presets</p>
                            <div className="grid grid-cols-3 gap-2">
                              {TYPOGRAPHY_PRESETS.map(preset => (
                                <button key={preset.value} type="button"
                                  onClick={() => applyTypographyPreset(preset.value)}
                                  className={`px-3 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97] text-left ${
                                    formData.fontStyle === preset.value
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary'
                                  }`}
                                >
                                  <span className="block font-semibold truncate" style={{ fontFamily: `'${preset.font}', sans-serif` }}>
                                    {preset.label}
                                  </span>
                                  <span className={`text-[9px] block leading-tight mt-0.5 ${
                                    formData.fontStyle === preset.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>{preset.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Fonte */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Fonte</p>
                            <div className="grid grid-cols-3 gap-2">
                              {GOOGLE_FONT_PRESETS.map(font => (
                                <button key={font.value} type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, fontFamily: font.value, fontStyle: '' }))}
                                  className={`px-3 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97] text-center ${
                                    formData.fontFamily === font.value
                                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30 font-semibold'
                                      : 'bg-muted/30 text-foreground hover:bg-muted/60'
                                  }`}
                                  style={{ fontFamily: `'${font.value}', sans-serif` }}
                                >
                                  {font.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Peso e Estilo */}
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-2">Peso</p>
                              <div className="flex gap-1.5">
                                {FONT_WEIGHT_OPTIONS.map(w => (
                                  <button key={w.value} type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, fontWeight: w.value, fontStyle: '' }))}
                                    className={`flex-1 px-1.5 py-2 rounded-lg text-xs transition-all active:scale-[0.97] text-center ${
                                      formData.fontWeight === w.value
                                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30 font-semibold'
                                        : 'bg-muted/30 text-foreground hover:bg-muted/60'
                                    }`}
                                  >
                                    {w.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Itálico</p>
                              <button type="button"
                                onClick={() => setFormData(prev => ({ ...prev, fontItalic: !prev.fontItalic, fontStyle: '' }))}
                                className={`px-4 py-2 rounded-lg text-xs italic transition-all active:scale-[0.97] ${
                                  formData.fontItalic
                                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30 font-semibold'
                                    : 'bg-muted/30 text-foreground hover:bg-muted/60'
                                }`}
                              >
                                Aa
                              </button>
                            </div>
                          </div>

                          {/* Tamanho da fonte */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[10px] text-muted-foreground">Tamanho</p>
                              <span className="text-[10px] font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                {formData.fontSize || 48}px
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground">12</span>
                              <input
                                type="range"
                                min={12}
                                max={36}
                                step={1}
                                value={formData.fontSize || 18}
                                onChange={e => setFormData(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                                className="flex-1 h-1.5 accent-primary cursor-pointer"
                              />
                              <span className="text-[9px] text-muted-foreground">36</span>
                            </div>
                            <div className="flex gap-1 mt-1.5">
                              {[12, 14, 16, 18, 24].map(size => (
                                <button key={size} type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, fontSize: size }))}
                                  className={`flex-1 px-1 py-1 rounded-md text-[9px] transition-all ${
                                    (formData.fontSize || 48) === size
                                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30 font-semibold'
                                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold">Design</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {TEXT_DESIGN_OPTIONS.map(design => (
                              <button key={design.value} type="button"
                                onClick={() => setFormData(prev => ({ ...prev, textDesignStyle: design.value }))}
                                className={`px-3 py-2.5 rounded-lg text-sm transition-all active:scale-[0.97] text-left space-y-0.5 ${
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

                      <div className="flex items-center gap-2 px-6 py-1.5 border-t border-border/50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, imageIncludeText: false, imageTextContent: '', ctaText: '' }));
                            setTextModalOpen(false);
                          }}
                        >
                          Remover texto
                        </Button>
                        <div className="flex-1" />
                        <Button type="button" size="sm" onClick={() => setTextModalOpen(false)}>
                          Confirmar
                        </Button>
                      </div>
                    </div>

                    {/* Right: Live Preview — separate card */}
                    <div className="hidden sm:flex flex-col w-96 flex-shrink-0 bg-background rounded-xl shadow-lg border border-border h-full animate-in fade-in-0 slide-in-from-right-4 duration-200">
                      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                        <h3 className="font-semibold text-base">Preview</h3>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formData.width || '1080'}×{formData.height || '1080'}px
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {/* Format selector inside modal */}
                        <div className="px-5 pt-4 pb-5">
                          <FormatPreview
                            platform={formData.platform}
                            aspectRatio={formData.aspectRatio || (formData.platform ? getPlatformImageSpec(formData.platform, "feed", contentType)?.aspectRatio : undefined) || "1:1"}
                            onPlatformChange={(platform, aspectRatio, width, height) => {
                              handleSelectChange("platform", platform);
                              setFormData(prev => ({
                                ...prev,
                                aspectRatio,
                                width: String(width),
                                height: String(height),
                              }));
                            }}
                          >
                            {/* Text overlay inside format preview */}
                            <div className={`absolute inset-0 flex p-3 ${
                              (() => {
                                const p = formData.imageTextPosition || 'center';
                                const vAlign = p.includes('top') ? 'items-start' : p.includes('bottom') ? 'items-end' : 'items-center';
                                const hAlign = p.includes('left') ? 'justify-start' : p.includes('right') ? 'justify-end' : 'justify-center';
                                return `${vAlign} ${hAlign}`;
                              })()
                            }`}>
                              <div className={`max-w-[85%] transition-all duration-300 ${
                                (() => {
                                  const p = formData.imageTextPosition || 'center';
                                  return p.includes('left') ? 'text-left' : p.includes('right') ? 'text-right' : 'text-center';
                                })()
                              }`}>
                                <div className={`rounded-lg px-3 py-2 transition-all duration-300 ${
                                  (() => {
                                    const d = formData.textDesignStyle || 'clean';
                                    switch (d) {
                                      case 'overlay': return 'bg-black/40 backdrop-blur-sm';
                                      case 'gradient_bar': return 'bg-gradient-to-r from-primary/80 to-primary/40';
                                      case 'boxed': return 'border-2 border-foreground/60 bg-background/80';
                                      case 'badge': return 'bg-primary rounded-full px-4';
                                      case 'neon_glow': return 'drop-shadow-[0_0_8px_hsl(var(--primary))]';
                                      case 'shadow_drop': return 'drop-shadow-[2px_4px_6px_rgba(0,0,0,0.5)]';
                                      case 'plaquinha': return 'bg-amber-900/60 border border-amber-700/50 rounded-md';
                                      case 'card_overlay': return 'bg-background/90 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3';
                                      case 'cutout': return 'mix-blend-difference';
                                      default: return '';
                                    }
                                  })()
                                }`}>
                                  <p className={`text-sm leading-tight transition-all duration-300 line-clamp-3 break-words ${
                                    (['overlay', 'gradient_bar', 'badge', 'plaquinha'].includes(formData.textDesignStyle || ''))
                                      ? 'text-white'
                                      : 'text-foreground'
                                  }`} style={getFontStyle()}>
                                    {formData.imageTextContent || 'Seu texto aqui'}
                                  </p>
                                  {formData.ctaText && (
                                    <p className={`mt-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all duration-300 ${
                                      (['overlay', 'gradient_bar', 'badge', 'plaquinha'].includes(formData.textDesignStyle || ''))
                                        ? 'text-white/80'
                                        : 'text-primary'
                                    }`}>
                                      {formData.ctaText}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Labels */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                              <span className="text-[9px] text-muted-foreground/60 font-medium">
                                {formData.fontFamily || 'Montserrat'}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60 font-medium">
                                {TEXT_DESIGN_OPTIONS.find(d => d.value === formData.textDesignStyle)?.label || 'Clean'}
                              </span>
                            </div>
                          </FormatPreview>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Category Selector */}
              <CategorySelector value={selectedCategoryId} onChange={setSelectedCategoryId} disabled={loading} />

              {/* Additional Info (collapsible) */}
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

            {/* ═══ Right Column — Sticky Preview ═══ */}
            <div className="lg:sticky lg:top-4 self-start space-y-4">
              {/* Format Preview */}
              <div className="bg-card rounded-2xl shadow-lg p-5 flex flex-col items-center">
                <FormatPreview
                  platform={formData.platform}
                  aspectRatio={formData.aspectRatio || (formData.platform ? getPlatformImageSpec(formData.platform, "feed", contentType)?.aspectRatio : undefined) || "1:1"}
                  onPlatformChange={(platform, aspectRatio, width, height) => {
                    handleSelectChange("platform", platform);
                    setFormData(prev => ({
                      ...prev,
                      aspectRatio,
                      width: String(width),
                      height: String(height),
                    }));
                  }}
                >
                  {/* Aspect ratio label — always visible */}
                  {contentType === "ads" && (!formData.imageIncludeText || !formData.imageTextContent) ? (
                    <>
                      <span className="absolute top-2 right-2 text-xs font-bold text-primary/40">{formData.aspectRatio || "1:1"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, imageIncludeText: true }));
                          setTextModalOpen(true);
                        }}
                        className="flex flex-col items-center gap-1.5 text-center p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        <Type className="h-5 w-5 text-primary/60" />
                        <span className="text-[11px] font-medium text-primary/80">Adicionar texto na imagem</span>
                        <span className="text-[9px] text-muted-foreground">Recomendado para tráfego</span>
                      </button>
                    </>
                  ) : !(formData.imageIncludeText && formData.imageTextContent) ? (
                    <div className="text-center">
                      <span className="text-xl font-bold text-primary/50">{formData.aspectRatio || "1:1"}</span>
                    </div>
                  ) : null}
                  {formData.imageIncludeText && formData.imageTextContent && (
                    <>
                      <div className={`absolute inset-0 flex p-3 ${
                        (() => {
                          const p = formData.imageTextPosition || 'center';
                          const vAlign = p.includes('top') ? 'items-start' : p.includes('bottom') ? 'items-end' : 'items-center';
                          const hAlign = p.includes('left') ? 'justify-start' : p.includes('right') ? 'justify-end' : 'justify-center';
                          return `${vAlign} ${hAlign}`;
                        })()
                      }`}>
                        <div className={`max-w-[85%] transition-all duration-300 ${
                          (() => {
                            const p = formData.imageTextPosition || 'center';
                            return p.includes('left') ? 'text-left' : p.includes('right') ? 'text-right' : 'text-center';
                          })()
                        }`}>
                          <div className={`rounded-lg px-3 py-2 transition-all duration-300 ${
                            (() => {
                              const d = formData.textDesignStyle || 'clean';
                              switch (d) {
                                case 'overlay': return 'bg-black/40 backdrop-blur-sm';
                                case 'gradient_bar': return 'bg-gradient-to-r from-primary/80 to-primary/40';
                                case 'boxed': return 'border-2 border-foreground/60 bg-background/80';
                                case 'badge': return 'bg-primary rounded-full px-4';
                                case 'neon_glow': return 'drop-shadow-[0_0_8px_hsl(var(--primary))]';
                                case 'shadow_drop': return 'drop-shadow-[2px_4px_6px_rgba(0,0,0,0.5)]';
                                case 'plaquinha': return 'bg-amber-900/60 border border-amber-700/50 rounded-md';
                                case 'card_overlay': return 'bg-background/90 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3';
                                case 'cutout': return 'mix-blend-difference';
                                default: return '';
                              }
                            })()
                          }`}>
                            <p className={`text-sm leading-tight transition-all duration-300 line-clamp-3 break-words ${
                              (['overlay', 'gradient_bar', 'badge', 'plaquinha'].includes(formData.textDesignStyle || ''))
                                ? 'text-white'
                                : 'text-foreground'
                            }`} style={getFontStyle()}>
                              {formData.imageTextContent}
                            </p>
                            {formData.ctaText && (
                              <p className={`mt-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all duration-300 ${
                                (['overlay', 'gradient_bar', 'badge', 'plaquinha'].includes(formData.textDesignStyle || ''))
                                  ? 'text-white/80'
                                  : 'text-primary'
                              }`}>
                                {formData.ctaText}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground/60 font-medium">
                          {formData.fontFamily || 'Montserrat'}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-medium">
                          {TEXT_DESIGN_OPTIONS.find(d => d.value === formData.textDesignStyle)?.label || 'Clean'}
                        </span>
                      </div>
                    </>
                  )}
                </FormatPreview>
              </div>

              {/* Visual Style + Camera Angle */}
              <div className="flex flex-col gap-3">
                <VisualStyleGrid
                  value={formData.visualStyle}
                  onChange={value => handleSelectChange("visualStyle" as any, value)}
                />
                <CameraAngleGrid
                  value={formData.cameraAngle || "eye_level"}
                  onChange={value => handleSelectChange("cameraAngle" as any, value)}
                />
              </div>

            </div>
          </div>

          {/* Generate Button — full width */}
          <div className="flex justify-center pb-6">
            <Button id="generate-button" onClick={handleGenerateContent} disabled={loading || !isFormValid} size="lg"
              className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg gap-2">
              {loading ? (<><Loader2 className="animate-spin h-5 w-5" /><span>Gerando imagem...</span></>) : (
                <>
                  <Sparkles className="h-5 w-5" /><span>Gerar Imagem</span>
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1">
                    <Coins className="h-3 w-3" />{CREDIT_COSTS.COMPLETE_IMAGE}
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
