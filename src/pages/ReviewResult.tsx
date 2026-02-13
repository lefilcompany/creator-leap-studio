import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Copy, Download, CheckCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import reviewBanner from '@/assets/review-banner.jpg';

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
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 flex-shrink-0 overflow-hidden">
        <PageBreadcrumb
          items={[
            { label: "Revisar Conteúdo", href: "/review" },
            { label: "Resultado da Revisão" },
          ]}
          variant="overlay"
        />
        <img
          src={reviewBanner}
          alt="Resultado da Revisão"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0 z-10">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 border border-primary/20 shadow-sm text-primary rounded-2xl p-3 lg:p-4">
              <CheckCircle className="h-8 w-8 lg:h-10 lg:w-10" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Revisão Completa</h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                {reviewType === 'image' && 'Sugestões para sua imagem'}
                {reviewType === 'caption' && 'Sugestões para sua legenda'}
                {reviewType === 'text-for-image' && 'Texto otimizado para geração de imagem'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleCopy} variant="outline" className="rounded-xl">
              <Copy className="mr-2 h-4 w-4" />
              {isCopied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button onClick={handleDownload} variant="outline" className="rounded-xl">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => navigate('/review')} variant="outline" className="rounded-xl">
              <RotateCcw className="mr-2 h-4 w-4" />
              Nova Revisão
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-4">
          {brandName && (
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span><strong>Marca:</strong> {brandName}</span>
                  {themeName && <span><strong>Tema:</strong> {themeName}</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {reviewType === 'image' && originalContent && (
            <Card className="border-0 shadow-lg rounded-2xl max-w-2xl mx-auto">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Imagem Original
                </h2>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="w-full aspect-square max-w-md mx-auto bg-muted/50 rounded-2xl flex items-center justify-center border-2 border-dashed border-secondary relative overflow-hidden">
                  <img src={originalContent} alt="Original" className="w-full h-full rounded-2xl object-cover" />
                </div>
              </CardContent>
            </Card>
          )}

          {(reviewType === 'caption' || reviewType === 'text-for-image') && originalContent && (
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  {reviewType === 'caption' ? 'Legenda Original' : 'Texto Original'}
                </h2>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="min-h-[200px] bg-muted/30 rounded-2xl p-6 border-2 border-secondary/20">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{originalContent}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Revisão da IA
              </h2>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="min-h-[400px] bg-muted/30 rounded-2xl p-6 border-2 border-primary/20 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
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

          {actionId && (
            <Card className="border-0 shadow-lg rounded-2xl">
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
      </main>
    </div>
  );
};

export default ReviewResult;
