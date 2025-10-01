import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Copy, 
  Share2, 
  Sparkles,
  ArrowLeft,
  Check,
  ImageIcon,
  Video,
  RefreshCw,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ContentResultData {
  type: "image" | "video";
  mediaUrl: string;
  caption: string;
  platform: string;
  brand: string;
  title?: string;
  hashtags?: string[];
  originalFormData?: any;
  actionId?: string;
}

export default function ContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useAuth();
  const [copied, setCopied] = useState(false);
  const [contentData, setContentData] = useState<ContentResultData | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewType, setReviewType] = useState<"image" | "caption" | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [freeRevisionsLeft, setFreeRevisionsLeft] = useState(2);
  const [totalRevisions, setTotalRevisions] = useState(0);

  useEffect(() => {
    // Get data from navigation state
    if (location.state?.contentData) {
      const data = location.state.contentData;
      setContentData(data);
      
      // Save to localStorage and history
      const contentId = `content_${Date.now()}`;
      const savedContent = {
        id: contentId,
        ...data,
        createdAt: new Date().toISOString(),
        revisions: []
      };
      
      localStorage.setItem('currentContent', JSON.stringify(savedContent));
      
      // Add to history (without base64 image to save space)
      try {
        const history = JSON.parse(localStorage.getItem('contentHistory') || '[]');
        const historyItem = {
          id: contentId,
          type: data.type,
          platform: data.platform,
          brand: data.brand,
          createdAt: new Date().toISOString(),
          // Don't store mediaUrl (base64) to avoid quota issues
        };
        history.unshift(historyItem);
        // Keep only last 10 items to avoid quota issues
        localStorage.setItem('contentHistory', JSON.stringify(history.slice(0, 10)));
      } catch (error) {
        console.error('Error saving to history:', error);
        // If quota exceeded, clear history and try again
        localStorage.removeItem('contentHistory');
      }
      
      // Load revision count for this session
      const revisionsKey = `revisions_${contentId}`;
      const savedRevisions = localStorage.getItem(revisionsKey);
      if (savedRevisions) {
        const count = parseInt(savedRevisions);
        setTotalRevisions(count);
        setFreeRevisionsLeft(Math.max(0, 2 - count));
      }
    } else {
      // Try to load from localStorage
      const saved = localStorage.getItem('currentContent');
      if (saved) {
        const parsed = JSON.parse(saved);
        setContentData(parsed);
        
        const revisionsKey = `revisions_${parsed.id}`;
        const savedRevisions = localStorage.getItem(revisionsKey);
        if (savedRevisions) {
          const count = parseInt(savedRevisions);
          setTotalRevisions(count);
          setFreeRevisionsLeft(Math.max(0, 2 - count));
        }
      } else {
        toast.error("Nenhum conteúdo encontrado");
        navigate("/create");
      }
    }
  }, [location.state, navigate]);

  const handleCopyCaption = async () => {
    if (!contentData) return;
    
    try {
      await navigator.clipboard.writeText(contentData.caption);
      setCopied(true);
      toast.success("Legenda copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar legenda");
    }
  };

  const handleDownload = () => {
    if (!contentData) return;
    
    try {
      // Convert base64 to blob
      const base64Data = contentData.mediaUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = contentData.type === "video" ? "video/mp4" : "image/png";
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const extension = contentData.type === "video" ? "mp4" : "png";
      link.download = `${contentData.brand.replace(/\s+/g, '_')}_${contentData.platform}_${timestamp}.${extension}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Download em alta qualidade iniciado!`);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error("Erro ao fazer download");
    }
  };

  const handleShare = async () => {
    if (!contentData) return;

    try {
      // Check if Web Share API is available
      if (!navigator.share) {
        // Fallback: copy caption and prompt to download
        await navigator.clipboard.writeText(contentData.caption);
        toast.info("Legenda copiada! Agora faça o download da mídia para compartilhar.");
        return;
      }

      // Convert base64 to blob
      const base64Data = contentData.mediaUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = contentData.type === "video" ? "video/mp4" : "image/png";
      const extension = contentData.type === "video" ? "mp4" : "png";
      
      // Create File object
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${contentData.brand.replace(/\s+/g, '_')}_${contentData.platform}_${timestamp}.${extension}`;
      const file = new File([byteArray], filename, { type: mimeType });

      // Share using Web Share API
      await navigator.share({
        title: `${contentData.brand} - ${contentData.platform}`,
        text: contentData.caption,
        files: [file]
      });

      toast.success("Compartilhado com sucesso!");
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        // User cancelled, don't show error
        return;
      }
      console.error('Erro ao compartilhar:', error);
      toast.error("Erro ao compartilhar. Tente copiar a legenda e baixar a mídia.");
    }
  };

  const handleOpenReview = () => {
    setReviewType(null);
    setShowReviewDialog(true);
    setReviewPrompt("");
  };

  const handleSubmitReview = async () => {
    if (!reviewPrompt.trim() || !contentData || !reviewType) return;

    // Check if needs to consume credits
    const needsCredit = freeRevisionsLeft === 0;
    if (needsCredit && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0)) {
      toast.error("Você não tem créditos de revisão disponíveis");
      return;
    }

    setIsReviewing(true);

    try {
      const newRevisionCount = totalRevisions + 1;
      const newFreeRevisionsLeft = Math.max(0, 2 - newRevisionCount);

      // Get original form data from localStorage
      const saved = JSON.parse(localStorage.getItem('currentContent') || '{}');
      const originalFormData = saved.originalFormData || {};

      // Update content based on review type
      const updatedContent = { ...contentData };
      
      if (reviewType === "caption") {
        // Regenerate caption with review feedback
        toast.info("Regenerando legenda com base no seu feedback...");
        
        const { data, error } = await supabase.functions.invoke('generate-caption', {
          body: {
            ...originalFormData,
            // Add review feedback to the additionalInfo
            additionalInfo: `${originalFormData.additionalInfo || ''}\n\nREVISÃO SOLICITADA: ${reviewPrompt}`
          }
        });

        if (error) {
          console.error("Erro ao regenerar legenda:", error);
          throw new Error("Falha ao regenerar legenda");
        }

        // Format caption with hashtags
        const formattedCaption = `${data.title}\n\n${data.body}\n\n${data.hashtags.map((tag: string) => `#${tag}`).join(' ')}`;
        updatedContent.caption = formattedCaption;
        
      } else {
        // Edit existing image with review feedback
        toast.info("Editando imagem com base no seu feedback...");
        
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            isEdit: true,
            existingImage: contentData.mediaUrl,
            description: reviewPrompt, // Just the review instructions
            brand: originalFormData.brand,
            platform: originalFormData.platform
          }
        });

        if (error) {
          console.error("Erro ao editar imagem:", error);
          throw new Error("Falha ao editar imagem");
        }

        updatedContent.mediaUrl = data.imageUrl;
      }

      setContentData(updatedContent);
      
      // Update localStorage
      const updatedSaved = {
        ...saved,
        ...updatedContent,
        revisions: [...(saved.revisions || []), {
          type: reviewType,
          prompt: reviewPrompt,
          timestamp: new Date().toISOString(),
          usedCredit: needsCredit
        }]
      };
      localStorage.setItem('currentContent', JSON.stringify(updatedSaved));
      
      // Update revision count
      const revisionsKey = `revisions_${saved.id}`;
      localStorage.setItem(revisionsKey, newRevisionCount.toString());
      
      setTotalRevisions(newRevisionCount);
      setFreeRevisionsLeft(newFreeRevisionsLeft);

      // Atualizar registro no histórico (tabela actions)
      if (saved.actionId) {
        const { error: updateError } = await supabase
          .from('actions')
          .update({
            revisions: newRevisionCount,
            result: {
              imageUrl: updatedContent.mediaUrl,
              title: updatedContent.title,
              body: updatedContent.caption?.split('\n\n')[1] || updatedContent.caption,
              hashtags: updatedContent.hashtags,
              feedback: reviewPrompt,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', saved.actionId);

        if (updateError) {
          console.error("Erro ao atualizar histórico:", updateError);
          // Não bloqueia o fluxo
        }
      }

      if (needsCredit) {
        toast.success("Revisão concluída! 1 crédito foi consumido.");
      } else {
        toast.success(`Revisão concluída! ${newFreeRevisionsLeft} revisão${newFreeRevisionsLeft !== 1 ? 'ões' : ''} gratuita${newFreeRevisionsLeft !== 1 ? 's' : ''} restante${newFreeRevisionsLeft !== 1 ? 's' : ''}.`);
      }

      setShowReviewDialog(false);
      setReviewPrompt("");
    } catch (error) {
      console.error("Erro ao processar revisão:", error);
      toast.error("Erro ao processar revisão. Tente novamente.");
    } finally {
      setIsReviewing(false);
    }
  };

  if (!contentData) {
    return null;
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-3 md:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/create")}
                className="rounded-xl hover:bg-background/50 lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 md:p-3">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                      Conteúdo Gerado
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      {contentData.brand} • {contentData.platform}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-2 px-3 py-1.5">
                  <RefreshCw className="h-3 w-3" />
                  {freeRevisionsLeft > 0 ? (
                    <span>{freeRevisionsLeft} revisões grátis</span>
                  ) : (
                    <span>{team?.credits?.contentReviews || 0} créditos</span>
                  )}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-2 px-3 py-1.5">
                  {contentData.type === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {contentData.type === "video" ? "Vídeo" : "Imagem"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Media Preview */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted/30 relative overflow-hidden">
                {contentData.type === "video" ? (
                  <video
                    src={contentData.mediaUrl}
                    controls
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                  >
                    Seu navegador não suporta vídeos.
                  </video>
                ) : (
                  <img
                    src={contentData.mediaUrl}
                    alt="Conteúdo gerado"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              {/* Action buttons */}
              <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-t border-border/20 flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1 rounded-xl gap-2 hover:scale-[1.02] transition-transform"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="rounded-xl hover:scale-105 transition-transform"
                  size="lg"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleOpenReview}
                  variant="secondary"
                  className="rounded-xl gap-2 hover:scale-105 transition-all hover:shadow-lg hover:shadow-primary/20 group"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Caption */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/20">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Legenda
                </h2>
                <Button
                  onClick={handleCopyCaption}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                  <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {contentData.caption}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/20 space-y-3">
                  <Button
                    onClick={() => navigate("/create")}
                    variant="outline"
                    className="w-full rounded-xl hover:scale-[1.02] transition-transform"
                    size="lg"
                  >
                    Criar Novo Conteúdo
                  </Button>
                  <Button
                    onClick={() => navigate("/history")}
                    variant="ghost"
                    className="w-full rounded-xl hover:scale-[1.02] transition-transform"
                    size="lg"
                  >
                    Ver Histórico
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {reviewType ? `Revisar ${reviewType === "image" ? (contentData?.type === "video" ? "Vídeo" : "Imagem") : "Legenda"}` : "Escolha o tipo de revisão"}
            </DialogTitle>
            <DialogDescription>
              {reviewType ? (
                <>
                  Descreva as alterações que deseja fazer.
                  {freeRevisionsLeft > 0 ? (
                    <span className="text-primary font-medium"> Você tem {freeRevisionsLeft} revisão{freeRevisionsLeft !== 1 ? 'ões' : ''} gratuita{freeRevisionsLeft !== 1 ? 's' : ''}.</span>
                  ) : (
                    <span className="text-orange-600 font-medium"> Esta revisão consumirá 1 crédito.</span>
                  )}
                </>
              ) : (
                "Selecione o que você deseja revisar neste conteúdo."
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!reviewType ? (
              <RadioGroup 
                onValueChange={(value) => setReviewType(value as "image" | "caption")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-primary/10 transition-all cursor-pointer group">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image" className="flex-1 cursor-pointer flex items-center gap-3">
                    {contentData?.type === "video" ? (
                      <Video className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    )}
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">Revisar {contentData?.type === "video" ? "Vídeo" : "Imagem"}</div>
                      <div className="text-sm text-muted-foreground">Alterar elementos visuais do conteúdo</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 hover:border-secondary hover:bg-secondary/10 transition-all cursor-pointer group">
                  <RadioGroupItem value="caption" id="caption" />
                  <Label htmlFor="caption" className="flex-1 cursor-pointer flex items-center gap-3">
                    <FileText className="h-5 w-5 text-secondary group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-semibold group-hover:text-secondary transition-colors">Revisar Legenda</div>
                      <div className="text-sm text-muted-foreground">Melhorar o texto e a mensagem</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            ) : (
              <>
                {freeRevisionsLeft === 0 && (
                  <Alert className="border-orange-500/50 bg-orange-500/10">
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm">
                      <span className="font-semibold text-orange-600">Atenção:</span> Esta revisão consumirá 1 crédito do seu plano.
                      {team?.credits?.contentReviews !== undefined && (
                        <span className="block mt-1 text-muted-foreground">
                          {team.credits.contentReviews > 0 ? (
                            <>Você tem {team.credits.contentReviews} crédito{team.credits.contentReviews !== 1 ? 's' : ''} disponível{team.credits.contentReviews !== 1 ? 'eis' : ''}.</>
                          ) : (
                            <span className="text-destructive font-medium">Você não tem créditos disponíveis. Faça upgrade do seu plano.</span>
                          )}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-prompt">O que você quer melhorar?</Label>
                  <Textarea
                    id="review-prompt"
                    placeholder={
                      reviewType === "image" 
                        ? "Ex: Deixar a imagem mais clara, mudar o fundo para azul..."
                        : "Ex: Tornar o texto mais persuasivo, adicionar emojis..."
                    }
                    value={reviewPrompt}
                    onChange={(e) => setReviewPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReviewType(null);
                      setReviewPrompt("");
                    }}
                    className="flex-1"
                    disabled={isReviewing}
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    className="flex-1 gap-2"
                    disabled={
                      !reviewPrompt.trim() || 
                      isReviewing || 
                      (freeRevisionsLeft === 0 && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0))
                    }
                  >
                    {isReviewing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Revisando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        {freeRevisionsLeft === 0 ? 'Confirmar e Usar Crédito' : 'Confirmar Revisão'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
