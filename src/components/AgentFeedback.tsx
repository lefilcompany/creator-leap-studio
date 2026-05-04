import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type AgentId =
  | "calendar_briefing"
  | "calendar_items"
  | "copy_caption"
  | "image_briefing"
  | "image_generation"
  | "video_generation";

interface AgentFeedbackProps {
  agentId: AgentId;
  /** Identificador do alvo avaliado (ex.: id do calendário, id do item, id da action). */
  targetType: string;
  targetId?: string | null;
  brandId?: string | null;
  /** Snapshot do conteúdo avaliado — fica salvo para virar exemplo no prompt. */
  contentSnapshot?: Record<string, any>;
  /** Contexto adicional (não vai para o prompt). */
  context?: Record<string, any>;
  /** Texto curto sobre o que está sendo avaliado (mostrado ao usuário). */
  label?: string;
  className?: string;
}

const AGENT_LABEL: Record<AgentId, string> = {
  calendar_briefing: "este briefing",
  calendar_items: "estas pautas",
  copy_caption: "esta legenda",
  image_briefing: "este briefing visual",
  image_generation: "esta imagem",
  video_generation: "este vídeo",
};

export function AgentFeedback({
  agentId,
  targetType,
  targetId,
  brandId,
  contentSnapshot,
  context,
  label,
  className,
}: AgentFeedbackProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carrega feedback existente
  useEffect(() => {
    if (!targetId || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("agent_feedback")
        .select("id, rating, comment")
        .eq("agent_id", agentId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setExistingId(data.id);
      setRating(data.rating as "positive" | "negative");
      setComment(data.comment || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId, targetType, targetId, user?.id]);

  const persist = async (newRating: "positive" | "negative", newComment: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        team_id: user.teamId || null,
        brand_id: brandId || null,
        agent_id: agentId,
        target_type: targetType,
        target_id: targetId || null,
        rating: newRating,
        comment: newComment.trim() || null,
        content_snapshot: contentSnapshot || {},
        context: context || {},
      };

      if (existingId) {
        const { error } = await supabase
          .from("agent_feedback")
          .update({
            rating: newRating,
            comment: newComment.trim() || null,
            content_snapshot: contentSnapshot || {},
            context: context || {},
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("agent_feedback")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }
      setRating(newRating);
      toast.success(
        newRating === "positive"
          ? "Feedback registrado. A IA vai reforçar esse padrão."
          : "Feedback registrado. A IA vai evitar esse padrão."
      );
    } catch (e) {
      console.error("agent feedback error", e);
      toast.error("Não foi possível salvar o feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (newRating: "positive" | "negative") => {
    if (loading) return;
    persist(newRating, comment);
    setShowComment(true);
  };

  const handleSaveComment = () => {
    if (!rating) {
      toast.error("Escolha 👍 ou 👎 antes de comentar");
      return;
    }
    persist(rating, comment);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-sm p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <ThumbsUp className="h-3 w-3 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Avalie {label || AGENT_LABEL[agentId]}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Seu feedback treina o agente desta marca.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleRate("positive")}
            className={cn(
              "h-8 px-3 rounded-lg gap-1.5 text-xs",
              rating === "positive"
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "text-muted-foreground hover:text-emerald-600"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleRate("negative")}
            className={cn(
              "h-8 px-3 rounded-lg gap-1.5 text-xs",
              rating === "negative"
                ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                : "text-muted-foreground hover:text-rose-600"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
          {!showComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComment(true)}
              className="h-8 px-2 rounded-lg text-xs text-muted-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {showComment && (
        <div className="space-y-2 animate-fade-in">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              rating === "negative"
                ? "O que precisa melhorar? (ex: tom muito formal, falta CTA, etc)"
                : "O que ficou bom? (opcional, ajuda a IA a repetir o acerto)"
            }
            rows={2}
            className="text-xs resize-none"
            maxLength={500}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={loading || !rating}
              onClick={handleSaveComment}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <Check className="h-3 w-3" />
              Salvar comentário
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
