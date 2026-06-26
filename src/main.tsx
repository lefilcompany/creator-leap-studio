import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalExtensionProtection } from "./hooks/useExtensionProtection";
import { scheduleAnalytics } from "./lib/loadAnalytics";

// Carrega GTM/GA4/Meta Pixel fora do critical path (idle ou primeira interação)
scheduleAnalytics();


// Inicializar proteções globais contra extensões
initGlobalExtensionProtection();

// Global error handlers para prevenir tela branca
window.addEventListener('error', (event) => {
  console.error('🚨 Global error caught:', event.error);
  // Verificar se o erro é causado por extensão do navegador
  if (event.error?.stack?.includes('extension://') || event.error?.stack?.includes('chrome-extension://')) {
    console.warn('⚠️ Erro causado por extensão do navegador - ignorando para manter estabilidade');
    event.preventDefault();
    return;
  }
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  // Verificar se a rejeição é causada por extensão
  if (event.reason?.stack?.includes('extension://') || event.reason?.stack?.includes('chrome-extension://')) {
    console.warn('⚠️ Promise rejection causada por extensão do navegador - ignorando');
    event.preventDefault();
    return;
  }
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
