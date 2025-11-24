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
        quick: '/quick-content',
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
    <div className="min-h-full w-full">
      <OnboardingTour 
        tourType="create_content" 
        steps={contentCreationSelectorSteps}
      />

      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <Card id="content-creation-header" className="border border-border/40 bg-card shadow-sm">
          <CardHeader className="pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-3">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Criar Conteúdo</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Escolha o tipo de criação que deseja fazer
                  </p>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-20 w-48 rounded-xl" />
              ) : team && (
                <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-lg p-2.5">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-foreground tabular-nums">
                          {team.credits || 0}
                        </span>
                        <p className="text-xs text-muted-foreground font-medium">
                          Créditos disponíveis
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card id="creation-type-selection" className="border border-border/40 bg-card shadow-sm">
          <CardHeader className="pb-5">
            <h2 className="text-lg font-semibold text-foreground">
              Tipo de Criação
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Selecione o tipo de conteúdo que deseja criar</p>
          </CardHeader>
          <CardContent className="p-6">
            <RadioGroup value={creationType || ''} onValueChange={(value) => setCreationType(value as CreationType)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label htmlFor="quick" className="cursor-pointer group">
                  <Card className="h-full border-border/40 bg-card hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 hover:shadow-md">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-5">
                      <RadioGroupItem value="quick" id="quick" className="sr-only" />
                      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors duration-300">
                        <Zap className="h-7 w-7 text-accent" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-foreground">Criação Rápida</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Gere imagens rapidamente com prompts simples e diretos
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                        <Zap className="h-3 w-3 text-accent" />
                        <span className="text-xs font-semibold text-accent">{CREDIT_COSTS.QUICK_IMAGE} créditos</span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="image" className="cursor-pointer group">
                  <Card className="h-full border-border/40 bg-card hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 hover:shadow-md">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-5">
                      <RadioGroupItem value="image" id="image" className="sr-only" />
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                        <ImageIcon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-foreground">Criação Personalizada</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Crie imagens profissionais com controle completo e editor de canvas
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                        <ImageIcon className="h-3 w-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">{CREDIT_COSTS.COMPLETE_IMAGE} créditos</span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="video" className="cursor-pointer group">
                  <Card className="h-full border-border/40 bg-card hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 hover:shadow-md">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-5">
                      <RadioGroupItem value="video" id="video" className="sr-only" />
                      <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors duration-300">
                        <Video className="h-7 w-7 text-secondary" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-foreground">Criação de Vídeo</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Gere vídeos impactantes com IA usando o modelo Veo
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
                        <Video className="h-3 w-3 text-secondary" />
                        <span className="text-xs font-semibold text-secondary">{CREDIT_COSTS.VIDEO_GENERATION} créditos</span>
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
