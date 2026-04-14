import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CreationFeedbackProps {
  actionId?: string;
  brandId?: string;
  imageUrl?: string;
  thumbPath?: string;
  className?: string;
}

export function CreationFeedback({ actionId, brandId, imageUrl, thumbPath, className }: CreationFeedbackProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(false);

  // Load existing feedback
  useEffect(() => {
    if (!actionId || !user?.id) return;
    supabase
      .from("creation_feedback")
      .select("rating")
      .eq("action_id", actionId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRating(data.rating as "positive" | "negative");
          setExistingFeedback(true);
        }
      });
  }, [actionId, user?.id]);

  const handleFeedback = async (newRating: "positive" | "negative") => {
    if (!actionId || !user?.id || loading) return;

    const isSame = rating === newRating;
    setLoading(true);

    try {
      if (isSame) {
        // Remove feedback
        await supabase
          .from("creation_feedback")
          .delete()
          .eq("action_id", actionId)
          .eq("user_id", user.id);
        setRating(null);
        setExistingFeedback(false);
        toast.success("Feedback removido");
      } else if (existingFeedback) {
        // Update feedback
        await supabase
          .from("creation_feedback")
          .update({
            rating: newRating,
            updated_at: new Date().toISOString(),
          })
          .eq("action_id", actionId)
          .eq("user_id", user.id);
        setRating(newRating);
        toast.success(newRating === "positive" ? "Obrigado pelo feedback positivo! A IA aprenderá com isso." : "Entendido! A IA evitará esse estilo no futuro.");
      } else {
        // Insert feedback
        await supabase
          .from("creation_feedback")
          .insert({
            action_id: actionId,
            brand_id: brandId || null,
            team_id: user.teamId || null,
            user_id: user.id,
            rating: newRating,
            image_url: imageUrl || null,
            thumb_path: thumbPath || null,
          });
        setRating(newRating);
        setExistingFeedback(true);
        toast.success(newRating === "positive" ? "Obrigado! A IA aprenderá com esse estilo." : "Entendido! A IA evitará criar imagens assim.");
      }

      // Trigger style preferences update in background
      if (brandId) {
        updateBrandStylePreferences(brandId, user.teamId || null, user.id);
      }
    } catch (error) {
      console.error("Erro ao salvar feedback:", error);
      toast.error("Erro ao salvar feedback");
    } finally {
      setLoading(false);
    }
  };

  if (!actionId) return null;

  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-muted/30 backdrop-blur-sm p-3 space-y-2",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
          <ThumbsUp className="h-2.5 w-2.5 text-primary" />
        </div>
        <span className="text-xs font-semibold text-foreground tracking-tight">
          Avalie esta criação
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Seu feedback ensina a IA a criar conteúdos cada vez melhores para sua marca.
      </p>
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => handleFeedback("positive")}
          className={cn(
            "h-9 px-4 rounded-lg gap-1.5 text-xs font-medium transition-all duration-200",
            rating === "positive"
              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10"
              : "text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/5"
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Gostei
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => handleFeedback("negative")}
          className={cn(
            "h-9 px-4 rounded-lg gap-1.5 text-xs font-medium transition-all duration-200",
            rating === "negative"
              ? "bg-rose-500/15 text-rose-600 border-rose-500/30 hover:bg-rose-500/20 shadow-sm shadow-rose-500/10"
              : "text-muted-foreground hover:text-rose-600 hover:border-rose-500/30 hover:bg-rose-500/5"
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Melhorar
        </Button>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
      </div>
      {rating && (
        <div className={cn(
          "flex items-center gap-1.5 pt-1 animate-fade-in",
          rating === "positive" ? "text-emerald-600" : "text-rose-500"
        )}>
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            rating === "positive" ? "bg-emerald-500" : "bg-rose-500"
          )} />
          <span className="text-[11px] font-medium">
            {rating === "positive" ? "A IA usará isso como referência de estilo" : "A IA evitará criar nesse estilo"}
          </span>
        </div>
      )}
    </div>
  );
}

// Background function to consolidate feedback into brand style preferences
async function updateBrandStylePreferences(brandId: string, teamId: string | null, userId: string) {
  try {
    // Get all feedback for this brand
    const { data: feedbacks } = await supabase
      .from("creation_feedback")
      .select("rating, image_url, thumb_path, action_id")
      .eq("brand_id", brandId);

    if (!feedbacks || feedbacks.length === 0) return;

    const positiveCount = feedbacks.filter(f => f.rating === "positive").length;
    const negativeCount = feedbacks.filter(f => f.rating === "negative").length;

    const positiveImages = feedbacks
      .filter(f => f.rating === "positive" && (f.image_url || f.thumb_path))
      .map(f => ({ image_url: f.image_url, thumb_path: f.thumb_path, action_id: f.action_id }))
      .slice(-10); // Keep last 10

    const negativeImages = feedbacks
      .filter(f => f.rating === "negative" && (f.image_url || f.thumb_path))
      .map(f => ({ image_url: f.image_url, thumb_path: f.thumb_path, action_id: f.action_id }))
      .slice(-10);

    // Upsert brand style preferences
    const { error } = await supabase
      .from("brand_style_preferences")
      .upsert(
        {
          brand_id: brandId,
          team_id: teamId,
          user_id: userId,
          positive_patterns: positiveImages,
          negative_patterns: negativeImages,
          total_positive: positiveCount,
          total_negative: negativeCount,
          last_updated_from_feedback_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id,team_id" }
      );

    if (error) console.error("Erro ao atualizar preferências:", error);
  } catch (error) {
    console.error("Erro ao consolidar feedback:", error);
  }
}
