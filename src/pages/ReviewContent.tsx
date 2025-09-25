import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Wand2, Image as ImageIcon } from "lucide-react";

const ReviewContent = () => {
  const [formData, setFormData] = useState({
    brand: "",
    theme: "",
    image: null as File | null,
    feedback: ""
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData("image", file);
    }
  };

  const analyzeImage = () => {
    console.log("Analyzing image with:", formData);
    // Here would be the AI image analysis logic
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 bg-teal-50 px-4 py-3 rounded-lg">
          <CheckCircle className="w-5 h-5 text-teal-600" />
          <div>
            <h1 className="text-xl font-semibold">Revisar Conteúdo</h1>
            <p className="text-sm text-muted-foreground">Receba sugestões da IA para aprimorar sua imagem</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">9926 Revisões Restantes</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card className="creator-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                Configuração Básica
              </CardTitle>
              <CardDescription>Defina marca e tema para contextualizar a IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Marca (Opcional)</label>
                <Select onValueChange={(value) => updateFormData("brand", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acucar-petribu">Açúcar Petribu</SelectItem>
                    <SelectItem value="ceramica-brennand">Cerâmica Brennand</SelectItem>
                    <SelectItem value="iclub">Iclub</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Tema Estratégico (Opcional)</label>
                <Select onValueChange={(value) => updateFormData("theme", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Primeiro, escolha a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receitas">Receitas tradicionais</SelectItem>
                    <SelectItem value="familia">Momentos em família</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Image Analysis */}
          <Card className="creator-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Análise da Imagem
              </CardTitle>
              <CardDescription>Envie a imagem e descreva o que precisa melhorar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sua Imagem *</label>
                <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Arraste e solte ou clique para enviar
                    </p>
                    <Button variant="outline" asChild>
                      <span>Escolher arquivo</span>
                    </Button>
                    {formData.image && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {formData.image.name}
                      </p>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">O que você gostaria de ajustar? *</label>
                <Textarea
                  placeholder='Descreva o objetivo e o que você espera da imagem. Ex: "Quero que a imagem transmita mais energia e seja mais vibrante"'
                  value={formData.feedback}
                  onChange={(e) => updateFormData("feedback", e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={analyzeImage}
                className="w-full creator-button-primary"
                disabled={!formData.image || !formData.feedback}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Analisar Imagem
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReviewContent;