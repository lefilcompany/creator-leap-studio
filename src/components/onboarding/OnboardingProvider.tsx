import { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingContextType, OnboardingState, OnboardingTourType } from '@/types/onboarding';
import { toast } from '@/hooks/use-toast';

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
  onboarding_navbar_completed: false,
  onboarding_dashboard_completed: false,
  onboarding_brands_completed: false,
  onboarding_themes_completed: false,
  onboarding_personas_completed: false,
  onboarding_create_content_completed: false,
  onboarding_quick_content_completed: false,
  onboarding_plan_content_completed: false,
  onboarding_history_completed: false,
  onboarding_credits_completed: false,
  onboarding_review_content_completed: false,
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOnboardingState();
    }
  }, [user?.id]);

  const loadOnboardingState = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          onboarding_navbar_completed,
          onboarding_dashboard_completed,
          onboarding_brands_completed,
          onboarding_themes_completed,
          onboarding_personas_completed,
          onboarding_create_content_completed,
          onboarding_quick_content_completed,
          onboarding_plan_content_completed,
          onboarding_history_completed,
          onboarding_credits_completed,
          onboarding_review_content_completed
        `)
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setState(data as OnboardingState);
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markTourAsCompleted = async (tourType: OnboardingTourType) => {
    const fieldName = `onboarding_${tourType}_completed` as keyof OnboardingState;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [fieldName]: true })
        .eq('id', user!.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        [fieldName]: true,
      }));
    } catch (error) {
      console.error('Error marking tour as completed:', error);
      toast({
        title: 'Erro ao salvar progresso',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const resetAllTours = async () => {
    try {
      const resetState = Object.keys(initialState).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as any);

      const { error } = await supabase
        .from('profiles')
        .update(resetState)
        .eq('id', user!.id);

      if (error) throw error;

      setState(initialState);

      toast({
        title: 'Tours resetados!',
        description: 'Você verá os tours novamente ao navegar pela plataforma.',
      });
    } catch (error) {
      console.error('Error resetting tours:', error);
      toast({
        title: 'Erro ao resetar tours',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const isTourCompleted = (tourType: OnboardingTourType): boolean => {
    const fieldName = `onboarding_${tourType}_completed` as keyof OnboardingState;
    return state[fieldName];
  };

  // Verifica se um tour deve ser exibido
  const shouldShowTour = (tourType: OnboardingTourType): boolean => {
    // Mostrar o tour apenas se ainda não foi completado
    return !isTourCompleted(tourType);
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        isLoading,
        markTourAsCompleted,
        resetAllTours,
        isTourCompleted,
        shouldShowTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
