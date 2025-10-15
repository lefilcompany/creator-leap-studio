import { History, Eye, Download, Copy, Check, FileText, File, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import type { Action } from '@/types/action';
import { ACTION_STYLE_MAP, ACTION_TYPE_DISPLAY } from '@/types/action';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const handleDownloadTxt = (planContent: string) => {
    try {
      const blob = new Blob([planContent], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `planejamento-${new Date().toISOString().split('T')[0]}.txt`);
      toast.success('Download do TXT iniciado!');
    } catch (error) {
      console.error('Error generating TXT:', error);
      toast.error('Erro ao gerar TXT.');
    }
  };

  const handleDownloadMd = (planContent: string) => {
    try {
      const blob = new Blob([planContent], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, `planejamento-${new Date().toISOString().split('T')[0]}.md`);
      toast.success('Download do Markdown iniciado!');
    } catch (error) {
      console.error('Error generating Markdown:', error);
      toast.error('Erro ao gerar Markdown.');
    }
  };

  const handleDownloadDocx = async (planContent: string) => {
    try {
      // Helper function to process inline markdown (bold text)
      const processInlineMarkdown = (text: string): TextRun[] => {
        const parts: TextRun[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(text)) !== null) {
          // Text before bold
          if (match.index > lastIndex) {
            parts.push(new TextRun({
              text: text.substring(lastIndex, match.index),
              font: "Arial",
              size: 24, // 12pt
              color: "000000",
            }));
          }
          
          // Bold text
          parts.push(new TextRun({
            text: match[1],
            font: "Arial",
            size: 24, // 12pt
            color: "000000",
            bold: true,
          }));
          
          lastIndex = match.index + match[0].length;
        }
        
        // Remaining text
        if (lastIndex < text.length) {
          parts.push(new TextRun({
            text: text.substring(lastIndex),
            font: "Arial",
            size: 24, // 12pt
            color: "000000",
          }));
        }
        
        return parts.length > 0 ? parts : [new TextRun({
          text: text,
          font: "Arial",
          size: 24, // 12pt
          color: "000000",
        })];
      };

      const paragraphs: Paragraph[] = [];
      const lines = planContent.split('\n');
      
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines but add spacing
        if (!trimmedLine) {
          paragraphs.push(new Paragraph({
            text: "",
            spacing: { after: 100 }
          }));
          return;
        }

        // H1 - Main headers (# Título) - MUST have space after #
        if (trimmedLine.match(/^#\s+[^#]/)) {
          const text = trimmedLine.replace(/^#\s+/, '');
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: text,
                font: "Arial",
                size: 36, // 18pt
                bold: true,
                color: "000000",
              })
            ],
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.LEFT,
          }));
        }
        // H2 - Section headers (## Seção) - MUST have space after ##
        else if (trimmedLine.match(/^##\s+[^#]/)) {
          const text = trimmedLine.replace(/^##\s+/, '');
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: text,
                font: "Arial",
                size: 32, // 16pt
                bold: true,
                color: "000000",
              })
            ],
            spacing: { before: 200, after: 100 },
            alignment: AlignmentType.LEFT,
          }));
        }
        // H3 - Subsection headers (### Subseção) - MUST have space after ###
        else if (trimmedLine.match(/^###\s+/)) {
          const text = trimmedLine.replace(/^###\s+/, '');
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: text,
                font: "Arial",
                size: 28, // 14pt
                bold: true,
                color: "000000",
              })
            ],
            spacing: { before: 160, after: 80 },
            alignment: AlignmentType.LEFT,
          }));
        }
        // Numbered lists (1. Item)
        else if (trimmedLine.match(/^\d+\.\s+/)) {
          const text = trimmedLine.replace(/^\d+\.\s+/, '');
          paragraphs.push(new Paragraph({
            children: processInlineMarkdown(text),
            numbering: {
              reference: "default-numbering",
              level: 0
            },
            spacing: { after: 80 }
          }));
        }
        // Bullet lists (- Item or * Item) - MUST have space after - or *
        else if (trimmedLine.match(/^(\-|\*)\s+/)) {
          const text = trimmedLine.replace(/^(\-|\*)\s+/, '');
          paragraphs.push(new Paragraph({
            children: processInlineMarkdown(text),
            bullet: {
              level: 0
            },
            spacing: { after: 80 }
          }));
        }
        // Hashtags (#LumiLife) - NO space after # = regular text
        else if (trimmedLine.match(/^#[^\s]/)) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                font: "Arial",
                size: 24, // 12pt
                color: "000000",
              })
            ],
            spacing: { after: 80 }
          }));
        }
        // Regular text with inline markdown processing
        else {
          paragraphs.push(new Paragraph({
            children: processInlineMarkdown(trimmedLine),
            spacing: { after: 100 }
          }));
        }
      });

      const doc = new Document({
        numbering: {
          config: [{
            reference: "default-numbering",
            levels: [{
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }]
          }]
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: paragraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `planejamento-${new Date().toISOString().split('T')[0]}.docx`);
      toast.success('Download do DOCX iniciado!');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast.error('Erro ao gerar DOCX.');
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

  const handleDownloadVideo = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      link.download = `video_${timestamp}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download do vídeo iniciado!");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do vídeo");
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
              onClick={() => navigate(`/action/${action.id}`)}
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
        <DetailItem label="Criado por" value={action.user?.name || action.user?.email || 'N/A'} />

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
            {action.result?.videoUrl && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Vídeo Gerado</p>
                    {action.result?.processingTime && (
                      <Badge variant="secondary" className="text-xs">
                        Processado em {action.result.processingTime}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadVideo(action.result.videoUrl!)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="w-full aspect-video bg-secondary/5 rounded-lg border border-secondary/10 overflow-hidden">
                  <video 
                    src={action.result.videoUrl} 
                    controls
                    className="w-full h-full object-contain bg-black"
                    preload="metadata"
                  />
                </div>
                {action.result?.caption && (
                  <div className="mt-3 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Legenda</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{action.result.caption}</p>
                  </div>
                )}
              </div>
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
            {action.details?.reviewType && (
              <DetailItem 
                label="Tipo de Revisão" 
                value={
                  action.details.reviewType === 'image' ? 'Revisão de Imagem' :
                  action.details.reviewType === 'caption' ? 'Revisão de Legenda' :
                  'Revisão de Texto para Imagem'
                } 
              />
            )}
            {action.details?.brandName && (
              <DetailItem label="Marca" value={action.details.brandName} />
            )}
            {action.details?.themeName && (
              <DetailItem label="Tema Estratégico" value={action.details.themeName} />
            )}
            {action.result?.review && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Revisão Gerada</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(action.result.review!)}
                    className="gap-2"
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <div className="bg-secondary/5 rounded-lg border border-secondary/10 p-6">
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
                      {action.result.review}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {action.type === 'CRIAR_CONTEUDO_RAPIDO' && (
          <>
            {action.details?.platform && (
              <DetailItem label="Plataforma" value={action.details.platform} />
            )}
            {action.details?.prompt && (
              <DetailItem label="Prompt" value={action.details.prompt} />
            )}
            {action.result?.description && (
              <DetailItem 
                label="Descrição Gerada" 
                value={
                  <p className="font-semibold text-foreground whitespace-pre-line leading-relaxed">
                    {action.result.description}
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

        {action.type === 'GERAR_VIDEO' && (
          <>
            {action.details?.prompt && (
              <DetailItem label="Prompt" value={action.details.prompt} />
            )}
            {action.result?.videoUrl && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Vídeo Gerado</p>
                    {action.result?.processingTime && (
                      <Badge variant="secondary" className="text-xs">
                        Processado em {action.result.processingTime}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadVideo(action.result.videoUrl!)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="w-full aspect-video bg-secondary/5 rounded-lg border border-secondary/10 overflow-hidden">
                  <video 
                    src={action.result.videoUrl} 
                    controls
                    className="w-full h-full object-contain bg-black"
                    preload="metadata"
                  />
                </div>
                {action.result?.caption && (
                  <div className="mt-3 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Legenda</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{action.result.caption}</p>
                  </div>
                )}
              </div>
            )}
            {action.result?.status === 'processing' && (
              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/10">
                <p className="text-sm text-muted-foreground">Vídeo em processamento...</p>
              </div>
            )}
            {action.result?.status === 'error' && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive">Erro ao processar vídeo</p>
                {action.result?.error && (
                  <p className="text-xs text-muted-foreground mt-1">{action.result.error}</p>
                )}
              </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 hover:text-accent hover:border-accent hover:bg-accent/20"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border shadow-lg z-50">
                        <DropdownMenuItem 
                          onClick={() => handleDownloadDocx(action.result.plan!)}
                          className="cursor-pointer hover:bg-accent/20 hover:text-accent focus:bg-accent/20"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Baixar como .docx (Word)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDownloadTxt(action.result.plan!)}
                          className="cursor-pointer hover:bg-accent/20 hover:text-accent focus:bg-accent/20"
                        >
                          <File className="h-4 w-4 mr-2" />
                          Baixar como .txt (Texto)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDownloadMd(action.result.plan!)}
                          className="cursor-pointer hover:bg-accent/20 hover:text-accent focus:bg-accent/20"
                        >
                          <FileCode className="h-4 w-4 mr-2" />
                          Baixar como .md (Markdown)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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