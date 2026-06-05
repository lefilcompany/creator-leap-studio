import { useEffect, useRef, useState } from "react";
import { Loader2, X, Sparkles, Coins, Info, RefreshCw, ClipboardPaste, ImagePlus } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { CarouselResult, SlideState } from "@/components/create-content/carousel/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string;
  carousel: CarouselResult;
  slide: SlideState | null;
}

const REGEN_FREE_LIMIT = 1; // primeira regeração grátis
const REGEN_PAID_COST = 4; // créditos a partir da 2ª
const MAX_REFS = 3;

export function RegenerateImageDialog({ open, onOpenChange, actionId, carousel, slide }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
  const { user, refreshUserCredits } = useAuth() as any;
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [instructions, setInstructions] = useState("");
  const [whatWentWrong, setWhatWentWrong] = useState("");
  const [avoid, setAvoid] = useState("");
  const [refs, setRefs] = useState<{ url: string; name: string }[]>([]);
  const [preserveImageIndices, setPreserveImageIndices] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keepOriginalPrompt, setKeepOriginalPrompt] = useState(true);

  // Reset state when dialog opens for a new slide
  useEffect(() => {
    if (open) {
      setInstructions("");
      setWhatWentWrong("");
      setAvoid("");
      setRefs([]);
      setPreserveImageIndices([]);
      setShowAdvanced(false);
      setKeepOriginalPrompt(true);
    }
  }, [open, slide?.index]);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
  const regenerationCount = (slide as any)?.regenerationCount ?? 0;
  const cost = regenerationCount < REGEN_FREE_LIMIT ? 0 : REGEN_PAID_COST;
  const userCredits = user?.credits ?? 0;
  const hasEnough = userCredits >= cost;

  const handleUpload = async (file: File) => {
    if (!user?.id) {
      toast.error("Faça login para enviar imagens");
      return;
    }
    if (refs.length >= MAX_REFS) {
      toast.error(`Máximo de ${MAX_REFS} referências`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas arquivos de imagem");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/regenerate-refs/${Date.now()}-slide-${slide?.index ?? 0}.${ext}`;
      const { error } = await supabase.storage.from("content-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("content-images").getPublicUrl(path);
      setRefs((prev) => [...prev, { url: data.publicUrl, name: file.name }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
    } catch (err: any) {
      toast.error("Erro ao enviar imagem", { description: err?.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePasteEvent = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    const remaining = MAX_REFS - refs.length;
    for (const f of files.slice(0, remaining)) {
      // eslint-disable-next-line no-await-in-loop
      await handleUpload(f);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          files.push(new File([blob], `colado-${Date.now()}.${ext}`, { type: imageType }));
        }
      }
      if (files.length === 0) {
        toast.error("Nenhuma imagem encontrada na área de transferência");
        return;
      }
      const remaining = MAX_REFS - refs.length;
      for (const f of files.slice(0, remaining)) {
        // eslint-disable-next-line no-await-in-loop
        await handleUpload(f);
      }
    } catch {
      toast.error("Não foi possível acessar a área de transferência. Use Ctrl+V dentro do diálogo.");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const remaining = MAX_REFS - refs.length;
    for (const f of files.slice(0, remaining)) {
      // eslint-disable-next-line no-await-in-loop
      await handleUpload(f);
    }
  };

  const handleSubmit = async () => {
    if (!slide) return;
    if (!instructions.trim()) {
      toast.error("Descreva o que quer ajustar");
      return;
    }
    if (!hasEnough) {
      toast.error(`Créditos insuficientes. Necessário: ${cost}`);
      return;
    }

    setSubmitting(true);
    try {
      const composedInstructions = [
        whatWentWrong.trim() ? `O que deu errado na versão anterior: ${whatWentWrong.trim()}` : "",
        instructions.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      const body = {
        actionId,
        slidesCount: carousel.slidesCount,
        slides: carousel.slides.map((s) => ({
          index: s.index,
          prompt: s.prompt,
          visualStyle: s.visualStyle,
          cameraAngle: s.cameraAngle,
          lighting: s.lighting,
          composition: s.composition,
          mood: s.mood,
          referenceImageUrl: s.referenceImageUrl,
          referenceImageUrls: s.referenceImageUrls,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
        brandId: (carousel as any).brandId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
        themeId: (carousel as any).themeId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
        personaId: (carousel as any).personaId,
        platform: "Carrossel",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
        contentType: (carousel as any).contentType ?? "organic",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
        tone: (carousel as any).tone,
        onlyIndex: slide.index,
        // Novos campos de regeração
        regenerationInstructions: composedInstructions,
        regenerationReferenceImages: refs,
        avoid: avoid.trim() || undefined,
        keepOriginalPrompt,
      };

      const { error } = await supabase.functions.invoke("generate-carousel-images", { body });
      if (error) throw new Error(error.message || "Falha ao iniciar regeração");

      toast.success(`Slide ${slide.index + 1} entrou na fila`, {
        description: cost > 0 ? `Custou ${cost} crédito${cost > 1 ? "s" : ""}` : "Regeração gratuita",
      });

      // Garante que o polling volte a rodar mesmo se já estava parado
      await queryClient.invalidateQueries({ queryKey: ["carousel-slides", actionId] });
      if (typeof refreshUserCredits === "function") refreshUserCredits();

      onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
    } catch (err: any) {
      toast.error("Erro ao regerar", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent
        className="max-w-xl max-h-[92vh] overflow-y-auto"
        onPaste={handlePasteEvent}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Regerar slide {slide ? slide.index + 1 : ""}
          </DialogTitle>
          <DialogDescription>
            Descreva o que quer mudar e (opcional) envie referências para guiar a nova geração.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preview */}
          {slide?.imageUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 p-2.5">
              <img
                src={slide.imageUrl}
                alt={`Slide ${slide.index + 1}`}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="font-medium text-foreground line-clamp-1">Versão atual</p>
                <p className="line-clamp-2">{slide.prompt}</p>
              </div>
            </div>
          )}

          {/* O que deu errado */}
          <div className="space-y-1.5">
            <Label htmlFor="regen-wrong" className="text-sm">
              O que não ficou bom?
            </Label>
            <div className="rounded-2xl shadow-sm overflow-hidden border border-border/40 bg-card transition-shadow focus-within:shadow-md">
              <div className="p-3 pb-2">
                <Textarea
                  id="regen-wrong"
                  placeholder="Ex: O produto ficou cortado, a cor do fundo está errada..."
                  value={whatWentWrong}
                  onChange={(e) => setWhatWentWrong(e.target.value)}
                  className="resize-none border-0 bg-transparent p-0 text-sm placeholder:text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[60px]"
                  maxLength={400}
                />
              </div>
            </div>
          </div>

          {/* Instruções + Referências (unificado) */}
          <div className="space-y-1.5">
            <Label htmlFor="regen-instructions" className="text-sm font-semibold">
              O que ajustar nesta imagem?
            </Label>
            <div className="rounded-2xl shadow-sm overflow-hidden border border-border/40 bg-card transition-shadow focus-within:shadow-md">
              {/* Textarea */}
              <div className="p-3 pb-2">
                <Textarea
                  id="regen-instructions"
                  placeholder="Ex: Trocar o fundo para um ambiente externo, aproximar o produto, mudar a iluminação para mais quente..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="resize-none border-0 bg-transparent p-0 text-sm placeholder:text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                  maxLength={800}
                  required
                />
              </div>

              {/* Anexos: chip com nome + toggle "Preservar" */}
              {refs.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {refs.map((ref, i) => {
                    const isPreserving = preserveImageIndices.includes(i);
                    return (
                      <div key={ref.url} className="relative group flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[140px] text-foreground">{ref.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPreserveImageIndices((prev) =>
                              prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
                            )
                          }
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                            isPreserving
                              ? "bg-primary/15 border-primary/30 text-primary"
                              : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                          }`}
                          title="Preservar traços desta imagem"
                        >
                          {isPreserving ? "Preservando" : "Preservar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRefs((prev) => prev.filter((_, idx) => idx !== i));
                            setPreserveImageIndices((prev) =>
                              prev.filter((idx) => idx !== i).map((idx) => (idx > i ? idx - 1 : idx))
                            );
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remover"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}


              {/* Toolbar inferior */}
              <div className="flex items-center gap-1 px-2.5 py-2 border-t border-border/20 bg-muted/10">
                <span className="text-[11px] text-muted-foreground font-medium mr-1">Referências</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || refs.length >= MAX_REFS}
                  className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  <span>Selecionar</span>
                </button>
                <button
                  type="button"
                  onClick={handleClipboardPaste}
                  disabled={uploading || refs.length >= MAX_REFS}
                  className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>Colar</span>
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground">{refs.length}/{MAX_REFS}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Quanto mais específico, melhor. Você pode anexar referências (Ctrl+V ou arrastar imagens).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const remaining = MAX_REFS - refs.length;
                for (const f of files.slice(0, remaining)) {
                  // eslint-disable-next-line no-await-in-loop
                  await handleUpload(f);
                }
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>


          {/* Avançado */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {showAdvanced ? "Ocultar opções avançadas" : "Mais opções"}
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="regen-avoid" className="text-xs">
                  Evitar
                </Label>
                <Textarea
                  id="regen-avoid"
                  placeholder="Ex: Sem texto na imagem, sem pessoas, sem fundo branco..."
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                  className="min-h-[50px] resize-none text-xs"
                  maxLength={300}
                />
              </div>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepOriginalPrompt}
                  onChange={(e) => setKeepOriginalPrompt(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-muted-foreground">
                  Manter o briefing original e apenas aplicar os ajustes acima. Desmarque para usar as instruções como prompt principal.
                </span>
              </label>
            </div>
          )}

          {/* Custo */}
          <div
            className={cn(
              "rounded-xl border p-3 flex items-start gap-2 text-xs",
              cost === 0
                ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                : "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
            )}
          >
            <Coins className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {cost === 0 ? (
                <p className="font-semibold">Esta é sua regeração gratuita deste slide.</p>
              ) : (
                <p className="font-semibold">
                  Esta regeração custa {cost} crédito{cost > 1 ? "s" : ""} (metade de uma imagem nova).
                </p>
              )}
              <p className="opacity-80">
                Você tem {userCredits} crédito{userCredits === 1 ? "" : "s"} disponíveis.
                {regenerationCount > 0 && ` Esta será a regeração #${regenerationCount + 1}.`}
              </p>
            </div>
          </div>

          {!hasEnough && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2 text-xs text-destructive">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Créditos insuficientes para esta regeração.</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 gap-1.5"
              disabled={submitting || !instructions.trim() || !hasEnough}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regerar {cost > 0 ? `(${cost} cr)` : "(grátis)"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
}
