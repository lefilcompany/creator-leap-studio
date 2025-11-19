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
}

export function OnboardingTour({ tourType, steps, startDelay = 500 }: OnboardingTourProps) {
  const { isTourCompleted, markTourAsCompleted } = useOnboarding();
  const [run, setRun] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't show tours on mobile
    if (isMobile) {
      return;
    }

    // Check if tour should run
    if (!isTourCompleted(tourType)) {
      const timer = setTimeout(() => {
        setRun(true);
      }, startDelay);

      return () => clearTimeout(timer);
    }
  }, [tourType, isTourCompleted, startDelay, isMobile]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);

      if (status === STATUS.FINISHED) {
        markTourAsCompleted(tourType);
      } else if (status === STATUS.SKIPPED && action === 'close') {
        toast({
          title: 'Tour pulado',
          description: 'Você pode refazer os tours a qualquer momento na página de Perfil.',
        });
      }
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
      scrollToFirstStep
      scrollOffset={100}
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
