import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTourType } from '@/types/onboarding';
import { tourStyles } from './tourStyles';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingTourProps {
  tourType: OnboardingTourType;
  steps: Step[];
  startDelay?: number;
  onComplete?: () => void;
}

export function OnboardingTour({ tourType, steps, startDelay = 500, onComplete }: OnboardingTourProps) {
  const { shouldShowTour, markTourAsCompleted } = useOnboarding();
  const [run, setRun] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't show tours on mobile
    if (isMobile) {
      return;
    }

    // Check if tour should run (respecting order)
    if (shouldShowTour(tourType)) {
      const timer = setTimeout(() => {
        setRun(true);
      }, startDelay);

      return () => clearTimeout(timer);
    }
  }, [tourType, shouldShowTour, startDelay, isMobile]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);

      if (status === STATUS.FINISHED) {
        markTourAsCompleted(tourType);
        toast({
          title: 'Tour concluído! 🎉',
          description: 'Você pode refazer os tours nas Configurações (ícone de engrenagem).',
          duration: 5000,
        });
      } else if (status === STATUS.SKIPPED) {
        // Quando o tour é pulado, também marca como completo
        markTourAsCompleted(tourType);
        toast({
          title: 'Tour pulado',
          description: 'Este tour foi marcado como concluído. Você pode refazê-lo nas Configurações.',
          duration: 5000,
        });
      }

      // Chamar callback de conclusão se fornecido
      onComplete?.();
    }
  };

  if (isMobile || !run) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep={false}
      scrollOffset={20}
      disableScrollParentFix={true}
      callback={handleJoyrideCallback}
      styles={tourStyles}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular tour',
      }}
    />
  );
}
