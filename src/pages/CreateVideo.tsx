import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, Video, Coins } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { toast } from "sonner";
import type { BrandSummary } from "@/types/brand";
import type { StrategicThemeSummary } from "@/types/theme";
import type { PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";

interface FormData {
  brand: string;
  theme: string;
  persona: string;
  objective: string;
  platform: string;
  description: string;
  tone: string[];
  additionalInfo: string;
  videoGenerationType: 'text_to_video';
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

  const handleGenerateVideo = async () => {
    if (!team) return toast.error("Equipe não encontrada.");
    if ((team?.credits || 0) <= 0) return toast.error("Créditos insuficientes.");
    
    if (!formData.brand || !formData.objective || !formData.platform || !formData.description || formData.tone.length === 0) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    setLoading(true);
    const toastId = toast.loading("Iniciando geração de vídeo...");

    try {
      const selectedBrand = brands.find(b => b.id === formData.brand);
      const videoPrompt = `${formData.objective}. ${formData.description}. Tom: ${formData.tone.join(", ")}. Marca: ${selectedBrand?.name}.`;
      
      const { data: actionData } = await supabase.from('actions').insert({
        type: 'GERAR_VIDEO',
        brand_id: formData.brand,
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
        }
      }).select().single();

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          prompt: videoPrompt,
          generationType: 'text_to_video',
          actionId: actionData.id,
          audioStyle: formData.videoAudioStyle,
          visualStyle: formData.videoVisualStyle,
          aspectRatio: formData.videoAspectRatio,
          resolution: formData.videoResolution,
          duration: formData.videoDuration,
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
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-purple-500/10">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/20 text-purple-500 rounded-2xl p-3">
                  <Video className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Criar Vídeo
                  </h1>
                  <p className="text-muted-foreground text-sm">Gere vídeos profissionais com IA</p>
                </div>
              </div>
              {team && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full p-2">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                          {team?.credits || 0}
                        </span>
                        <p className="text-sm text-muted-foreground">Créditos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="backdrop-blur-sm bg-card/90 border-2 border-border/50 shadow-xl rounded-2xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-t-2xl border-b-2 border-border/30">
              <h2 className="text-xl font-bold">Configuração Básica</h2>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-3">
                <Label>Marca <span className="text-destructive">*</span></Label>
                {isLoadingData ? <Skeleton className="h-11 w-full" /> : (
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value, theme: "", persona: "" }))} value={formData.brand}>
                    <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                    <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-3">
                <Label>Tema Estratégico</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))} value={formData.theme} disabled={!formData.brand || filteredThemes.length === 0}>
                  <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue placeholder="Selecione um tema (opcional)" /></SelectTrigger>
                  <SelectContent>{filteredThemes.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Persona</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, persona: value }))} value={formData.persona} disabled={!formData.brand || filteredPersonas.length === 0}>
                  <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue placeholder="Adicionar persona" /></SelectTrigger>
                  <SelectContent>{filteredPersonas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Plataforma <span className="text-destructive">*</span></Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))} value={formData.platform}>
                  <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue placeholder="Onde será postado?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Twitter/X">Twitter (X)</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/90 border-2 border-border/50 shadow-xl rounded-2xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-pink-500/5 to-purple-500/5 rounded-t-2xl border-b-2 border-border/30">
              <h2 className="text-xl font-bold">Detalhes do Vídeo</h2>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-3">
                <Label>Objetivo <span className="text-destructive">*</span></Label>
                <Textarea id="objective" placeholder="Qual a principal meta?" value={formData.objective} onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))} className="min-h-[100px] rounded-xl border-2" />
              </div>

              <div className="space-y-3">
                <Label>Descrição Visual <span className="text-destructive">*</span></Label>
                <Textarea id="description" placeholder="Descreva o que deve aparecer no vídeo..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="min-h-[120px] rounded-xl border-2" />
              </div>

              <div className="space-y-3">
                <Label>Tom de Voz <span className="text-destructive">*</span></Label>
                <Select onValueChange={(tone) => { if (!formData.tone.includes(tone) && formData.tone.length < 4) setFormData(prev => ({ ...prev, tone: [...prev.tone, tone] })); }} value="">
                  <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue placeholder="Selecione um tom" /></SelectTrigger>
                  <SelectContent>{toneOptions.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
                {formData.tone.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-purple-500/5 rounded-xl border-2 border-purple-500/20">
                    {formData.tone.map((t) => (
                      <Badge key={t} variant="secondary" className="bg-purple-500/10 text-purple-500">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-6 pb-8">
          <Card className="bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 border-2 border-purple-500/20 rounded-2xl shadow-2xl">
            <CardContent className="p-6">
              <Button onClick={handleGenerateVideo} disabled={loading} className="w-full max-w-md h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:opacity-90 mx-auto flex gap-2">
                {loading ? <><Loader2 className="animate-spin h-5 w-5" /><span>Gerando vídeo...</span></> : <><Sparkles className="h-5 w-5" /><span>Gerar Vídeo</span><Badge variant="secondary" className="ml-2"><Coins className="h-3 w-3 mr-1" />{CREDIT_COSTS.VIDEO_GENERATION}</Badge></>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
