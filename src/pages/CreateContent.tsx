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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const updatedFiles = referenceFiles.filter((_, index) => index !== indexToRemove);
    setReferenceFiles(updatedFiles);
    
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
            id: '3',
            name: 'PRO',
            displayName: 'Premium',
            price: 99.90,
            trialDays: 14,
            maxMembers: 10,
            maxBrands: 20,
            maxStrategicThemes: 50,
            maxPersonas: 30,
            quickContentCreations: 1000,
            customContentSuggestions: 100,
            contentPlans: 5,
            contentReviews: 50,
            isActive: true,
          },
          credits: {
            quickContentCreations: 795,
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
      
      // Mock generated content
      const generatedContent = {
        type: isVideoMode ? "video" : "image",
        mediaUrl: isVideoMode 
          ? "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop" 
          : "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=800&fit=crop",
        caption: `🌟 Descubra o poder de ${formData.brand}! 🌟

${formData.objective}

${formData.description}

Tom: ${formData.tone.join(", ")}

${formData.additionalInfo ? `\n${formData.additionalInfo}` : ""}

#${formData.brand.replace(/\s+/g, "")} #${formData.platform} #ConteúdoIA`,
        platform: formData.platform,
        brand: formData.brand,
      };
      
      toast.success("Conteúdo gerado com sucesso!", {
        id: toastId,
        description: "Redirecionando para a página de resultado...",
      });
      
      navigate("/result", { state: { contentData: generatedContent } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar o conteúdo.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-3 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                    Criar Conteúdo
                  </h1>
                  <p className="text-muted-foreground text-xs md:text-sm lg:text-base">
                    Preencha os campos para gerar um post com IA
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto xl:max-w-md">
                <div className="flex items-center space-x-1 rounded-full bg-muted p-1 border flex-1">
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
                  <Skeleton className="h-12 md:h-14 w-full sm:w-40 lg:w-48 rounded-xl" />
                ) : (
                  team && (
                    <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 flex-shrink-0">
                      <CardContent className="p-2.5 md:p-3">
                        <div className="flex items-center justify-center gap-2 md:gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                            <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-1.5 md:p-2">
                              <Zap className="h-3 w-3 md:h-4 md:w-4" />
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                              {team?.credits?.contentSuggestions || 0}
                            </span>
                            <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-tight">
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
                    >
                      <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
                        <SelectValue placeholder="Selecione a marca" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/20">
                        {brands.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={b.name}
                            className="rounded-lg"
                          >
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            value={t.title}
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
                            value={p.name}
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
                    <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
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
                      <SelectItem value="Twitter" className="rounded-lg">
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

                  <div className="space-y-2 md:space-y-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={isVideoMode && transformationType === "video_to_video" ? "video/*" : "image/*"}
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReferenceFiles((prev) =>
                          [...prev, ...files].slice(0, 10)
                        );
                      }}
                      className="h-12 md:h-14 rounded-xl border-2 border-border/50 bg-background/50 flex items-center file:mr-3 md:file:mr-4 file:h-full file:py-0 file:px-4 md:file:px-5 file:rounded-l-[10px] file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 hover:border-primary/30 transition-all cursor-pointer"
                    />

                    <div
                      ref={pasteAreaRef}
                      tabIndex={0}
                      onPaste={handlePaste}
                      className="border-2 border-dashed border-border/50 rounded-xl p-3 md:p-4 text-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Cole sua imagem aqui (Ctrl+V)
                      </p>
                    </div>

                    {referenceFiles.length > 0 && (
                      <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                        {referenceFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-background/50 rounded-lg p-2">
                            <span className="text-xs md:text-sm text-primary font-medium flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                              <span className="truncate">{file.name}</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(idx)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0 ml-2"
                              title="Remover arquivo"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
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
                    className="min-h-[80px] md:min-h-[100px] rounded-xl border-2 border-border/50 bg-background/50 resize-none text-sm hover:border-border/70 focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-2 md:space-y-3">
                  <Label
                    htmlFor="description"
                    className="text-xs md:text-sm font-semibold text-foreground"
                  >
                    {isVideoMode
                      ? "Descrição Visual do Vídeo"
                      : "Descrição Visual da Imagem"} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={
                      isVideoMode
                        ? "Como um roteirista: descreva a ação, câmera e atmosfera..."
                        : "Como um diretor de arte: descreva a cena, iluminação e emoção..."
                    }
                    value={formData.description}
                    onChange={handleInputChange}
                    className="min-h-[100px] md:min-h-[120px] rounded-xl border-2 border-border/50 bg-background/50 resize-none text-sm hover:border-border/70 focus:border-primary/50 transition-colors"
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
                    <SelectTrigger className="h-10 md:h-11 rounded-xl border-2 border-border/50 bg-background/50 text-sm hover:border-border/70 transition-colors">
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
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
                    {formData.tone.length === 0 ? (
                      <span className="text-xs md:text-sm text-muted-foreground italic self-center">
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
                  disabled={loading || !isFormValid()}
                  className="w-full max-w-sm md:max-w-md h-12 md:h-14 rounded-2xl text-base md:text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary hover:from-primary/90 hover:via-accent/90 hover:to-secondary/90 shadow-xl transition-all duration-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base">Gerando conteúdo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base">Gerar Conteúdo</span>
                    </>
                  )}
                </Button>
                {!isFormValid() && !loading && (
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