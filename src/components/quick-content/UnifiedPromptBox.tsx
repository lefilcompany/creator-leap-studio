import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, ImageIcon, X, Paintbrush, ChevronDown } from "lucide-react";
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
    <div className="rounded-2xl shadow-lg overflow-hidden border border-border/50 bg-card transition-shadow focus-within:shadow-xl focus-within:border-primary/30">
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

        {/* Reference images preview inline */}
        {referenceFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/20">
            {referenceFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative group flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs border border-border/30 hover:border-border/50 transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
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

      {/* Bottom toolbar */}
      <div className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 border-t border-border/20 bg-muted/10">
        {/* Add image button */}
        <button
          type="button"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-[0.95]"
          onClick={() => fileInputRef.current?.click()}
          title="Adicionar imagens de referência"
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            onReferenceFilesChange([...referenceFiles, ...files].slice(0, 5));
          }}
        />

        {/* Visual style toggle */}
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

        {/* Reference count */}
        {referenceFiles.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 ml-1">
            <ImageIcon className="h-3 w-3" />
            {referenceFiles.length}
          </Badge>
        )}

        <div className="flex-1" />

        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Cole imagens com Ctrl+V
        </p>
      </div>
    </div>
  );
}
