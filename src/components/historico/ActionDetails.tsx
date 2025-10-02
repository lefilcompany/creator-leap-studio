import { History, Eye, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { Action } from '@/types/action';
import { ACTION_STYLE_MAP, ACTION_TYPE_DISPLAY } from '@/types/action';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ActionDetailsProps {
  action: Action | null;
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/10">
    <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
    {typeof value === 'string' ? (
      <p className="font-semibold text-foreground break-words">{value}</p>
    ) : (
      value
    )}
  </div>
);

export default function ActionDetails({ action, isLoading = false }: ActionDetailsProps) {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast.success('Copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => toast.error('Falha ao copiar.'));
  };

  const handleDownloadPDF = (planContent: string) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        lines.forEach((line: string) => {
          checkPageBreak(fontSize / 2);
          pdf.text(line, margin, yPosition);
          yPosition += fontSize / 2;
        });
      };

      const lines = planContent.split('\n');
      
      lines.forEach((line) => {
        line = line.trim();
        if (!line) {
          yPosition += 3;
          return;
        }

        if (line.startsWith('# ') && !line.startsWith('## ')) {
          checkPageBreak(15);
          const text = line.replace(/^#\s+/, '');
          addText(text, 16, 'bold', [41, 128, 185]);
          yPosition += 5;
        } else if (line.startsWith('## ')) {
          checkPageBreak(12);
          const text = line.replace(/^##\s+/, '');
          addText(text, 14, 'bold', [52, 152, 219]);
          yPosition += 4;
        } else if (line.startsWith('### ')) {
          checkPageBreak(10);
          const text = line.replace(/^###\s+/, '');
          addText(text, 12, 'bold', [44, 62, 80]);
          yPosition += 3;
        } else if (line.includes('**')) {
          const text = line.replace(/\*\*/g, '');
          addText(text, 11, 'bold', [44, 62, 80]);
          yPosition += 2;
        } else if (line.match(/^[\d]+\.\s/) || line.startsWith('- ') || line.startsWith('* ')) {
          checkPageBreak(8);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(52, 73, 94);
          const lines = pdf.splitTextToSize(line, maxWidth - 5);
          lines.forEach((l: string) => {
            checkPageBreak(6);
            pdf.text(l, margin + 5, yPosition);
            yPosition += 5;
          });
        } else {
          addText(line, 10, 'normal', [52, 73, 94]);
          yPosition += 2;
        }
      });

      pdf.save(`planejamento-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Download do PDF iniciado!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF.');
    }
  };

  const handleDownloadImage = (imageUrl: string) => {
    try {
      if (imageUrl.startsWith('data:image')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `imagem-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado!');
      } else {
        window.open(imageUrl, '_blank');
        toast.success('Imagem aberta em nova aba');
      }
    } catch (error) {
      toast.error('Erro ao fazer download');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="bg-secondary/10 rounded-full p-6 mb-4">
          <History className="h-12 w-12 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhuma ação selecionada
        </h3>
        <p className="text-muted-foreground text-sm">
          Selecione uma ação na lista para ver os detalhes.
        </p>
      </div>
    );
  }

  const displayType = ACTION_TYPE_DISPLAY[action.type];
  const style = ACTION_STYLE_MAP[displayType];
  const Icon = style?.icon;

  return (
    <div className="h-full bg-card/80 backdrop-blur-sm rounded-2xl border border-secondary/20 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-secondary/10 flex-shrink-0">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={cn("flex-shrink-0 rounded-xl w-16 h-16 flex items-center justify-center", style.background)}>
              <Icon className={cn("h-8 w-8", style.color)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground mb-1 break-words">
              {displayType}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {formatDate(action.createdAt)}
            </p>
            <Button
              onClick={() => navigate(`/historico/${action.id}`)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Visualizar completo
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-8">
        <DetailItem label="Marca" value={action.brand?.name || 'N/A'} />

        {action.type === 'CRIAR_CONTEUDO' && (
          <>
            {action.details?.platform && (
              <DetailItem label="Plataforma" value={action.details.platform} />
            )}
            {action.result?.title && (
              <DetailItem label="Título Gerado" value={action.result.title} />
            )}
            {action.result?.body && (
              <DetailItem 
                label="Legenda Gerada" 
                value={
                  <p className="font-semibold text-foreground whitespace-pre-line leading-relaxed">
                    {action.result.body}
                  </p>
                } 
              />
            )}
            {action.result?.imageUrl && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Imagem Gerada</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadImage(action.result.imageUrl!)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="w-full aspect-square bg-secondary/5 rounded-lg border border-secondary/10 overflow-hidden">
                  <img 
                    src={action.result.imageUrl} 
                    alt="Imagem Gerada" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {action.type === 'REVISAR_CONTEUDO' && (
          <>
            {action.result?.feedback && (
              <DetailItem 
                label="Feedback Gerado" 
                value={
                  <p className="font-semibold text-foreground whitespace-pre-line leading-relaxed">
                    {action.result.feedback}
                  </p>
                } 
              />
            )}
            {action.result?.originalImage ? (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Imagem Original</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadImage(action.result.originalImage!)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="w-full aspect-square bg-secondary/5 rounded-lg border border-secondary/10 overflow-hidden">
                  <img 
                    src={action.result.originalImage} 
                    alt="Imagem Original" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <DetailItem label="Imagem Original" value="Não disponível" />
            )}
          </>
        )}

        {action.type === 'PLANEJAR_CONTEUDO' && (
          <>
            {action.details?.platform && (
              <DetailItem label="Plataforma" value={action.details.platform} />
            )}
            {action.details?.quantity && (
              <DetailItem label="Quantidade" value={action.details.quantity} />
            )}
            {action.result?.plan && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Planejamento Gerado</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(action.result.plan!)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(action.result.plan!)}
                      className="gap-2"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
                <div className="bg-secondary/5 rounded-lg border border-secondary/10 p-6">
                  {typeof action.result.plan === 'string' && action.result.plan.trim().length > 0 ? (
                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold text-primary mb-4 pb-2 border-b border-primary/20">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                              <span className="w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full flex-shrink-0"></span>
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 mb-3 ml-4">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 mb-3 ml-4">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm text-muted-foreground">
                              {children}
                            </li>
                          ),
                        }}
                      >
                        {action.result.plan}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">
                      Nenhum planejamento disponível
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Espaço adicional no final para melhor UX em mobile */}
        <div className="h-6"></div>
      </div>
    </div>
  );
}