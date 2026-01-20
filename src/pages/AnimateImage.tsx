import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, AlertCircle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

export default function AnimateImage() {
  const { toast } = useToast();
  const { user, team } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [animationPrompt, setAnimationPrompt] = useState<string>(
    "Use a imagem fornecida como base para animar componentes específicos. A animação deve ser discreta, com movimentos leves, como um suave balanço ou deslocamento. Foque em animar as seguintes partes:\n\nPessoas: Um movimento sutil nos braços ou cabeça, como se estivessem conversando ou se movendo lentamente.\n\nProduto: Um movimento suave, como um brilho ou efeito de rotação leve.\n\nObjeto: Se houver algum objeto na cena, adicione uma leve translação ou efeito de luz que destaca o objeto de forma delicada.\n\nOs movimentos devem ser naturais e quase imperceptíveis, sem tirar o foco da cena principal. A animação deve ser realista e sutil, criando uma sensação de vida sem exageros."
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 10MB.",
        });
        return;
      }

      // Validar formato
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validFormats.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Use apenas imagens JPG, PNG ou WEBP.",
        });
        return;
      }

      setSelectedImage(file);
      setProcessingStatus("idle");
      setErrorMessage("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnimateImage = async () => {
    if (!selectedImage || !user || !team) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione uma imagem e faça login para continuar.",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("uploading");
    setProgress(10);
    setErrorMessage("");

    try {
      // Converter imagem para base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const imageData = reader.result as string;
          setProgress(30);
          setProcessingStatus("processing");

          // Chamar edge function
          const { data, error } = await supabase.functions.invoke('animate-image', {
            body: {
              imageData,
              animationPrompt,
              userId: user.id,
              teamId: team.id,
            },
          });

          setProgress(90);

          if (error) {
            throw new Error(error.message || "Erro ao processar animação");
          }

          // Verificar status da resposta
          if (data?.error) {
            if (data.error.includes("Créditos insuficientes")) {
              setProcessingStatus("error");
              setErrorMessage("Créditos insuficientes. Recarregue seus créditos para continuar.");
              toast({
                variant: "destructive",
                title: "Créditos insuficientes",
                description: `Você precisa de ${data.required || 15} créditos. Disponível: ${data.available || 0}`,
              });
            } else if (data.error.includes("Limite de requisições")) {
              setProcessingStatus("error");
              setErrorMessage("Limite de requisições excedido. Tente novamente em alguns instantes.");
              toast({
                variant: "destructive",
                title: "Limite excedido",
                description: "Aguarde alguns instantes antes de tentar novamente.",
              });
            } else {
              throw new Error(data.error);
            }
            return;
          }

          // Verificar se está em desenvolvimento
          if (data?.status === "training") {
            setProgress(100);
            setProcessingStatus("error");
            setErrorMessage("Funcionalidade em desenvolvimento. O agente de IA ainda está sendo treinado.");
            toast({
              variant: "default",
              title: "Em desenvolvimento",
              description: "Esta funcionalidade estará disponível em breve!",
            });
            return;
          }

          // Sucesso (quando implementado)
          setProgress(100);
          setProcessingStatus("success");
          toast({
            title: "Animação concluída!",
            description: "Sua imagem foi animada com sucesso.",
          });

          // TODO: Exibir resultado do vídeo quando implementado
          // setVideoResult(data.videoUrl);

        } catch (err) {
          console.error("Erro ao animar imagem:", err);
          setProcessingStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido");
          toast({
            variant: "destructive",
            title: "Erro ao animar",
            description: err instanceof Error ? err.message : "Ocorreu um erro inesperado.",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setProcessingStatus("error");
        setErrorMessage("Erro ao ler o arquivo de imagem");
        setIsProcessing(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível ler o arquivo de imagem.",
        });
      };

      reader.readAsDataURL(selectedImage);
    } catch (err) {
      console.error("Erro geral:", err);
      setProcessingStatus("error");
      setErrorMessage("Erro ao iniciar o processo de animação");
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível iniciar a animação.",
      });
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

        <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5">
          <CardContent className="p-6 space-y-4">
            <Button
              disabled={!selectedImage || isProcessing}
              onClick={handleAnimateImage}
              className="w-full group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              size="lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 relative z-10 animate-spin" />
                  <span className="relative z-10">Processando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2 relative z-10 group-hover:animate-pulse" />
                  <span className="relative z-10">Animar Imagem</span>
                </>
              )}
            </Button>

            {isProcessing && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {processingStatus === "uploading" && "Preparando imagem..."}
                    {processingStatus === "processing" && "Processando animação..."}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {processingStatus === "success" && (
              <Alert className="bg-green-500/10 border-green-500/30 animate-fade-in">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Animação concluída com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {processingStatus === "error" && errorMessage && (
              <Alert className="bg-destructive/10 border-destructive/30 animate-fade-in">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {processingStatus === "idle" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center font-medium">
                  🎬 Funcionalidade em desenvolvimento - Agente de IA em treinamento
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
