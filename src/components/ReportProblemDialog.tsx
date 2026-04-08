import { useState, useRef } from "react";
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
import { AlertTriangle, Upload, X, Loader2, ImageIcon } from "lucide-react";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - screenshots.length;
    if (files.length > remaining) {
      toast.error(`Você pode enviar no máximo 3 imagens`);
    }
    const toAdd = files.slice(0, remaining);
    setScreenshots((prev) => [...prev, ...toAdd]);
    setPreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      // Upload screenshots
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

      // Insert report
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

      // Send email notification
      try {
        await supabase.functions.invoke("send-report-email", {
          body: {
            userName: user.name,
            userEmail: user.email,
            teamName: user.teamName || null,
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
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reportar problema
          </DialogTitle>
          <DialogDescription>
            Descreva o problema encontrado na geração. Nossa equipe irá analisar e buscar uma solução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Problem Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipo do problema *</Label>
            <RadioGroup value={problemType} onValueChange={setProblemType} className="grid grid-cols-2 gap-2">
              {PROBLEM_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={`flex items-center space-x-2 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                    problemType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="cursor-pointer text-sm">
                    {type.label}
                  </Label>
                </div>
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
              className="min-h-[100px]"
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
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px]">Enviar</span>
                </button>
              )}
            </div>
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
