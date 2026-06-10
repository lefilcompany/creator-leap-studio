import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Coins, ImageIcon, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGenerateFromTemplate } from "@/hooks/useGenerateFromTemplate";
import { CreditConfirmationDialog } from "@/components/CreditConfirmationDialog";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { GeneratingOverlay } from "@/components/GeneratingOverlay";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import type { BrandTemplate, TemplateFillInput } from "@/types/template";

export default function CreateFromTemplate() {
  const [params] = useSearchParams();
  const templateId = params.get("templateId") ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { start, cost } = useGenerateFromTemplate();
  const { tasks } = useBackgroundTasks();

  const { data: template, isLoading } = useQuery<BrandTemplate | null>({
    queryKey: ["brand-template", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("id", templateId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const previewUrl = data.preview_path
        ? (await supabase.storage.from("brand-templates").createSignedUrl(data.preview_path, 3600)).data?.signedUrl
        : null;
      return { ...data, preview_url: previewUrl } as unknown as BrandTemplate;
    },
  });

  const [fills, setFills] = useState<Record<string, string>>({});
  const [backgroundMode, setBackgroundMode] = useState<"reuse" | "new">("reuse");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      const initial: Record<string, string> = {};
      for (const z of template.text_zones) initial[z.id] = z.original_text ?? "";
      setFills(initial);
    }
  }, [template]);

  const credits = user?.credits ?? 0;
  const insufficient = credits < cost;

  const fillsArray: TemplateFillInput[] = useMemo(
    () => Object.entries(fills).map(([zone_id, value]) => ({ zone_id, value })),
    [fills],
  );

  const handleGenerate = () => {
    if (!template) return;
    if (backgroundMode === "new" && backgroundPrompt.trim().length < 3) {
      return;
    }
    const id = start({
      template,
      fills: fillsArray,
      background_mode: backgroundMode,
      background_prompt: backgroundMode === "new" ? backgroundPrompt : undefined,
      include_logo: includeLogo,
    });
    if (id) setActiveTaskId(id);
    setConfirmOpen(false);
  };

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <PageBreadcrumb items={[{ label: "Início", href: "/dashboard" }, { label: "Criar a partir de template" }]} />

        <div className="mt-4 mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Criar a partir de template</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os textos das zonas e gere uma peça mantendo a identidade visual aprovada da marca.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-card/80 backdrop-blur-sm border border-border/10 rounded-2xl px-4 py-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold">{credits}</span>
            <span className="text-muted-foreground">créditos · custo {cost}</span>
          </div>
        </div>

        {!templateId && (
          <Alert className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum template selecionado. Abra um template a partir da página da marca.
              <Button variant="link" onClick={() => navigate("/brands")}>Ir para marcas</Button>
            </AlertDescription>
          </Alert>
        )}

        {templateId && isLoading && <Skeleton className="h-[400px] rounded-2xl" />}

        {template && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 p-4 shadow-sm">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Preview</h3>
              <div className="relative w-full bg-muted/30 rounded-xl overflow-hidden" style={{ aspectRatio: `${template.width} / ${template.height}` }}>
                {template.preview_url ? (
                  <img src={template.preview_url} alt={template.name} className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                  </div>
                )}
                {template.text_zones.map((z) => {
                  const value = fills[z.id] ?? z.original_text ?? "";
                  if (!value) return null;
                  return (
                    <div
                      key={z.id}
                      className="absolute overflow-hidden"
                      style={{
                        left: `${z.bbox.x * 100}%`,
                        top: `${z.bbox.y * 100}%`,
                        width: `${z.bbox.w * 100}%`,
                        height: `${z.bbox.h * 100}%`,
                        color: z.color,
                        fontFamily: `'${z.font_family}', sans-serif`,
                        fontWeight: z.font_weight,
                        fontSize: `clamp(8px, ${z.font_size_px / template.width * 100}cqw, 200px)`,
                        textAlign: z.align,
                        lineHeight: z.line_height,
                        containerType: "inline-size",
                      }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 p-5 space-y-4 shadow-sm">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Textos do template</h3>
                {template.text_zones.map((z) => {
                  const value = fills[z.id] ?? "";
                  const max = z.max_chars;
                  const usePreset = (z.original_text?.length ?? 0) > 60;
                  return (
                    <div key={z.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase text-muted-foreground">{z.label}</Label>
                        {max && (
                          <span className={`text-[10px] ${value.length > max ? "text-destructive" : "text-muted-foreground"}`}>
                            {value.length} / {max}
                          </span>
                        )}
                      </div>
                      {usePreset ? (
                        <Textarea
                          value={value}
                          onChange={(e) => setFills((p) => ({ ...p, [z.id]: e.target.value }))}
                          className="rounded-xl min-h-[80px]"
                          maxLength={max}
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) => setFills((p) => ({ ...p, [z.id]: e.target.value }))}
                          className="rounded-xl"
                          maxLength={max}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 p-5 space-y-4 shadow-sm">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fundo da imagem</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={backgroundMode === "reuse" ? "default" : "outline"}
                    onClick={() => setBackgroundMode("reuse")}
                    className="rounded-xl flex-1"
                  >
                    Reusar fundo original
                  </Button>
                  <Button
                    type="button"
                    variant={backgroundMode === "new" ? "default" : "outline"}
                    onClick={() => setBackgroundMode("new")}
                    className="rounded-xl flex-1"
                  >
                    Gerar novo fundo
                  </Button>
                </div>

                {backgroundMode === "new" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Descreva o novo fundo</Label>
                    <Textarea
                      value={backgroundPrompt}
                      onChange={(e) => setBackgroundPrompt(e.target.value)}
                      placeholder="Ex.: fundo escuro com gradiente azul-marinho e elementos abstratos minimalistas"
                      className="rounded-xl min-h-[80px]"
                    />
                  </div>
                )}

                {template.logo_slot && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    Incluir logo da marca
                  </label>
                )}
              </div>

              {insufficient && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Créditos insuficientes. Você tem {credits} e esta ação custa {cost}.
                    <Button variant="link" onClick={() => navigate("/credits")}>Comprar créditos</Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => setConfirmOpen(true)}
                disabled={insufficient || (backgroundMode === "new" && backgroundPrompt.trim().length < 3)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar imagem ({cost} créditos)
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreditConfirmationDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleGenerate}
        currentBalance={credits}
        cost={cost}
        resourceType="geração a partir de template"
        title="Confirmar geração"
      />

      {activeTaskId && tasks.find((t) => t.id === activeTaskId) && (
        <GeneratingOverlay
          taskId={activeTaskId}
          onReset={() => setActiveTaskId(null)}
        />
      )}
    </div>
  );
}
