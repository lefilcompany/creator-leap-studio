import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, ImageIcon, X, Info } from "lucide-react";
import { toast } from "sonner";

const VISUAL_STYLES = [
  { value: "realistic", label: "Fotorealístico", emoji: "📷" },
  { value: "animated", label: "Animado / 3D", emoji: "🎮" },
  { value: "cartoon", label: "Cartoon", emoji: "🎨" },
  { value: "anime", label: "Anime", emoji: "🌸" },
  { value: "watercolor", label: "Aquarela", emoji: "💧" },
  { value: "oil_painting", label: "Óleo", emoji: "🖼️" },
  { value: "digital_art", label: "Arte Digital", emoji: "✨" },
  { value: "sketch", label: "Esboço", emoji: "✏️" },
  { value: "minimalist", label: "Minimalista", emoji: "◻️" },
  { value: "vintage", label: "Vintage", emoji: "📻" },
] as const;

interface ReferenceFile {
  file: File;
  preserveTraits: boolean;
}

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
    <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border/50">
      {/* Main textarea area */}
      <div className="p-4 md:p-5" onPaste={handlePaste}>
        <Textarea
          id="quick-description"
          placeholder="Descreva o que você quer criar... Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com estética minimalista e cores quentes"
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          rows={4}
          className="resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
        />

        {/* Reference images preview inline */}
        {referenceFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
            {referenceFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative group flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs border border-border/30"
              >
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate max-w-[120px] text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleTogglePreserve(idx)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                    preserveImageIndices.includes(idx)
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted border-border/50 text-muted-foreground hover:border-primary/30"
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

      {/* Visual style tags */}
      {showStyles && (
        <div className="px-4 md:px-5 pb-3 border-t border-border/30 pt-3">
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">Estilo Visual</Label>
          <div className="flex flex-wrap gap-1.5">
            {VISUAL_STYLES.map(style => (
              <button
                key={style.value}
                type="button"
                onClick={() => {
                  onVisualStyleChange(style.value);
                  setShowStyles(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  visualStyle === style.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-foreground hover:bg-muted border border-border/40"
                }`}
              >
                <span>{style.emoji}</span>
                <span>{style.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 px-4 md:px-5 py-3 border-t border-border/30 bg-muted/20">
        {/* Add image button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="Adicionar imagens de referência"
        >
          <Plus className="h-4 w-4" />
        </Button>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground px-2"
          onClick={() => setShowStyles(!showStyles)}
        >
          <span className="text-sm">{selectedStyleLabel?.emoji || "🎨"}</span>
          <span className="text-xs font-medium">{selectedStyleLabel?.label || "Estilo"}</span>
        </Button>

        {/* Reference count */}
        {referenceFiles.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
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
