import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader, Sparkles, Zap, X, Info, ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import type { Brand, BrandSummary } from "@/types/brand";
import type { StrategicTheme, StrategicThemeSummary } from "@/types/theme";
import type { Persona, PersonaSummary } from "@/types/persona";
import type { Team } from "@/types/theme";
import { useAuth } from "@/hooks/useAuth";

// Interfaces
interface FormData {
  brand: string;
  theme: string;
  persona: string;
  objective: string;
  platform: string;
  description: string;
  audience: string;
  tone: string[];
  additionalInfo: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    brand: "",
    theme: "",
    persona: "",
    objective: "",
    platform: "",
    description: "",
    audience: "",
    tone: [],
    additionalInfo: "",
  });

  const [team, setTeam] = useState<Team | null>(null);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [themes, setThemes] = useState<StrategicThemeSummary[]>([]);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filteredThemes, setFilteredThemes] = useState<StrategicThemeSummary[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [isVideoMode, setIsVideoMode] = useState<boolean>(false);
  const [transformationType, setTransformationType] = useState<
    "image_to_video" | "video_to_video"
  >("image_to_video");
  const [ratio, setRatio] = useState<string>("768:1280");
  const [duration, setDuration] = useState<string>("5");
  const pasteAreaRef = useRef<HTMLDivElement>(null);

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

  const handleRemoveFile = (indexToRemove: number) => {
    setReferenceFiles((prev) => 
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.teamId || !user?.id) {
        if (user) setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        // Mock data for development
        const mockTeam: Team = {
          id: 'team-1',
          name: 'LeFil',
          code: 'lefil-123',
          admin: 'copy@lefil.com.br',
          members: ['copy@lefil.com.br'],
          pending: [],
          plan: {
            name: 'PREMIUM',
            limits: {
              members: 10,
              themes: 10,
              brands: 20,
              personas: 15,
              calendars: 5,
              contentSuggestions: 100,
              contentReviews: 50
            }
          },
          credits: {
            contentSuggestions: 9795,
            contentReviews: 48,
            contentPlans: 25
          }
        };

        const mockBrands: BrandSummary[] = [
          { id: '1', name: 'Açúcar Petribu', responsible: 'copy@lefil.com.br', createdAt: '2025-09-01T10:00:00Z', updatedAt: '2025-09-29T10:00:00Z' },
          { id: '2', name: 'Cerâmica Brennand', responsible: 'copy@lefil.com.br', createdAt: '2025-09-02T10:00:00Z', updatedAt: '2025-09-29T10:00:00Z' },
          { id: '3', name: 'Iclub', responsible: 'copy@lefil.com.br', createdAt: '2025-09-03T10:00:00Z', updatedAt: '2025-09-29T10:00:00Z' },
        ];

        const mockThemes: StrategicThemeSummary[] = [
          { id: '1', brandId: '1', title: 'Receitas Tradicionais', createdAt: '2025-09-01T10:00:00Z' },
          { id: '2', brandId: '1', title: 'Momentos em Família', createdAt: '2025-09-02T10:00:00Z' },
          { id: '3', brandId: '2', title: 'Arte e Tradição', createdAt: '2025-09-03T10:00:00Z' },
        ];

        const mockPersonas: PersonaSummary[] = [
          { id: '1', brandId: '1', name: 'Mãe Carinhosa', createdAt: '2025-09-01T10:00:00Z' },
          { id: '2', brandId: '1', name: 'Jovem Independente', createdAt: '2025-09-02T10:00:00Z' },
          { id: '3', brandId: '2', name: 'Artista Apreciador', createdAt: '2025-09-03T10:00:00Z' },
        ];

        setTeam(mockTeam);
        setBrands(mockBrands);
        setThemes(mockThemes);
        setPersonas(mockPersonas);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do formulário");
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const selectedBrand = brands.find((b) => b.name === formData.brand);
    setFilteredThemes(
      selectedBrand ? themes.filter((t) => t.brandId === selectedBrand.id) : []
    );
    setFilteredPersonas(
      selectedBrand ? personas.filter((p) => p.brandId === selectedBrand.id) : []
    );
  }, [brands, themes, personas, formData.brand]);

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
        theme: "",
        persona: ""
      }));
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

  const isFormValid = () => {
    const baseValid =
      formData.brand &&
      formData.objective &&
      formData.platform &&
      formData.description &&
      formData.audience &&
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
  };

  const handleGenerateContent = async () => {
    if (!team) return toast.error("Equipe não encontrada.");
    
    const availableCredits = team?.credits?.contentSuggestions || 0;
    if (availableCredits <= 0)
      return toast.error("Seus créditos para criação de conteúdo acabaram.");
      
    if (!isFormValid())
      return toast.error(
        "Por favor, preencha todos os campos obrigatórios (*)."
      );

    setLoading(true);
    const toastId = toast.loading("Gerando seu conteúdo...", {
      description: "A IA está trabalhando. Isso pode levar alguns instantes.",
    });

    try {
      // Simulate content generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Conteúdo gerado com sucesso!", {
        id: toastId,
        description: "Redirecionando para a página de resultado...",
      });
      navigate("/historico");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar o conteúdo.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/8 via-secondary/8 to-accent/8 backdrop-blur-sm mb-8">
          <CardHeader className="p-6 lg:p-8">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="flex-shrink-0 bg-gradient-to-br from-primary/15 to-secondary/15 text-primary rounded-2xl p-4 shadow-lg">
                  <Sparkles className="h-7 w-7 lg:h-8 lg:w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                    Criar Conteúdo
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
                    Preencha os campos para gerar um post com IA
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full xl:w-auto">
                {/* Mode Toggle */}
                <div className="flex items-center rounded-2xl bg-muted/50 p-1.5 border shadow-sm backdrop-blur-sm min-w-0">
                  <Button
                    variant={!isVideoMode ? "default" : "ghost"}
                    onClick={() => handleVideoModeChange(false)}
                    className="flex-1 sm:flex-none rounded-xl font-semibold transition-all duration-300 text-sm px-4 py-2.5 shadow-sm"
                  >
                    <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Imagem</span>
                  </Button>
                  <Button
                    variant={isVideoMode ? "default" : "ghost"}
                    onClick={() => handleVideoModeChange(true)}
                    className="flex-1 sm:flex-none rounded-xl font-semibold transition-all duration-300 text-sm px-4 py-2.5 shadow-sm"
                  >
                    <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">Vídeo</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 font-bold">
                        BETA
                      </Badge>
                    </div>
                  </Button>
                </div>

                {/* Credits Card */}
                {isLoadingData ? (
                  <Skeleton className="h-16 w-full sm:w-52 rounded-2xl" />
                ) : (
                  team && (
                    <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-primary/20 shadow-lg backdrop-blur-sm flex-shrink-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-md opacity-50"></div>
                            <div className="relative bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-3 shadow-lg">
                              <Zap className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                              {team?.credits?.contentSuggestions || 0}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium leading-tight">
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

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Left Column - Configuration */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="backdrop-blur-sm bg-card/90 border border-border/30 shadow-xl rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4 bg-gradient-to-br from-primary/8 to-secondary/8 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg"></div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Configuração Básica
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Defina marca, tema e público-alvo
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Marca <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-12 w-full rounded-xl" />
                  ) : (
                    <Select
                      onValueChange={(value) => handleSelectChange("brand", value)}
                      value={formData.brand}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-primary/50 focus:border-primary transition-all duration-200 shadow-sm">
                        <SelectValue placeholder="Selecione a marca" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 shadow-xl">
                        {brands.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={b.name}
                            className="rounded-lg hover:bg-primary/5 focus:bg-primary/10"
                          >
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                    Tema Estratégico
                  </Label>
                  {isLoadingData ? (
                    <Skeleton className="h-12 w-full rounded-xl" />
                  ) : (
                    <Select
                      onValueChange={(value) => handleSelectChange("theme", value)}
                      value={formData.theme}
                      disabled={!formData.brand || filteredThemes.length === 0}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-secondary/50 focus:border-secondary transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
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
                      <SelectContent className="rounded-xl border-border/30 shadow-xl">
                        {filteredThemes.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.title}
                            className="rounded-lg hover:bg-secondary/5 focus:bg-secondary/10"
                          >
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Remaining Configuration Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      Persona
                    </Label>
                    {isLoadingData ? (
                      <Skeleton className="h-12 w-full rounded-xl" />
                    ) : (
                      <Select
                        onValueChange={(value) => handleSelectChange("persona", value)}
                        value={formData.persona}
                        disabled={!formData.brand || filteredPersonas.length === 0}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-accent/50 focus:border-accent transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue
                            placeholder={
                              !formData.brand ? "Primeiro, escolha a marca" : "Adicionar persona"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/30 shadow-xl">
                          {filteredPersonas.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.name}
                              className="rounded-lg hover:bg-accent/5 focus:bg-accent/10"
                            >
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Plataforma <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      onValueChange={(value) => handleSelectChange("platform", value)}
                      value={formData.platform}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-primary/50 focus:border-primary transition-all duration-200 shadow-sm">
                        <SelectValue placeholder="Onde será postado?" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 shadow-xl">
                        <SelectItem value="Instagram" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          Instagram
                        </SelectItem>
                        <SelectItem value="Facebook" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          Facebook
                        </SelectItem>
                        <SelectItem value="TikTok" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          TikTok
                        </SelectItem>
                        <SelectItem value="Twitter" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          Twitter (X)
                        </SelectItem>
                        <SelectItem value="LinkedIn" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          LinkedIn
                        </SelectItem>
                        <SelectItem value="Comunidades" className="rounded-lg hover:bg-primary/5 focus:bg-primary/10">
                          Comunidades
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                    Público-Alvo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="audience"
                    placeholder="Ex: Jovens de 18-25 anos interessados em tecnologia"
                    value={formData.audience}
                    onChange={handleInputChange}
                    className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-secondary/50 focus:border-secondary transition-all duration-200 shadow-sm"
                  />
                </div>

                {isVideoMode && (
                  <div className="p-4 bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-accent/20 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-accent">
                      <Video className="h-4 w-4" />
                      Configurações de Vídeo
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-sm font-bold text-foreground">
                        Tipo de Transformação <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={transformationType}
                        onValueChange={(value) => setTransformationType(value as any)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image_to_video">Imagem para Vídeo</SelectItem>
                          <SelectItem value="video_to_video">Vídeo para Vídeo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Label className="text-sm font-bold text-foreground">
                          Proporção <span className="text-destructive">*</span>
                        </Label>
                        <Select value={ratio} onValueChange={setRatio}>
                          <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="768:1280">Vertical (9:16)</SelectItem>
                            <SelectItem value="1280:768">Horizontal (16:9)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {transformationType === "image_to_video" && (
                        <div className="space-y-4">
                          <Label className="text-sm font-bold text-foreground">
                            Duração (s) <span className="text-destructive">*</span>
                          </Label>
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70">
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
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    {isVideoMode
                      ? transformationType === "image_to_video"
                        ? "Imagem de Referência"
                        : "Vídeo de Referência"
                      : "Imagem de Referência"} <span className="text-destructive">*</span>
                  </Label>

                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept={isVideoMode && transformationType === "video_to_video" ? "video/*" : "image/*"}
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReferenceFiles((prev) => [...prev, ...files].slice(0, 10));
                      }}
                      className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-accent/50 focus:border-accent transition-all duration-200 shadow-sm file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gradient-to-r file:from-primary/15 file:to-accent/15 file:text-primary hover:file:bg-gradient-to-r hover:file:from-primary/25 hover:file:to-accent/25"
                    />

                    <div
                      ref={pasteAreaRef}
                      tabIndex={0}
                      onPaste={handlePaste}
                      className="group relative border-2 border-dashed border-border/50 hover:border-accent/60 rounded-xl p-8 text-center bg-gradient-to-br from-muted/20 to-accent/5 hover:from-muted/30 hover:to-accent/10 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300"></div>
                      <div className="relative">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3 group-hover:text-accent/70 transition-colors duration-200" />
                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                          Cole sua imagem aqui (Ctrl+V) ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Suporte para múltiplas imagens (máx. 10)
                        </p>
                      </div>
                    </div>

                    {referenceFiles.length > 0 && (
                      <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-xl border border-primary/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          {referenceFiles.length} arquivo{referenceFiles.length > 1 ? 's' : ''} selecionado{referenceFiles.length > 1 ? 's' : ''}
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {referenceFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border/30 group hover:bg-background/90 transition-all duration-200">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full flex-shrink-0"></div>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {file.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(idx)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Remover arquivo"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Content Details */}
          <div className="xl:col-span-3 space-y-6">
            <Card className="backdrop-blur-sm bg-card/90 border border-border/30 shadow-xl rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4 bg-gradient-to-br from-secondary/8 to-accent/8 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-secondary to-accent rounded-full shadow-lg"></div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Detalhes do Conteúdo
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Descreva o objetivo e características do post
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Objetivo do Post <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="objective"
                    placeholder="Qual a principal meta? (ex: gerar engajamento, anunciar um produto, educar sobre sustentabilidade)"
                    value={formData.objective}
                    onChange={handleInputChange}
                    className="min-h-[110px] rounded-xl border-2 border-border/40 bg-background/70 hover:border-primary/50 focus:border-primary transition-all duration-200 shadow-sm resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                    {isVideoMode ? "Descrição Visual do Vídeo" : "Descrição Visual da Imagem"} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={
                      isVideoMode
                        ? "Como um roteirista: descreva a ação, movimento de câmera e atmosfera desejada..."
                        : "Como um diretor de arte: descreva a cena, iluminação, cores e emoção que deve transmitir..."
                    }
                    value={formData.description}
                    onChange={handleInputChange}
                    className="min-h-[130px] rounded-xl border-2 border-border/40 bg-background/70 hover:border-secondary/50 focus:border-secondary transition-all duration-200 shadow-sm resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    Tom de Voz <span className="text-destructive">*</span> 
                    <span className="text-xs font-normal text-muted-foreground ml-auto">(máximo 4)</span>
                  </Label>
                  <Select onValueChange={handleToneSelect} value="">
                    <SelectTrigger className="h-12 rounded-xl border-2 border-border/40 bg-background/70 hover:border-accent/50 focus:border-accent transition-all duration-200 shadow-sm">
                      <SelectValue placeholder="Adicionar tom de voz..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/30 shadow-xl">
                      {toneOptions
                        .filter(option => !formData.tone.includes(option))
                        .map((option) => (
                        <SelectItem
                          key={option}
                          value={option}
                          className="rounded-lg hover:bg-accent/5 focus:bg-accent/10"
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="min-h-[80px] p-4 rounded-xl border-2 border-dashed border-border/40 bg-gradient-to-br from-muted/10 to-accent/5 transition-all duration-200 hover:from-muted/20 hover:to-accent/10">
                    {formData.tone.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground italic">
                          Nenhum tom selecionado
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData.tone.map((tone) => (
                          <Badge
                            key={tone}
                            className="group flex items-center gap-2 bg-gradient-to-r from-accent/15 to-secondary/15 border border-accent/30 text-accent hover:from-accent/25 hover:to-secondary/25 transition-all duration-200 px-3 py-1.5 text-sm font-semibold"
                          >
                            {tone.charAt(0).toUpperCase() + tone.slice(1)}
                            <button
                              onClick={() => handleToneRemove(tone)}
                              className="ml-1 text-accent hover:text-destructive p-1 rounded-full hover:bg-destructive/10 transition-all duration-200 group-hover:scale-110"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Informações Extras
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Detalhes cruciais (ex: usar a cor #FF5733, incluir nosso logo, mencionar promoção especial, evitar certos elementos)"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    className="min-h-[110px] rounded-xl border-2 border-border/40 bg-background/70 hover:border-primary/50 focus:border-primary transition-all duration-200 shadow-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-8 pb-12">
          <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 opacity-50"></div>
            <CardContent className="relative p-8">
              <div className="flex flex-col items-center gap-6">
                <Button
                  onClick={handleGenerateContent}
                  disabled={loading || !isFormValid()}
                  className="group relative w-full max-w-lg h-16 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary hover:from-primary/90 hover:via-accent/90 hover:to-secondary/90 shadow-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <Loader className="animate-spin h-6 w-6" />
                        <span>Gerando conteúdo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                        <span>Gerar Conteúdo</span>
                      </>
                    )}
                  </div>
                </Button>
                
                {!isFormValid() && !loading && (
                  <div className="text-center bg-muted/40 backdrop-blur-sm p-4 rounded-2xl border border-border/40 max-w-lg w-full">
                    <p className="text-muted-foreground font-medium">
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