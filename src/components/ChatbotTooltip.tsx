import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export const ChatbotTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o tooltip já foi mostrado
    const hasSeenTooltip = localStorage.getItem("chatbot-tooltip-seen");
    
    if (!hasSeenTooltip) {
      // Aguarda 1 segundo para mostrar o tooltip após o carregamento
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("chatbot-tooltip-seen", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[9998] animate-fade-in">
      <Card className="w-[320px] shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 pr-2">
              <h4 className="font-semibold text-foreground mb-1">
                Assistente Creator
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Precisa de ajuda? Clique no botão abaixo para conversar com nosso assistente inteligente! Ele pode ajudar com dúvidas sobre a plataforma, recursos e funcionalidades.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Seta apontando para o botão do chatbot */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-gradient-to-br from-primary/5 to-background border-r-2 border-b-2 border-primary/20 transform rotate-45" />
        </div>
      </Card>
    </div>
  );
};
