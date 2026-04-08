import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Upload, X, Loader2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PROBLEM_TYPES = [
  { value: "distorted_image", label: "Imagem distorcida" },
  { value: "incorrect_text", label: "Texto incorreto" },
  { value: "generation_error", label: "Erro de geração" },
  { value: "other", label: "Outro" },
] as const;

interface ReportProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId?: string;
  actionType?: string;
}

export function ReportProblemDialog({
  open,
  onOpenChange,
  actionId,
  actionType,
}: ReportProblemDialogProps) {
  const { user } = useAuth();
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const remaining = 3 - screenshots.length;
    if (remaining <= 0) {
      toast.error("Limite de 3 imagens atingido");
      return;
    }
    const toAdd = imageFiles.slice(0, remaining);
    setScreenshots((prev) => [...prev, ...toAdd]);
    setPreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  }, [screenshots.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle paste from clipboard
  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
        toast.success("Imagem colada com sucesso!");
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open, addFiles]);

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setProblemType("");
    setDescription("");
    previewUrls.forEach(URL.revokeObjectURL);
    setScreenshots([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async () => {
    if (!problemType || !description.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of screenshots) {
        const ext = file.name.split(".").pop() || "png";
        const path = `reports/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("content-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("content-images")
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: insertError } = await supabase
        .from("generation_reports")
        .insert({
          user_id: user.id,
          team_id: user.teamId || null,
          action_id: actionId || null,
          action_type: actionType || null,
          problem_type: problemType,
          description: description.trim(),
          screenshot_urls: uploadedUrls,
        });
      if (insertError) throw insertError;

      try {
        await supabase.functions.invoke("send-report-email", {
          body: {
            userName: user.name,
            userEmail: user.email,
            teamName: null,
            problemType,
            description: description.trim(),
            screenshotUrls: uploadedUrls,
            actionId,
            actionType,
          },
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
      }

      toast.success("Problema reportado com sucesso! Nossa equipe irá analisar.");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Erro ao enviar o report. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent ref={dialogRef} className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto [&_*]:outline-none [&_*]:ring-0 [&_*]:ring-offset-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reportar problema
          </DialogTitle>
          <DialogDescription>
            Descreva o problema encontrado na geração. Nossa equipe irá analisar e buscar uma solução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Problem Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Tipo do problema *</Label>
            <RadioGroup value={problemType} onValueChange={setProblemType} className="grid grid-cols-2 gap-1.5">
              {PROBLEM_TYPES.map((type) => (
                <label
                  key={type.value}
                  htmlFor={type.value}
                  className={`flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    problemType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={type.value} id={type.value} />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="report-description" className="text-sm font-semibold">
              Descrição do problema *
            </Label>
            <Textarea
              id="report-description"
              placeholder="Descreva detalhadamente o que aconteceu de errado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Capturas de tela (opcional, máx. 3)
            </Label>
            <div className="flex flex-wrap gap-3">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {screenshots.length < 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Enviar</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const items = await navigator.clipboard.read();
                        const imageFiles: File[] = [];
                        for (const item of items) {
                          const imageType = item.types.find(t => t.startsWith("image/"));
                          if (imageType) {
                            const blob = await item.getType(imageType);
                            const ext = imageType.split("/")[1] || "png";
                            const file = new File([blob], `pasted-image.${ext}`, { type: imageType });
                            imageFiles.push(file);
                          }
                        }
                        if (imageFiles.length > 0) {
                          addFiles(imageFiles);
                          toast.success("Imagem colada com sucesso!");
                        } else {
                          toast.error("Nenhuma imagem encontrada na área de transferência");
                        }
                      } catch {
                        toast.info("Use Ctrl+V para colar uma imagem da área de transferência");
                      }
                    }}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ClipboardPaste className="h-5 w-5" />
                    <span className="text-xs">Colar</span>
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Você também pode colar imagens com <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Ctrl+V</kbd>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!problemType || !description.trim() || isSubmitting}
              className="rounded-xl gap-2 bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Enviar Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
