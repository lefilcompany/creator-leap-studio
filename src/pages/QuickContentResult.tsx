import { useEffect, useState, useRef, useCallback } from "react";
import { CreationFeedback } from "@/components/CreationFeedback";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Download, Copy, Check, Maximize2, RefreshCw, Undo2, Zap,
  Coins, Building2, Palette, User, Share2, History, Pen,
  ChevronDown, AlertTriangle, Info, X, Plus, Sparkles,
  Users, Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import createBanner from "@/assets/create-banner.jpg";
import { cn } from "@/lib/utils";
import { ComplianceAlert, type ComplianceData } from "@/components/ComplianceAlert";

function PlatformIcon({ platform, className = "h-3.5 w-3.5" }: { platform: string; className?: string }) {
  switch (platform) {
    case 'Instagram':
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#E4405F]")}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>);
    case 'Facebook':
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#1877F2]")}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);
    case 'LinkedIn':
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#0A66C2]")}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>);
    case 'TikTok':
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-foreground")}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>);
    case 'Twitter/X':
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-foreground")}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>);
    case 'Comunidades':
      return <Users className={cn(className, "text-secondary")} />;
    default:
      return <Globe className={cn(className, "text-muted-foreground")} />;
  }
}

export default function QuickContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUserCredits } = useAuth();
  const [isCopied, setIsCopied] = useState(false);
  const [isImageCopied, setIsImageCopied] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [totalRevisions, setTotalRevisions] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isPromptTruncated, setIsPromptTruncated] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const promptRef = useRef<HTMLParagraphElement>(null);

  const { imageUrl, description, actionId, prompt, brandName, themeName, personaName, platform, headline, subtexto, legenda, cta, hashtags, complianceCheck } = location.state || {};

  const checkTruncation = useCallback(() => {
    if (promptRef.current) {
      setIsPromptTruncated(promptRef.current.scrollHeight > promptRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [checkTruncation, prompt]);
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
        keysToRemove.forEach(key => localStorage.removeItem(key));
      };
      cleanupOldHistories();

      const contentId = `quick_content_${actionId || Date.now()}`;
      const savedRevisions = localStorage.getItem(`revisions_${contentId}`);
      if (savedRevisions) setTotalRevisions(parseInt(savedRevisions));

      const savedHistory = localStorage.getItem(`image_history_${contentId}`);
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
      toast.error("Não há ajustes para reverter");
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
    toast.success("Ajuste revertido com sucesso!");
  };

  const handleSubmitReview = async () => {
    if (!reviewPrompt.trim()) {
      toast.error("Digite o que você gostaria de alterar na imagem");
      return;
    }
    if (!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW) {
      toast.error(`Créditos insuficientes. Cada ajuste custa ${CREDIT_COSTS.IMAGE_REVIEW} créditos.`);
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

      toast.success("Ajuste concluído! 1 crédito foi consumido.");
      setShowReviewDialog(false);
      setReviewPrompt("");
    } catch (error) {
      console.error("Erro ao ajustar imagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao ajustar imagem");
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
    const keys = [
      'prompt', 'brandId', 'themeId', 'personaId', 'platform',
      'aspectRatio', 'visualStyle', 'style', 'quality',
      'colorPalette', 'lighting', 'composition', 'cameraAngle',
      'mood', 'width', 'height'
    ];
    keys.forEach(k => { if (originalFormData[k]) prefillData[k] = originalFormData[k]; });
    if (!prefillData.prompt && prompt) prefillData.prompt = prompt;
    navigate("/quick-content", { state: { prefillData } });
    toast.warning("Se você usou imagens de referência, lembre-se de anexá-las novamente.", { duration: 6000 });
  };

  if (!imageUrl) return null;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      {/* Banner */}
      <div className="relative h-20 md:h-24 overflow-hidden">
        <PageBreadcrumb
          items={[
            { label: "Criar Conteúdo", href: "/create" },
            { label: "Criação Rápida", href: "/quick-content" },
            { label: "Resultado" },
          ]}
          variant="overlay"
        />
        <img src={createBanner} alt="Resultado" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card + Progress Bar */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-stretch gap-3">
          {/* Title card */}
          <div className="bg-card rounded-2xl shadow-lg p-2.5 lg:p-3 flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
              <Zap className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">Resultado da Geração</h1>
              <p className="text-muted-foreground text-[11px] lg:text-xs">Confira o conteúdo gerado com IA</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl px-3 py-1.5 flex-shrink-0 border border-primary/20">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-1.5">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.credits || 0}</span>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Créditos</span>
            </div>
          </div>

          {/* Progress bar card */}
          <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4 flex-shrink-0 flex items-center min-w-[320px]">
            <CreationProgressBar currentStep="result" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Card - Left column, sticky on desktop */}
            <div className="lg:sticky lg:top-4 lg:self-start order-1 lg:order-2">
              <Card className="bg-card border-0 shadow-xl rounded-2xl overflow-hidden animate-fade-in group relative">
                <div className="relative bg-muted/20">
                  <img
                    src={currentImageUrl}
                    alt="Conteúdo gerado"
                    className="w-full max-h-[80vh] object-contain"
                    key={currentImageUrl}
                  />

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-foreground shadow-lg gap-2 rounded-xl backdrop-blur-sm"
                      onClick={() => setIsImageDialogOpen(true)}
                    >
                      <Maximize2 className="h-4 w-4" />
                      Ampliar
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-foreground shadow-lg gap-2 rounded-xl backdrop-blur-sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Revert bar */}
                {totalRevisions > 0 && (
                  <div className="p-3 bg-muted/20 border-t border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <History className="h-3 w-3" />
                      <span>{totalRevisions} ajuste{totalRevisions !== 1 ? "s" : ""}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRevert} disabled={imageHistory.length <= 1} className="gap-1.5 text-xs rounded-lg">
                      <Undo2 className="h-3.5 w-3.5" />
                      Reverter
                    </Button>
                  </div>
                )}

                {/* Feedback */}
                <div className="p-3 bg-muted/10 border-t border-border/20">
                  <CreationFeedback
                    actionId={actionId}
                    brandId={originalFormData.brandId}
                    imageUrl={currentImageUrl}
                  />
                </div>
              </Card>
            </div>

            {/* Right column - Info */}
            <div className="space-y-5 order-2 lg:order-1">
              {/* Success Title */}
              <h2 className="font-bold leading-tight text-4xl">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-bold text-3xl">
                  Imagem gerada{"\n"}com sucesso!
                </span>
              </h2>

              {/* Prompt Used */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Prompt utilizado:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <span className="relative h-4 w-4">
                        <Copy className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${isCopied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                        <Check className={`h-4 w-4 absolute inset-0 text-green-500 transition-all duration-300 ${isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                      </span>
                      {isCopied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
                <div className="backdrop-blur-2xl bg-gradient-to-br from-primary/[0.04] via-white/[0.06] to-accent/[0.04] rounded-2xl p-4 border border-primary/[0.12] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                  <p
                    ref={promptRef}
                    className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all duration-300 ${!isPromptExpanded ? 'line-clamp-3' : ''}`}
                  >
                    {prompt}
                  </p>
                  {isPromptTruncated && (
                    <button
                      onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                      className="text-sm font-medium text-primary hover:text-primary/80 mt-2 transition-colors"
                    >
                      {isPromptExpanded ? "Ler menos" : "Ler mais"}
                    </button>
                  )}
                </div>
              </div>

              {/* Legenda sugerida */}
              {(headline || legenda || cta || (hashtags && hashtags.length > 0)) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Legenda sugerida</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const parts = [headline, legenda, cta, hashtags?.join(' ')].filter(Boolean);
                          await navigator.clipboard.writeText(parts.join('\n\n'));
                          toast.success("Legenda copiada!");
                        } catch {
                          toast.error("Erro ao copiar legenda");
                        }
                      }}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar tudo
                    </Button>
                  </div>
                  <div className="backdrop-blur-2xl bg-gradient-to-br from-primary/[0.04] via-white/[0.06] to-accent/[0.04] rounded-2xl p-4 border border-primary/[0.12] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)] space-y-3">
                    {headline && <p className="font-semibold text-foreground text-base leading-snug">{headline}</p>}
                    {legenda && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{legenda}</p>}
                    {cta && <p className="text-sm font-medium text-primary">{cta}</p>}
                    {hashtags && hashtags.length > 0 && <p className="text-sm text-muted-foreground">{hashtags.join(' ')}</p>}
                  </div>
                </div>
              )}

              {/* Configurations Used - Collapsible */}
              {(brandName || themeName || personaName || platform) && (
                <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-sm font-semibold text-foreground py-2 border-b border-border/30 hover:text-primary transition-colors">
                      <span>Configurações utilizadas</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="flex flex-wrap gap-2">
                      {platform && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-primary/[0.06] via-white/[0.08] to-accent/[0.06] border border-primary/20 text-foreground/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <PlatformIcon platform={platform} />{platform}
                        </span>
                      )}
                      {brandName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-primary/[0.1] via-white/[0.08] to-secondary/[0.06] border border-primary/25 text-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <Building2 className="h-3.5 w-3.5" />{brandName}
                        </span>
                      )}
                      {themeName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-accent/[0.1] via-white/[0.08] to-primary/[0.06] border border-accent/25 text-accent shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <Palette className="h-3.5 w-3.5" />{themeName}
                        </span>
                      )}
                      {personaName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-secondary/[0.1] via-white/[0.08] to-primary/[0.06] border border-secondary/25 text-secondary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <User className="h-3.5 w-3.5" />{personaName}
                        </span>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Report problem link */}
              <button
                onClick={() => setShowReportDialog(true)}
                className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Reportar problema com geração
              </button>

              {/* Category badges placeholder */}
              {actionId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>Ação salva no histórico</span>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate('/history')}>
                    Ver detalhes
                  </Button>
                </div>
              )}

              {/* Action Buttons - matching reference */}
              <div className="flex flex-row gap-2 pt-2 w-full md:flex-col md:w-1/2">
                <Button
                  onClick={handleOpenReview}
                  size="default"
                  className="relative overflow-hidden bg-accent/20 hover:bg-accent/25 border border-accent/30 text-accent rounded-xl gap-2 h-10 w-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700 before:ease-in-out"
                  disabled={!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW}
                >
                  <Pen className="h-4 w-4" />
                  Corrigir
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="default"
                      className="relative overflow-hidden bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-white rounded-xl gap-2 h-10 w-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700 before:ease-in-out"
                    >
                      <Plus className="h-4 w-4" />
                      Criar outro
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-60 p-1.5">
                    <DropdownMenuItem onClick={handleReusePrompt} className="gap-3 py-3.5 px-3 cursor-pointer rounded-lg focus:bg-primary/10 hover:bg-primary/10 data-[highlighted]:bg-primary/10 focus:text-foreground data-[highlighted]:text-foreground">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/15 shrink-0">
                        <RefreshCw className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">Mesmo prompt</span>
                        <span className="text-xs text-muted-foreground">Reutilizar as configurações atuais</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/quick-content")} className="gap-3 py-3.5 px-3 cursor-pointer rounded-lg focus:bg-muted hover:bg-muted data-[highlighted]:bg-muted focus:text-foreground data-[highlighted]:text-foreground">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">Começar do zero</span>
                        <span className="text-xs text-muted-foreground">Criar com novas configurações</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={(open) => { setIsImageDialogOpen(open); if (!open) setIsImageCopied(false); }}>
        <DialogContent className="max-w-[92vw] max-h-[92vh] w-auto h-auto p-0 overflow-hidden border-0 bg-black/95 [&>button]:hidden rounded-xl [&>div:first-child]:p-0 [&>div:first-child]:overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da Imagem</DialogTitle>
            <DialogDescription>Imagem ampliada do conteúdo gerado</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            <div className="flex items-center justify-end gap-1.5 px-3 py-2 shrink-0">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 rounded-lg gap-1 transition-all duration-300 h-7 px-2 text-xs"
              >
                <Download className="h-3 w-3" />
                Baixar
              </Button>
              <Button
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(currentImageUrl);
                    const blob = await response.blob();
                    await navigator.clipboard.write([
                      new ClipboardItem({ [blob.type]: blob })
                    ]);
                    setIsImageCopied(true);
                    setTimeout(() => setIsImageCopied(false), 2000);
                  } catch {
                    toast.error("Não foi possível copiar a imagem");
                  }
                }}
                className={`backdrop-blur-md border border-white/20 rounded-lg gap-1 transition-all duration-300 h-7 px-2 text-xs ${isImageCopied ? 'bg-green-500/30 hover:bg-green-500/40 text-green-300' : 'bg-white/15 hover:bg-white/25 text-white'}`}
              >
                <span className="relative h-3 w-3">
                  <Copy className={`h-3 w-3 absolute inset-0 transition-all duration-300 ${isImageCopied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                  <Check className={`h-3 w-3 absolute inset-0 transition-all duration-300 ${isImageCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                </span>
                {isImageCopied ? "Copiado!" : "Copiar"}
              </Button>
              <button
                onClick={() => setIsImageDialogOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all duration-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center justify-center px-3 pb-3">
              <img src={currentImageUrl} alt="Conteúdo gerado ampliado" className="max-w-[88vw] max-h-[calc(92vh-52px)] object-contain rounded-lg" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />Ajustar Imagem
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Descreva o que você gostaria de alterar na imagem. A IA preservará a imagem original, modificando apenas o que você solicitar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <Alert>
              <AlertDescription className="text-xs sm:text-sm">
                Este ajuste consumirá <strong>{CREDIT_COSTS.IMAGE_REVIEW} créditos</strong>.
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
                   <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Ajustando...</>
                 ) : (
                   <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Ajustar<Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 gap-1"><Coins className="h-3 w-3" />{CREDIT_COSTS.IMAGE_REVIEW}</Badge></>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Problem Dialog */}
      <ReportProblemDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        actionId={actionId}
        actionType="CRIAR_CONTEUDO_RAPIDO"
        generatedImageUrl={currentImageUrl}
      />
    </div>
  );
}
