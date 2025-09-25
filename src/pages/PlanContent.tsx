import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Wand2 } from "lucide-react";

const PlanContent = () => {
  const [formData, setFormData] = useState({
    brand: "",
    theme: "",
    platform: "",
    quantity: "1",
    objective: "",
    additionalInfo: ""
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePlan = () => {
    console.log("Generating content plan with:", formData);
    // Here would be the AI planning logic
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 bg-purple-50 px-4 py-3 rounded-lg">
          <Calendar className="w-5 h-5 text-purple-600" />
          <div>
            <h1 className="text-xl font-semibold">Planejar Conteúdo</h1>
            <p className="text-sm text-muted-foreground">Preencha os campos para gerar seu planejamento de posts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Planejamento Ilimitado</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card className="creator-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Configuração Básica
              </CardTitle>
              <CardDescription>Defina marca, tema e plataforma</CardDescription>
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
                <Label htmlFor="theme">Tema Estratégico *</Label>
                <Select onValueChange={(value) => updateFormData("theme", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receitas">Receitas tradicionais</SelectItem>
                    <SelectItem value="familia">Momentos em família</SelectItem>
                    <SelectItem value="tradicao">Tradição e memória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="platform">Plataforma *</Label>
                <Select onValueChange={(value) => updateFormData("platform", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
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
                <Label htmlFor="quantity">Quantidade de Posts (1-7) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.quantity}
                  onChange={(e) => updateFormData("quantity", e.target.value)}
                  placeholder="1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Planning Details */}
          <Card className="creator-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Detalhes do Planejamento
              </CardTitle>
              <CardDescription>Descreva os objetivos e informações adicionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="objective">Objetivo dos Posts *</Label>
                <Textarea
                  placeholder="Ex: Gerar engajamento, educar o público, aumentar vendas..."
                  value={formData.objective}
                  onChange={(e) => updateFormData("objective", e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="additionalInfo">Informações Adicionais</Label>
                <Textarea
                  placeholder="Ex: Usar cores da marca, focar em jovens de 18-25 anos..."
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData("additionalInfo", e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={generatePlan}
                className="w-full creator-button-primary"
                disabled={!formData.brand || !formData.theme || !formData.platform || !formData.objective}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Gerar Planejamento
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Plan Preview */}
        <Card className="creator-card mt-6">
          <CardHeader>
            <CardTitle>Preview do Planejamento</CardTitle>
            <CardDescription>Aqui aparecerá o planejamento gerado pela IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Preencha o formulário acima e clique em "Gerar Planejamento" para ver o resultado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanContent;