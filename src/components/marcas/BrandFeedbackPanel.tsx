import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ThumbsUp, ThumbsDown, TrendingUp, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedbackStats {
  totalPositive: number;
  totalNegative: number;
  styleSummary: string | null;
}

interface TopImage {
  id: string;
  imageUrl: string;
  thumbPath: string | null;
  actionId: string;
  createdAt: string;
}

interface BrandFeedbackPanelProps {
  brandId: string;
  accentColor?: string;
}

export function BrandFeedbackPanel({ brandId, accentColor }: BrandFeedbackPanelProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [topImages, setTopImages] = useState<TopImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch style preferences
        const { data: prefs } = await supabase
          .from('brand_style_preferences')
          .select('total_positive, total_negative, style_summary')
          .eq('brand_id', brandId)
          .maybeSingle();

        setStats({
          totalPositive: prefs?.total_positive ?? 0,
          totalNegative: prefs?.total_negative ?? 0,
          styleSummary: prefs?.style_summary ?? null,
        });

        // Fetch top-rated images (positive feedback with image)
        const { data: feedbacks } = await supabase
          .from('creation_feedback')
          .select('id, action_id, image_url, thumb_path, created_at')
          .eq('brand_id', brandId)
          .eq('rating', 'positive')
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6);

        if (feedbacks) {
          setTopImages(
            feedbacks
              .filter((f: any) => f.image_url)
              .map((f: any) => ({
                id: f.id,
                imageUrl: f.image_url,
                thumbPath: f.thumb_path,
                actionId: f.action_id,
                createdAt: f.created_at,
              }))
          );
        }
      } catch (err) {
        console.error('Error loading feedback stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brandId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const total = (stats?.totalPositive ?? 0) + (stats?.totalNegative ?? 0);

  if (total === 0 && topImages.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum feedback ainda</p>
        <p className="text-xs text-muted-foreground/70">
          Avalie suas criações com 👍 ou 👎 para a IA aprender seu estilo
        </p>
      </div>
    );
  }

  const approvalRate = total > 0 ? Math.round((stats!.totalPositive / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
          <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold text-emerald-600">{stats?.totalPositive ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprovadas</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-3 text-center">
          <ThumbsDown className="h-4 w-4 mx-auto mb-1 text-red-500" />
          <p className="text-lg font-bold text-red-500">{stats?.totalNegative ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rejeitadas</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: accentColor ? `${accentColor}10` : 'hsl(var(--primary) / 0.1)' }}>
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-primary">{approvalRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprovação</p>
        </div>
      </div>

      {/* Style summary */}
      {stats?.styleSummary && (
        <div className="bg-muted/30 rounded-xl p-3 border border-border/10">
          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Resumo de Estilo</p>
          <p className="text-sm text-foreground leading-relaxed">{stats.styleSummary}</p>
        </div>
      )}

      {/* Top images gallery */}
      {topImages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Imagens Referência ({topImages.length})
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {topImages.map((img) => {
              const src = img.thumbPath
                ? supabase.storage.from('creations').getPublicUrl(img.thumbPath).data.publicUrl
                : img.imageUrl;
              return (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-border/10 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all duration-200"
                  onClick={() => navigate(`/action/${img.actionId}`)}
                >
                  <img
                    src={src}
                    alt="Referência aprovada"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute top-1 right-1">
                    <ThumbsUp className="h-3 w-3 text-emerald-400 drop-shadow-md" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
