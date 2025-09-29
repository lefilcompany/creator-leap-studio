import { History, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { Action } from '@/types/action';
import { ACTION_STYLE_MAP, ACTION_TYPE_DISPLAY } from '@/types/action';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
                <p className="text-sm font-medium text-muted-foreground">Imagem Gerada</p>
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
                <p className="text-sm font-medium text-muted-foreground">Imagem Original</p>
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
                <p className="text-sm font-medium text-muted-foreground">Planejamento Gerado</p>
                <div className="bg-secondary/5 rounded-lg border border-secondary/10 p-4">
                  {typeof action.result.plan === 'string' && action.result.plan.trim().length > 0 ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                      style={{ minHeight: 200 }}
                      dangerouslySetInnerHTML={{ __html: action.result.plan }}
                    />
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