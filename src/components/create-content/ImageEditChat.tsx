import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Check, Pen, RotateCcw, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface ImageEditChatProps {
  /** Chamado quando o assistente entrega um refinedPrompt final. */
  onApply: (refinedPrompt: string) => void | Promise<void>;
  /** true enquanto o edit-image está rodando (bloqueia UI). */
  isApplying?: boolean;
  /** Créditos disponíveis do usuário. */
  availableCredits: number;
  /** Custo em créditos do ajuste (para exibição). */
  editCost: number;
  /** URL da imagem atual — usada pelo assistente para ler textos e citar trechos exatos. */
  imageUrl?: string;
  /** Texto/contexto (título, legenda, prompt) para ajudar o assistente a identificar elementos. */
  contextText?: string;
  className?: string;
}

/**
 * Chat conversacional inline para refinar o pedido de edição de imagem.
 * Faz perguntas clarificadoras via edge function `image-edit-chat` até obter
 * um refinedPrompt, então mostra um botão "Aplicar ajuste" que chama onApply.
 */
export function ImageEditChat({
  onApply,
  isApplying = false,
  availableCredits,
  editCost,
  imageUrl,
  contextText,
  className,
}: ImageEditChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bootstrappedRef = useRef(false);

  const noCredits = availableCredits < editCost;

  // Boot: pede a mensagem inicial do assistente na primeira expansão.
  useEffect(() => {
    if (!expanded || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      setIsThinking(true);
      try {
        const { data, error } = await supabase.functions.invoke("image-edit-chat", {
          body: { messages: [] },
        });
        if (error) throw error;
        setMessages([{ role: "assistant", content: data?.message ?? "" }]);
      } catch (e) {
        console.error("[ImageEditChat] boot error", e);
        setMessages([
          {
            role: "assistant",
            content:
              "Olá! O que você gostaria de ajustar nesta imagem? Descreva com detalhes.",
          },
        ]);
      } finally {
        setIsThinking(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    })();
  }, [expanded]);

  // Auto-scroll ao chegar nova mensagem.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || isThinking || isApplying) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-edit-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      const assistantMsg = (data?.message as string) ?? "";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
      if (data?.status === "ready" && typeof data?.refinedPrompt === "string") {
        setRefinedPrompt(data.refinedPrompt);
      }
    } catch (e) {
      console.error("[ImageEditChat] send error", e);
      toast.error("Não consegui processar sua resposta. Tente novamente.");
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
    setRefinedPrompt(null);
    bootstrappedRef.current = false;
    setExpanded(false);
  };

  const apply = async () => {
    if (!refinedPrompt) return;
    await onApply(refinedPrompt);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Estado colapsado: card com CTA.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        disabled={noCredits}
        className={cn(
          "relative overflow-hidden w-full text-left rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.06] via-white/[0.04] to-primary/[0.04] p-4 shadow-lg hover:shadow-xl transition-all group disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-start gap-3">
          <div className="flex-shrink-0 rounded-xl bg-accent/20 border border-accent/30 p-2 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Ajustar com o assistente
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md">
                <Coins className="h-3 w-3" />
                {editCost} crédito{editCost > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Converse com a IA para refinar exatamente o que mudar. Ela vai te perguntar
              detalhes antes de aplicar a edição.
            </p>
            {noCredits && (
              <p className="text-[11px] text-destructive font-medium mt-1.5">
                Créditos insuficientes.
              </p>
            )}
          </div>
        </div>
      </button>
    );
  }

  // Estado expandido: janela de conversa.
  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/30 bg-card shadow-xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-gradient-to-r from-accent/[0.06] via-primary/[0.04] to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg bg-accent/20 border border-accent/30 p-1.5 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Assistente de Ajuste
            </p>
            <p className="text-[10px] text-muted-foreground">
              {editCost} crédito{editCost > 1 ? "s" : ""} ao aplicar
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={isApplying}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Reiniciar
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[320px] min-h-[180px] bg-gradient-to-b from-transparent to-muted/10"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Pensando…
            </div>
          </div>
        )}
      </div>

      {/* Ready-to-apply banner */}
      {refinedPrompt && !isApplying && (
        <div className="px-3 py-2 border-t border-accent/20 bg-accent/[0.06]">
          <button
            type="button"
            onClick={apply}
            disabled={noCredits}
            className="relative overflow-hidden w-full bg-gradient-to-r from-primary via-secondary to-accent text-white rounded-xl h-10 text-sm font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <Check className="h-4 w-4 relative z-10" />
            <span className="relative z-10">
              Aplicar ajuste ({editCost} crédito{editCost > 1 ? "s" : ""})
            </span>
          </button>
          {noCredits && (
            <p className="text-[11px] text-destructive font-medium mt-1.5 text-center">
              Créditos insuficientes.
            </p>
          )}
        </div>
      )}

      {isApplying && (
        <div className="px-3 py-2.5 border-t border-accent/20 bg-accent/[0.06] text-center text-xs text-foreground inline-flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Aplicando ajuste na imagem…
        </div>
      )}

      {/* Composer */}
      {!refinedPrompt && !isApplying && (
        <div className="border-t border-border/40 p-2 bg-card">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Descreva o ajuste…"
              rows={1}
              disabled={isThinking}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[40px] max-h-[120px]"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isThinking}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
              aria-label="Enviar"
            >
              {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 px-1 inline-flex items-center gap-1">
            <Pen className="h-3 w-3" />
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      )}
    </div>
  );
}
