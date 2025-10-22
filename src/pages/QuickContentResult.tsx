import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Copy, Check, Maximize2, RefreshCw, Undo2, Zap, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function QuickContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useAuth();
  const [isCopied, setIsCopied] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [freeRevisionsLeft, setFreeRevisionsLeft] = useState(2);
  const [totalRevisions, setTotalRevisions] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageHistory, setImageHistory] = useState<string[]>([]);

  const { imageUrl, description, actionId, prompt } = location.state || {};

  useEffect(() => {
    if (!imageUrl) {
      toast.error("Nenhum conteúdo encontrado");
      navigate("/quick-content");
    } else {
      setCurrentImageUrl(imageUrl);
      setImageHistory([imageUrl]); // Initialize history with original image

      // Limpar históricos antigos (>7 dias) automaticamente
      const cleanupOldHistories = () => {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('image_history_') || key?.startsWith('revisions_')) {
            try {
              // Extrair timestamp do contentId se possível
              const match = key.match(/quick_content_(\d+)/);
              if (match) {
                const timestamp = parseInt(match[1]);
                if (now - timestamp > SEVEN_DAYS) {
                  keysToRemove.push(key);
                }
              }
            } catch (e) {
              // Ignorar erros de parsing
            }
          }
        }

        // Remover históricos antigos
        if (keysToRemove.length > 0) {
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.log(`🧹 Limpeza automática: ${keysToRemove.length} históricos antigos removidos`);
        }
      };

      cleanupOldHistories();

      // Load revision count and history from localStorage
      const contentId = `quick_content_${actionId || Date.now()}`;
      const revisionsKey = `revisions_${contentId}`;
      const historyKey = `image_history_${contentId}`;

      const savedRevisions = localStorage.getItem(revisionsKey);
      if (savedRevisions) {
        const count = parseInt(savedRevisions);
        setTotalRevisions(count);
        setFreeRevisionsLeft(Math.max(0, 2 - count));
      }

      // Load image history if exists
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        try {
          const history = JSON.parse(savedHistory);
          if (Array.isArray(history) && history.length > 0) {
            setImageHistory(history);
            setCurrentImageUrl(history[history.length - 1]); // Set to most recent
          }
        } catch (error) {
          console.error("Error loading image history:", error);
        }
      }
    }
  }, [imageUrl, navigate, actionId]);

  const handleDownload = async () => {
    try {
      toast.info("Preparando download...");
      
      // Detectar se é base64 ou URL
      const isBase64 = currentImageUrl.startsWith('data:');
      
      if (isBase64) {
        // Para base64, fazer download direto
        const link = document.createElement("a");
        link.href = currentImageUrl;
        link.download = `creator-quick-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download concluído!");
        return;
      }
      
      // Para URLs HTTP/HTTPS, tentar múltiplos métodos
      try {
        // Método 1: Fetch + Blob (ideal)
        const response = await fetch(currentImageUrl, { 
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `creator-quick-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Download concluído!");
        
      } catch (fetchError) {
        console.warn("Fetch method failed, trying alternative:", fetchError);
        
        // Método 2: Download direto com attribute
        try {
          const link = document.createElement("a");
          link.href = currentImageUrl;
          link.download = `creator-quick-${Date.now()}.png`;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Aguardar um pouco para ver se funcionou
          await new Promise(resolve => setTimeout(resolve, 500));
          toast.success("Download iniciado!");
          
        } catch (directError) {
          console.warn("Direct download failed, trying canvas method:", directError);
          
          // Método 3: Via Canvas (último recurso)
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = currentImageUrl;
            });
            
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            
            // Usar PNG com qualidade máxima (1.0) para preservar qualidade Full HD/4K
            canvas.toBlob((blob) => {
              if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `creator-quick-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success("Download concluído!");
              } else {
                throw new Error("Falha ao criar blob do canvas");
              }
            }, 'image/png', 1.0); // Qualidade máxima para imagens HD/4K
            
          } catch (canvasError) {
            console.error("Canvas method failed:", canvasError);
            // Último recurso: abrir em nova aba
            window.open(currentImageUrl, '_blank');
            toast.info("Imagem aberta em nova aba. Use 'Salvar imagem como...' do navegador");
          }
        }
      }
      
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Erro ao baixar imagem. Tente abrir em nova aba.");
    }
  };


  const handleOpenReview = () => {
    setShowReviewDialog(true);
    setReviewPrompt("");
  };

  const handleRevert = () => {
    if (imageHistory.length <= 1) {
      toast.error("Não há revisões para reverter");
      return;
    }

    const newHistory = [...imageHistory];
    newHistory.pop(); // Remove current image
    const previousImage = newHistory[newHistory.length - 1];

    setImageHistory(newHistory);
    setCurrentImageUrl(previousImage);

    // Update localStorage - keep totalRevisions unchanged
    const contentId = `quick_content_${actionId || Date.now()}`;
    const historyKey = `image_history_${contentId}`;
    localStorage.setItem(historyKey, JSON.stringify(newHistory));

    // Update action in database if it exists
    if (actionId) {
      supabase
        .from("actions")
        .update({
          result: {
            imageUrl: previousImage,
            description,
            prompt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId)
        .then(({ error }) => {
          if (error) console.error("Error updating action:", error);
        });
    }

    toast.success("Revisão revertida com sucesso!");
  };

  const handleSubmitReview = async () => {
    if (!reviewPrompt.trim()) {
      toast.error("Digite o que você gostaria de alterar na imagem");
      return;
    }

    const needsCredit = totalRevisions >= 2;

    if (needsCredit && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0)) {
      toast.error("Você não tem créditos de revisão disponíveis");
      return;
    }

    setIsReviewing(true);

    try {
      const newRevisionCount = totalRevisions + 1;
      const newFreeRevisionsLeft = Math.max(0, freeRevisionsLeft - 1);

      toast.info("Editando imagem com base no seu feedback...");

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          reviewPrompt,
          imageUrl: currentImageUrl,
          brandId: null,
          themeId: null,
        },
      });

      if (error) {
        console.error("Erro ao editar imagem:", error);
        throw new Error(error.message || "Falha ao editar imagem");
      }

      if (!data?.editedImageUrl) {
        throw new Error("Imagem editada não foi retornada");
      }

      // Aceitar tanto URLs HTTP quanto imagens base64
      const isBase64 = data.editedImageUrl.startsWith('data:');
      const isHttpUrl = data.editedImageUrl.startsWith('http');
      
      if (!isBase64 && !isHttpUrl) {
        throw new Error("URL da imagem editada é inválida");
      }

      // Para imagens base64, usar diretamente; para URLs, adicionar timestamp
      const imageUrlWithTimestamp = isBase64 
        ? data.editedImageUrl 
        : `${data.editedImageUrl}?t=${Date.now()}`;

      // Add to history (limite de 5 URLs para economizar espaço)
      const newHistory = [...imageHistory, imageUrlWithTimestamp].slice(-5);
      setImageHistory(newHistory);
      setCurrentImageUrl(imageUrlWithTimestamp);

      // Update revision count and history in localStorage
      const contentId = `quick_content_${actionId || Date.now()}`;
      const revisionsKey = `revisions_${contentId}`;
      const historyKey = `image_history_${contentId}`;

      try {
        // Verificar espaço disponível no localStorage antes de salvar
        const testKey = 'test_storage_' + Date.now();
        try {
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
        } catch (e) {
          throw new DOMException('Storage quota check failed', 'QuotaExceededError');
        }

        localStorage.setItem(revisionsKey, newRevisionCount.toString());
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          // Limpar históricos antigos (>7 dias) de outros conteúdos
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('image_history_') || key?.startsWith('revisions_')) {
              keysToRemove.push(key);
            }
          }
          
          // Remover metade dos históricos antigos
          const toRemove = keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2));
          toRemove.forEach(key => localStorage.removeItem(key));
          
          // Tentar salvar novamente
          try {
            localStorage.setItem(revisionsKey, newRevisionCount.toString());
            localStorage.setItem(historyKey, JSON.stringify(newHistory));
            toast.info('Históricos antigos foram limpos para liberar espaço');
          } catch (retryError) {
            // Último recurso: salvar apenas a imagem atual
            localStorage.setItem(historyKey, JSON.stringify([imageUrlWithTimestamp]));
            toast.warning('Histórico limitado à versão atual por espaço');
          }
        }
      }

      setTotalRevisions(newRevisionCount);
      setFreeRevisionsLeft(newFreeRevisionsLeft);

      // Decrement team credits if needed
      if (needsCredit && team?.id) {
        const { error: creditError } = await supabase
          .from("teams")
          .update({
            credits_reviews: (team.credits.contentReviews || 0) - 1,
          })
          .eq("id", team.id);

        if (creditError) {
          console.error("Error updating team credits:", creditError);
        }
      }

      // Update action in database if it exists
      if (actionId) {
        await supabase
          .from("actions")
          .update({
            revisions: newRevisionCount,
            result: {
              imageUrl: imageUrlWithTimestamp,
              description,
              prompt,
              feedback: reviewPrompt,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", actionId);
      }

      if (needsCredit) {
        toast.success("Revisão concluída! 1 crédito foi consumido.");
      } else {
        toast.success(
          `Revisão concluída! ${newFreeRevisionsLeft} ${newFreeRevisionsLeft !== 1 ? "revisões" : "revisão"} gratuita${newFreeRevisionsLeft !== 1 ? "s" : ""} restante${newFreeRevisionsLeft !== 1 ? "s" : ""}.`,
        );
      }

      setShowReviewDialog(false);
      setReviewPrompt("");
    } catch (error) {
      console.error("Erro ao revisar imagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao revisar imagem");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      toast.success("Prompt copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar prompt");
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header Card */}
      <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-md rounded-xl overflow-hidden animate-fade-in">
        <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/quick-content")} 
              className="rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent hover-scale transition-all duration-200 flex-shrink-0 hover:shadow-md hover:text-primary h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-foreground leading-tight text-base">Criação Rápida</h1>
              <p className="text-muted-foreground text-xs leading-tight truncate">
                Imagem gerada com sucesso
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-1 px-2 py-1 text-xs h-7">
                <RefreshCw className="h-3 w-3" />
                <span>{freeRevisionsLeft > 0 ? freeRevisionsLeft : team?.credits?.contentReviews || 0}</span>
              </Badge>
            </div>
          </div>

          {/* Desktop/Tablet Layout */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/quick-content")} 
                className="rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent hover-scale transition-all duration-200 flex-shrink-0 hover:shadow-md hover:text-primary"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 lg:p-3">
                  <Zap className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                    Criação Rápida
                  </h1>
                  <p className="text-muted-foreground text-sm truncate">
                    Imagem gerada com sucesso
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-2 px-3 py-1.5 text-xs">
                <RefreshCw className="h-3 w-3" />
                <span>
                  {freeRevisionsLeft > 0 ? <>{freeRevisionsLeft} revisões grátis</> : <>{team?.credits?.contentReviews || 0} créditos</>}
                </span>
              </Badge>
            </div>
          </div>

          {/* Action Buttons - Mobile */}
          <div className="flex sm:hidden flex-wrap gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReview}
              className="flex-1 hover:text-primary hover:bg-primary/10 hover:border-primary transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Revisar</span>
            </Button>

            {totalRevisions > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
                disabled={imageHistory.length <= 1}
                className="flex-1 hover:text-primary hover:bg-primary/10 hover:border-primary transition-all disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Reverter</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1 hover:text-primary hover:bg-primary/10 hover:border-primary transition-all"
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Baixar</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate("/quick-content")}
              className="flex-1 hover:scale-105 transition-transform"
            >
              <span className="text-xs">Criar Novo</span>
            </Button>
          </div>

          {/* Action Buttons - Desktop/Tablet */}
          <div className="hidden sm:flex items-center gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReview}
              className="hover:text-primary hover:bg-primary/10 hover:border-primary transition-all hover-scale"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Revisar
            </Button>

            {totalRevisions > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
                disabled={imageHistory.length <= 1}
                className="hover:text-primary hover:bg-primary/10 hover:border-primary transition-all hover-scale disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Reverter
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hover:text-primary hover:bg-primary/10 hover:border-primary transition-all hover-scale"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>

            <Button
              size="sm"
              onClick={() => navigate("/quick-content")}
              className="ml-auto hover:scale-105 transition-transform"
            >
              Criar Novo
            </Button>
          </div>
        </div>
      </Card>

        {/* Content Grid */}
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-5 md:gap-6 xl:gap-8">
          {/* Image Display */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl sm:rounded-2xl overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300 xl:flex-1">
            <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Imagem Gerada
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsImageDialogOpen(true)} className="gap-2 hover:scale-105 transition-transform">
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Ampliar</span>
                </Button>
              </div>
              <div
                className="relative aspect-square max-h-[500px] sm:max-h-[600px] rounded-xl overflow-hidden bg-muted/30 cursor-pointer group"
                onClick={() => setIsImageDialogOpen(true)}
              >
                <img
                  src={currentImageUrl}
                  alt="Conteúdo gerado"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  key={currentImageUrl}
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              {totalRevisions > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {totalRevisions} revisão{totalRevisions !== 1 ? "ões" : ""} realizada
                    {totalRevisions !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Details Grid */}
          <div className="flex flex-col gap-4 sm:gap-5 xl:flex-1">
            {/* Description */}
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300 flex-1" style={{ animationDelay: "100ms" }}>
              <div className="p-4 sm:p-5 lg:p-6 space-y-2 sm:space-y-3">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Descrição
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </Card>

            {/* Prompt */}
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300 flex-1" style={{ animationDelay: "200ms" }}>
              <div className="p-4 sm:p-5 lg:p-6 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                    Prompt Utilizado
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="hover:scale-105 transition-transform"
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        <span className="text-sm">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        <span className="text-sm">Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{prompt}</p>
              </div>
            </Card>
          </div>

          {/* Action Link */}
          {actionId && (
            <Card className="backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 shadow-lg rounded-xl overflow-hidden animate-fade-in hover:shadow-xl hover:shadow-primary/10 transition-all duration-300" style={{ animationDelay: "300ms" }}>
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full flex-shrink-0" />
                      Ação registrada
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Esta criação foi salva no histórico
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/action/${actionId}`)}
                    className="hover:scale-105 transition-transform w-full sm:w-auto"
                  >
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Image Dialog */}
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent 
            className="max-w-[95vw] max-h-[95vh] p-2 overflow-auto border-0 bg-black/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="bg-white/10 hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
            <DialogHeader className="sr-only">
              <DialogTitle>Visualização da Imagem</DialogTitle>
              <DialogDescription>Imagem ampliada do conteúdo gerado</DialogDescription>
            </DialogHeader>
            <div 
              className="flex items-center justify-center min-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={currentImageUrl} 
                alt="Conteúdo gerado ampliado" 
                className="max-w-full max-h-full object-contain cursor-default"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Revisar Imagem
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Descreva o que você gostaria de alterar na imagem. A IA preservará a imagem original, modificando apenas
                o que você solicitar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              {/* Revision counter */}
              <Alert>
                <AlertDescription className="text-xs sm:text-sm">
                  {freeRevisionsLeft > 0 ? (
                    <span>
                      <strong>{freeRevisionsLeft}</strong> {freeRevisionsLeft > 1 ? "revisões gratuitas restantes" : "revisão gratuita restante"}
                    </span>
                  ) : (
                    <span>
                      Esta revisão consumirá <strong>1 crédito</strong> de revisão.
                      {team?.credits?.contentReviews && (
                        <>
                          {" "}
                          Você tem <strong>{team.credits.contentReviews}</strong>{" "}
                          {team.credits.contentReviews !== 1 ? "créditos" : "crédito"}{" "}
                          {team.credits.contentReviews !== 1 ? "disponíveis" : "disponível"}.
                        </>
                      )}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="review-prompt" className="text-xs sm:text-sm">O que você gostaria de alterar?</Label>
                <Textarea
                  id="review-prompt"
                  placeholder="Ex: Deixe o céu mais azul e adicione nuvens brancas..."
                  value={reviewPrompt}
                  onChange={(e) => setReviewPrompt(e.target.value)}
                  className="min-h-[100px] sm:min-h-[120px] text-xs sm:text-sm"
                  disabled={isReviewing}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReviewDialog(false)} 
                  disabled={isReviewing}
                  className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isReviewing || !reviewPrompt.trim()}
                  className="w-full sm:w-auto min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm h-9 sm:h-10"
                >
                  {isReviewing ? (
                    <>
                      <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      Revisando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Revisar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
