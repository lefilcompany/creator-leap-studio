import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, Video, Coins, Info, ImagePlus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { toast } from "sonner";
import type { BrandSummary } from "@/types/brand";
import type { StrategicThemeSummary } from "@/types/theme";
import type { PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";
import { TourSelector } from "@/components/onboarding/TourSelector";
import { navbarSteps } from "@/components/onboarding/tourSteps";

interface FormData {
  brand: string;
  theme: string;
  persona: string;
  objective: string;
  platform: string;
  description: string;
  tone: string[];
  additionalInfo: string;
  videoGenerationType: 'text_to_video' | 'image_to_video';
  videoAudioStyle: 'dialogue' | 'sound_effects' | 'music' | 'none';
  videoVisualStyle: 'cinematic' | 'animation' | 'realistic' | 'creative';
  videoAspectRatio: '16:9' | '9:16';
  videoResolution: '720p' | '1080p';
  videoDuration: 4 | 6 | 8;
}

const toneOptions = ["inspirador", "motivacional", "profissional", "casual", "elegante", "moderno", "tradicional", "divertido", "sério"];

export default function CreateVideo() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    brand: "",
    theme: "",
    persona: "",
    objective: "",
    platform: "",
    description: "",
    tone: [],
    additionalInfo: "",
    videoGenerationType: 'text_to_video',
    videoAudioStyle: 'sound_effects',
    videoVisualStyle: 'cinematic',
    videoAspectRatio: '9:16',
    videoResolution: '1080p',
    videoDuration: 8,
  });

  const [team, setTeam] = useState<Team | null>(null);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [themes, setThemes] = useState<StrategicThemeSummary[]>([]);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredThemes, setFilteredThemes] = useState<StrategicThemeSummary[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.teamId || !user?.id) {
        if (user) setIsLoadingData(false);
        return;
      }

      try {
        const [
          { data: teamData },
          { data: brandsData },
          { data: themesData },
          { data: personasData }
        ] = await Promise.all([
          supabase.from('teams').select('*, plan:plans(*)').eq('id', user.teamId).single(),
          supabase.from('brands').select('id, name, responsible, created_at, updated_at').eq('team_id', user.teamId).order('created_at', { ascending: false }),
          supabase.from('strategic_themes').select('id, brand_id, title, created_at').eq('team_id', user.teamId).order('created_at', { ascending: false }),
          supabase.from('personas').select('id, brand_id, name, created_at').eq('team_id', user.teamId).order('created_at', { ascending: false })
        ]);

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

        setTeam(mappedTeam);
        setBrands((brandsData || []).map((b: any) => ({ id: b.id, name: b.name, responsible: b.responsible, createdAt: b.created_at, updatedAt: b.updated_at })));
        setThemes((themesData || []).map((t: any) => ({ id: t.id, brandId: t.brand_id, title: t.title, createdAt: t.created_at })));
        setPersonas((personasData || []).map((p: any) => ({ id: p.id, brandId: p.brand_id, name: p.name, createdAt: p.created_at })));
        setIsLoadingData(false);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const selectedBrand = brands.find((b) => b.id === formData.brand);
    setFilteredThemes(selectedBrand ? themes.filter((t) => t.brandId === selectedBrand.id) : []);
    setFilteredPersonas(selectedBrand ? personas.filter((p) => p.brandId === selectedBrand.id) : []);
  }, [brands, themes, personas, formData.brand]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    setReferenceImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
      setFormData(prev => ({ ...prev, videoGenerationType: 'image_to_video' }));
    };
    reader.readAsDataURL(file);
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImageFile(null);
    setFormData(prev => ({ ...prev, videoGenerationType: 'text_to_video' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateVideo = async () => {
    if (!team) return toast.error("Equipe não encontrada.");
    if ((team?.credits || 0) <= 0) return toast.error("Créditos insuficientes.");
    
    if (!formData.objective || !formData.description || formData.tone.length === 0) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    setLoading(true);
    const toastId = toast.loading("Iniciando geração de vídeo...");

    try {
      const selectedBrand = brands.find(b => b.id === formData.brand);
      const videoPrompt = `${formData.objective}. ${formData.description}. Tom: ${formData.tone.join(", ")}${selectedBrand ? `. Marca: ${selectedBrand.name}` : ''}.`;
      
      const { data: actionData } = await supabase.from('actions').insert({
        type: 'GERAR_VIDEO',
        brand_id: formData.brand || null,
        team_id: user?.teamId,
        user_id: user?.id,
        status: 'pending',
        details: {
          prompt: videoPrompt,
          objective: formData.objective,
          platform: formData.platform,
          tone: formData.tone,
          audioStyle: formData.videoAudioStyle,
          visualStyle: formData.videoVisualStyle,
          aspectRatio: formData.videoAspectRatio,
          resolution: formData.videoResolution,
          duration: formData.videoDuration,
          hasReferenceImage: !!referenceImage,
        }
      }).select().single();

      // Preparar imagens de referência se houver
      const preserveImages = referenceImage ? [referenceImage] : [];

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          prompt: videoPrompt,
          generationType: referenceImage ? 'image_to_video' : 'text_to_video',
          actionId: actionData.id,
          audioStyle: formData.videoAudioStyle,
          visualStyle: formData.videoVisualStyle,
          aspectRatio: formData.videoAspectRatio,
          resolution: formData.videoResolution,
          duration: formData.videoDuration,
          preserveImages,
        }),
      });

      toast.success("Vídeo sendo gerado!", { id: toastId, duration: 3000 });
      navigate("/video-result", { state: { contentData: { actionId: actionData.id, isProcessing: true } } });
    } catch (err: any) {
      console.error("Erro:", err);
      toast.error("Erro ao gerar vídeo", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingData) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-pink-50/50 dark:from-background dark:via-background dark:to-muted/20">
      <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
        {/* Header */}
        <Card className="border-purple-200/50 dark:border-purple-500/20 bg-gradient-to-r from-pink-50/80 via-purple-50/60 to-pink-50/80 dark:from-purple-500/10 dark:via-purple-500/5 dark:to-purple-500/10 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-3 shadow-md">
                  <Video className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Criar Vídeo
                  </h1>
                  <p className="text-muted-foreground text-sm mt-0.5">Gere vídeos profissionais com IA</p>
                </div>
              </div>
              {team && (
                <Card className="bg-gradient-to-br from-purple-100/80 to-pink-100/80 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-300/50 dark:border-purple-500/20 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full p-2 shadow-sm">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {team?.credits || 0}
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

        {/* Main Form */}
        <Card className="border-purple-200/50 dark:border-border/50 bg-white/80 dark:bg-card/90 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-2">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Configure sua criação</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Descreva o que deseja criar e personalize as opções</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Marca */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Marca <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              {isLoadingData ? <Skeleton className="h-11 w-full rounded-xl" /> : (
                <>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value, theme: "", persona: "" }))} value={formData.brand}>
                    <SelectTrigger className="h-11 rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors"><SelectValue placeholder="Nenhuma marca selecionada" /></SelectTrigger>
                    <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {formData.brand && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 dark:bg-muted/30 rounded-lg p-3">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>Selecionar uma marca ajuda a IA a criar conteúdo alinhado com sua identidade visual</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tema Estratégico */}
            {formData.brand && filteredThemes.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-foreground">Tema Estratégico <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))} value={formData.theme}>
                  <SelectTrigger className="h-11 rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors"><SelectValue placeholder="Nenhum tema selecionado" /></SelectTrigger>
                  <SelectContent>{filteredThemes.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Persona */}
            {formData.brand && filteredPersonas.length > 0 && (
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-foreground">Persona <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, persona: value }))} value={formData.persona}>
                  <SelectTrigger className="h-11 rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors"><SelectValue placeholder="Nenhuma persona selecionada" /></SelectTrigger>
                  <SelectContent>{filteredPersonas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Plataforma */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Plataforma <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))} value={formData.platform}>
                <SelectTrigger className="h-11 rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors"><SelectValue placeholder="Nenhuma plataforma selecionada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Twitter/X">Twitter (X)</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 dark:bg-muted/30 rounded-lg p-3">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Selecionar plataforma ajusta automaticamente a proporção ideal</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Imagem de Referência */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Imagem de Referência <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 dark:bg-muted/30 rounded-lg p-3 mb-3">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Adicione uma imagem para criar um vídeo baseado nela. A IA usará a imagem como referência visual.</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {referenceImage ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-purple-200 dark:border-purple-500/30 bg-muted/30">
                  <img 
                    src={referenceImage} 
                    alt="Imagem de referência" 
                    className="w-full max-h-[200px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                    onClick={removeReferenceImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      Imagem para vídeo
                    </Badge>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Clique para adicionar imagem de referência</span>
                  </div>
                </Button>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Descreva o que você quer criar <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Ex: Um vídeo mostrando um produto sendo usado em diferentes cenários, com transições suaves e música de fundo inspiradora..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            {/* Objetivo */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Objetivo <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Qual a principal meta deste vídeo?"
                value={formData.objective}
                onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                className="min-h-[80px] rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            {/* Tom de Voz */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Tom de Voz <span className="text-destructive">*</span></Label>
              <Select onValueChange={(tone) => { if (!formData.tone.includes(tone) && formData.tone.length < 4) setFormData(prev => ({ ...prev, tone: [...prev.tone, tone] })); }} value="">
                <SelectTrigger className="h-11 rounded-xl border-purple-200 dark:border-border hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors"><SelectValue placeholder="Selecione um tom" /></SelectTrigger>
                <SelectContent>{toneOptions.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              {formData.tone.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-purple-100/50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                  {formData.tone.map((t) => (
                    <Badge key={t} variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="pt-2 pb-8">
          <Button
            onClick={handleGenerateVideo}
            disabled={loading}
            className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:opacity-90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                <span>Gerando vídeo...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                <span>Gerar Vídeo</span>
                <Badge variant="secondary" className="ml-3 bg-white/20 text-white border-0 hover:bg-white/30">
                  <Coins className="h-3 w-3 mr-1" />
                  {CREDIT_COSTS.VIDEO_GENERATION}
                </Badge>
              </>
            )}
          </Button>
        </div>

        <TourSelector 
          tours={[
            {
              tourType: 'navbar',
              steps: navbarSteps,
              label: 'Tour da Navegação',
              targetElement: '#sidebar-logo'
            }
          ]}
          startDelay={500}
        />
      </div>
    </div>
  );
}
