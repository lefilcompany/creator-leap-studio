import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentTemplate } from "./types";

const VISUAL_STYLE_OPTIONS = [
  { value: "realistic", label: "Fotorealístico" },
  { value: "animated", label: "Animado / 3D" },
  { value: "cartoon", label: "Cartoon" },
  { value: "anime", label: "Anime" },
  { value: "watercolor", label: "Aquarela" },
  { value: "oil_painting", label: "Pintura a Óleo" },
  { value: "digital_art", label: "Arte Digital" },
  { value: "sketch", label: "Esboço" },
  { value: "minimalist", label: "Minimalista" },
  { value: "vintage", label: "Vintage" },
];

const ASPECT_OPTIONS = [
  { value: "1:1", label: "1:1 (Quadrado)" },
  { value: "4:5", label: "4:5 (Retrato)" },
  { value: "9:16", label: "9:16 (Story / Reels)" },
  { value: "16:9", label: "16:9 (Paisagem)" },
];

interface Step3EditTemplateProps {
  template: ContentTemplate;
  original: ContentTemplate;
  onChange: (next: ContentTemplate) => void;
}

export function Step3EditTemplate({ template, original, onChange }: Step3EditTemplateProps) {
  const setVD = <K extends keyof ContentTemplate["visualDirection"]>(
    k: K, v: ContentTemplate["visualDirection"][K],
  ) => onChange({ ...template, visualDirection: { ...template.visualDirection, [k]: v } });

  const setRoot = <K extends keyof ContentTemplate>(k: K, v: ContentTemplate[K]) =>
    onChange({ ...template, [k]: v });

  const restore = () => onChange(original);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">Ajuste o template</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Refine a direção visual e a legenda como preferir. Você pode restaurar a sugestão original a qualquer momento.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={restore} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar sugestão
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-bold">Título</Label>
        <Input
          value={template.title}
          onChange={e => setRoot("title", e.target.value)}
          className="h-10 rounded-xl border-2"
          maxLength={200}
        />
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="caption">Legenda</TabsTrigger>
          <TabsTrigger value="text">Texto na imagem</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">Direção visual (descrição)</Label>
            <Textarea
              value={template.visualDirection.description}
              onChange={e => setVD("description", e.target.value)}
              rows={4}
              className="resize-none rounded-xl border-2"
              maxLength={1500}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Estilo visual</Label>
              <NativeSelect
                value={template.visualDirection.visualStyle}
                onValueChange={v => setVD("visualStyle", v)}
                options={VISUAL_STYLE_OPTIONS}
                triggerClassName="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Proporção</Label>
              <NativeSelect
                value={template.visualDirection.aspectRatio}
                onValueChange={v => setVD("aspectRatio", v)}
                options={ASPECT_OPTIONS}
                triggerClassName="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Mood</Label>
              <Input
                value={template.visualDirection.mood}
                onChange={e => setVD("mood", e.target.value)}
                className="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Iluminação</Label>
              <Input
                value={template.visualDirection.lighting}
                onChange={e => setVD("lighting", e.target.value)}
                className="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Composição</Label>
              <Input
                value={template.visualDirection.composition}
                onChange={e => setVD("composition", e.target.value)}
                className="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">Ângulo de câmera</Label>
              <Input
                value={template.visualDirection.cameraAngle}
                onChange={e => setVD("cameraAngle", e.target.value)}
                className="h-10 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold">Paleta de cores</Label>
              <Input
                value={template.visualDirection.colorPalette}
                onChange={e => setVD("colorPalette", e.target.value)}
                className="h-10 rounded-xl border-2"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="caption" className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">Legenda</Label>
            <Textarea
              value={template.caption}
              onChange={e => setRoot("caption", e.target.value)}
              rows={8}
              className="resize-none rounded-xl border-2"
              maxLength={3000}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">CTA</Label>
            <Input
              value={template.cta}
              onChange={e => setRoot("cta", e.target.value)}
              className="h-10 rounded-xl border-2"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">Hashtags</Label>
            <Input
              value={template.hashtags.join(" ")}
              onChange={e => setRoot(
                "hashtags",
                e.target.value.split(/\s+/).filter(Boolean).slice(0, 15),
              )}
              className="h-10 rounded-xl border-2"
              placeholder="#exemplo #marketing"
            />
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4 pt-4">
          <div className="flex items-center justify-between p-3 rounded-xl border-2 bg-card">
            <div>
              <Label className="text-sm font-bold">Incluir texto na imagem</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sobrepor um texto sobre a imagem gerada.
              </p>
            </div>
            <Switch
              checked={template.visualDirection.imageText.include}
              onCheckedChange={v => setVD("imageText", { ...template.visualDirection.imageText, include: v })}
            />
          </div>
          {template.visualDirection.imageText.include && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Texto</Label>
                <Input
                  value={template.visualDirection.imageText.content}
                  onChange={e => setVD("imageText", { ...template.visualDirection.imageText, content: e.target.value })}
                  className="h-10 rounded-xl border-2"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Posição</Label>
                <NativeSelect
                  value={template.visualDirection.imageText.position}
                  onValueChange={v => setVD("imageText", { ...template.visualDirection.imageText, position: v })}
                  options={[
                    { value: "top", label: "Topo" },
                    { value: "center", label: "Centro" },
                    { value: "bottom", label: "Inferior" },
                  ]}
                  triggerClassName="h-10 rounded-xl border-2"
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
