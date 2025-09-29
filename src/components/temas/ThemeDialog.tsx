import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
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
    targetAudience: '',
    tone: '',
    objectives: [] as string[],
    keyMessages: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [newKeyMessage, setNewKeyMessage] = useState('');

  useEffect(() => {
    if (themeToEdit) {
      setFormData({
        brandId: themeToEdit.brandId,
        title: themeToEdit.title,
        description: themeToEdit.description,
        targetAudience: themeToEdit.targetAudience,
        tone: themeToEdit.tone,
        objectives: themeToEdit.objectives || [],
        keyMessages: themeToEdit.keyMessages || []
      });
    } else {
      setFormData({
        brandId: '',
        title: '',
        description: '',
        targetAudience: '',
        tone: '',
        objectives: [],
        keyMessages: []
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

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addKeyMessage = () => {
    if (newKeyMessage.trim()) {
      setFormData(prev => ({
        ...prev,
        keyMessages: [...prev.keyMessages, newKeyMessage.trim()]
      }));
      setNewKeyMessage('');
    }
  };

  const removeKeyMessage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyMessages: prev.keyMessages.filter((_, i) => i !== index)
    }));
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

          {/* Tom de Voz */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom de Voz</Label>
            <Select 
              value={formData.tone} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
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

          {/* Objetivos */}
          <div className="space-y-2">
            <Label>Objetivos</Label>
            <div className="flex gap-2">
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Adicionar objetivo"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
              />
              <Button type="button" onClick={addObjective} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.objectives.length > 0 && (
              <div className="space-y-1">
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                    <span className="flex-1 text-sm">{objective}</span>
                    <Button
                      type="button"
                      onClick={() => removeObjective(index)}
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensagens-Chave */}
          <div className="space-y-2">
            <Label>Mensagens-Chave</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyMessage}
                onChange={(e) => setNewKeyMessage(e.target.value)}
                placeholder="Adicionar mensagem-chave"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyMessage())}
              />
              <Button type="button" onClick={addKeyMessage} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.keyMessages.length > 0 && (
              <div className="space-y-1">
                {formData.keyMessages.map((message, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                    <span className="flex-1 text-sm">{message}</span>
                    <Button
                      type="button"
                      onClick={() => removeKeyMessage(index)}
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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