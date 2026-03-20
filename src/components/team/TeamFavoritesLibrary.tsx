import { useNavigate } from 'react-router-dom';
import { Star, Sparkles, Image, CheckCircle, Calendar, Video, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamFavorites } from '@/hooks/useFavorites';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  'CRIAR_CONTEUDO': Image,
  'CRIAR_CONTEUDO_RAPIDO': Sparkles,
  'REVISAR_CONTEUDO': CheckCircle,
  'PLANEJAR_CONTEUDO': Calendar,
  'GERAR_VIDEO': Video,
};

const ACTION_GRADIENT_MAP: Record<string, string> = {
  'CRIAR_CONTEUDO': 'from-primary/30 to-primary/10',
  'CRIAR_CONTEUDO_RAPIDO': 'from-primary/30 to-primary/10',
  'REVISAR_CONTEUDO': 'from-accent/30 to-accent/10',
  'PLANEJAR_CONTEUDO': 'from-secondary/30 to-secondary/10',
  'GERAR_VIDEO': 'from-primary/30 to-primary/10',
};

interface TeamFavoritesLibraryProps {
  teamId: string;
}

export function TeamFavoritesLibrary({ teamId }: TeamFavoritesLibraryProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamFavorites = [], isLoading: isLoadingFavs } = useTeamFavorites(teamId);

  const favoriteActionIds = teamFavorites.map(f => f.action_id);

  const { data: favoriteActions = [], isLoading: isLoadingActions } = useQuery({
    queryKey: ['team-favorite-actions', favoriteActionIds],
    queryFn: async () => {
      if (favoriteActionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('actions')
        .select('*, brands(name)')
        .in('id', favoriteActionIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: favoriteActionIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const removeFromTeam = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('action_favorites')
        .delete()
        .eq('action_id', actionId)
        .eq('scope', 'team')
        .eq('team_id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-favorites'] });
      queryClient.invalidateQueries({ queryKey: ['team-favorite-actions'] });
      toast.success('Removido da biblioteca da equipe');
    },
    onError: () => {
      toast.error('Erro ao remover favorito');
    },
  });

  const handleRemove = (e: React.MouseEvent, actionId: string) => {
    e.stopPropagation();
    removeFromTeam.mutate(actionId);
  };

  const isLoading = isLoadingFavs || (favoriteActionIds.length > 0 && isLoadingActions);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Biblioteca de Favoritos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/30">
              <Skeleton className="aspect-video w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favoriteActions.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Biblioteca de Favoritos
        </h2>
        <div className="text-center py-10 bg-card rounded-xl border border-border/30 shadow-sm">
          <Star className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            Nenhuma criação favoritada para a equipe ainda.
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Favorite criações no histórico escolhendo "Para a equipe" para que apareçam aqui.
          </p>
        </div>
      </div>
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/content-images/` : '';

  const getImageUrl = (action: typeof favoriteActions[0]) => {
    if (action.thumb_path && storageBase) {
      const path = action.thumb_path.replace(/^\/+/, '');
      return `${storageBase}${path}`;
    }
    const result = action.result as any;
    if (result?.imageUrl) return result.imageUrl;
    if (result?.originalImage) return result.originalImage;
    return null;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" />
        Biblioteca de Favoritos
        <span className="text-xs bg-amber-400/20 text-amber-600 rounded-full px-2 py-0.5 font-semibold tabular-nums">
          {favoriteActions.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {favoriteActions.map((action) => {
          const displayType = ACTION_TYPE_DISPLAY[action.type] || action.type;
          const FallbackIcon = ACTION_ICON_MAP[action.type] || Sparkles;
          const gradient = ACTION_GRADIENT_MAP[action.type] || 'from-muted to-muted/50';
          const imageUrl = getImageUrl(action);
          const result = action.result as any;
          const title = result?.title || result?.description || displayType;
          const brandName = (action as any).brands?.name;

          return (
            <div
              key={action.id}
              onClick={() => navigate(`/action/${action.id}`)}
              className="cursor-pointer bg-card rounded-xl overflow-hidden shadow-sm border border-border/30 hover:shadow-md transition-all group"
            >
              <div className="aspect-video w-full relative overflow-hidden bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
                    <FallbackIcon className="h-10 w-10 opacity-40 text-primary" />
                  </div>
                )}
                <button
                  onClick={(e) => handleRemove(e, action.id)}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                  title="Remover da equipe"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute top-2 left-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-medium text-sm text-foreground line-clamp-1">
                  {title}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge className="text-[10px] px-2 py-0.5 h-5 font-medium border-0 bg-primary/20 text-primary hover:bg-primary/20">
                    {displayType}
                  </Badge>
                  {brandName && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      {brandName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
