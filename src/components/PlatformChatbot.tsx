import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, RotateCcw, Copy, Reply, Check, Sparkles, ImagePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { ChatbotTooltip } from "./ChatbotTooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  replyTo?: { idx: number; content: string };
};

const PROMPT_IMAGE_REGEX = /\[PROMPT_IMAGE:\s*(.*?)\]/g;

const MessageContent = ({ content, onUsePrompt }: { content: string; onUsePrompt: (prompt: string) => void }) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(PROMPT_IMAGE_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(
        <div key={`md-${lastIndex}`} className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&>p:last-child]:mb-0">
          <ReactMarkdown>{textBefore}</ReactMarkdown>
        </div>
      );
    }
    const promptText = match[1].trim();
    parts.push(
      <button
        key={`prompt-${match.index}`}
        onClick={() => onUsePrompt(promptText)}
        className="flex items-center gap-2 mt-2 mb-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] w-full text-left"
      >
        <ImagePlus className="h-4 w-4 shrink-0" />
        <span className="line-clamp-2">{promptText}</span>
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <div key={`md-end`} className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&>p:last-child]:mb-0">
        <ReactMarkdown>{content.slice(lastIndex)}</ReactMarkdown>
      </div>
    );
  }

  if (parts.length === 0) {
    parts.push(
      <div key="md-full" className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&>p:last-child]:mb-0">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return <>{parts}</>;
};

export const PlatformChatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! 👋 Sou o assistente da plataforma **Creator**. Como posso ajudá-lo hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ idx: number; content: string } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = useCallback((content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  const handleReply = useCallback((idx: number, content: string) => {
    setReplyingTo({ idx, content });
    inputRef.current?.focus();
  }, []);

  const handleUsePrompt = useCallback((prompt: string) => {
    navigate(`/create/content?prompt=${encodeURIComponent(prompt)}`);
  }, [navigate]);

  const streamChat = async (userMessage: string, replyContext?: { idx: number; content: string }) => {
    let finalMessage = userMessage;
    if (replyContext) {
      const replyPreview = replyContext.content.slice(0, 200);
      finalMessage = `[Respondendo a: "${replyPreview}"]\n\n${userMessage}`;
    }

    const newMsg: Message = { role: "user", content: userMessage, replyTo: replyContext || undefined };
    const messagesForApi = [...messages, { role: "user" as const, content: finalMessage }];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Você precisa estar logado para usar o chat.");
        return;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-chat`;

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: messagesForApi }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Limite de mensagens atingido. Tente novamente mais tarde.");
          return;
        }
        throw new Error("Erro ao processar requisição");
      }

      if (!response.body) throw new Error("Sem resposta do servidor");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === "assistant") {
                  newMessages[newMessages.length - 1] = { ...lastMsg, content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Erro no chat:", error);
      toast.error("Não foi possível processar sua mensagem.");
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const currentReply = replyingTo;
    setInput("");
    setReplyingTo(null);

    const newMsg: Message = {
      role: "user",
      content: userMessage,
      replyTo: currentReply || undefined,
    };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    await streamChat(userMessage, currentReply || undefined);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Olá! 👋 Sou o assistente da plataforma **Creator**. Como posso ajudá-lo hoje?",
      },
    ]);
    setInput("");
    setReplyingTo(null);
  };

  return (
    <>
      <ChatbotTooltip />

      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-[9999] bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[560px] shadow-2xl z-[9999] flex flex-col border border-border/50 bg-background overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">Assistente Creator</h3>
                <span className="text-[10px] opacity-80">Online • Pronto para ajudar</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8 hover:bg-primary-foreground/20 text-primary-foreground"
                title="Nova conversa"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 hover:bg-primary-foreground/20 text-primary-foreground"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3" ref={scrollRef}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className="relative max-w-[78%]">
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div className="mb-1 px-2.5 py-1.5 rounded-lg bg-muted/60 border-l-2 border-primary/40 text-[10px] text-muted-foreground line-clamp-2">
                        {msg.replyTo.content.slice(0, 100)}
                        {msg.replyTo.content.length > 100 ? "..." : ""}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/70 text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          <MessageContent content={msg.content} onUsePrompt={handleUsePrompt} />
                          {isLoading && idx === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary rounded-full animate-pulse" />
                          )}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Action buttons on hover */}
                    <div className={`absolute ${msg.role === "user" ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar"
                      >
                        {copiedIdx === idx ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => handleReply(idx, msg.content)}
                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="Responder"
                      >
                        <Reply className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted/70 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Reply preview bar */}
          {replyingTo && (
            <div className="px-3 pt-2 pb-1 border-t bg-muted/30">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 border-l-2 border-primary">
                <Reply className="h-3 w-3 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 line-clamp-1">
                  {replyingTo.content.slice(0, 80)}
                  {replyingTo.content.length > 80 ? "..." : ""}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1 rounded-xl border-border/50 bg-muted/30 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
