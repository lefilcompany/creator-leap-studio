import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Image as ImageIcon, Video, Wand2, Upload, X } from "lucide-react";

const CreateContent = () => {
  const [contentType, setContentType] = useState("image");
  const [formData, setFormData] = useState({
    brand: "",
    theme: "",
    persona: "",
    platform: "",
    targetAudience: "",
    referenceImage: null as File | null,
    objective: "",
    visualDescription: "",
    tone: [],
    extraInfo: ""
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTone = (tone: string) => {
    if (!formData.tone.includes(tone)) {
      updateFormData("tone", [...formData.tone, tone]);
    }
  };

  const removeTone = (tone: string) => {
    updateFormData("tone", formData.tone.filter(t => t !== tone));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData("referenceImage", file);
    }
  };

  const generateContent = () => {
    console.log("Generating content with:", formData);
    // Here would be the AI content generation logic
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 bg-pink-50 px-4 py-3 rounded-lg">
          <Sparkles className="w-5 h-5 text-pink-600" />
          <div>
            <h1 className="text-xl font-semibold">Criar Conteúdo</h1>
            <p className="text-sm text-muted-foreground">Preencha os campos para gerar um post com IA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={contentType === "image" ? "default" : "outline"}
            onClick={() => setContentType("image")}
            className={contentType === "image" ? "creator-button-primary" : ""}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Imagem
          </Button>
          <Button
            variant={contentType === "video" ? "default" : "outline"}
            onClick={() => setContentType("video")}
            className={contentType === "video" ? "creator-button-primary" : ""}
          >
            <Video className="w-4 h-4 mr-2" />
            Vídeo
            <Badge variant="secondary" className="ml-2">BETA</Badge>
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">9836 Criações Restantes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card className="creator-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              Configuração Básica
            </CardTitle>
            <CardDescription>Defina marca, tema e público</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="brand">Marca *</Label>
              <Select onValueChange={(value) => updateFormData("brand", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acucar-petribu">Açúcar Petribu</SelectItem>
                  <SelectItem value="ceramica-brennand">Cerâmica Brennand</SelectItem>
                  <SelectItem value="iclub">Iclub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="theme">Tema Estratégico</Label>
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

            <div>
              <Label htmlFor="persona">Persona</Label>
              <Select onValueChange={(value) => updateFormData("persona", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Primeiro, escolha a marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mae-carinhosa">Mãe Carinhosa</SelectItem>
                  <SelectItem value="jovem-independente">Jovem Independente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="platform">Plataforma *</Label>
              <Select onValueChange={(value) => updateFormData("platform", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Onde será postado?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audience">Público-Alvo *</Label>
              <Input
                placeholder="Ex: Jovens de 16-25 anos"
                value={formData.targetAudience}
                onChange={(e) => updateFormData("targetAudience", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="reference">Imagem de Referência *</Label>
              <div className="border-2 border-dashed border-input rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <Button variant="outline" asChild>
                    <span>Escolher arquivos</span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.referenceImage ? formData.referenceImage.name : "Nenhum arquivo escolhido"}
                  </p>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Cole sua imagem aqui (Ctrl+V)</p>
            </div>
          </CardContent>
        </Card>

        {/* Content Details */}
        <Card className="creator-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Detalhes do Conteúdo
            </CardTitle>
            <CardDescription>Descreva o objetivo e características do post</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="objective">Objetivo do Post *</Label>
              <Textarea
                placeholder="Qual a principal meta? (ex: gerar engajamento, anunciar um produto, educar)"
                value={formData.objective}
                onChange={(e) => updateFormData("objective", e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="visual">Descrição Visual da Imagem *</Label>
              <Textarea
                placeholder="Como um diretor de arte: descreva a cena, iluminação e emoção."
                value={formData.visualDescription}
                onChange={(e) => updateFormData("visualDescription", e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tone">Tom de Voz * (máximo 4)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tone.map((tone) => (
                  <Badge key={tone} variant="secondary" className="flex items-center gap-1">
                    {tone}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeTone(tone)}
                    />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Adicionar tom de voz..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    addTone(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum tom selecionado
              </p>
            </div>

            <div>
              <Label htmlFor="extra">Informações Extras</Label>
              <Textarea
                placeholder="Detalhes cruciais (ex: usar a cor #FF5733, incluir nosso logo...)"
                value={formData.extraInfo}
                onChange={(e) => updateFormData("extraInfo", e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={generateContent}
              className="w-full creator-button-primary"
              disabled={!formData.brand || !formData.platform || !formData.objective}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Gerar Conteúdo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateContent;