import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Copy, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const ReviewResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const { reviewType, review, originalContent, brandName, themeName, actionId } = location.state || {};

  if (!review || !reviewType) {
    navigate('/review');
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(review);
      setIsCopied(true);
      toast.success('Revisão copiada!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([review], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revisao-${reviewType}-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (err) {
      toast.error('Erro ao fazer download');
    }
  };

  return (
    <div className="min-h-full p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Revisão Completa</h1>
                  <p className="text-muted-foreground text-base">
                    {reviewType === 'image' && 'Sugestões para sua imagem'}
                    {reviewType === 'caption' && 'Sugestões para sua legenda'}
                    {reviewType === 'text-for-image' && 'Texto otimizado para geração de imagem'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCopy} variant="outline" className="rounded-xl">
                  <Copy className="mr-2 h-4 w-4" />
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button onClick={handleDownload} variant="outline" className="rounded-xl">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button onClick={() => navigate('/review')} variant="outline" className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Nova Revisão
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {brandName && (
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span><strong>Marca:</strong> {brandName}</span>
                {themeName && <span><strong>Tema:</strong> {themeName}</span>}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-6">
          {reviewType === 'image' && originalContent && (
            <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-accent/5">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Imagem Original
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full aspect-square bg-muted/50 rounded-2xl flex items-center justify-center border-2 border-dashed border-secondary relative overflow-hidden">
                  <img src={originalContent} alt="Original" className="w-full h-full rounded-2xl object-cover" />
                </div>
              </CardContent>
            </Card>
          )}

          {(reviewType === 'caption' || reviewType === 'text-for-image') && originalContent && (
            <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg rounded-2xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-secondary/5 to-accent/5">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  {reviewType === 'caption' ? 'Legenda Original' : 'Texto Original'}
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="min-h-[400px] bg-card rounded-2xl p-6 border-2 border-secondary/20">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{originalContent}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="backdrop-blur-sm bg-card/60 border border-border/20 shadow-lg rounded-2xl">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Revisão da IA
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="min-h-[400px] bg-card rounded-2xl p-6 border-2 border-primary/20 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 text-primary" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 text-primary" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-4 text-base leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-base" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                  }}
                >
                  {review}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {actionId && (
          <Card className="backdrop-blur-sm bg-card/60 border border-border/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                Esta revisão foi salva no seu histórico.{' '}
                <button 
                  onClick={() => navigate(`/action/${actionId}`)}
                  className="text-primary hover:underline font-medium"
                >
                  Ver no histórico
                </button>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewResult;
