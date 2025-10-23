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
    
    return !!(
      data.prompt?.trim().length > 0 ||
      data.brandId ||
      data.platform ||
      data.negativePrompt?.trim().length > 0 ||
      (data.colorPalette && data.colorPalette !== 'auto') ||
      (data.lighting && data.lighting !== 'natural') ||
      (data.composition && data.composition !== 'auto') ||
      (data.cameraAngle && data.cameraAngle !== 'eye_level') ||
      (data.detailLevel && data.detailLevel !== 7) ||
      (data.mood && data.mood !== 'auto') ||
      data.width ||
      data.height
    );
  };

  return {
    loadPersistedData,
    clearPersistedData,
    hasRelevantData
  };
}
