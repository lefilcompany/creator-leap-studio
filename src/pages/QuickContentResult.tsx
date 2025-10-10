import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Download, Copy, Check, ExternalLink, Maximize2 } from "lucide-react";
import { toast } from "sonner";

export default function QuickContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  const { imageUrl, description, actionId, prompt } = location.state || {};

  useEffect(() => {
    if (!imageUrl) {
      toast.error("Nenhum conteúdo encontrado");
      navigate("/quick-content");
    }
  }, [imageUrl, navigate]);

  const handleDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = imageUrl;
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
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 sm:px-6 py-3 sm:py-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                  Conteúdo Gerado
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Sua imagem foi criada com sucesso
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="hover:scale-105 transition-transform flex-1 sm:flex-initial"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Baixar</span>
                <span className="xs:hidden">Baixar</span>
              </Button>
              <Button 
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform flex-1 sm:flex-initial"
              >
                <span className="hidden xs:inline">Criar Novo</span>
                <span className="xs:hidden">Novo</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 px-6 pb-8">
          {/* Image Display */}
          <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Imagem Gerada
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsImageDialogOpen(true)}
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Ampliar</span>
                </Button>
              </div>
              <div 
                className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted border border-border/50 shadow-inner group-hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                onClick={() => setIsImageDialogOpen(true)}
              >
                <img
                  src={imageUrl}
                  alt="Conteúdo gerado"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </Card>

          {/* Details */}
          <div className="space-y-6">
            {/* Description */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="p-6 space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                  Descrição
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed pl-3">
                  {description}
                </p>
              </div>
            </Card>

            {/* Prompt */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
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
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-3">
                  {prompt}
                </p>
              </div>
            </Card>

            {/* Action Link */}
            {actionId && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full flex-shrink-0" />
                        Ação registrada
                      </h3>
                      <p className="text-xs text-muted-foreground pl-3 break-words">
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
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
            <div className="relative w-full h-[85vh] flex items-center justify-center bg-muted/20 rounded-lg">
              <img
                src={imageUrl}
                alt="Conteúdo gerado ampliado"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
