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
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/quick-content")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Conteúdo Gerado</h1>
            <p className="text-sm text-muted-foreground">
              Sua imagem foi criada com sucesso
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Baixar
          </Button>
          <Button onClick={() => navigate("/quick-content")}>
            Criar Novo
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Display */}
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Imagem Gerada</h2>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
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
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Descrição</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </Card>

          {/* Prompt */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Prompt Utilizado</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              {prompt}
            </p>
          </Card>

          {/* Action Link */}
          {actionId && (
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Ação registrada</h3>
                  <p className="text-xs text-muted-foreground">
                    Esta criação foi salva no histórico
                  </p>
                </div>
                <Link to={`/action/${actionId}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
