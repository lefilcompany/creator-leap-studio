import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";

interface FinalizeViewProps {
  imageUrl: string;
  caption: {
    title: string;
    body: string;
    hashtags: string;
  };
  onSave: () => void;
  onDownload: () => void;
  isSaving: boolean;
}

export const FinalizeView = ({
  imageUrl,
  caption,
  onSave,
  onDownload,
  isSaving
}: FinalizeViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Conteúdo Finalizado!</h2>
            <p className="text-muted-foreground">
              Revise seu conteúdo antes de salvar
            </p>
          </div>

          <Card className="p-6">
            <div className="aspect-square w-full max-w-xl mx-auto bg-muted rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Conteúdo final"
                className="w-full h-full object-contain"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Título</h3>
              <p className="text-sm">{caption.title}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Legenda</h3>
              <p className="text-sm whitespace-pre-wrap">{caption.body}</p>
            </div>

            {caption.hashtags && (
              <div>
                <h3 className="font-semibold mb-2">Hashtags</h3>
                <p className="text-sm text-primary">{caption.hashtags}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button variant="outline" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Imagem
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar no Histórico
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
