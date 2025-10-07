import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Copy, 
  Sparkles,
  ArrowLeft,
  Check,
  ImageIcon,
  Video,
  RefreshCw,
  FileText,
  Loader
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
import { ContentResultSkeleton } from "@/components/ContentResultSkeleton";

interface ContentResultData {
  type: "image" | "video";
  mediaUrl: string;
  caption?: string; // Opcional, para compatibilidade com formato antigo
  platform: string;
  brand: string;
  title?: string;
  body?: string; // Novo campo estruturado
  hashtags?: string[];
  originalFormData?: any;
  actionId?: string;
  isLocalFallback?: boolean; // Indica se usou fallback local
}

export default function ContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { team, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [contentData, setContentData] = useState<ContentResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewType, setReviewType] = useState<"image" | "caption" | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [freeRevisionsLeft, setFreeRevisionsLeft] = useState(2);
  const [totalRevisions, setTotalRevisions] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      // Limpar imagens antigas do sessionStorage (mais de 1 hora)
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('image_')) {
            const timestamp = parseInt(key.split('_')[1]);
            if (!isNaN(timestamp) && Date.now() - timestamp > 3600000) {
              sessionStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.error('Erro ao limpar sessionStorage:', error);
      }

      // Get data from navigation state
      if (location.state?.contentData) {
        const data = location.state.contentData;
        const contentId = `content_${Date.now()}`;
        
        // ✅ ETAPA 1: Definir contentData IMEDIATAMENTE (antes de qualquer validação)
        setContentData(data);
        setIsLoading(false);
        
        // Verificar se já foi salvo no histórico
        setIsSavedToHistory(!!data.actionId);
        
        // ✅ ETAPA 2: Salvar imagem no sessionStorage (não no localStorage)
        if (data.mediaUrl) {
          try {
            sessionStorage.setItem(`image_${contentId}`, data.mediaUrl);
          } catch (error) {
            if (error instanceof Error && error.name === 'QuotaExceededError') {
              console.warn('⚠️ Imagem muito grande para cache - continuando sem salvar');
            } else {
              console.error('Erro ao salvar imagem no sessionStorage:', error);
            }
          }
        }
        
        // ✅ ETAPA 3: Validar dados DEPOIS de definir o estado
        if (!data.mediaUrl || !data.caption) {
          toast.error("Dados incompletos, mas exibindo o que foi gerado");
        }
        
        // ✅ ETAPA 4: Criar sistema de versionamento
        const versionData = {
          version: 0,
          timestamp: new Date().toISOString(),
          caption: data.caption,
          title: data.title,
          hashtags: data.hashtags,
          type: data.type,
        };
        
        // ✅ ETAPA 5: Salvar metadados no localStorage (SEM base64)
        const savedContent = {
          id: contentId,
          type: data.type,
          platform: data.platform,
          brand: data.brand,
          caption: data.caption,
          title: data.title,
          hashtags: data.hashtags,
          originalFormData: data.originalFormData,
          actionId: data.actionId,
          createdAt: new Date().toISOString(),
          currentVersion: 0,
          versions: [versionData],
          savedToHistory: !!data.actionId
        };
        
        try {
          localStorage.setItem('currentContent', JSON.stringify(savedContent));
          // Também salvar versões separadamente para facilitar recuperação
          localStorage.setItem(`versions_${contentId}`, JSON.stringify([versionData]));
        } catch (error) {
          console.error('Erro ao salvar no localStorage:', error);
        }
        
        // Load revision count
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
          try {
            const parsed = JSON.parse(saved);
            
            // Verificar se já foi salvo no histórico
            setIsSavedToHistory(!!parsed.savedToHistory);
            
            // Tentar recuperar imagem do sessionStorage
            const imageUrl = sessionStorage.getItem(`image_${parsed.id}`);
            if (imageUrl) {
              parsed.mediaUrl = imageUrl;
            }
            
            setContentData(parsed);
            
            const revisionsKey = `revisions_${parsed.id}`;
            const savedRevisions = localStorage.getItem(revisionsKey);
            if (savedRevisions) {
              const count = parseInt(savedRevisions);
              setTotalRevisions(count);
              setFreeRevisionsLeft(Math.max(0, 2 - count));
            }
            
            setIsLoading(false);
          } catch (error) {
            console.error('Erro ao carregar conteúdo salvo:', error);
            toast.error("Erro ao carregar conteúdo");
            navigate("/create");
          }
        } else {
          toast.error("Nenhum conteúdo encontrado");
          navigate("/create");
        }
      }
    };
    
    loadContent();
  }, [location.state, navigate]);

  const handleCopyCaption = async () => {
    if (!contentData) return;
    
    try {
      // Verificar se os dados estão estruturados (novo formato)
      const captionText = contentData.title && contentData.body && contentData.hashtags
        ? `${contentData.title}\n\n${contentData.body}\n\n${contentData.hashtags.map((tag: string) => `#${tag}`).join(" ")}`
        : contentData.caption || ""; // Fallback para formato antigo
      
      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      toast.success("Legenda completa copiada!", {
        description: "Título, texto e hashtags copiados para a área de transferência.",
      });
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


  const handleOpenReview = () => {
    setReviewType(null);
    setShowReviewDialog(true);
    setReviewPrompt("");
  };

  const handleSubmitReview = async () => {
    if (!reviewPrompt.trim() || !contentData || !reviewType) return;

    // Check if user can still review
    const needsCredit = freeRevisionsLeft === 0;
    
    // Bloquear se não tem revisões gratuitas E não tem créditos
    if (needsCredit && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0)) {
      toast.error("Você não tem créditos de revisão disponíveis");
      return;
    }

    setIsReviewing(true);

    try {
      const newRevisionCount = totalRevisions + 1;
      const newFreeRevisionsLeft = Math.max(0, freeRevisionsLeft - 1);

      // Get original form data from localStorage
      const saved = JSON.parse(localStorage.getItem('currentContent') || '{}');
      const originalFormData = saved.originalFormData || {};

      // Update content based on review type
      const updatedContent = { ...contentData };
      
      if (reviewType === "caption") {
        // Revise caption using OpenAI gpt-4o-mini
        toast.info("Revisando legenda com base no seu feedback...");
        
        const { data, error } = await supabase.functions.invoke('revise-caption-openai', {
          body: {
            prompt: reviewPrompt,
            originalTitle: contentData.title || "",
            originalBody: contentData.body || contentData.caption?.split('\n\n')[1] || "",
            originalHashtags: contentData.hashtags || [],
            brand: originalFormData.brand || contentData.brand,
            theme: originalFormData.theme || "",
            brandId: originalFormData.brandId
          }
        });

        if (error) {
          console.error("Erro ao revisar legenda:", error);
          throw new Error(error.message || "Falha ao revisar legenda");
        }

        if (!data.title || !data.body || !data.hashtags) {
          throw new Error("Resposta inválida da revisão de legenda");
        }

        // Format caption with hashtags
        const formattedCaption = `${data.title}\n\n${data.body}\n\n${data.hashtags.map((tag: string) => `#${tag}`).join(' ')}`;
        updatedContent.caption = formattedCaption;
        updatedContent.title = data.title;
        updatedContent.body = data.body;
        updatedContent.hashtags = data.hashtags;
        
      } else {
        // Edit existing image with AI-powered editing
        toast.info("Editando imagem com base no seu feedback...");
        
        try {
          console.log('🤖 Enviando requisição para edit-image:', {
            hasPrompt: !!reviewPrompt,
            hasImageUrl: !!contentData.mediaUrl,
            hasBrandId: !!originalFormData.brandId,
            hasThemeId: !!originalFormData.themeId
          });

          const { data, error } = await supabase.functions.invoke('edit-image', {
            body: {
              reviewPrompt,
              imageUrl: contentData.mediaUrl,
              brandId: originalFormData.brandId,
              themeId: originalFormData.themeId || null
            }
          });

          console.log('📡 Resposta recebida de edit-image:', {
            hasData: !!data,
            hasError: !!error,
            editedImageUrl: data?.editedImageUrl,
            errorMessage: error?.message
          });

          if (error) {
            console.error("❌ Erro ao editar imagem:", error);
            throw new Error(error.message || "Falha ao editar imagem");
          }

          if (!data?.editedImageUrl) {
            console.error("❌ URL da imagem editada não foi retornada");
            throw new Error("Imagem editada não foi retornada");
          }

          // Validate URL format
          if (!data.editedImageUrl.startsWith('http')) {
            console.error("❌ URL da imagem inválida:", data.editedImageUrl);
            throw new Error("URL da imagem editada é inválida");
          }

          // Add timestamp to prevent caching
          const timestamp = Date.now();
          const imageUrlWithTimestamp = `${data.editedImageUrl}?t=${timestamp}`;
          
          updatedContent.mediaUrl = imageUrlWithTimestamp;
          console.log('✅ Imagem editada atualizada com sucesso:', imageUrlWithTimestamp);
          
        } catch (error) {
          console.error("❌ Erro ao editar imagem:", error);
          throw new Error(error instanceof Error ? error.message : "Falha ao editar imagem");
        }
      }

      // Force update by creating a completely new object
      const newContentData = {
        ...updatedContent,
        mediaUrl: updatedContent.mediaUrl, // Ensure the new URL is used
        _updateKey: Date.now() // Add unique key to force re-render
      };

      setContentData(newContentData);
      
      // Update sessionStorage with new image (se foi editada)
      if (reviewType === "image" && updatedContent.mediaUrl) {
        try {
          sessionStorage.setItem(`image_${saved.id}`, updatedContent.mediaUrl);
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.warn('⚠️ Imagem muito grande para cache');
          }
        }
      }
      
      // Criar nova versão
      const newVersion = {
        version: newRevisionCount,
        timestamp: new Date().toISOString(),
        caption: updatedContent.caption,
        title: updatedContent.title,
        hashtags: updatedContent.hashtags,
        type: reviewType,
        reviewPrompt,
        usedCredit: needsCredit
      };
      
      // Atualizar versões
      const currentVersions = saved.versions || [];
      const updatedVersions = [...currentVersions, newVersion];
      
      // Update localStorage (sem base64)
      const updatedSaved = {
        ...saved,
        type: updatedContent.type,
        platform: updatedContent.platform,
        brand: updatedContent.brand,
        caption: updatedContent.caption,
        title: updatedContent.title,
        hashtags: updatedContent.hashtags,
        currentVersion: newRevisionCount,
        versions: updatedVersions,
        revisions: [...(saved.revisions || []), {
          type: reviewType,
          prompt: reviewPrompt,
          timestamp: new Date().toISOString(),
          usedCredit: needsCredit
        }]
      };
      
      try {
        localStorage.setItem('currentContent', JSON.stringify(updatedSaved));
        localStorage.setItem(`versions_${saved.id}`, JSON.stringify(updatedVersions));
      } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
      }
      
      // Update revision count
      const revisionsKey = `revisions_${saved.id}`;
      localStorage.setItem(revisionsKey, newRevisionCount.toString());
      
      setTotalRevisions(newRevisionCount);
      setFreeRevisionsLeft(newFreeRevisionsLeft);

      // Atualizar registro no histórico (tabela actions) se já estiver salvo
      if (saved.actionId && saved.savedToHistory) {
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

  const handleSaveToHistory = async () => {
    if (!contentData || !team || !user) return;
    
    if (isSavedToHistory) {
      toast.info("Este conteúdo já foi salvo no histórico");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get saved content metadata
      const saved = JSON.parse(localStorage.getItem('currentContent') || '{}');
      
      // Get brand_id from originalFormData if it exists, otherwise set to null
      let brandId = null;
      if (saved.originalFormData?.brandId) {
        brandId = saved.originalFormData.brandId;
      }
      
      // Determinar o tipo de ação baseado na origem do conteúdo
      let actionType: 'CRIAR_CONTEUDO' | 'CRIAR_CONTEUDO_RAPIDO' | 'GERAR_VIDEO' = 'CRIAR_CONTEUDO_RAPIDO';
      
      // Se for vídeo
      if (contentData.type === "video") {
        actionType = 'GERAR_VIDEO';
      } 
      // Se tem dados completos de criação (brand, objective, etc) = CRIAR_CONTEUDO
      else if (saved.originalFormData?.objective && saved.originalFormData?.description && saved.originalFormData?.tone) {
        actionType = 'CRIAR_CONTEUDO';
      }
      // Caso contrário (apenas prompt simples) = CRIAR_CONTEUDO_RAPIDO
      
      // Criar registro no histórico
      const { data: actionData, error: actionError } = await supabase
        .from('actions')
        .insert({
          type: actionType,
          brand_id: brandId,
          team_id: user.teamId,
          user_id: user.id,
          status: 'Concluído',
          approved: false,
          revisions: totalRevisions,
          details: {
            prompt: saved.originalFormData?.description || saved.originalFormData?.prompt || contentData.caption,
            objective: saved.originalFormData?.objective,
            platform: contentData.platform,
            tone: saved.originalFormData?.tone,
            brand: saved.originalFormData?.brand || contentData.brand,
            theme: saved.originalFormData?.theme,
            persona: saved.originalFormData?.persona,
            additionalInfo: saved.originalFormData?.additionalInfo,
            versions: saved.versions || [],
          },
          result: {
            imageUrl: contentData.mediaUrl,
            title: contentData.title,
            body: contentData.caption?.split('\n\n')[1] || contentData.caption,
            hashtags: contentData.hashtags,
          }
        })
        .select()
        .single();

      if (actionError) {
        console.error("Erro ao salvar no histórico:", actionError);
        throw new Error("Erro ao salvar no histórico");
      }

      // Atualizar localStorage com actionId
      const updatedSaved = {
        ...saved,
        actionId: actionData.id,
        savedToHistory: true
      };
      
      localStorage.setItem('currentContent', JSON.stringify(updatedSaved));
      
      // Atualizar estado
      setContentData({ ...contentData, actionId: actionData.id });
      setIsSavedToHistory(true);
      
      toast.success("Conteúdo salvo no histórico com sucesso!");
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar no histórico. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !contentData) {
    return <ContentResultSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in">
        
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-scale-in">
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            {/* Mobile Layout */}
            <div className="flex sm:hidden flex-col gap-3">
              {/* Top row: Back button, icon, title, badges */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/create")}
                  className="rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent hover-scale transition-all duration-200 h-9 w-9 flex-shrink-0 hover:shadow-md hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-foreground leading-tight">
                    Conteúdo Gerado
                  </h1>
                  <p className="text-muted-foreground text-xs leading-tight truncate">
                    {contentData.brand} • {contentData.platform}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-1 px-2 py-1 text-xs h-7">
                    <RefreshCw className="h-3 w-3" />
                    <span>{freeRevisionsLeft > 0 ? freeRevisionsLeft : team?.credits?.contentReviews || 0}</span>
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 p-1.5 h-7 w-7 flex items-center justify-center">
                    {contentData.type === "video" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Desktop/Tablet Layout */}
            <div className="hidden sm:flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/create")}
                  className="rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent hover-scale transition-all duration-200 flex-shrink-0 hover:shadow-md hover:text-primary"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5 lg:p-3">
                    <Sparkles className="h-5 w-5 lg:h-6 lg:w-6 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                      Conteúdo Gerado
                    </h1>
                    <p className="text-muted-foreground text-sm truncate">
                      {contentData.brand} • {contentData.platform}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/30 gap-2 px-3 py-1.5 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {freeRevisionsLeft > 0 ? (
                      <>{freeRevisionsLeft} revisões grátis</>
                    ) : (
                      <>{team?.credits?.contentReviews || 0} créditos</>
                    )}
                  </span>
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-2 px-3 py-1.5 text-xs">
                  {contentData.type === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  <span>{contentData.type === "video" ? "Vídeo" : "Imagem"}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
          
          {/* Media Preview */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl sm:rounded-2xl overflow-hidden animate-fade-in hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-0">
              <div className="aspect-square max-h-[500px] sm:max-h-[600px] md:max-h-[700px] bg-muted/30 relative overflow-hidden group mx-auto">
                {contentData.mediaUrl ? (
                  contentData.type === "video" ? (
                    <video
                      src={contentData.mediaUrl}
                      controls
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      autoPlay
                      loop
                      muted
                    >
                      Seu navegador não suporta vídeos.
                    </video>
                  ) : (
                    <img
                      key={contentData.mediaUrl} // Force re-render when URL changes
                      src={contentData.mediaUrl}
                      alt="Conteúdo gerado"
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-sm sm:text-base text-muted-foreground">Imagem não disponível</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              {/* Action buttons */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-t border-border/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1 rounded-xl gap-2 hover-scale transition-all duration-200 hover:shadow-md"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden xs:inline">Download</span>
                </Button>
                <div className="relative group">
                  <Button
                    onClick={handleOpenReview}
                    variant="secondary"
                    className="w-full flex-1 sm:flex-initial rounded-xl gap-2 hover-scale transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 group"
                    size="lg"
                    disabled={freeRevisionsLeft === 0 && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0)}
                  >
                    <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="sm:hidden">Revisar</span>
                    {freeRevisionsLeft > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 bg-primary/20 text-primary border-primary/30">
                        {freeRevisionsLeft}
                      </Badge>
                    )}
                  </Button>
                  {freeRevisionsLeft === 0 && (!team?.credits?.contentReviews || team.credits.contentReviews <= 0) && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      Sem créditos disponíveis
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caption */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-xl sm:rounded-2xl animate-fade-in hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/20">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Legenda
                </h2>
                <Button
                  onClick={handleCopyCaption}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 hover-scale transition-all duration-200 hover:bg-accent/20 hover:text-accent hover:border-accent"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500 animate-scale-in" />
                      <span className="hidden sm:inline">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 sm:p-5 min-h-[250px] max-h-[500px] overflow-y-auto backdrop-blur-sm">
                  {contentData.title && contentData.body && contentData.hashtags ? (
                    // Novo formato estruturado
                    <>
                      {/* Título da Legenda */}
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-3">
                        {contentData.title}
                        {contentData.isLocalFallback && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Padrão
                          </Badge>
                        )}
                      </h3>
                      
                      {/* Corpo da Legenda */}
                      <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {contentData.body}
                      </p>
                      
                      {/* Hashtags */}
                      <div className="mt-4 pt-4 border-t border-border/20">
                        <div className="flex flex-wrap gap-2">
                          {contentData.hashtags.map((tag, index) => (
                            <span 
                              key={index}
                              className="text-xs sm:text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-md"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Formato antigo (compatibilidade)
                    <>
                      {contentData.title && (
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-3">
                          {contentData.title}
                        </h3>
                      )}
                      
                      <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {contentData.caption}
                      </p>
                      
                      {contentData.hashtags && contentData.hashtags.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/20">
                          <div className="flex flex-wrap gap-2">
                            {contentData.hashtags.map((tag, index) => (
                              <span 
                                key={index}
                                className="text-xs sm:text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-3 sm:pt-4 border-t border-border/20 space-y-2 sm:space-y-3">
                  {!isSavedToHistory && (
                    <Button
                      onClick={handleSaveToHistory}
                      disabled={isSaving}
                      className="w-full rounded-xl hover-scale transition-all duration-200 hover:shadow-lg gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-sm sm:text-base"
                      size="lg"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span className="hidden xs:inline">Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span className="hidden xs:inline">Salvar no Histórico</span>
                          <span className="xs:hidden">Salvar</span>
                        </>
                      )}
                    </Button>
                  )}
                  
                  {isSavedToHistory && contentData.actionId && (
                    <Button
                      onClick={() => navigate(`/history/${contentData.actionId}`)}
                      variant="default"
                      className="w-full rounded-xl hover-scale transition-all duration-200 gap-2 text-sm sm:text-base"
                      size="lg"
                    >
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="hidden sm:inline">Salvo no Histórico - Ver Detalhes</span>
                      <span className="sm:hidden">Ver no Histórico</span>
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => navigate("/create")}
                    variant="outline"
                    className="w-full rounded-xl hover-scale transition-all duration-200 hover:shadow-md hover:bg-accent/20 hover:text-accent hover:border-accent text-sm sm:text-base"
                    size="lg"
                  >
                    Criar Novo Conteúdo
                  </Button>
                  <Button
                    onClick={() => navigate("/history")}
                    variant="ghost"
                    className="w-full rounded-xl hover-scale transition-all duration-200 text-sm sm:text-base"
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="truncate">{reviewType ? `Revisar ${reviewType === "image" ? (contentData?.type === "video" ? "Vídeo" : "Imagem") : "Legenda"}` : "Escolha o tipo de revisão"}</span>
            </DialogTitle>
            <DialogDescription>
              {reviewType ? (
                <>
                  Descreva as alterações que deseja fazer.
                  {freeRevisionsLeft > 0 ? (
                    <span className="text-primary font-medium"> {freeRevisionsLeft} revisão(ões) gratuita(s) restante(s).</span>
                  ) : team?.credits?.contentReviews && team.credits.contentReviews > 0 ? (
                    <span className="text-orange-600 font-medium"> Esta revisão consumirá 1 crédito. Você tem {team.credits.contentReviews} crédito(s).</span>
                  ) : (
                    <span className="text-destructive font-medium"> Sem créditos disponíveis para revisão.</span>
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
                {freeRevisionsLeft > 0 && (
                  <Alert className="border-primary/50 bg-primary/10">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      <span className="font-semibold text-primary">Revisão Gratuita:</span> Você tem {freeRevisionsLeft} revisão{freeRevisionsLeft !== 1 ? 'ões' : ''} gratuita{freeRevisionsLeft !== 1 ? 's' : ''} disponível{freeRevisionsLeft !== 1 ? 'eis' : ''} para este conteúdo.
                    </AlertDescription>
                  </Alert>
                )}
                
                {freeRevisionsLeft === 0 && (
                  <Alert className="border-orange-500/50 bg-orange-500/10">
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm">
                      <span className="font-semibold text-orange-600">Atenção:</span> Revisões gratuitas esgotadas. Esta revisão consumirá 1 crédito do seu plano.
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
