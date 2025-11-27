import { useEffect, useRef } from 'react';

/**
 * Hook para proteger componentes contra interferências de extensões do navegador
 */
export const useExtensionProtection = () => {
  const isProtectedRef = useRef(false);

  useEffect(() => {
    if (isProtectedRef.current) return;
    isProtectedRef.current = true;

    // Proteger contra modificações no localStorage
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalGetItem = localStorage.getItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    // Restaurar funções originais se foram modificadas
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      enumerable: false,
      value: originalSetItem,
      writable: true,
    });

    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      enumerable: false,
      value: originalGetItem,
      writable: true,
    });

    Object.defineProperty(Storage.prototype, 'removeItem', {
      configurable: true,
      enumerable: false,
      value: originalRemoveItem,
      writable: true,
    });

    // Proteger fetch contra interceptações
    const originalFetch = window.fetch.bind(window);
    window.fetch = function(...args) {
      try {
        return originalFetch(...args);
      } catch (error) {
        console.error('Fetch interceptado por extensão:', error);
        return originalFetch(...args);
      }
    };

    // Cleanup
    return () => {
      isProtectedRef.current = false;
    };
  }, []);
};

/**
 * Hook para proteger formulários contra auto-fill malicioso de extensões
 */
export const useFormProtection = (formRef: React.RefObject<HTMLFormElement>) => {
  useEffect(() => {
    if (!formRef.current) return;

    const form = formRef.current;
    
    // Prevenir modificações não autorizadas nos inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          const target = mutation.target as HTMLInputElement;
          // Apenas validar, não bloquear - deixar o usuário ter controle
          if (target && target.dataset.protected === 'true') {
            console.debug('Mudança detectada em campo protegido:', target.name);
          }
        }
      });
    });

    observer.observe(form, {
      attributes: true,
      subtree: true,
      attributeFilter: ['value'],
    });

    // Adicionar atributo autocomplete de forma mais agressiva
    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
      if (!input.getAttribute('autocomplete')) {
        input.setAttribute('autocomplete', 'off');
      }
      input.setAttribute('data-form-type', 'other');
      input.setAttribute('data-lpignore', 'true'); // LastPass
      input.setAttribute('data-1p-ignore', 'true'); // 1Password
    });

    return () => {
      observer.disconnect();
    };
  }, [formRef]);
};

/**
 * Adicionar proteções globais contra extensões problemáticas
 */
export const initGlobalExtensionProtection = () => {
  // Proteger contra modificações no DOM que quebram a aplicação
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions
  ): HTMLElementTagNameMap[K] {
    try {
      const element = originalCreateElement(tagName, options);
      return element;
    } catch (error) {
      console.error('Erro ao criar elemento (possível interferência de extensão):', error);
      return originalCreateElement(tagName, options);
    }
  };

  // Proteger console para debug mesmo com extensões que o modificam
  const originalConsole = { ...console };
  const protectedConsole = Object.keys(console).reduce((acc, key) => {
    acc[key] = function(...args: any[]) {
      try {
        return originalConsole[key as keyof Console]?.apply(console, args);
      } catch {
        // Ignorar silenciosamente se console foi desabilitado por extensão
      }
    };
    return acc;
  }, {} as any);

  Object.assign(console, protectedConsole);

  // Proteger addEventListener para garantir que nossos eventos sejam registrados
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    try {
      return originalAddEventListener.call(this, type, listener, options);
    } catch (error) {
      console.error('Erro ao adicionar event listener:', error);
      // Tentar novamente sem options como fallback
      return originalAddEventListener.call(this, type, listener);
    }
  };
};
