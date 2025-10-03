import { useEffect, useRef, useCallback } from 'react';

interface DraftData<T> {
  data: T;
  timestamp: number;
}

interface UseDraftFormOptions {
  draftKey: string;
  expirationHours?: number;
  debounceMs?: number;
}

/**
 * Hook para gerenciar rascunhos de formulários no localStorage
 * Salva automaticamente com debounce e expira após X horas
 */
export function useDraftForm<T extends Record<string, any>>(
  formData: T,
  options: UseDraftFormOptions
) {
  const { draftKey, expirationHours = 2, debounceMs = 1000 } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Salvar rascunho no localStorage com debounce
  const saveDraft = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const draftData: DraftData<T> = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, debounceMs);
  }, [draftKey, debounceMs]);

  // Recuperar rascunho do localStorage
  const loadDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return null;

      const draftData: DraftData<T> = JSON.parse(stored);
      const expirationMs = expirationHours * 60 * 60 * 1000;
      const isExpired = Date.now() - draftData.timestamp > expirationMs;

      if (isExpired) {
        localStorage.removeItem(draftKey);
        return null;
      }

      return draftData.data;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [draftKey, expirationHours]);

  // Limpar rascunho do localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [draftKey]);

  // Verificar se existe rascunho salvo
  const hasDraft = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return false;

      const draftData: DraftData<T> = JSON.parse(stored);
      const expirationMs = expirationHours * 60 * 60 * 1000;
      const isExpired = Date.now() - draftData.timestamp > expirationMs;

      return !isExpired;
    } catch {
      return false;
    }
  }, [draftKey, expirationHours]);

  // Verificar se o formulário tem dados (não está vazio)
  const hasFormData = useCallback((data: T): boolean => {
    return Object.values(data).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });
  }, []);

  // Salvar rascunho automaticamente quando formData mudar (exceto no mount inicial)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Só salva se houver dados no formulário
    if (hasFormData(formData)) {
      saveDraft(formData);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, saveDraft, hasFormData]);

  return {
    loadDraft,
    clearDraft,
    hasDraft,
    saveDraft,
  };
}
