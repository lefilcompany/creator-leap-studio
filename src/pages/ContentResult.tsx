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
  Video
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ContentResultData {
  type: "image" | "video";
  mediaUrl: string;
  caption: string;
  platform: string;
  brand: string;
}

export default function ContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [contentData, setContentData] = useState<ContentResultData | null>(null);

  useEffect(() => {
    // Get data from navigation state
    if (location.state?.contentData) {
      setContentData(location.state.contentData);
    } else {
      // If no data, redirect back
      toast.error("Nenhum conteúdo encontrado");
      navigate("/create");
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
    toast.success(`Download do ${contentData?.type === "video" ? "vídeo" : "imagem"} iniciado!`);
  };

  const handleShare = () => {
    toast.info("Funcionalidade de compartilhamento em breve");
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
                  className="rounded-xl hover:bg-background/50"
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
              
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-2 px-3 py-1.5">
                {contentData.type === "video" ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                {contentData.type === "video" ? "Vídeo" : "Imagem"}
              </Badge>
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
              <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-t border-border/20">
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownload}
                    className="flex-1 rounded-xl gap-2"
                    size="lg"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="rounded-xl"
                    size="lg"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
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
                    className="w-full rounded-xl"
                    size="lg"
                  >
                    Criar Novo Conteúdo
                  </Button>
                  <Button
                    onClick={() => navigate("/history")}
                    variant="ghost"
                    className="w-full rounded-xl"
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
    </div>
  );
}
