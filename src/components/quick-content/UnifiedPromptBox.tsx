import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

interface UnifiedPromptBoxProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  referenceFiles: File[];
  onReferenceFilesChange: (files: File[]) => void;
  preserveImageIndices: number[];
  onPreserveImageIndicesChange: (indices: number[]) => void;
}

export function UnifiedPromptBox({
  prompt,
  onPromptChange,
  referenceFiles,
  onReferenceFilesChange,
  preserveImageIndices,
  onPreserveImageIndicesChange,
}: UnifiedPromptBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const remaining = 5 - referenceFiles.length;
      const toAdd = files.slice(0, remaining);
      onReferenceFilesChange([...referenceFiles, ...toAdd]);
      toast.success(`${toAdd.length} imagem(ns) adicionada(s)`);
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

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
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
        toast.error("Nenhuma imagem encontrada na área de transferência");
      }
    } catch {
      toast.error("Não foi possível acessar a área de transferência. Use Ctrl+V no campo.");
    }
  };

  return (
    <div className="space-y-2.5">
      <div>
        <Label htmlFor="quick-description" className="text-base font-bold text-foreground">
          Descreva sua criação
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quanto mais detalhes, melhor o resultado. Inclua cenário, cores, estilo e elementos desejados.
        </p>
      </div>

      {/* Unified card: textarea + references */}
      <div className="rounded-2xl shadow-lg overflow-hidden border-0 bg-card transition-shadow focus-within:shadow-xl" onPaste={handlePaste}>
        {/* Textarea */}
        <div className="p-4 md:p-5 pb-2">
          <Textarea
            id="quick-description"
            placeholder="Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com estética minimalista e cores quentes"
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            rows={4}
            className="resize-none border-0 bg-transparent p-0 text-base placeholder:text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
          />
        </div>

        {/* Attached files thumbnails inside card */}
        {referenceFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 md:px-5 pb-2">
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
                <button type="button" onClick={() => handleRemoveFile(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom toolbar: references actions */}
        <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 border-t border-border/20 bg-muted/10">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Referências</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span>Selecionar imagem</span>
          </button>
          <button
            type="button"
            onClick={handleClipboardPaste}
            className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span>Colar imagem</span>
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">{referenceFiles.length}/5</span>
        </div>
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
    </div>
  );
}
