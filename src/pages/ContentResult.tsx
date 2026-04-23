import { useEffect, useState, useRef, useCallback } from "react";
import { CreationFeedback } from "@/components/CreationFeedback";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Download, Copy, Sparkles, Check, ImageIcon, Video, RefreshCw, FileText,
  Loader, Coins, Undo2, Redo2, History, AlertTriangle, Maximize2, Pen,
  Plus, ChevronDown, X, Share2, Building2, Palette, User, Zap, Info, Globe, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import createBanner from "@/assets/create-banner.jpg";
import { ComplianceAlert, type ComplianceData } from "@/components/ComplianceAlert";
import { TextOverlayEditor, type TextLayer } from "@/components/TextOverlayEditor";

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

interface ContentResultData {
  type: "image" | "video";
  mediaUrl: string;
  caption?: string;
  platform: string;
  brand: string;
  title?: string;
  body?: string;
  hashtags?: string[];
  originalFormData?: any;
  actionId?: string;
  isLocalFallback?: boolean;
  isProcessing?: boolean;
  categoryId?: string;
  complianceCheck?: ComplianceData;
}

export default function ContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    refreshUserCredits
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isImageCopied, setIsImageCopied] = useState(false);
  const [contentData, setContentData] = useState<ContentResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewType, setReviewType] = useState<"image" | "caption" | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [totalRevisions, setTotalRevisions] = useState(0);
  
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [textOverlayLayers, setTextOverlayLayers] = useState<TextLayer[] | undefined>(undefined);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isCaptionTruncated, setIsCaptionTruncated] = useState(false);
  const captionRef = useRef<HTMLParagraphElement>(null);

  const checkTruncation = useCallback(() => {
    if (captionRef.current) {
      setIsCaptionTruncated(captionRef.current.scrollHeight > captionRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [checkTruncation, contentData]);

  // Auto-save to history (like QuickContentResult)
  const autoSaveToHistoryRef = useRef<((data: ContentResultData) => Promise<void>) | null>(null);
  autoSaveToHistoryRef.current = async (data: ContentResultData) => {
    if (!user || data.actionId || isSavedToHistory) return;
    
    try {
      const saved = JSON.parse(localStorage.getItem("currentContent") || "{}");
      
      let brandId = null;
      if (saved.originalFormData?.brandId || data.originalFormData?.brandId) {
        brandId = saved.originalFormData?.brandId || data.originalFormData?.brandId;
      }

      let actionType: "CRIAR_CONTEUDO" | "CRIAR_CONTEUDO_RAPIDO" | "GERAR_VIDEO" = "CRIAR_CONTEUDO_RAPIDO";
      const formData = saved.originalFormData || data.originalFormData || {};
      if (data.type === "video") {
        actionType = "GERAR_VIDEO";
      } else if (formData.objective && formData.description && formData.tone) {
        actionType = "CRIAR_CONTEUDO";
      }

      const { data: actionData, error: actionError } = await supabase.from("actions").insert({
        type: actionType,
        brand_id: brandId,
        team_id: user.teamId,
        user_id: user.id,
        status: "Concluído",
        approved: false,
        revisions: 0,
        details: {
          prompt: formData.description || formData.prompt || data.caption,
          objective: formData.objective,
          platform: data.platform,
          tone: formData.tone,
          brand: formData.brand || data.brand,
          theme: formData.theme,
          persona: formData.persona,
          additionalInfo: formData.additionalInfo,
          versions: saved.versions || []
        },
        result: {
          imageUrl: data.mediaUrl,
          title: data.title,
          body: data.body || data.caption,
          hashtags: data.hashtags
        }
      }).select().single();

      if (actionError) {
        console.error("Erro ao salvar automaticamente:", actionError);
        return;
      }

      // Update local state
      const updatedData = { ...data, actionId: actionData.id };
      setContentData(updatedData);
      setIsSavedToHistory(true);

      // Update localStorage
      const updatedSaved = { ...saved, actionId: actionData.id, savedToHistory: true };
      localStorage.setItem("currentContent", JSON.stringify(updatedSaved));

      // Assign category if exists
      const categoryId = data.categoryId || saved.categoryId;
      if (categoryId && actionData.id) {
        try {
          await supabase.from('action_category_items').insert({
            category_id: categoryId,
            action_id: actionData.id,
            added_by: user.id,
          });
        } catch (e) {
          console.error("Erro ao atribuir categoria:", e);
        }
      }
    } catch (error) {
      console.error("Erro no auto-save:", error);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        // Clean old sessionStorage images
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith("image_")) {
            const timestamp = parseInt(key.split("_")[1]);
            if (!isNaN(timestamp) && Date.now() - timestamp > 3600000) {
              sessionStorage.removeItem(key);
            }
          }
        });
        // Clean old versions_* localStorage entries to prevent QuotaExceeded
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("versions_content_") || key.startsWith("revisions_content_")) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error("Erro ao limpar storage:", error);
      }

      if (location.state?.contentData) {
        const data = location.state.contentData;
        const contentId = `content_${Date.now()}`;

        setContentData(data);
        setIsLoading(false);
        setIsSavedToHistory(!!data.actionId);

        if (data.type === "video") {
          navigate("/video-result", {
            state: { contentData: data },
            replace: true
          });
          return;
        }

        if (data.mediaUrl) {
          try {
            sessionStorage.setItem(`image_${contentId}`, data.mediaUrl);
          } catch (error) {
            if (error instanceof Error && error.name === "QuotaExceededError") {
              console.warn("⚠️ Imagem muito grande para cache - continuando sem salvar");
            } else {
              console.error("Erro ao salvar imagem no sessionStorage:", error);
            }
          }
        }

        const hasOldFormat = !!data.caption;
        const hasNewFormat = !!(data.title && data.body && data.hashtags);
        const hasValidContent = hasOldFormat || hasNewFormat;
        if (!data.mediaUrl || !hasValidContent) {
          toast.error("Dados incompletos, mas exibindo o que foi gerado");
        }

        const versionData = {
          version: 0,
          timestamp: new Date().toISOString(),
          caption: data.caption,
          title: data.title,
          body: data.body,
          hashtags: data.hashtags,
          type: data.type,
          mediaUrl: data.mediaUrl
        };
        setVersionHistory([versionData]);
        setCurrentVersionIndex(0);

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
          localStorage.setItem("currentContent", JSON.stringify(savedContent));
          localStorage.setItem(`versions_${contentId}`, JSON.stringify([versionData]));
        } catch (error) {
          console.error("Erro ao salvar no localStorage:", error);
        }

        const revisionsKey = `revisions_${contentId}`;
        const savedRevisions = localStorage.getItem(revisionsKey);
        if (savedRevisions) {
          const count = parseInt(savedRevisions);
          setTotalRevisions(count);
        }

        // Auto-save to history if not already saved
        if (!data.actionId) {
          autoSaveToHistoryRef.current?.(data);
        }
      } else {
        const saved = localStorage.getItem("currentContent");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setIsSavedToHistory(!!parsed.savedToHistory);
            const imageUrl = sessionStorage.getItem(`image_${parsed.id}`);
            if (imageUrl) {
              parsed.mediaUrl = imageUrl;
            }
            setContentData(parsed);
            if (parsed.versions && parsed.versions.length > 0) {
              setVersionHistory(parsed.versions);
              setCurrentVersionIndex(parsed.currentVersion || parsed.versions.length - 1);
            }
            const revisionsKey = `revisions_${parsed.id}`;
            const savedRevisions = localStorage.getItem(revisionsKey);
            if (savedRevisions) {
              const count = parseInt(savedRevisions);
              setTotalRevisions(count);
            }
            setIsLoading(false);
          } catch (error) {
            console.error("Erro ao carregar conteúdo salvo:", error);
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
      const captionText = contentData.title && contentData.body && contentData.hashtags
        ? `${contentData.title}\n\n${contentData.body}\n\n${contentData.hashtags.map((tag: string) => `#${tag}`).join(" ")}`
        : contentData.caption || "";

      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      toast.success("Legenda completa copiada!", {
        description: "Título, texto e hashtags copiados para a área de transferência."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar legenda");
    }
  };

  const handleDownload = async () => {
    if (!contentData) return;
    try {
      toast.info("Preparando download em alta qualidade...");
      
      if (contentData.mediaUrl.startsWith('data:')) {
        const link = document.createElement("a");
        link.href = contentData.mediaUrl;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const brandName = contentData.brand ? contentData.brand.replace(/\s+/g, "_") : "conteudo";
        const platformName = contentData.platform || "creator";
        link.download = `${brandName}_${platformName}_${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download concluído em qualidade máxima!");
      } else {
        const response = await fetch(contentData.mediaUrl, { mode: 'cors' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const brandName = contentData.brand ? contentData.brand.replace(/\s+/g, "_") : "conteudo";
        const platformName = contentData.platform || "creator";
        link.download = `${brandName}_${platformName}_${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Download concluído em qualidade máxima!");
      }
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download da imagem");
    }
  };

  const handleOpenReview = () => {
    setReviewType(null);
    setShowReviewDialog(true);
    setReviewPrompt("");
  };

  const handleSubmitReview = async () => {
    if (!reviewPrompt.trim() || !contentData || !reviewType) return;

    if (!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW) {
      toast.error(`Você não tem créditos disponíveis. Cada ajuste custa ${CREDIT_COSTS.IMAGE_REVIEW} créditos.`);
      return;
    }
    setIsReviewing(true);
    try {
      const newRevisionCount = totalRevisions + 1;
      const saved = JSON.parse(localStorage.getItem("currentContent") || "{}");
      const originalFormData = saved.originalFormData || {};

      const updatedContent = { ...contentData };

      if (reviewType === "caption") {
        toast.info("Ajustando legenda com base no seu feedback...");
        const { data, error } = await supabase.functions.invoke("revise-caption-openai", {
          body: {
            prompt: reviewPrompt,
            originalTitle: contentData.title || "",
            originalBody: contentData.body || contentData.caption?.split("\n\n")[1] || "",
            originalHashtags: contentData.hashtags || [],
            brand: originalFormData.brand || contentData.brand,
            theme: originalFormData.theme || "",
            brandId: originalFormData.brandId,
            teamId: user?.teamId,
            userId: user?.id
          }
        });
        if (error) {
          console.error("Erro ao ajustar legenda:", error);
          throw new Error(error.message || "Falha ao ajustar legenda");
        }
        if (!data.title || !data.body || !data.hashtags) {
          throw new Error("Resposta inválida do ajuste de legenda");
        }

        const formattedCaption = `${data.title}\n\n${data.body}\n\n${data.hashtags.map((tag: string) => `#${tag}`).join(" ")}`;
        updatedContent.caption = formattedCaption;
        updatedContent.title = data.title;
        updatedContent.body = data.body;
        updatedContent.hashtags = data.hashtags;
      } else {
        toast.info("Editando imagem com base no seu feedback...");
        try {
          console.log("🤖 Enviando requisição para edit-image:", {
            hasPrompt: !!reviewPrompt,
            hasImageUrl: !!contentData.mediaUrl,
            hasBrandId: !!originalFormData.brandId,
            hasThemeId: !!originalFormData.themeId
          });
          const { data, error } = await supabase.functions.invoke("edit-image", {
            body: {
              reviewPrompt,
              imageUrl: contentData.mediaUrl,
              brandId: originalFormData.brandId,
              themeId: originalFormData.themeId || null,
              platform: contentData.platform || originalFormData.platform,
              aspectRatio: originalFormData.aspectRatio,
              source: 'complete'
            }
          });
          console.log("📡 Resposta recebida de edit-image:", {
            hasData: !!data,
            hasError: !!error,
            editedImageUrl: data?.editedImageUrl,
            errorMessage: error?.message
          });
          const actualError = error || (data?.error ? { message: data.error } : null);
          
          if (actualError) {
            console.error("❌ Erro ao editar imagem:", actualError, data);
            
            if (data?.error === 'Créditos insuficientes') {
              toast.error("Créditos insuficientes", {
                description: `Necessários: ${data.required}, disponíveis: ${data.available}`,
                duration: 6000
              });
              setShowReviewDialog(false);
              setIsReviewing(false);
              return;
            }
            
            let errorMessage = "Erro ao processar a edição da imagem";
            const errMsg = actualError.message || '';
            
            if (errMsg.includes('rate limit') || errMsg.includes('429')) {
              errorMessage = "Limite de requisições atingido. Aguarde alguns segundos e tente novamente.";
              toast.error("Erro na Edição", { description: errorMessage, duration: 6000 });
              setShowReviewDialog(false);
              setIsReviewing(false);
              return;
            } else if (errMsg.includes('API key')) {
              errorMessage = "Erro de configuração do servidor. Contacte o suporte.";
              toast.error("Erro na Edição", { description: errorMessage, duration: 6000 });
              setShowReviewDialog(false);
              setIsReviewing(false);
              return;
            } else if (errMsg.includes('timeout')) {
              errorMessage = "A edição está demorando mais que o esperado. Tente novamente com um ajuste mais simples.";
              toast.error("Erro na Edição", { description: errorMessage, duration: 6000 });
              setShowReviewDialog(false);
              setIsReviewing(false);
              return;
            }

            if (errMsg.includes('compliance_violation')) {
              try {
                const errorMatch = errMsg.match(/\{.*\}/);
                if (errorMatch) {
                  const errorData = JSON.parse(errorMatch[0]);
                  toast.error("Solicitação não permitida", {
                    description: errorData.message || "A solicitação viola regulamentações publicitárias brasileiras",
                    duration: 8000
                  });
                  if (errorData.recommendation) {
                    setTimeout(() => {
                      toast.info("Sugestão", { description: errorData.recommendation, duration: 10000 });
                    }, 500);
                  }
                  setShowReviewDialog(false);
                  setIsReviewing(false);
                  return;
                }
              } catch (parseError) {
                console.error("Erro ao parsear erro de compliance:", parseError);
              }
              toast.error("Solicitação não permitida", {
                description: "A solicitação viola regulamentações publicitárias brasileiras"
              });
              setShowReviewDialog(false);
              setIsReviewing(false);
              return;
            }
            throw new Error(errMsg || "Falha ao editar imagem");
          }
          if (!data?.editedImageUrl) {
            console.error("❌ URL da imagem editada não foi retornada, data:", JSON.stringify(data));
            throw new Error("Imagem editada não foi retornada");
          }
          if (!data.editedImageUrl.startsWith("http")) {
            console.error("❌ URL da imagem inválida:", data.editedImageUrl);
            throw new Error("URL da imagem editada é inválida");
          }

          const timestamp = Date.now();
          const imageUrlWithTimestamp = `${data.editedImageUrl}?t=${timestamp}`;
          updatedContent.mediaUrl = imageUrlWithTimestamp;
          console.log("✅ Imagem editada atualizada com sucesso:", imageUrlWithTimestamp);
        } catch (error) {
          console.error("❌ Erro ao editar imagem:", error);
          throw new Error(error instanceof Error ? error.message : "Falha ao editar imagem");
        }
      }

      const newContentData = {
        ...updatedContent,
        mediaUrl: updatedContent.mediaUrl,
        _updateKey: Date.now()
      };
      setContentData(newContentData as any);

      if (reviewType === "image" && updatedContent.mediaUrl) {
        try {
          sessionStorage.setItem(`image_${saved.id}`, updatedContent.mediaUrl);
        } catch (error) {
          if (error instanceof Error && error.name === "QuotaExceededError") {
            console.warn("⚠️ Imagem muito grande para cache");
          }
        }
      }

      const newVersion = {
        version: newRevisionCount,
        timestamp: new Date().toISOString(),
        caption: updatedContent.caption,
        title: updatedContent.title,
        body: updatedContent.body,
        hashtags: updatedContent.hashtags,
        type: reviewType,
        reviewPrompt,
        usedCredit: true,
        mediaUrl: updatedContent.mediaUrl
      };

      setVersionHistory(prev => {
        const newHistory = [...prev, newVersion];
        setCurrentVersionIndex(newHistory.length - 1);
        return newHistory;
      });

      const currentVersions = saved.versions || [];
      const updatedVersions = [...currentVersions, newVersion];

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
          usedCredit: true
        }]
      };
      try {
        localStorage.setItem("currentContent", JSON.stringify(updatedSaved));
        localStorage.setItem(`versions_${saved.id}`, JSON.stringify(updatedVersions));
      } catch (error) {
        console.error("Erro ao atualizar localStorage:", error);
      }

      const revisionsKey = `revisions_${saved.id}`;
      localStorage.setItem(revisionsKey, newRevisionCount.toString());
      setTotalRevisions(newRevisionCount);

      try {
        await refreshUserCredits();
      } catch (error) {
        console.error("Error refreshing user credits:", error);
      }

      if (saved.actionId) {
        const { error: updateError } = await supabase.from("actions").update({
          revisions: newRevisionCount,
          result: {
            imageUrl: updatedContent.mediaUrl,
            title: updatedContent.title,
            body: updatedContent.body || updatedContent.caption,
            hashtags: updatedContent.hashtags,
            feedback: reviewPrompt
          },
          updated_at: new Date().toISOString()
        }).eq("id", saved.actionId);
        if (updateError) {
          console.error("Erro ao atualizar histórico:", updateError);
        }
      }
      toast.success("Ajuste concluído! 1 crédito foi consumido.");
      setShowReviewDialog(false);
      setReviewPrompt("");
    } catch (error) {
      console.error("Erro ao processar ajuste:", error);
      toast.error("Erro ao processar ajuste. Tente novamente.");
    } finally {
      setIsReviewing(false);
    }
  };



  const handleNavigateVersion = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? currentVersionIndex - 1 : currentVersionIndex + 1;
    if (newIndex < 0 || newIndex >= versionHistory.length) return;

    const version = versionHistory[newIndex];
    setCurrentVersionIndex(newIndex);
    setContentData(prev => prev ? {
      ...prev,
      caption: version.caption || prev.caption,
      title: version.title || prev.title,
      body: version.body || prev.body,
      hashtags: version.hashtags || prev.hashtags,
      mediaUrl: version.mediaUrl || prev.mediaUrl,
    } : prev);
  };

  const handleReusePrompt = () => {
    const saved = JSON.parse(localStorage.getItem("currentContent") || "{}");
    const originalFormData = saved.originalFormData || {};
    const prefillData: Record<string, any> = {};
    // Map all fields including text-on-image settings
    const keys = [
      'description', 'prompt', 'objective', 'brandId', 'themeId', 'personaId', 'platform',
      'aspectRatio', 'visualStyle', 'style', 'quality', 'tone',
      'colorPalette', 'lighting', 'composition', 'cameraAngle',
      'mood', 'width', 'height', 'additionalInfo', 'contentType',
      'negativePrompt', 'detailLevel',
      'includeText', 'textContent', 'textPosition',
      'fontStyle', 'fontFamily', 'fontWeight', 'fontItalic', 'fontSize',
      'textDesignStyle', 'ctaText', 'adMode', 'priceText', 'includeBrandLogo',
    ];
    keys.forEach(k => { if (originalFormData[k] !== undefined && originalFormData[k] !== null && originalFormData[k] !== '') prefillData[k] = originalFormData[k]; });
    navigate("/create/image", { state: { prefillData } });
    toast.warning("Se você usou imagens de referência, lembre-se de anexá-las novamente.", { duration: 6000 });
  };

  if (isLoading || !contentData) {
    return <ContentResultSkeleton />;
  }

  const saved = JSON.parse(localStorage.getItem("currentContent") || "{}");
  const originalFormData = saved.originalFormData || {};
  const promptUsed = originalFormData.description || originalFormData.prompt || contentData.caption || "";
  const brandName = originalFormData.brand || contentData.brand;
  const platformName = contentData.platform;
  const themeName = originalFormData.theme;
  const personaName = originalFormData.persona;
  const aspectRatio = originalFormData.aspectRatio;
  const formatWidth = originalFormData.width;
  const formatHeight = originalFormData.height;
  const formatLabel = aspectRatio
    ? `${aspectRatio}${formatWidth && formatHeight ? ` (${formatWidth}×${formatHeight})` : ''}`
    : null;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      {/* Banner */}
      <div className="relative h-20 md:h-24 overflow-hidden">
        <PageBreadcrumb
          items={[
            { label: "Criar Conteúdo", href: "/create" },
            { label: "Criação Personalizada", href: "/create/image" },
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
              <Sparkles className="h-5 w-5 lg:h-6 lg:w-6" />
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
            {/* Image Card - Right column, sticky */}
            <div className="lg:sticky lg:top-4 lg:self-start order-1 lg:order-2">
              <Card className="bg-card border-0 shadow-xl rounded-2xl overflow-hidden animate-fade-in group relative">
                <div className="relative bg-muted/20">
                  {contentData.isProcessing ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <div className="text-center space-y-4">
                        <Loader className="h-12 w-12 mx-auto text-primary animate-spin" />
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-foreground">Gerando...</p>
                          <p className="text-sm text-muted-foreground">Isso pode levar alguns minutos</p>
                        </div>
                      </div>
                    </div>
                  ) : contentData.mediaUrl ? (
                    contentData.type === "video" ? (
                      <video src={contentData.mediaUrl} controls className="w-full max-h-[80vh] object-contain" autoPlay loop muted>
                        Seu navegador não suporta vídeos.
                      </video>
                    ) : (
                      <img
                        key={contentData.mediaUrl}
                        src={contentData.mediaUrl}
                        alt="Conteúdo gerado"
                        className="w-full max-h-[80vh] object-contain"
                      />
                    )
                  ) : (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <div className="text-center space-y-2">
                        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Mídia não disponível</p>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  {contentData.mediaUrl && !contentData.isProcessing && contentData.type !== "video" && (
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
                  )}
                </div>

                {/* Version Navigation */}
                {versionHistory.length > 1 && (
                  <div className="p-3 bg-muted/20 border-t border-border/20 flex items-center justify-between">
                    <Button onClick={() => handleNavigateVersion("prev")} variant="outline" size="sm" disabled={currentVersionIndex === 0} className="rounded-lg gap-1.5 text-xs">
                      <Undo2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      <span className="font-medium">{currentVersionIndex === 0 ? "Original" : `Ajuste ${currentVersionIndex}`}</span>
                      <span>({currentVersionIndex + 1}/{versionHistory.length})</span>
                    </div>
                    <Button onClick={() => handleNavigateVersion("next")} variant="outline" size="sm" disabled={currentVersionIndex === versionHistory.length - 1} className="rounded-lg gap-1.5 text-xs">
                      <span className="hidden sm:inline">Próxima</span>
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Feedback */}
                <div className="p-3 bg-muted/10 border-t border-border/20">
                  <CreationFeedback
                    actionId={saved.actionId}
                    brandId={originalFormData.brandId}
                    imageUrl={contentData.mediaUrl}
                  />
                </div>
              </Card>

              {/* Compliance Alert */}
              <ComplianceAlert compliance={contentData?.complianceCheck as ComplianceData} className="mt-3" />
            </div>

            {/* Right column - Info */}
            <div className="space-y-5 order-2 lg:order-1">
              {/* Success Title */}
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-bold text-3xl">
                  Conteúdo gerado{"\n"}com sucesso!
                </span>
              </h2>

              {/* Caption Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Legenda gerada:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCaption}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <span className="relative h-4 w-4">
                      <Copy className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${copied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                      <Check className={`h-4 w-4 absolute inset-0 text-green-500 transition-all duration-300 ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                    </span>
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <div className="backdrop-blur-2xl bg-gradient-to-br from-primary/[0.04] via-white/[0.06] to-accent/[0.04] rounded-2xl p-4 border border-primary/[0.12] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                  {contentData.title && (
                    <h3 className="text-sm sm:text-base font-bold text-foreground mb-2">
                      {contentData.title}
                      {contentData.isLocalFallback && (
                        <Badge variant="outline" className="ml-2 text-xs">Padrão</Badge>
                      )}
                    </h3>
                  )}
                  <p
                    ref={captionRef}
                    className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all duration-300 ${!isCaptionExpanded ? 'line-clamp-3' : ''}`}
                  >
                    {contentData.body || contentData.caption}
                  </p>
                  {(isCaptionTruncated || isCaptionExpanded) && (
                    <button
                      onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                      className="text-sm font-medium text-primary hover:text-primary/80 mt-2 transition-colors"
                    >
                      {isCaptionExpanded ? "Ler menos" : "Ler mais"}
                    </button>
                  )}
                  {contentData.hashtags && contentData.hashtags.length > 0 && !isCaptionExpanded && (
                    <div className="mt-3 pt-3 border-t border-foreground/[0.06] flex flex-wrap gap-1.5 overflow-hidden max-h-16">
                      {contentData.hashtags.slice(0, 8).map((tag, index) => (
                        <span key={index} className="text-[10px] text-primary font-medium backdrop-blur-sm bg-primary/[0.08] border border-primary/[0.1] px-2 py-0.5 rounded-md shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.08)]">
                          #{tag}
                        </span>
                      ))}
                      {contentData.hashtags.length > 8 && (
                        <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5">
                          +{contentData.hashtags.length - 8}
                        </span>
                      )}
                    </div>
                  )}
                  {contentData.hashtags && contentData.hashtags.length > 0 && isCaptionExpanded && (
                    <div className="mt-3 pt-3 border-t border-foreground/[0.06] flex flex-wrap gap-1.5">
                      {contentData.hashtags.map((tag, index) => (
                        <span key={index} className="text-[10px] text-primary font-medium backdrop-blur-sm bg-primary/[0.08] border border-primary/[0.1] px-2 py-0.5 rounded-md shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.08)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Configurations Used - Collapsible */}
              {(brandName || themeName || personaName || platformName || promptUsed) && (
                <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-sm font-semibold text-foreground py-2 border-b border-border/30 hover:text-primary transition-colors">
                      <span>Configurações utilizadas</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    {promptUsed && (
                      <div className="backdrop-blur-2xl bg-gradient-to-br from-primary/[0.04] via-white/[0.06] to-accent/[0.04] rounded-xl p-4 border border-primary/[0.12] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prompt</span>
                        <p className="text-sm text-foreground/90 mt-1.5 whitespace-pre-wrap line-clamp-4 leading-relaxed">{promptUsed}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {platformName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-primary/[0.06] via-white/[0.08] to-accent/[0.06] border border-primary/20 text-foreground/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <PlatformIcon platform={platformName} />{platformName}
                        </span>
                      )}
                      {brandName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-primary/[0.1] via-white/[0.08] to-secondary/[0.06] border border-primary/25 text-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <Building2 className="h-3.5 w-3.5" />{brandName}
                        </span>
                      )}
                      {themeName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-accent/[0.08] via-white/[0.08] to-primary/[0.06] border border-accent/20 text-accent-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <Palette className="h-3.5 w-3.5" />{themeName}
                        </span>
                      )}
                      {personaName && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-secondary/[0.1] via-white/[0.08] to-primary/[0.06] border border-secondary/20 text-secondary-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <User className="h-3.5 w-3.5" />{personaName}
                        </span>
                      )}
                      {formatLabel && (
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-xl backdrop-blur-2xl bg-gradient-to-br from-primary/[0.06] via-white/[0.08] to-accent/[0.06] border border-primary/20 text-foreground/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                          <ImageIcon className="h-3.5 w-3.5" />{formatLabel}
                        </span>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Saved info */}
              {contentData.actionId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>Ação salva no histórico</span>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate(`/action/${contentData.actionId}`)}>
                    Ver detalhes
                  </Button>
                </div>
              )}

              {/* Report problem link */}
              <button
                onClick={() => setShowReportDialog(true)}
                className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Reportar problema com geração
              </button>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 w-1/2">
                <button
                  onClick={handleOpenReview}
                  disabled={!user?.credits || user.credits < CREDIT_COSTS.IMAGE_REVIEW}
                  className="relative overflow-hidden bg-accent/20 border border-accent/30 text-accent rounded-xl gap-2 h-10 w-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center disabled:pointer-events-none disabled:opacity-50 group"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                  <Pen className="h-4 w-4 relative z-10" />
                  <span className="relative z-10">Corrigir</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative overflow-hidden bg-gradient-to-r from-primary via-secondary to-accent text-white rounded-xl gap-2 h-10 w-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center group"
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                      <Plus className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">Criar outro</span>
                    </button>
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
                    <DropdownMenuItem onClick={() => navigate("/create/image")} className="gap-3 py-3.5 px-3 cursor-pointer rounded-lg focus:bg-muted hover:bg-muted data-[highlighted]:bg-muted focus:text-foreground data-[highlighted]:text-foreground">
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

      {/* Image Dialog - Glassmorphism */}
      <Dialog open={isImageDialogOpen} onOpenChange={(open) => { setIsImageDialogOpen(open); if (!open) setIsImageCopied(false); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-0 bg-black/95 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da Imagem</DialogTitle>
            <DialogDescription>Imagem ampliada do conteúdo gerado</DialogDescription>
          </DialogHeader>
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 rounded-lg gap-1.5 transition-all duration-300 h-9 px-3"
            >
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const response = await fetch(contentData.mediaUrl);
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
              className={`backdrop-blur-md border border-white/20 rounded-lg gap-1.5 transition-all duration-300 h-9 px-3 ${isImageCopied ? 'bg-green-500/30 hover:bg-green-500/40 text-green-300' : 'bg-white/15 hover:bg-white/25 text-white'}`}
            >
              <span className="relative h-4 w-4">
                <Copy className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${isImageCopied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                <Check className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${isImageCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
              </span>
              {isImageCopied ? "Copiado!" : "Copiar"}
            </Button>
            <button
              onClick={() => setIsImageDialogOpen(false)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all duration-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="w-full h-full flex items-center justify-center">
            <img src={contentData.mediaUrl} alt="Conteúdo gerado ampliado" className="max-w-full max-h-[90vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="truncate">
                {reviewType ? `Ajustar ${reviewType === "image" ? contentData?.type === "video" ? "Vídeo" : "Imagem" : "Legenda"}` : "Escolha o tipo de ajuste"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {reviewType ? (
                <>
                  Descreva as alterações que deseja fazer.
                  <span className="text-orange-600 font-medium flex items-center gap-1 mt-1">
                    <Coins className="h-3.5 w-3.5" />
                    Este ajuste consumirá {CREDIT_COSTS.IMAGE_REVIEW} créditos. Você tem {user?.credits || 0} crédito(s).
                  </span>
                </>
              ) : "Selecione o que você deseja ajustar neste conteúdo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!reviewType ? (
              <RadioGroup onValueChange={value => setReviewType(value as "image" | "caption")} className="space-y-3">
                <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-primary/10 transition-all cursor-pointer group">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image" className="flex-1 cursor-pointer flex items-center gap-3">
                    {contentData?.type === "video" ? <Video className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> : <ImageIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />}
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">
                        Ajustar {contentData?.type === "video" ? "Vídeo" : "Imagem"}
                      </div>
                      <div className="text-sm text-muted-foreground">Alterar elementos visuais do conteúdo</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-4 hover:border-secondary hover:bg-secondary/10 transition-all cursor-pointer group">
                  <RadioGroupItem value="caption" id="caption" />
                  <Label htmlFor="caption" className="flex-1 cursor-pointer flex items-center gap-3">
                    <FileText className="h-5 w-5 text-secondary group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-semibold group-hover:text-secondary transition-colors">Ajustar Legenda</div>
                      <div className="text-sm text-muted-foreground">Melhorar o texto e a mensagem</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            ) : (
              <>
                <Alert className="border-orange-500/50 bg-orange-500/10">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm">
                    <span className="font-semibold text-orange-600">Atenção:</span> Este ajuste consumirá 1 crédito do seu plano.
                    {user?.credits !== undefined && (
                      <span className="block mt-1 text-muted-foreground">
                        {user.credits > 0 ? (
                          <>Você tem {user.credits} crédito{user.credits !== 1 ? "s" : ""} disponível{user.credits !== 1 ? "eis" : ""}.</>
                        ) : (
                          <span className="text-destructive font-medium">
                            Você não tem créditos disponíveis. Faça upgrade do seu plano.
                          </span>
                        )}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="review-prompt">O que você quer melhorar?</Label>
                  <Textarea
                    id="review-prompt"
                    placeholder={reviewType === "image" ? "Ex: Deixar a imagem mais clara, mudar o fundo para azul..." : "Ex: Tornar o texto mais persuasivo, adicionar emojis..."}
                    value={reviewPrompt}
                    onChange={e => setReviewPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setReviewType(null); setReviewPrompt(""); }} className="flex-1" disabled={isReviewing}>
                    Voltar
                  </Button>
                  <Button onClick={handleSubmitReview} className="flex-1 gap-2" disabled={!reviewPrompt.trim() || isReviewing || !user?.credits || user.credits <= 0}>
                    {isReviewing ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" />Ajustando...</>
                    ) : (
                      <><Check className="h-4 w-4" />Confirmar e Usar 1 Crédito</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Problem Dialog */}
      <ReportProblemDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        actionId={contentData?.actionId}
        actionType="CRIAR_CONTEUDO"
        generatedImageUrl={contentData?.mediaUrl}
      />
    </div>
  );
}
