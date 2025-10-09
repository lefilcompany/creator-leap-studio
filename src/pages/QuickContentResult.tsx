import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function QuickContentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);

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
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Conteúdo Gerado
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sua imagem foi criada com sucesso
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="hover:scale-105 transition-transform"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
              <Button 
                onClick={() => navigate("/quick-content")}
                className="hover:scale-105 transition-transform"
              >
                Criar Novo
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 px-6 pb-8">
          {/* Image Display */}
          <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                Imagem Gerada
              </h2>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted border border-border/50 shadow-inner group-hover:scale-[1.02] transition-transform duration-300">
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/60 rounded-full" />
                        Ação registrada
                      </h3>
                      <p className="text-xs text-muted-foreground pl-3">
                        Esta criação foi salva no histórico
                      </p>
                    </div>
                    <Link to={`/action/${actionId}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:scale-105 transition-transform"
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
      </div>
    </div>
  );
}
