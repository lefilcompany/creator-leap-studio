import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_COSTS } from "@/lib/creditCosts";

interface ImageAdjustmentProps {
  imageUrl: string;
  brandId?: string;
  themeId?: string;
  credits: number;
  onAdjust: (newImageUrl: string) => void;
  onContinue: () => void;
  onCreditsUpdate: () => void;
}

export const ImageAdjustment = ({
  imageUrl,
  brandId,
  themeId,
  credits,
  onAdjust,
  onContinue,
  onCreditsUpdate
}: ImageAdjustmentProps) => {
  const [adjustmentPrompt, setAdjustmentPrompt] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<string[]>([imageUrl]);

  const handleAdjust = async () => {
    if (!adjustmentPrompt.trim()) {
      toast.error("Digite o que deseja ajustar na imagem");
      return;
    }

    if (credits < CREDIT_COSTS.IMAGE_EDIT) {
      toast.error("Créditos insuficientes para ajustar a imagem");
      return;
    }

    setIsAdjusting(true);

    try {
      const { data, error } = await supabase.functions.invoke('adjust-image', {
        body: {
          imageUrl: adjustmentHistory[adjustmentHistory.length - 1],
          adjustmentPrompt,
          brandId,
          themeId,
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAdjustmentHistory(prev => [...prev, data.adjustedImageUrl]);
      onAdjust(data.adjustedImageUrl);
      setAdjustmentPrompt("");
      toast.success("Imagem ajustada com sucesso!");
      onCreditsUpdate();

    } catch (error) {
      console.error("Erro ao ajustar imagem:", error);
      toast.error("Erro ao ajustar imagem. Tente novamente.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const currentImage = adjustmentHistory[adjustmentHistory.length - 1];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Ajustar Imagem com IA</h2>
            <p className="text-muted-foreground">
              Solicite ajustes à IA ou continue para editar no canvas
            </p>
          </div>

          <Card className="p-6">
            <div className="aspect-square w-full max-w-xl mx-auto bg-muted rounded-lg overflow-hidden">
              <img
                src={currentImage}
                alt="Imagem gerada"
                className="w-full h-full object-contain"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>O que você gostaria de ajustar?</Label>
              <Textarea
                placeholder="Ex: Deixar o céu mais azul, adicionar mais contraste, melhorar a iluminação..."
                value={adjustmentPrompt}
                onChange={(e) => setAdjustmentPrompt(e.target.value)}
                rows={4}
                disabled={isAdjusting}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Ajustes realizados: {adjustmentHistory.length - 1}</span>
              <span>Custo: 1 crédito por ajuste</span>
            </div>

            <Button
              onClick={handleAdjust}
              disabled={isAdjusting || !adjustmentPrompt.trim() || credits < CREDIT_COSTS.IMAGE_EDIT}
              className="w-full"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajustando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ajustar com IA (1 crédito)
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>

      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button variant="outline" onClick={onContinue}>
            Pular Ajustes
          </Button>
          <Button onClick={onContinue}>
            Continuar para Canvas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
