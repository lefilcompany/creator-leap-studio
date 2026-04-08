import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Copy, Check, Maximize2, RefreshCw, Undo2, Zap, ArrowLeft, Coins, Building2, Palette, User, Share2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

export default function QuickContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUserCredits } = useAuth();
  const [isCopied, setIsCopied] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [totalRevisions, setTotalRevisions] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const { imageUrl, description, actionId, prompt, brandName, themeName, personaName, platform } = location.state || {};

  // Preserve all original form data for reuse
  const originalFormData = location.state || {};

  useEffect(() => {
    if (!imageUrl) {
      toast.error("Nenhum conteúdo encontrado");
      navigate("/quick-content");
    } else {
      setCurrentImageUrl(imageUrl);
      setImageHistory([imageUrl]);

      const cleanupOldHistories = () => {
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('image_history_') || key?.startsWith('revisions_')) {
            try {
              const match = key.match(/quick_content_(\d+)/);
              if (match) {
                const timestamp = parseInt(match[1]);
                if (now - timestamp > SEVEN_DAYS) keysToRemove.push(key);
              }
            } catch (e) {}
          }
        }
        if (keysToRemove.length > 0) {
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      };
      cleanupOldHistories();

      const contentId = `quick_content_${actionId || Date.now()}`;
      const revisionsKey = `revisions_${contentId}`;
      const historyKey = `image_history_${contentId}`;

      const savedRevisions = localStorage.getItem(revisionsKey);
      if (savedRevisions) setTotalRevisions(parseInt(savedRevisions));

      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        try {
          const history = JSON.parse(savedHistory);
          if (Array.isArray(history) && history.length > 0) {
            setImageHistory(history);
            setCurrentImageUrl(history[history.length - 1]);
          }
        } catch (error) {}
      }
    }
  }, [imageUrl, navigate, actionId]);

  const handleDownload = async () => {
    try {
      toast.info("Preparando download...");
      const isBase64 = currentImageUrl.startsWith('data:');
      if (isBase64) {
        const link = document.createElement("a");
        link.href = currentImageUrl;
        link.download = `creator-quick-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download concluído!");
        return;
      }
      try {
        const response = await fetch(currentImageUrl, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        window.open(currentImageUrl, '_blank');
        toast.info("Imagem aberta em nova aba. Use 'Salvar imagem como...' do navegador");
      }
    } catch (error) {
      toast.error("Erro ao baixar imagem.");
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
    newHistory.pop();
    const previousImage = newHistory[newHistory.length - 1];
    setImageHistory(newHistory);
    setCurrentImageUrl(previousImage);

    const contentId = `quick_content_${actionId || Date.now()}`;
    localStorage.setItem(`image_history_${contentId}`, JSON.stringify(newHistory));

    if (actionId) {
      supabase.from("actions").update({
        result: { imageUrl: previousImage, description, prompt },
        updated_at: new Date().toISOString(),
      }).eq("id", actionId).then(({ error }) => {
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
    if (!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW) {
      toast.error(`Créditos insuficientes. Cada revisão custa ${CREDIT_COSTS.IMAGE_REVIEW} créditos.`);
      return;
    }
    setIsReviewing(true);
    try {
      const newRevisionCount = totalRevisions + 1;
      toast.info("Editando imagem com base no seu feedback...");

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { reviewPrompt, imageUrl: currentImageUrl, brandId: null, themeId: null },
      });

      if (error) throw new Error(error.message || "Falha ao editar imagem");
      if (!data?.editedImageUrl) throw new Error("Imagem editada não foi retornada");

      const isBase64 = data.editedImageUrl.startsWith('data:');
      const isHttpUrl = data.editedImageUrl.startsWith('http');
      if (!isBase64 && !isHttpUrl) throw new Error("URL da imagem editada é inválida");

      const imageUrlWithTimestamp = isBase64 ? data.editedImageUrl : `${data.editedImageUrl}?t=${Date.now()}`;
      const newHistory = [...imageHistory, imageUrlWithTimestamp].slice(-5);
      setImageHistory(newHistory);
      setCurrentImageUrl(imageUrlWithTimestamp);

      const contentId = `quick_content_${actionId || Date.now()}`;
      try {
        localStorage.setItem(`revisions_${contentId}`, newRevisionCount.toString());
        localStorage.setItem(`image_history_${contentId}`, JSON.stringify(newHistory));
      } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
      }

      setTotalRevisions(newRevisionCount);
      try { await refreshUserCredits(); } catch {}

      if (actionId) {
        await supabase.from("actions").update({
          revisions: newRevisionCount,
          result: { imageUrl: imageUrlWithTimestamp, description, prompt, feedback: reviewPrompt },
          updated_at: new Date().toISOString(),
        }).eq("id", actionId);
      }

      toast.success("Revisão concluída! 1 crédito foi consumido.");
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

  const handleReusePrompt = () => {
    const prefillData: Record<string, any> = {};
    if (originalFormData.prompt) prefillData.prompt = originalFormData.prompt;
    if (originalFormData.brandId) prefillData.brandId = originalFormData.brandId;
    if (originalFormData.themeId) prefillData.themeId = originalFormData.themeId;
    if (originalFormData.personaId) prefillData.personaId = originalFormData.personaId;
    if (originalFormData.platform) prefillData.platform = originalFormData.platform;
    if (originalFormData.aspectRatio) prefillData.aspectRatio = originalFormData.aspectRatio;
    if (originalFormData.visualStyle) prefillData.visualStyle = originalFormData.visualStyle;
    if (originalFormData.style) prefillData.style = originalFormData.style;
    if (originalFormData.quality) prefillData.quality = originalFormData.quality;
    if (originalFormData.colorPalette) prefillData.colorPalette = originalFormData.colorPalette;
    if (originalFormData.lighting) prefillData.lighting = originalFormData.lighting;
    if (originalFormData.composition) prefillData.composition = originalFormData.composition;
    if (originalFormData.cameraAngle) prefillData.cameraAngle = originalFormData.cameraAngle;
    if (originalFormData.mood) prefillData.mood = originalFormData.mood;
    if (originalFormData.width) prefillData.width = originalFormData.width;
    if (originalFormData.height) prefillData.height = originalFormData.height;

    // Use the prompt field if no explicit prompt was stored
    if (!prefillData.prompt && prompt) prefillData.prompt = prompt;

    navigate("/quick-content", { state: { prefillData } });
  };

  if (!imageUrl) return null;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 md:space-y-6">
      <PageBreadcrumb items={[{ label: "Criação Rápida", href: "/quick-content" }, { label: "Resultado" }]} />

      {/* Two-column layout: Image left (sticky), Info right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* Image - Left column, sticky on desktop */}
        <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl sm:rounded-2xl overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300 order-1 lg:sticky lg:top-4 lg:self-start">
          <div className="relative bg-muted/30 overflow-hidden group cursor-pointer" onClick={() => setIsImageDialogOpen(true)}>
            <img
              src={currentImageUrl}
              alt="Conteúdo gerado"
              className="w-full max-h-[80vh] object-contain"
              key={currentImageUrl}
            />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="secondary" size="sm" className="bg-background/80 backdrop-blur-sm gap-1.5 shadow-md">
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="text-xs">Ampliar</span>
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-t border-border/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button onClick={handleDownload} size="lg" className="flex-1 gap-2 hover-scale transition-all duration-200 hover:shadow-md rounded-xl">
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            <Button onClick={handleOpenReview} variant="secondary" className="flex-1 sm:flex-initial rounded-xl gap-2 hover-scale transition-all duration-300 hover:shadow-lg hover:shadow-primary/20" size="lg" disabled={!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW}>
              <RefreshCw className="h-4 w-4" />
              <span>Corrigir</span>
              <Badge variant="outline" className="ml-1 gap-1 border-secondary-foreground/30">
                <Coins className="h-3 w-3" />
                {CREDIT_COSTS.IMAGE_REVIEW}
              </Badge>
            </Button>
          </div>

          {/* Revert + version info */}
          {totalRevisions > 0 && (
            <div className="p-3 bg-muted/20 border-t border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <History className="h-3 w-3" />
                <span>{totalRevisions} revisão{totalRevisions !== 1 ? "ões" : ""}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleRevert} disabled={imageHistory.length <= 1} className="gap-1.5 text-xs rounded-lg">
                <Undo2 className="h-3.5 w-3.5" />
                Reverter
              </Button>
            </div>
          )}
        </Card>

        {/* Right column - Info */}
        <div className="space-y-4 order-2">
          {/* Credits badge */}
          <div className="flex items-center gap-2 justify-end">
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-2 px-3 py-1.5 text-xs">
              <Zap className="h-3 w-3" />
              <span>{user?.credits || 0} créditos</span>
            </Badge>
          </div>

          {/* Context Used */}
          {(brandName || themeName || personaName || platform) && (
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl overflow-hidden animate-fade-in" style={{ animationDelay: "50ms" }}>
              <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Contexto Utilizado
                </h2>
                <div className="flex flex-wrap gap-2">
                  {brandName && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm bg-primary/10 text-primary border-primary/20">
                      <Building2 className="h-3.5 w-3.5" />{brandName}
                    </Badge>
                  )}
                  {themeName && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm bg-accent/10 text-accent-foreground border-accent/20">
                      <Palette className="h-3.5 w-3.5" />{themeName}
                    </Badge>
                  )}
                  {personaName && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm bg-secondary/20 text-secondary-foreground border-secondary/30">
                      <User className="h-3.5 w-3.5" />{personaName}
                    </Badge>
                  )}
                  {platform && (
                    <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-sm border-border/50">
                      <Share2 className="h-3.5 w-3.5" />{platform}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Prompt Used - Truncated with "Ler mais" */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl overflow-hidden animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Prompt Utilizado
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="flex-shrink-0 gap-1.5 transition-all duration-300"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500 transition-all duration-300 scale-110" />
                  ) : (
                    <Copy className="h-4 w-4 transition-all duration-300" />
                  )}
                  <span className="text-sm">{isCopied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
              <div className="relative">
                <p className={`text-sm text-muted-foreground leading-relaxed ${!isPromptExpanded ? 'line-clamp-3' : ''}`}>
                  {prompt}
                </p>
                {prompt && prompt.length > 150 && (
                  <button
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="text-sm font-medium text-primary hover:text-primary/80 mt-1 transition-colors"
                  >
                    {isPromptExpanded ? "Ler menos" : "Ler mais"}
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Description */}
          {description && (
            <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl overflow-hidden animate-fade-in" style={{ animationDelay: "150ms" }}>
              <div className="p-4 sm:p-5 space-y-2">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Descrição
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </Card>
          )}

          {/* Action Link */}
          {actionId && (
            <Card className="backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 shadow-lg rounded-xl overflow-hidden animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full flex-shrink-0" />
                    Ação registrada
                  </h3>
                  <p className="text-xs text-muted-foreground">Salva no histórico</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/action/${actionId}`)} className="hover:scale-105 transition-transform flex-shrink-0">
                  <Check className="mr-2 h-4 w-4 text-green-500" />Ver detalhes
                </Button>
              </div>
            </Card>
          )}

          {/* Bottom Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleReusePrompt} variant="outline" className="flex-1 rounded-xl hover-scale transition-all duration-200 gap-2 hover:bg-primary/10 hover:border-primary hover:text-primary" size="lg">
              <Zap className="h-4 w-4" />
              Criar nova com mesmo prompt
            </Button>
            <Button onClick={() => navigate("/quick-content")} variant="secondary" className="flex-1 rounded-xl hover-scale transition-all duration-200 gap-2" size="lg">
              Criar Novo
            </Button>
            <Button onClick={() => navigate("/history")} variant="ghost" className="flex-1 rounded-xl hover-scale transition-all duration-200 gap-2" size="lg">
              <History className="h-4 w-4" />
              Histórico
            </Button>
          </div>
        </div>
      </div>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 overflow-auto border-0 bg-black/95" onClick={(e) => e.stopPropagation()}>
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="bg-white/10 hover:bg-white/20">
              <Download className="h-4 w-4 mr-2" />Baixar
            </Button>
          </div>
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da Imagem</DialogTitle>
            <DialogDescription>Imagem ampliada do conteúdo gerado</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={currentImageUrl} alt="Conteúdo gerado ampliado" className="max-w-full max-h-full object-contain cursor-default" onClick={(e) => e.stopPropagation()} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />Revisar Imagem
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Descreva o que você gostaria de alterar na imagem. A IA preservará a imagem original, modificando apenas o que você solicitar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <Alert>
              <AlertDescription className="text-xs sm:text-sm">
                Esta revisão consumirá <strong>{CREDIT_COSTS.IMAGE_REVIEW} créditos</strong>.
                {user?.credits && user.credits > 0 && (
                  <> Você tem <strong>{user.credits}</strong> {user.credits !== 1 ? "créditos disponíveis" : "crédito disponível"}.</>
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
              <Button variant="outline" onClick={() => setShowReviewDialog(false)} disabled={isReviewing} className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewPrompt.trim() || isReviewing || (user?.credits || 0) < CREDIT_COSTS.IMAGE_REVIEW}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs sm:text-sm gap-1"
              >
                {isReviewing ? (
                  <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Revisando...</>
                ) : (
                  <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Revisar<Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1"><Coins className="h-3 w-3" />{CREDIT_COSTS.IMAGE_REVIEW}</Badge></>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
