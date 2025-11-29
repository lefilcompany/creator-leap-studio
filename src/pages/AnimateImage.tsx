import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AnimateImage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [animationPrompt, setAnimationPrompt] = useState<string>(
    "Use a imagem fornecida como base para animar componentes específicos. A animação deve ser discreta, com movimentos leves, como um suave balanço ou deslocamento. Foque em animar as seguintes partes:\n\nPessoas: Um movimento sutil nos braços ou cabeça, como se estivessem conversando ou se movendo lentamente.\n\nProduto: Um movimento suave, como um brilho ou efeito de rotação leve.\n\nObjeto: Se houver algum objeto na cena, adicione uma leve translação ou efeito de luz que destaca o objeto de forma delicada.\n\nOs movimentos devem ser naturais e quase imperceptíveis, sem tirar o foco da cena principal. A animação deve ser realista e sutil, criando uma sensação de vida sem exageros."
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="h-full w-full flex flex-col">
      <div className="max-w-5xl mx-auto flex flex-col w-full px-4 sm:px-6 lg:px-0 gap-8">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-500 rounded-lg p-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Animar Imagem</h1>
                <p className="text-muted-foreground text-base">
                  Transforme suas imagens em animações com IA
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Esta funcionalidade está em desenvolvimento. O agente de IA ainda está sendo treinado
            para animar imagens.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Imagem para Animar
              </h2>
              <p className="text-sm text-muted-foreground">
                Faça upload da imagem que deseja animar
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-upload">Selecionar Imagem</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
              </div>

              {imagePreview && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto object-contain"
                  />
                </div>
              )}

              {!imagePreview && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma imagem selecionada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Prompt de Animação
              </h2>
              <p className="text-sm text-muted-foreground">
                Descreva como deseja que a imagem seja animada
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="animation-prompt">Instruções para Animação</Label>
                <Textarea
                  id="animation-prompt"
                  value={animationPrompt}
                  onChange={(e) => setAnimationPrompt(e.target.value)}
                  placeholder="Descreva os movimentos e efeitos desejados..."
                  className="min-h-[200px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Seja específico sobre quais elementos devem ser animados e como
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <Button
              disabled={!selectedImage}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Animar Imagem
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Funcionalidade em desenvolvimento - Agente de IA em treinamento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
