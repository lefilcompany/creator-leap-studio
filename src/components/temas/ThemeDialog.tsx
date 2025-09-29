import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StrategicTheme } from "@/types/theme";
import type { BrandSummary } from "@/types/brand";

interface ThemeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (theme: Omit<StrategicTheme, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>) => Promise<StrategicTheme>;
  themeToEdit: StrategicTheme | null;
  brands: BrandSummary[];
}

export default function ThemeDialog({ 
  isOpen, 
  onOpenChange, 
  onSave, 
  themeToEdit, 
  brands 
}: ThemeDialogProps) {
  const [formData, setFormData] = useState({
    brandId: '',
    title: '',
    description: '',
    colorPalette: '',
    toneOfVoice: '',
    targetAudience: '',
    hashtags: '',
    objectives: '',
    contentFormat: '',
    macroThemes: '',
    bestFormats: '',
    platforms: '',
    expectedAction: '',
    additionalInfo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (themeToEdit) {
      setFormData({
        brandId: themeToEdit.brandId,
        title: themeToEdit.title,
        description: themeToEdit.description,
        colorPalette: themeToEdit.colorPalette,
        toneOfVoice: themeToEdit.toneOfVoice,
        targetAudience: themeToEdit.targetAudience,
        hashtags: themeToEdit.hashtags,
        objectives: themeToEdit.objectives,
        contentFormat: themeToEdit.contentFormat,
        macroThemes: themeToEdit.macroThemes,
        bestFormats: themeToEdit.bestFormats,
        platforms: themeToEdit.platforms,
        expectedAction: themeToEdit.expectedAction,
        additionalInfo: themeToEdit.additionalInfo,
      });
    } else {
      setFormData({
        brandId: '',
        title: '',
        description: '',
        colorPalette: '',
        toneOfVoice: '',
        targetAudience: '',
        hashtags: '',
        objectives: '',
        contentFormat: '',
        macroThemes: '',
        bestFormats: '',
        platforms: '',
        expectedAction: '',
        additionalInfo: '',
      });
    }
  }, [themeToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brandId || !formData.title.trim() || !formData.description.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {themeToEdit ? 'Editar Tema' : 'Novo Tema Estratégico'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Marca */}
          <div className="space-y-2">
            <Label htmlFor="brandId">Marca *</Label>
            <Select 
              value={formData.brandId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, brandId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Digite o título do tema"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o tema estratégico"
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tom de Voz */}
            <div className="space-y-2">
              <Label htmlFor="toneOfVoice">Tom de Voz</Label>
              <Select 
                value={formData.toneOfVoice} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, toneOfVoice: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="amigavel">Amigável</SelectItem>
                  <SelectItem value="serio">Sério</SelectItem>
                  <SelectItem value="inspirador">Inspirador</SelectItem>
                  <SelectItem value="divertido">Divertido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paleta de Cores */}
            <div className="space-y-2">
              <Label htmlFor="colorPalette">Paleta de Cores</Label>
              <Input
                id="colorPalette"
                value={formData.colorPalette}
                onChange={(e) => setFormData(prev => ({ ...prev, colorPalette: e.target.value }))}
                placeholder="Ex: #FF6B6B, #4ECDC4, #45B7D1"
              />
            </div>
          </div>

          {/* Público-Alvo */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Público-Alvo</Label>
            <Textarea
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="Descreva o público-alvo"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              value={formData.hashtags}
              onChange={(e) => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
              placeholder="Ex: #marketing #digital #inovacao"
            />
          </div>

          {/* Objetivos */}
          <div className="space-y-2">
            <Label htmlFor="objectives">Objetivos</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
              placeholder="Descreva os objetivos estratégicos"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formato de Conteúdo */}
            <div className="space-y-2">
              <Label htmlFor="contentFormat">Formato de Conteúdo</Label>
              <Input
                id="contentFormat"
                value={formData.contentFormat}
                onChange={(e) => setFormData(prev => ({ ...prev, contentFormat: e.target.value }))}
                placeholder="Ex: Posts, Stories, Reels"
              />
            </div>

            {/* Melhores Formatos */}
            <div className="space-y-2">
              <Label htmlFor="bestFormats">Melhores Formatos</Label>
              <Input
                id="bestFormats"
                value={formData.bestFormats}
                onChange={(e) => setFormData(prev => ({ ...prev, bestFormats: e.target.value }))}
                placeholder="Ex: Carrossel, Vídeo, Texto"
              />
            </div>
          </div>

          {/* Macro Temas */}
          <div className="space-y-2">
            <Label htmlFor="macroThemes">Macro Temas</Label>
            <Textarea
              id="macroThemes"
              value={formData.macroThemes}
              onChange={(e) => setFormData(prev => ({ ...prev, macroThemes: e.target.value }))}
              placeholder="Descreva os macro temas abordados"
            />
          </div>

          {/* Plataformas */}
          <div className="space-y-2">
            <Label htmlFor="platforms">Plataformas</Label>
            <Input
              id="platforms"
              value={formData.platforms}
              onChange={(e) => setFormData(prev => ({ ...prev, platforms: e.target.value }))}
              placeholder="Ex: Instagram, LinkedIn, Facebook"
            />
          </div>

          {/* Ação Esperada */}
          <div className="space-y-2">
            <Label htmlFor="expectedAction">Ação Esperada</Label>
            <Input
              id="expectedAction"
              value={formData.expectedAction}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedAction: e.target.value }))}
              placeholder="Ex: Engajamento, Conversão, Awareness"
            />
          </div>

          {/* Informações Adicionais */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Informações Adicionais</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
              placeholder="Outras informações relevantes"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.brandId || !formData.title.trim() || !formData.description.trim()}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {isSubmitting ? 'Salvando...' : themeToEdit ? 'Atualizar' : 'Criar Tema'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}