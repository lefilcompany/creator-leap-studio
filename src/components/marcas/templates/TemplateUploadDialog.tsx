import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, AlertCircle, Plus, FileImage } from "lucide-react";
import { useImportTemplate, validateImportFile, IMPORT_TEMPLATE_COST } from "@/hooks/useImportTemplate";
import { useCommitTemplate, defaultFontAssetsFromZones } from "@/hooks/useCommitTemplate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TemplateTextZone, TemplateLogoSlot, TemplateFontAssets, TemplateBBox } from "@/types/template";
import { TemplateZoneEditor } from "./TemplateZoneEditor";
import { TemplateZonePanel } from "./TemplateZonePanel";
import { Checkbox } from "@/components/ui/checkbox";
import { isGoogleFont } from "@/lib/googleFonts";

interface Props {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "processing" | "adjust";

export function TemplateUploadDialog({ brandId, open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imgDims, setImgDims] = useState({ w: 1080, h: 1080 });
  const [zones, setZones] = useState<TemplateTextZone[]>([]);
  const [logoSlot, setLogoSlot] = useState<TemplateLogoSlot | null>(null);
  const [selectedId, setSelectedId] = useState<string | "logo" | null>(null);
  const [fontAssets, setFontAssets] = useState<TemplateFontAssets>({});

  const importMut = useImportTemplate();
  const commitMut = useCommitTemplate();
  const queryClient = useQueryClient();

  const { data: customFonts = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["custom-fonts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_fonts").select("id, family_name, display_name");
      if (error || !data) return [];
      return data.map((r) => ({ id: r.id, name: r.display_name || r.family_name }));
    },
  });

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setName("");
    setError(null);
    setTemplateId(null);
    setPreviewUrl("");
    setZones([]);
    setLogoSlot(null);
    setSelectedId(null);
    setFontAssets({});
  }, []);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) return;
    const err = validateImportFile(f);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleImport = async () => {
    if (!file || !name.trim()) {
      setError("Informe um nome e selecione um arquivo");
      return;
    }
    setError(null);
    setStep("processing");
    try {
      const result = await importMut.mutateAsync({ brand_id: brandId, name, file });
      setTemplateId(result.template_id);
      setPreviewUrl(result.preview_url);
      setImgDims({ w: result.width, h: result.height });
      setZones(result.text_zones);
      setLogoSlot(result.logo_slot);
      setFontAssets(defaultFontAssetsFromZones(result.text_zones));
      setStep("adjust");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao processar template";
      setError(msg);
      setStep("upload");
    }
  };

  const updateZone = (id: string, patch: Partial<TemplateTextZone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  const addZone = () => {
    const id = crypto.randomUUID();
    setZones((prev) => [
      ...prev,
      {
        id,
        label: `Texto ${prev.length + 1}`,
        bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.1 },
        font_family: "Inter",
        font_weight: 700,
        font_size_px: 48,
        color: "#0F172A",
        align: "left",
        line_height: 1.1,
      },
    ]);
    setSelectedId(id);
    setFontAssets((prev) => (prev["Inter"] ? prev : { ...prev, Inter: { source: "google", weights: [400, 700] } }));
  };

  const toggleLogo = (checked: boolean) => {
    if (checked && !logoSlot) {
      setLogoSlot({ bbox: { x: 0.05, y: 0.8, w: 0.2, h: 0.15 }, fit: "contain", padding: 4 });
    } else if (!checked) {
      setLogoSlot(null);
      if (selectedId === "logo") setSelectedId(null);
    }
  };

  // Missing fonts: zones whose font isn't in Google curated AND not in fontAssets as custom
  const missingFonts = Array.from(new Set(zones.map((z) => z.font_family))).filter(
    (f) => !isGoogleFont(f) && !fontAssets[f],
  );

  const handleSave = async () => {
    if (!templateId) return;
    if (missingFonts.length > 0) {
      setError(`Fontes faltando: ${missingFonts.join(", ")}. Cadastre como Fonte Própria antes de salvar.`);
      return;
    }
    try {
      const assets = defaultFontAssetsFromZones(zones, fontAssets);
      await commitMut.mutateAsync({
        brand_id: brandId,
        template_id: templateId,
        text_zones: zones,
        logo_slot: logoSlot,
        font_assets: assets,
      });
      toast.success("Template salvo!");
      queryClient.invalidateQueries({ queryKey: ["brand-templates", brandId] });
      handleClose(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar template";
      setError(msg);
    }
  };

  const selectedZone = selectedId && selectedId !== "logo" ? zones.find((z) => z.id === selectedId) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Novo template"}
            {step === "processing" && "Processando template..."}
            {step === "adjust" && "Ajustar zonas e fontes"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie um PDF de 1 página ou imagem (PNG/JPG) com até 5MB."}
            {step === "processing" && "Detectando zonas de texto e logo..."}
            {step === "adjust" && "Posicione as zonas e ajuste as configurações de tipografia."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Nome do template</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Post de promoção Black Friday"
                maxLength={120}
                className="rounded-xl"
              />
            </div>

            <label className="block border-2 border-dashed border-border/40 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <FileImage className="h-6 w-6 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm font-medium">Clique para escolher ou arraste o arquivo</p>
                  <p className="text-xs">PDF (1 página) · PNG · JPG · até 5MB</p>
                </div>
              )}
            </label>
          </div>
        )}

        {step === "processing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Isso costuma levar de 5 a 20 segundos.</p>
          </div>
        )}

        {step === "adjust" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 overflow-hidden">
            <div className="overflow-auto">
              <TemplateZoneEditor
                imageUrl={previewUrl}
                imageWidth={imgDims.w}
                imageHeight={imgDims.h}
                zones={zones}
                logoSlot={logoSlot}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onZoneChange={(id, bbox) => updateZone(id, { bbox })}
                onLogoChange={(bbox: TemplateBBox) =>
                  setLogoSlot((prev) => (prev ? { ...prev, bbox } : prev))
                }
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={addZone} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar zona
                </Button>
                <label className="flex items-center gap-2 text-sm text-foreground/80 ml-2">
                  <Checkbox
                    checked={!!logoSlot}
                    onCheckedChange={(c) => toggleLogo(c === true)}
                  />
                  Incluir slot para logo da marca
                </label>
              </div>
            </div>

            <div className="overflow-auto pr-1 space-y-3">
              {selectedZone ? (
                <TemplateZonePanel
                  zone={selectedZone}
                  customFonts={customFonts}
                  onChange={(z) => updateZone(z.id, z)}
                  onRemove={() => {
                    setZones((prev) => prev.filter((z) => z.id !== selectedZone.id));
                    setSelectedId(null);
                  }}
                />
              ) : (
                <div className="bg-muted/40 rounded-2xl p-4 text-sm text-muted-foreground">
                  Selecione uma zona na imagem para ajustar fonte, cor e tamanho.
                </div>
              )}

              {missingFonts.length > 0 && (
                <Alert className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Fontes não reconhecidas: <b>{missingFonts.join(", ")}</b>.<br />
                    Cadastre em <a href="/profile" className="underline">Minhas fontes</a> ou troque por uma fonte Google.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleImport} disabled={!file || !name.trim()} className="rounded-xl">
                <Upload className="h-4 w-4 mr-1.5" /> Enviar template
              </Button>
            </>
          )}
          {step === "adjust" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} className="rounded-xl">Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={commitMut.isPending || missingFonts.length > 0 || zones.length === 0}
                className="rounded-xl"
              >
                {commitMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Salvar template
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
