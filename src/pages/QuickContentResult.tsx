import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Download, Copy, Check, ExternalLink, Maximize2, RefreshCw, Undo2 } from "lucide-react";
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

  const handleDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = currentImageUrl;
      link.download = `creator-quick-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Erro ao baixar imagem");
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

      if (!data.editedImageUrl.startsWith("http")) {
        throw new Error("URL da imagem editada é inválida");
      }

      const timestamp = Date.now();
      const imageUrlWithTimestamp = `${data.editedImageUrl}?t=${timestamp}`;

      // Add to history (limite de 10 imagens para evitar quota exceeded)
      const newHistory = [...imageHistory, imageUrlWithTimestamp].slice(-10);
      setImageHistory(newHistory);
      setCurrentImageUrl(imageUrlWithTimestamp);

      // Update revision count and history in localStorage
      const contentId = `quick_content_${actionId || Date.now()}`;
      const revisionsKey = `revisions_${contentId}`;
      const historyKey = `image_history_${contentId}`;

      try {
        localStorage.setItem(revisionsKey, newRevisionCount.toString());
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        // Se falhar, limpar histórico antigo e tentar novamente
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          localStorage.removeItem(historyKey);
          localStorage.setItem(historyKey, JSON.stringify([imageUrlWithTimestamp]));
          toast.warning('Histórico de imagens foi resetado por limite de armazenamento');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Left side: Back button + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform shrink-0 h-8 w-8 sm:h-9 sm:w-9"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                  Conteúdo Gerado
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">Sua imagem foi criada com sucesso</p>
              </div>
            </div>
            
            {/* Right side: Action buttons */}
            <div className="flex gap-1.5 sm:gap-2 lg:gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleOpenReview}
                      className="h-8 w-8 sm:h-9 sm:w-9 hover:text-accent hover:bg-accent/20 hover:border-accent transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Revisar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {totalRevisions > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRevert}
                        className="h-8 w-8 sm:h-9 sm:w-9 hover:text-accent hover:bg-accent/20 hover:border-accent transition-all"
                      >
                        <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reverter última revisão</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownload}
                      className="h-8 w-8 sm:h-9 sm:w-9 hover:text-accent hover:bg-accent/20 hover:border-accent transition-all"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Baixar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                size="sm"
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform h-8 sm:h-9 px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Criar Novo</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 pb-6 sm:pb-8">
          {/* Image Display */}
          <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2">
                  <div className="w-1 h-4 sm:h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Imagem Gerada
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsImageDialogOpen(true)} className="gap-1.5 sm:gap-2 h-8 sm:h-9">
                  <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Ampliar</span>
                </Button>
              </div>
              <div
                className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted border border-border/50 shadow-inner group-hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                onClick={() => setIsImageDialogOpen(true)}
              >
                <img
                  src={currentImageUrl}
                  alt="Conteúdo gerado"
                  className="w-full h-full object-contain"
                  key={currentImageUrl}
                />
              </div>
              {totalRevisions > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {totalRevisions} revisão{totalRevisions !== 1 ? "ões" : ""} realizada
                    {totalRevisions !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Details */}
            <div className="space-y-4 sm:space-y-6">
            {/* Description */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="p-4 sm:p-5 lg:p-6 space-y-2 sm:space-y-3">
                <h2 className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2">
                  <div className="w-1 h-4 sm:h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Descrição
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-3">{description}</p>
              </div>
            </Card>

            {/* Prompt */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="p-4 sm:p-5 lg:p-6 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                    Prompt Utilizado
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="hover:scale-105 transition-transform h-8 sm:h-9 shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-3">{prompt}</p>
              </div>
            </Card>

            {/* Action Link */}
            {actionId && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                        <div className="w-1 h-3.5 sm:h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full flex-shrink-0" />
                        Ação registrada
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground pl-3 break-words">
                        Esta criação foi salva no histórico
                      </p>
                    </div>
                    <Link to={`/action/${actionId}`} className="flex-shrink-0 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:scale-105 transition-transform w-full sm:w-auto"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Image Dialog */}
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 overflow-auto border-0 bg-black/95">
            <DialogHeader className="sr-only">
              <DialogTitle>Visualização da Imagem</DialogTitle>
              <DialogDescription>Imagem ampliada do conteúdo gerado</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-full">
              <img 
                src={currentImageUrl} 
                alt="Conteúdo gerado ampliado" 
                className="max-w-full max-h-full object-contain"
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
    </div>
  );
}
