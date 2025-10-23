import { useEffect, useRef } from 'react';

interface UseFormPersistenceOptions {
  key: string;
  formData: any;
  excludeFields?: string[];
}

export function useFormPersistence({ 
  key, 
  formData, 
  excludeFields = [] 
}: UseFormPersistenceOptions) {
  const isInitialMount = useRef(true);

  // Salvar no sessionStorage quando formData mudar
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const dataToSave = { ...formData };
    excludeFields.forEach(field => delete dataToSave[field]);
    
    try {
      sessionStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving form state:', error);
    }
  }, [formData, key, excludeFields]);

  // Recuperar do sessionStorage na montagem
  const loadPersistedData = () => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading form state:', error);
    }
    return null;
  };

  // Limpar sessionStorage
  const clearPersistedData = () => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing form state:', error);
    }
  };

  // Verificar se há dados relevantes (não apenas valores padrão)
  const hasRelevantData = (data: any): boolean => {
    if (!data) return false;
    
    // Verificar campos comuns em todos os formulários
    const hasCommonFields = !!(
      data.brand ||
      data.platform ||
      data.objective?.trim().length > 0 ||
      data.description?.trim().length > 0 ||
      data.additionalInfo?.trim().length > 0
    );
    
    // Verificar campos específicos de CreateContent
    const hasCreateContentFields = !!(
      data.theme ||
      data.persona ||
      (data.tone && data.tone.length > 0) ||
      data.negativePrompt?.trim().length > 0 ||
      (data.colorPalette && data.colorPalette !== 'auto') ||
      (data.lighting && data.lighting !== 'natural') ||
      (data.composition && data.composition !== 'auto') ||
      (data.cameraAngle && data.cameraAngle !== 'eye_level') ||
      (data.detailLevel && data.detailLevel !== 7) ||
      (data.mood && data.mood !== 'auto')
    );
    
    // Verificar campos específicos de ReviewContent
    const hasReviewContentFields = !!(
      data.reviewType ||
      data.adjustmentsPrompt?.trim().length > 0 ||
      data.captionText?.trim().length > 0 ||
      data.textForImage?.trim().length > 0
    );
    
    return hasCommonFields || hasCreateContentFields || hasReviewContentFields;
  };

  return {
    loadPersistedData,
    clearPersistedData,
    hasRelevantData
  };
}
