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
  const {
    team
  } = useAuth();
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
    const locationState = location.state as {
      reset?: boolean;
    } | null;
    if (locationState?.reset) {
      setCreationType(null);
      // Limpar o state para não resetar em próximos renders
      navigate(location.pathname, {
        replace: true,
        state: {}
      });
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
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>;
  }
  return <div className="min-h-full w-full bg-background">
      <OnboardingTour tourType="create_content" steps={contentCreationSelectorSteps} />

      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-0 py-0">
        <Card id="content-creation-header" className="border-0 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg animate-fade-in">
          <CardHeader className="pb-6 pt-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-2xl p-4 shadow-sm">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">Criar Conteúdo</h1>
                  <p className="text-muted-foreground text-base mt-1.5">
                    Escolha o tipo de criação que deseja fazer
                  </p>
                </div>
              </div>
              {isLoading ? <Skeleton className="h-24 w-56 rounded-2xl" /> : team && <Card className="border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 shadow-md backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl p-3 shadow-lg">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
                          {team.credits || 0}
                        </span>
                        <p className="text-xs text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide">
                          Créditos disponíveis
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>}
            </div>
          </CardHeader>
        </Card>

        <Card id="creation-type-selection" className="border-0 bg-card shadow-lg animate-fade-in" style={{
        animationDelay: '0.1s'
      }}>
          <CardHeader className="pb-6 pt-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Tipo de Criação
              </h2>
              <p className="text-muted-foreground text-base">Selecione o tipo de conteúdo que deseja criar</p>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <RadioGroup value={creationType || ''} onValueChange={value => setCreationType(value as CreationType)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <label htmlFor="quick" className="cursor-pointer group animate-scale-in" style={{
                animationDelay: '0.2s'
              }}>
                  <Card className="h-full border-2 border-border/50 bg-gradient-to-br from-card to-accent/5 hover:border-accent hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                      <RadioGroupItem value="quick" id="quick" className="sr-only" />
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent/30 transition-all duration-300">
                        <Zap className="h-10 w-10 text-accent" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-bold text-lg text-foreground">Criação Rápida</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Gere imagens rapidamente com prompts simples e diretos
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border-2 border-accent/30 shadow-sm">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-sm font-bold text-accent">{CREDIT_COSTS.QUICK_IMAGE} créditos</span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="image" className="cursor-pointer group animate-scale-in" style={{
                animationDelay: '0.3s'
              }}>
                  <Card className="h-full border-2 border-border/50 bg-gradient-to-br from-card to-primary/5 hover:border-primary hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                      <RadioGroupItem value="image" id="image" className="sr-only" />
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                        <ImageIcon className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-bold text-lg text-foreground">Criação Personalizada</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Crie imagens profissionais com controle completo e editor de canvas
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border-2 border-primary/30 shadow-sm">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">{CREDIT_COSTS.COMPLETE_IMAGE} créditos</span>
                      </div>
                    </CardContent>
                  </Card>
                </label>

                <label htmlFor="video" className="cursor-pointer group animate-scale-in" style={{
                animationDelay: '0.4s'
              }}>
                  <Card className="h-full border-2 border-border/50 bg-gradient-to-br from-card to-secondary/5 hover:border-secondary hover:shadow-xl hover:shadow-secondary/20 hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                      <RadioGroupItem value="video" id="video" className="sr-only" />
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-secondary/30 transition-all duration-300">
                        <Video className="h-10 w-10 text-secondary" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-bold text-lg text-foreground">Criação de Vídeo</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Gere vídeos impactantes com IA usando o modelo Veo
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/15 border-2 border-secondary/30 shadow-sm">
                        <Video className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-bold text-secondary">{CREDIT_COSTS.VIDEO_GENERATION} créditos</span>
                      </div>
                    </CardContent>
                  </Card>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>;
}