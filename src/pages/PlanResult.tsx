import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

const PlanResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);
  const planContent = location.state?.plan;
  const actionId = location.state?.actionId;

  useEffect(() => {
    if (!planContent) {
      toast.error("Nenhum planejamento encontrado");
      navigate("/plan");
    }
  }, [planContent, navigate]);

  const handleCopy = () => {
    if (!planContent) return;
    navigator.clipboard.writeText(planContent).then(() => {
      setIsCopied(true);
      toast.success('Planejamento copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => toast.error('Falha ao copiar.'));
  };

  const handleDownload = () => {
    if (!planContent) return;
    const blob = new Blob([planContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planejamento-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Download iniciado!');
  };

  if (!planContent) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/plan")}
            className="flex items-center gap-2 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Criar Novo Planejamento
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>

        {/* Content Card */}
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl">
                  Planejamento de Conteúdo
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerado em {new Date().toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 lg:p-12">
            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-primary mb-6 pb-3 border-b-2 border-primary/20">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold text-foreground mt-8 mb-4 flex items-center gap-2">
                      <span className="w-2 h-8 bg-gradient-to-b from-primary to-secondary rounded-full"></span>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold text-primary mt-4 mb-2">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-base text-muted-foreground leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-primary/5 py-2 my-4 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">
                      {children}
                    </code>
                  ),
                  hr: () => (
                    <hr className="my-8 border-t-2 border-border/30" />
                  ),
                }}
              >
                {planContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Action Link */}
        {actionId && (
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate(`/historico/${actionId}`)}
              className="text-muted-foreground hover:text-primary"
            >
              Ver detalhes desta ação no histórico →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanResult;
