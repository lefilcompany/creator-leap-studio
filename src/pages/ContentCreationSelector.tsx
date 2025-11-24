import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Zap, ImageIcon, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CREDIT_COSTS } from '@/lib/creditCosts';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { contentCreationSelectorSteps } from '@/components/onboarding/tourSteps';

type CreationType = 'quick' | 'image' | 'video';

export default function ContentCreationSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [creationType, setCreationType] = useState<CreationType | null>(null);

  // Verificar loading
  useEffect(() => {
    if (team !== null && team !== undefined) {
      setIsLoading(false);
    }
  }, [team]);

  // Detectar reset do sidebar e resetar estado
  useEffect(() => {
    const locationState = location.state as { reset?: boolean } | null;
    if (locationState?.reset) {
      setCreationType(null);
      // Limpar o state para não resetar em próximos renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Auto-navegar quando selecionar um tipo
  useEffect(() => {
    if (creationType) {
      const routes: Record<CreationType, string> = {
        quick: '/create/quick',
        image: '/create/image',
        video: '/create/video'
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
    <div className="min-h-full w-full p-6">
      <OnboardingTour 
        tourType="create_content" 
        steps={contentCreationSelectorSteps}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <Card id="content-creation-header" className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Criar Conteúdo</h1>
                  <p className="text-muted-foreground text-base">
                    Escolha o tipo de criação que deseja fazer
                  </p>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-14 w-full sm:w-40 rounded-xl" />
              ) : team && (
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 flex-shrink-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="text-left gap-4 flex justify-center items-center">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {team.credits || 0}
                        </span>
                        <p className="text-md text-muted-foreground font-medium leading-tight">
                          Créditos Restantes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card id="creation-type-selection" className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg shadow-black/5 rounded-2xl">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Tipo de Criação
            </h2>
            <p className="text-muted-foreground text-sm">Selecione o tipo de conteúdo que deseja criar</p>
          </CardHeader>
          <CardContent className="p-6">
            <RadioGroup value={creationType || ''} onValueChange={(value) => setCreationType(value as CreationType)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label htmlFor="quick" className="cursor-pointer h-full">
                  <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                      <RadioGroupItem value="quick" id="quick" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-8 w-8 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Criação Rápida</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Gere imagens rapidamente com prompts simples e diretos
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {CREDIT_COSTS.QUICK_IMAGE} créditos
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="image" className="cursor-pointer h-full">
                  <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                      <RadioGroupItem value="image" id="image" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Criação Personalizada</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Crie imagens profissionais com controle completo e editor de canvas
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {CREDIT_COSTS.COMPLETE_IMAGE} créditos
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="video" className="cursor-pointer h-full">
                  <Card className="hover:border-primary transition-all duration-300 hover:shadow-lg h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between min-h-[240px]">
                      <RadioGroupItem value="video" id="video" className="sr-only" />
                      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <Video className="h-8 w-8 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Criação de Vídeo</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Gere vídeos impactantes com IA usando o modelo Veo
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {CREDIT_COSTS.VIDEO_GENERATION} créditos
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
