import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

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
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Helper function to add text with word wrap
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

      // Parse markdown content and structure it
      const lines = planContent.split('\n');
      
      lines.forEach((line) => {
        line = line.trim();
        if (!line) {
          yPosition += 3;
          return;
        }

        // H1 - Main headers (e.g., "Plano de Conteúdo Estratégico")
        if (line.startsWith('# ') && !line.startsWith('## ')) {
          checkPageBreak(15);
          const text = line.replace(/^#\s+/, '');
          addText(text, 16, 'bold', [41, 128, 185]);
          yPosition += 5;
        }
        // H2 - Section headers (e.g., "Post 1:")
        else if (line.startsWith('## ')) {
          checkPageBreak(12);
          const text = line.replace(/^##\s+/, '');
          addText(text, 14, 'bold', [52, 152, 219]);
          yPosition += 4;
        }
        // H3 - Subsection headers (e.g., "Objetivo:", "Funil:")
        else if (line.startsWith('### ')) {
          checkPageBreak(10);
          const text = line.replace(/^###\s+/, '');
          addText(text, 12, 'bold', [44, 62, 80]);
          yPosition += 3;
        }
        // Bold text (field labels)
        else if (line.includes('**')) {
          const text = line.replace(/\*\*/g, '');
          addText(text, 11, 'bold', [44, 62, 80]);
          yPosition += 2;
        }
        // List items
        else if (line.match(/^[\d]+\.\s/) || line.startsWith('- ') || line.startsWith('* ')) {
          checkPageBreak(8);
          const text = line;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(52, 73, 94);
          const lines = pdf.splitTextToSize(text, maxWidth - 5);
          lines.forEach((l: string) => {
            checkPageBreak(6);
            pdf.text(l, margin + 5, yPosition);
            yPosition += 5;
          });
        }
        // Regular text
        else {
          addText(line, 10, 'normal', [52, 73, 94]);
          yPosition += 2;
        }
      });

      // Save the PDF
      pdf.save(`planejamento-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Download do PDF iniciado!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
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
            className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Criar Novo Planejamento
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2 hover:text-accent hover:border-accent hover:bg-accent/20"
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
                    <h1 className="text-2xl font-bold text-primary mb-4 pb-2 border-b border-primary/20">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                      <span className="w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full"></span>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-semibold text-primary mt-3 mb-2">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {children}
                    </p>
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
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-primary/5 py-2 my-3 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">
                      {children}
                    </code>
                  ),
                  hr: () => (
                    <hr className="my-6 border-t-2 border-border/30" />
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
