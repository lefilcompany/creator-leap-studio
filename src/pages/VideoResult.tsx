import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Copy,
  ArrowLeft,
  Check,
  Video,
  Loader,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface VideoResultData {
  mediaUrl: string;
  caption?: string;
  platform: string;
  brand: string;
  title?: string;
  body?: string;
  hashtags?: string[];
  originalFormData?: any;
  actionId?: string;
  isProcessing?: boolean;
}

export default function VideoResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { team, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [videoData, setVideoData] = useState<VideoResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      if (location.state?.contentData) {
        const data = location.state.contentData;
        setVideoData(data);
        setIsLoading(false);
        setIsSavedToHistory(!!data.actionId);

        // Se o vídeo está sendo processado, monitorar o status
        if (data.isProcessing && data.actionId) {
          const checkVideoStatus = async () => {
            try {
              const { data: actionData, error } = await supabase
                .from('actions')
                .select('status, result')
                .eq('id', data.actionId)
                .single();

              if (error) {
                console.error("Erro ao verificar status do vídeo:", error);
                return;
              }

              const result = actionData?.result as { videoUrl?: string; caption?: string } | null;

              if (actionData?.status === 'completed' && result?.videoUrl) {
                setVideoData(prev => prev ? {
                  ...prev,
                  mediaUrl: result.videoUrl,
                  caption: result.caption || prev.caption,
                  isProcessing: false
                } : null);
                
                // Mostrar toast apenas uma vez
                if (!hasShownSuccessToast) {
                  toast.success("Vídeo gerado com sucesso!");
                  setHasShownSuccessToast(true);
                }
              } else if (actionData?.status === 'failed') {
                toast.error("Falha ao gerar o vídeo. Tente novamente.");
                setVideoData(prev => prev ? { ...prev, isProcessing: false } : null);
              }
            } catch (error) {
              console.error("Erro ao verificar status:", error);
            }
          };

          const interval = setInterval(checkVideoStatus, 5000);
          checkVideoStatus();

          return () => clearInterval(interval);
        }
      } else {
        toast.error("Nenhum vídeo encontrado");
        navigate("/create");
      }
    };

    loadVideo();
  }, [location.state, navigate, hasShownSuccessToast]);

  const handleCopyCaption = async () => {
    if (!videoData) return;

    try {
      const captionText = videoData.title && videoData.body && videoData.hashtags
        ? `${videoData.title}\n\n${videoData.body}\n\n${videoData.hashtags.map(tag => `#${tag}`).join(" ")}`
        : videoData.caption || "";

      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      toast.success("Legenda copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar legenda");
    }
  };

  const handleDownload = async () => {
    if (!videoData || !videoData.mediaUrl) return;

    try {
      // Se for URL do Supabase Storage, fazer download direto
      if (videoData.mediaUrl.startsWith('http')) {
        const response = await fetch(videoData.mediaUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        link.download = `${videoData.brand.replace(/\s+/g, "_")}_${videoData.platform}_${timestamp}.mp4`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success("Download do vídeo iniciado!");
      } else {
        toast.error("URL do vídeo inválida");
      }
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do vídeo");
    }
  };

  const handleSaveToHistory = async () => {
    if (!videoData || !team?.id || !user?.id || isSavedToHistory) return;

    setIsSaving(true);
    try {
      // Se já tem actionId, apenas marcar como salvo
      if (videoData.actionId) {
        setIsSavedToHistory(true);
        toast.success("Vídeo já está salvo no histórico!");
        setIsSaving(false);
        return;
      }

      // Caso contrário, criar nova action
      const { data: action, error } = await supabase
        .from("actions")
        .insert({
          team_id: team.id,
          user_id: user.id,
          type: "CRIAR_CONTEUDO",
          status: "Concluído",
          approved: false,
          result: {
            videoUrl: videoData.mediaUrl,
            caption: videoData.caption,
            title: videoData.title,
            body: videoData.body,
            hashtags: videoData.hashtags,
            platform: videoData.platform,
            brand: videoData.brand,
          },
          details: {
            platform: videoData.platform,
            brand: videoData.brand,
          }
        })
        .select()
        .single();

      if (error) throw error;

      setVideoData(prev => prev ? { ...prev, actionId: action.id } : null);
      setIsSavedToHistory(true);
      toast.success("Vídeo salvo no histórico!");
    } catch (error) {
      console.error("Erro ao salvar no histórico:", error);
      toast.error("Erro ao salvar no histórico");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !videoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/create")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Badge variant="secondary" className="gap-2">
            <Video className="h-4 w-4" />
            Vídeo Gerado
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Video Preview */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {videoData.isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Gerando vídeo...</p>
                    <p className="text-sm text-muted-foreground">Isso pode levar alguns minutos</p>
                  </div>
                ) : videoData.mediaUrl ? (
                  <video
                    src={videoData.mediaUrl}
                    controls
                    className="w-full h-full"
                    autoPlay
                    loop
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2" />
                    <p>Vídeo não disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Caption and Actions */}
          <div className="space-y-6">
            {/* Platform and Brand Info */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plataforma</span>
                    <Badge variant="outline">{videoData.platform}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Marca</span>
                    <Badge variant="outline">{videoData.brand}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Caption */}
            {videoData.caption && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Legenda</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {videoData.caption}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleCopyCaption}
                variant="outline"
                className="w-full gap-2"
                disabled={!videoData.caption}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Legenda
                  </>
                )}
              </Button>

              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full gap-2"
                disabled={videoData.isProcessing}
              >
                <Download className="h-4 w-4" />
                Baixar Vídeo
              </Button>

              <Button
                onClick={handleSaveToHistory}
                className="w-full gap-2"
                disabled={isSaving || isSavedToHistory || videoData.isProcessing}
              >
                <Save className="h-4 w-4" />
                {isSavedToHistory ? "Salvo no Histórico" : "Salvar no Histórico"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
