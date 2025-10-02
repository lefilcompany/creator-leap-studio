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
  Tag
} from 'lucide-react';
import type { Action } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';

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
      toast.success('Texto copiado!');
    } catch (error) {
      toast.error('Erro ao copiar texto');
    } finally {
      setCopying(false);
    }
  };

  const handleDownloadImage = (imageUrl: string, filename: string = 'imagem') => {
    try {
      // Se for base64
      if (imageUrl.startsWith('data:image')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${filename}.png`;
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

        {/* Details Section */}
        {action.details && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes da Solicitação</h2>
            <div className="space-y-3">
              {action.details.prompt && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Prompt:</span>
                  <p className="mt-1 text-foreground">{action.details.prompt}</p>
                </div>
              )}
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
            </div>
          </Card>
        )}

        {/* Result Section */}
        {action.result && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Resultado</h2>
            
            {/* Image Result */}
            {action.result.imageUrl && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Imagem Gerada</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadImage(action.result.imageUrl!, 'imagem-gerada')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden border bg-muted/30">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(action.result.plan!)}
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
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: action.result.plan }}
                    />
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
