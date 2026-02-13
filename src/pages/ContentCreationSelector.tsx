import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap, ImageIcon, Video, Sparkles } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { contentCreationSelectorSteps } from "@/components/onboarding/tourSteps";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import createBanner from "@/assets/create-banner.jpg";

type CreationType = "quick" | "image" | "video" | "animate";

export default function ContentCreationSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [creationType, setCreationType] = useState<CreationType | null>(null);

  useEffect(() => {
    if (user !== null && user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const locationState = location.state as { reset?: boolean } | null;
    if (locationState?.reset) {
      setCreationType(null);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    if (creationType) {
      const routes: Record<CreationType, string> = {
        quick: "/quick-content",
        image: "/create/image",
        video: "/create/video",
        animate: "/create/animate",
      };
      navigate(routes[creationType]);
    }
  }, [creationType, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      <OnboardingTour tourType="create_content" steps={contentCreationSelectorSteps} />

      {/* Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <PageBreadcrumb items={[{ label: "Criar Conteúdo" }]} variant="overlay" />
        <img
          src={createBanner}
          alt="Criar Conteúdo"
          className="w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card sobreposto ao banner */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 z-10">
        <Card id="content-creation-header" className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Criar Conteúdo</h1>
                  <p className="text-muted-foreground text-base">
                    Escolha o tipo de criação que deseja fazer
                  </p>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-14 w-40 rounded-xl" />
              ) : (
                user && (
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 flex-shrink-0">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                          <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                            <Zap className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="text-left gap-4 flex justify-center items-center">
                          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {user.credits || 0}
                          </span>
                          <p className="text-xs text-muted-foreground font-medium leading-tight">
                            Créditos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Cards de seleção */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <Card id="creation-type-selection" className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-3 pt-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-2xl">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Tipo de Criação
            </h2>
            <p className="text-muted-foreground text-sm">
              Selecione o tipo de conteúdo que deseja criar
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <RadioGroup
              value={creationType || ""}
              onValueChange={(value) => setCreationType(value as CreationType)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Criação Rápida */}
                <label htmlFor="quick" className="cursor-pointer h-full" onClick={() => setCreationType("quick")}>
                  <Card className="border-0 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 h-full active:scale-[0.98] touch-manipulation">
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3 sm:gap-4 min-h-[240px] h-full justify-between">
                      <RadioGroupItem value="quick" id="quick" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-8 w-8 text-accent" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="font-semibold text-lg">Criação Rápida</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Gere imagens rapidamente com prompts simples e diretos
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-sm font-bold text-accent">
                          {CREDIT_COSTS.QUICK_IMAGE} créditos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                {/* Criação Personalizada */}
                <label htmlFor="image" className="cursor-pointer h-full" onClick={() => setCreationType("image")}>
                  <Card className="border-0 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 h-full active:scale-[0.98] touch-manipulation">
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3 sm:gap-4 min-h-[240px] h-full justify-between">
                      <RadioGroupItem value="image" id="image" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="font-semibold text-lg">Criação Personalizada</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Crie imagens profissionais com controle completo e editor de canvas
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          {CREDIT_COSTS.COMPLETE_IMAGE} créditos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                {/* Criação de Vídeo */}
                <label htmlFor="video" className="cursor-pointer h-full" onClick={() => setCreationType("video")}>
                  <Card className="border-0 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-300 h-full active:scale-[0.98] touch-manipulation">
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3 sm:gap-4 min-h-[240px] h-full justify-between">
                      <RadioGroupItem value="video" id="video" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <Video className="h-8 w-8 text-secondary" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="font-semibold text-lg">Criação de Vídeo</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Gere vídeos impactantes com IA usando o modelo Veo
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/15 border border-secondary/30">
                        <Video className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-bold text-secondary">
                          {CREDIT_COSTS.VIDEO_GENERATION} créditos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                {/* Animar Imagem (desabilitado) */}
                <div className="h-full cursor-not-allowed opacity-60">
                  <Card className="h-full pointer-events-none border-0 shadow-md">
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3 sm:gap-4 min-h-[240px] h-full justify-between">
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="font-semibold text-lg">Animar Imagem</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Transforme suas imagens em animações com IA (em desenvolvimento)
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/15 border border-purple-500/30">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-bold text-purple-500">Em breve</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
