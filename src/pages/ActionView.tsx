import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  CheckCircle, 
  Sparkles, 
  Calendar,
  Loader2,
  Clock,
  User,
  Tag,
  Check
} from 'lucide-react';
import type { Action } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

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

const getTypeIcon = (type: string) => {
  if (type.includes('CRIAR')) return Sparkles;
  if (type.includes('REVISAR')) return CheckCircle;
  if (type.includes('PLANEJAR')) return Calendar;
  return Sparkles;
};

const getStatusColor = (status: string) => {
  if (status === 'Concluído' || status === 'Aprovado') return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (status === 'Em revisão') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (status === 'Rejeitado') return 'bg-red-500/10 text-red-600 border-red-500/20';
  return 'bg-muted text-muted-foreground border-border';
};

export default function ActionView() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!actionId) return;
    
    const fetchAction = async () => {
      try {
        const { data, error } = await supabase
          .from('actions')
          .select(`
            *,
            brand:brands(id, name)
          `)
          .eq('id', actionId)
          .single();

        if (error) throw error;
        
        // Transform snake_case to camelCase
        const transformedData: Action = {
          id: data.id,
          type: data.type as Action['type'],
          brandId: data.brand_id,
          teamId: data.team_id,
          userId: data.user_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          status: data.status,
          approved: data.approved,
          revisions: data.revisions,
          details: data.details as Action['details'],
          result: data.result as Action['result'],
          brand: data.brand as Action['brand']
        };
        
        setAction(transformedData);
      } catch (error) {
        console.error('Erro ao carregar ação:', error);
        toast.error('Erro ao carregar detalhes da ação');
      } finally {
        setLoading(false);
      }
    };

    fetchAction();
  }, [actionId]);

  const handleCopyText = async (text: string) => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Texto copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar texto');
    } finally {
      setCopying(false);
    }
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

  const handleDownloadImage = (imageUrl: string, filename: string = 'imagem') => {
    try {
      // Se for base64
      if (imageUrl.startsWith('data:image')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado!');
      } else {
        // Se for URL externa
        window.open(imageUrl, '_blank');
        toast.success('Imagem aberta em nova aba');
      }
    } catch (error) {
      toast.error('Erro ao fazer download da imagem');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando detalhes da ação...</p>
        </div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">Ação não encontrada</h2>
          <p className="text-muted-foreground mb-6">A ação que você está procurando não existe ou foi removida.</p>
          <Button onClick={() => navigate('/history')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Histórico
          </Button>
        </Card>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(action.type);
  const displayType = ACTION_TYPE_DISPLAY[action.type];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/history')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{displayType}</h1>
                <p className="text-sm text-muted-foreground">ID: {action.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Data de Criação</span>
            </div>
            <p className="font-semibold">{formatDate(action.createdAt)}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium">Marca</span>
            </div>
            <p className="font-semibold">{action.brand?.name || 'Não especificada'}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Status de Aprovação</span>
            </div>
            <p className="font-semibold">{action.approved ? 'Aprovado' : 'Pendente'}</p>
          </Card>
        </div>

        {/* Status and Revisions */}
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-sm text-muted-foreground mr-2">Status:</span>
              <Badge className={getStatusColor(action.status)}>{action.status}</Badge>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <span className="text-sm text-muted-foreground mr-2">Aprovado:</span>
              <Badge variant={action.approved ? 'default' : 'secondary'}>
                {action.approved ? 'Sim' : 'Não'}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <span className="text-sm text-muted-foreground mr-2">Revisões:</span>
              <Badge variant="outline">{action.revisions || 0}</Badge>
            </div>
          </div>
        </Card>

        {/* Details Section - Specific per Action Type */}
        {action.details && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes da Solicitação</h2>
            <div className="space-y-4">
              {/* CRIAR_CONTEUDO and CRIAR_CONTEUDO_RAPIDO */}
              {(action.type === 'CRIAR_CONTEUDO' || action.type === 'CRIAR_CONTEUDO_RAPIDO') && (
                <>
                  {action.details.objective && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Objetivo:</span>
                      <p className="mt-1 text-foreground">{action.details.objective}</p>
                    </div>
                  )}
                  {action.details.platform && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
                      <p className="mt-1 text-foreground">{action.details.platform}</p>
                    </div>
                  )}
                  {action.details.description && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                      <p className="mt-1 text-foreground">{action.details.description}</p>
                    </div>
                  )}
                  {action.details.tone && Array.isArray(action.details.tone) && action.details.tone.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tom de Voz:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {action.details.tone.map((t: string, idx: number) => (
                          <Badge key={idx} variant="outline">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {action.details.additionalInfo && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Informações Adicionais:</span>
                      <p className="mt-1 text-foreground">{action.details.additionalInfo}</p>
                    </div>
                  )}
                  {action.details.isVideoMode && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Modo de Geração:</span>
                        <Badge className="mt-1" variant="secondary">Vídeo</Badge>
                      </div>
                      {action.details.ratio && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Proporção:</span>
                          <p className="mt-1 text-foreground">{action.details.ratio}</p>
                        </div>
                      )}
                      {action.details.duration && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Duração:</span>
                          <p className="mt-1 text-foreground">{action.details.duration}s</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* REVISAR_CONTEUDO */}
              {action.type === 'REVISAR_CONTEUDO' && (
                <>
                  {action.details.reviewType && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tipo de Revisão:</span>
                      <Badge className="mt-1" variant="secondary">
                        {action.details.reviewType === 'image' ? 'Imagem' : 
                         action.details.reviewType === 'caption' ? 'Legenda' : 
                         action.details.reviewType === 'text-for-image' ? 'Texto para Imagem' : 
                         action.details.reviewType}
                      </Badge>
                    </div>
                  )}
                  {action.details.prompt && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Contexto/Ajustes Solicitados:</span>
                      <p className="mt-1 text-foreground">{action.details.prompt}</p>
                    </div>
                  )}
                  {action.details.brandName && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Marca:</span>
                      <p className="mt-1 text-foreground">{action.details.brandName}</p>
                    </div>
                  )}
                  {action.details.themeName && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tema Estratégico:</span>
                      <p className="mt-1 text-foreground">{action.details.themeName}</p>
                    </div>
                  )}
                  {action.details.caption && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Legenda Enviada:</span>
                      <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                        <p className="text-foreground whitespace-pre-wrap">{action.details.caption}</p>
                      </div>
                    </div>
                  )}
                  {action.details.text && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Texto Enviado:</span>
                      <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                        <p className="text-foreground whitespace-pre-wrap">{action.details.text}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PLANEJAR_CONTEUDO */}
              {action.type === 'PLANEJAR_CONTEUDO' && (
                <>
                  {action.details.platform && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
                      <p className="mt-1 text-foreground">{action.details.platform}</p>
                    </div>
                  )}
                  {action.details.quantity && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Quantidade de Posts:</span>
                      <p className="mt-1 text-foreground">{action.details.quantity}</p>
                    </div>
                  )}
                  {action.details.theme && Array.isArray(action.details.theme) && action.details.theme.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Temas Estratégicos:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {action.details.theme.map((t: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {action.details.objective && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Objetivo:</span>
                      <p className="mt-1 text-foreground">{action.details.objective}</p>
                    </div>
                  )}
                  {action.details.additionalInfo && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Informações Adicionais:</span>
                      <p className="mt-1 text-foreground">{action.details.additionalInfo}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {/* Result Section */}
        {action.result && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Resultado</h2>
              {/* Action buttons for the whole result */}
              {(action.result.imageUrl || action.result.plan) && (
                <div className="flex gap-2">
                  {action.result.imageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadImage(action.result.imageUrl!, 'resultado')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Imagem
                    </Button>
                  )}
                  {action.result.plan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(action.result.plan!)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Review Result - Markdown format */}
            {action.result.review && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Análise e Revisão</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyText(action.result.review!)}
                    disabled={copying}
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-6 bg-muted/50 rounded-lg">
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
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-primary/5 py-2 my-3 rounded-r">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {action.result.review}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Image Result */}
            {action.result.imageUrl && !action.result.review && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Imagem Gerada</span>
                </div>
                <div className="rounded-lg overflow-hidden border bg-muted/30 max-w-2xl mx-auto">
                  <img 
                    src={action.result.imageUrl} 
                    alt="Imagem gerada" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Text Results */}
            <div className="space-y-4">
              {action.result.title && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Título</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(action.result.title!)}
                      disabled={copying}
                    >
                      {copying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="font-medium">{action.result.title}</p>
                  </div>
                </div>
              )}

              {action.result.body && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Legenda/Conteúdo</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(action.result.body!)}
                      disabled={copying}
                    >
                      {copying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="whitespace-pre-wrap">{action.result.body}</p>
                  </div>
                </div>
              )}

              {action.result.hashtags && action.result.hashtags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Hashtags</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(action.result.hashtags!.join(' '))}
                      disabled={copying}
                    >
                      {copying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {action.result.hashtags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {action.result.feedback && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Feedback</span>
                  <div className="p-4 bg-muted/50 rounded-lg mt-2">
                    <p className="whitespace-pre-wrap">{action.result.feedback}</p>
                  </div>
                </div>
              )}

              {action.result.plan && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Plano de Conteúdo</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(action.result.plan!)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(action.result.plan!)}
                        disabled={copying}
                      >
                        {isCopied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-6 bg-muted/50 rounded-lg">
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
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
