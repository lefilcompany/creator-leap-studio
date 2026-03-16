import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ImageIcon, X, Paintbrush, ChevronDown, ClipboardPaste, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const VISUAL_STYLES = [
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
] as const;

interface UnifiedPromptBoxProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  visualStyle: string;
  onVisualStyleChange: (value: string) => void;
  referenceFiles: File[];
  onReferenceFilesChange: (files: File[]) => void;
  preserveImageIndices: number[];
  onPreserveImageIndicesChange: (indices: number[]) => void;
}

export function UnifiedPromptBox({
  prompt,
  onPromptChange,
  visualStyle,
  onVisualStyleChange,
  referenceFiles,
  onReferenceFilesChange,
  preserveImageIndices,
  onPreserveImageIndicesChange,
}: UnifiedPromptBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStyles, setShowStyles] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      onReferenceFilesChange([...referenceFiles, ...files].slice(0, 5));
      toast.success(`${files.length} imagem(ns) adicionada(s)`);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = referenceFiles.filter((_, index) => index !== indexToRemove);
    onReferenceFilesChange(updatedFiles);
    onPreserveImageIndicesChange(
      preserveImageIndices
        .filter(idx => idx !== indexToRemove)
        .map(idx => (idx > indexToRemove ? idx - 1 : idx))
    );
  };

  const handleTogglePreserve = (index: number) => {
    if (preserveImageIndices.includes(index)) {
      onPreserveImageIndicesChange(preserveImageIndices.filter(idx => idx !== index));
    } else {
      onPreserveImageIndicesChange([...preserveImageIndices, index]);
    }
  };

  const selectedStyleLabel = VISUAL_STYLES.find(s => s.value === visualStyle);

  return (
    <div className="space-y-4">
      {/* Prompt textarea card */}
      <div className="rounded-2xl shadow-lg overflow-hidden border-0 bg-card transition-shadow focus-within:shadow-xl">
        {/* Main textarea area */}
        <div className="p-4 md:p-5 pb-2" onPaste={handlePaste}>
          <Textarea
            id="quick-description"
            placeholder="Descreva o que você quer criar... Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com estética minimalista e cores quentes"
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            rows={4}
            className="resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
          />
        </div>

        {/* Visual style picker dropdown */}
        {showStyles && (
          <div className="px-4 md:px-5 pb-3 pt-2">
            <Label className="text-xs font-medium text-muted-foreground mb-2.5 block">Estilo Visual</Label>
            <div className="flex flex-wrap gap-1.5">
              {VISUAL_STYLES.map(style => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => {
                    onVisualStyleChange(style.value);
                    setShowStyles(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                    visualStyle === style.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-foreground border border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom toolbar - only visual style */}
        <div className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 border-t border-border/20 bg-muted/10">
          <button
            type="button"
            className={`h-8 inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all active:scale-[0.97] ${
              showStyles
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            onClick={() => setShowStyles(!showStyles)}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            <span>{selectedStyleLabel?.label || "Estilo"}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showStyles ? "rotate-180" : ""}`} />
          </button>
          <div className="flex-1" />
        </div>
      </div>

      {/* Reference images section - separate card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Imagens de Referência <span className="text-muted-foreground/60">(opcional)</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">{referenceFiles.length}/5 · Cole com Ctrl+V</span>
        </div>

        <div className="flex gap-2" onPaste={handlePaste}>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 border-border/50 bg-muted/10"
          >
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center">
              Clique para adicionar imagens
            </p>
            <p className="text-[10px] text-muted-foreground/60">Máximo 5 · JPG, PNG, WebP</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                const clipboardItems = await navigator.clipboard.read();
                const files: File[] = [];
                for (const item of clipboardItems) {
                  const imageType = item.types.find(t => t.startsWith('image/'));
                  if (imageType) {
                    const blob = await item.getType(imageType);
                    const ext = imageType.split('/')[1] || 'png';
                    const file = new File([blob], `colado-${Date.now()}.${ext}`, { type: imageType });
                    files.push(file);
                  }
                }
                if (files.length > 0) {
                  const remaining = 5 - referenceFiles.length;
                  const toAdd = files.slice(0, remaining);
                  onReferenceFilesChange([...referenceFiles, ...toAdd]);
                  toast.success(`${toAdd.length} imagem(ns) colada(s)`);
                } else {
                  toast.error('Nenhuma imagem encontrada na área de transferência');
                }
              } catch {
                toast.error('Não foi possível acessar a área de transferência. Use Ctrl+V no campo.');
              }
            }}
            className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 min-w-[100px] border-border/50 bg-muted/10"
          >
            <ClipboardPaste className="h-6 w-6 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground text-center font-medium">Colar imagem</p>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={referenceFiles.length >= 5}
          onChange={e => {
            const files = Array.from(e.target.files || []);
            const remaining = 5 - referenceFiles.length;
            const toAdd = files.slice(0, remaining);
            if (files.length > remaining) toast.error(`Máximo 5 imagens. ${toAdd.length} adicionada(s).`);
            onReferenceFilesChange([...referenceFiles, ...toAdd]);
          }}
        />

        {referenceFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {referenceFiles.map((file, idx) => (
              <div key={idx} className="relative group flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                <ImagePlus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate max-w-[120px] text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleTogglePreserve(idx)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                    preserveImageIndices.includes(idx)
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }`}
                  title="Preservar traços desta imagem"
                >
                  {preserveImageIndices.includes(idx) ? "Preservando" : "Preservar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
