import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, BookmarkPlus, FolderOpen, Trash2, Users, User, Check, Layers as LayersIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { TextLayer } from "@/components/TextOverlayEditor";
import { ensureFontLoaded } from "@/hooks/useCustomFonts";

type Template = {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  layers: TextLayer[];
  is_shared: boolean;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Current layers in the editor — used when saving a new template. */
  currentLayers: TextLayer[];
  /** Apply the chosen template's layers back into the editor. */
  onApply: (layers: TextLayer[]) => void;
};

/** Strip transient/positional fields so templates are reusable across pautas. */
function sanitizeForTemplate(layers: TextLayer[]): TextLayer[] {
  return layers.map((l) => ({
    ...l,
    // Keep style; the editor will re-anchor positions to the new canvas.
  }));
}

export default function TextStyleTemplatesDialog({ open, onOpenChange, currentLayers, onApply }: Props) {
  const [tab, setTab] = useState<"load" | "save">("load");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Save form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);

  // Selection on load tab
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("not signed in");

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", uid)
        .maybeSingle();
      setTeamId(profile?.team_id ?? null);

      const { data, error } = await supabase
        .from("text_style_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates((data ?? []) as unknown as Template[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível carregar os templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setTab("load");
    setName("");
    setDescription("");
    setIsShared(false);
    fetchTemplates();
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao template");
      return;
    }
    if (!currentLayers.length) {
      toast.error("Não há camadas para salvar");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("not signed in");

      const payload = {
        user_id: uid,
        team_id: isShared ? teamId : null,
        name: name.trim(),
        description: description.trim() || null,
        is_shared: isShared && !!teamId,
        layers: sanitizeForTemplate(currentLayers) as any,
      };
      const { error } = await supabase.from("text_style_templates").insert(payload);
      if (error) throw error;
      toast.success("Template salvo");
      setName("");
      setDescription("");
      setIsShared(false);
      setTab("load");
      await fetchTemplates();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    try {
      const { error } = await supabase.from("text_style_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Template excluído");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao excluir");
    }
  };

  const handleApply = () => {
    const tpl = templates.find((t) => t.id === selectedId);
    if (!tpl) {
      toast.error("Selecione um template");
      return;
    }
    // Pre-load any custom fonts referenced by the template so the preview renders correctly.
    for (const l of tpl.layers || []) {
      if ((l as any).customFontUrl && (l as any).fontFamily) {
        ensureFontLoaded((l as any).fontFamily, (l as any).customFontUrl);
      }
    }
    // Re-id layers so they don't collide with anything currently in the editor.
    const fresh = (tpl.layers || []).map((l) => ({
      ...l,
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    }));
    onApply(fresh);
    toast.success(`Template "${tpl.name}" aplicado`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.5} />
            Templates de estilo
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">
            Salve combinações de tipografia, cores e efeitos para reutilizar em outras pautas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <div className="px-6 pt-3">
            <TabsList className="h-9">
              <TabsTrigger value="load" className="gap-1.5 text-[12.5px]">
                <FolderOpen className="h-3.5 w-3.5" /> Aplicar template
              </TabsTrigger>
              <TabsTrigger value="save" className="gap-1.5 text-[12.5px]">
                <BookmarkPlus className="h-3.5 w-3.5" /> Salvar atual
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === LOAD === */}
          <TabsContent value="load" className="m-0">
            <ScrollArea className="h-[420px]">
              <div className="px-6 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[13px]">Carregando…</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <LayersIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-[13px] font-medium">Nenhum template ainda</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Salve estilos da pauta atual para reaproveitar depois.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 h-8 gap-1.5"
                      onClick={() => setTab("save")}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" /> Salvar atual
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templates.map((t) => {
                      const isSel = selectedId === t.id;
                      const layerCount = Array.isArray(t.layers) ? t.layers.length : 0;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          onDoubleClick={() => { setSelectedId(t.id); setTimeout(handleApply, 0); }}
                          className={cn(
                            "group relative text-left rounded-xl border p-3 transition-all duration-200",
                            "hover:border-primary/50 hover:shadow-md hover:-translate-y-px",
                            isSel
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/30"
                              : "border-border/50 bg-card"
                          )}
                        >
                          {isSel && (
                            <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                          )}
                          <div className="flex items-start gap-2 pr-6">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center shrink-0">
                              <LayersIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-semibold leading-tight truncate">{t.name}</div>
                              {t.description && (
                                <div className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {t.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-[10.5px] text-muted-foreground">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted">
                                  {layerCount} {layerCount === 1 ? "camada" : "camadas"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  {t.is_shared ? (
                                    <><Users className="h-3 w-3" /> Equipe</>
                                  ) : (
                                    <><User className="h-3 w-3" /> Pessoal</>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                            className="absolute bottom-2 right-2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-3 border-t border-border/50 bg-muted/20">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!selectedId}
                className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Aplicar template
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* === SAVE === */}
          <TabsContent value="save" className="m-0">
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center gap-2 text-[12px]">
                <LayersIcon className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Salvando <strong className="text-foreground">{currentLayers.length}</strong> {currentLayers.length === 1 ? "camada atual" : "camadas atuais"} como template reutilizável.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-name" className="text-[12px] font-semibold">Nome do template *</Label>
                <Input
                  id="tpl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Headline grande com sombra"
                  maxLength={60}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc" className="text-[12px] font-semibold">Descrição</Label>
                <Textarea
                  id="tpl-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Quando usar este estilo (opcional)"
                  maxLength={200}
                  rows={2}
                  className="resize-none text-[13px]"
                />
              </div>

              {teamId && (
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Compartilhar com a equipe
                    </div>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      Outros membros poderão aplicar este template.
                    </p>
                  </div>
                  <Switch checked={isShared} onCheckedChange={setIsShared} />
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-3 border-t border-border/50 bg-muted/20">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" strokeWidth={2.5} />}
                Salvar template
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
