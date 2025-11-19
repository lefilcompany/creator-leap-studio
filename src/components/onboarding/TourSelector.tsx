import { useState, useEffect } from 'react';
import { OnboardingTour } from './OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTourType } from '@/types/onboarding';
import { Step } from 'react-joyride';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TourOption {
  tourType: OnboardingTourType;
  steps: Step[];
  label: string;
  targetElement?: string;
}

interface TourSelectorProps {
  tours: TourOption[];
  startDelay?: number;
}

export function TourSelector({ tours, startDelay = 500 }: TourSelectorProps) {
  const { shouldShowTour } = useOnboarding();
  const [activeTourIndex, setActiveTourIndex] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  const pendingTours = tours.filter(tour => shouldShowTour(tour.tourType));

  useEffect(() => {
    if (pendingTours.length === 0 || dismissed || isMobile) {
      return;
    }

    // Se houver apenas 1 tour pendente, iniciar automaticamente
    if (pendingTours.length === 1) {
      const timer = setTimeout(() => {
        setActiveTourIndex(0);
      }, startDelay);
      return () => clearTimeout(timer);
    }

    // Se houver múltiplos tours, mostrar seletor após delay
    const timer = setTimeout(() => {
      setShowSelector(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [pendingTours.length, startDelay, dismissed, isMobile]);

  const handleTourSelect = (index: number) => {
    setShowSelector(false);
    setActiveTourIndex(index);
  };

  const handleTourComplete = () => {
    setActiveTourIndex(null);
    
    // Verificar se ainda há tours pendentes (recarregar a lista)
    const remainingPendingTours = tours.filter(tour => shouldShowTour(tour.tourType));
    
    if (remainingPendingTours.length > 0) {
      // Mostrar seletor novamente após um breve delay
      setTimeout(() => {
        setShowSelector(true);
      }, 1000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowSelector(false);
  };

  // Se não há tours pendentes ou foi dispensado ou é mobile, não renderizar nada
  if (pendingTours.length === 0 || dismissed || isMobile) {
    return null;
  }

  // Se houver tour ativo, renderizar o OnboardingTour
  if (activeTourIndex !== null) {
    const activeTour = pendingTours[activeTourIndex];
    return (
      <OnboardingTour
        tourType={activeTour.tourType}
        steps={activeTour.steps}
        startDelay={0}
        onComplete={handleTourComplete}
      />
    );
  }

  // Se houver múltiplos tours, mostrar card de seleção
  if (showSelector && pendingTours.length > 1) {
    return (
      <div className="fixed top-20 right-4 z-[9999] max-w-sm animate-fade-in">
        <Card className="shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground text-base">
                  Tours Disponíveis
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha qual tour deseja fazer primeiro
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 hover:bg-muted shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {pendingTours.map((tour, index) => (
                <Button
                  key={tour.tourType}
                  onClick={() => handleTourSelect(index)}
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-3 px-3 hover:bg-primary/5 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
                    <PlayCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-left">
                    {tour.label}
                  </span>
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Você pode refazer os tours nas Configurações
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
