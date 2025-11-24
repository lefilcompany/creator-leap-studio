import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AVAILABLE_FONTS, FONT_WEIGHTS } from "@/types/canvas";
import { FabricObject, Textbox } from 'fabric';

interface PropertiesPanelProps {
  selectedObject: FabricObject | null;
  onPropertyChange: (property: string, value: any) => void;
}

export const PropertiesPanel = ({ selectedObject, onPropertyChange }: PropertiesPanelProps) => {
  if (!selectedObject) {
    return (
      <div className="w-64 bg-card border-l border-border p-4">
        <p className="text-sm text-muted-foreground text-center">
          Selecione um elemento para editar suas propriedades
        </p>
      </div>
    );
  }

  const isText = selectedObject instanceof Textbox;
  const fill = selectedObject.fill as string || '#000000';
  const stroke = (selectedObject as any).stroke as string || '#000000';
  const opacity = (selectedObject.opacity || 1) * 100;

  return (
    <div className="w-64 bg-card border-l border-border p-4 overflow-y-auto max-h-screen">
      <h3 className="font-semibold text-sm mb-4">Propriedades</h3>

      {isText && (
        <>
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Label className="text-xs">Fonte</Label>
              <Select
                value={(selectedObject as Textbox).fontFamily || 'Roboto'}
                onValueChange={(value) => onPropertyChange('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tamanho da Fonte</Label>
              <Input
                type="number"
                value={(selectedObject as Textbox).fontSize || 24}
                onChange={(e) => onPropertyChange('fontSize', parseInt(e.target.value))}
                min={8}
                max={200}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Peso da Fonte</Label>
              <Select
                value={String((selectedObject as Textbox).fontWeight || 400)}
                onValueChange={(value) => onPropertyChange('fontWeight', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((weight) => (
                    <SelectItem key={weight} value={String(weight)}>
                      {weight}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Cor do Texto</Label>
              <Input
                type="color"
                value={fill}
                onChange={(e) => onPropertyChange('fill', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Alinhamento</Label>
              <Select
                value={(selectedObject as Textbox).textAlign || 'left'}
                onValueChange={(value) => onPropertyChange('textAlign', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {!isText && (
        <>
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Label className="text-xs">Cor de Preenchimento</Label>
              <Input
                type="color"
                value={fill}
                onChange={(e) => onPropertyChange('fill', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Cor da Borda</Label>
              <Input
                type="color"
                value={stroke}
                onChange={(e) => onPropertyChange('stroke', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Espessura da Borda</Label>
              <Input
                type="number"
                value={(selectedObject as any).strokeWidth || 0}
                onChange={(e) => onPropertyChange('strokeWidth', parseInt(e.target.value))}
                min={0}
                max={20}
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Opacidade ({Math.round(opacity)}%)</Label>
          <Slider
            value={[opacity]}
            onValueChange={([value]) => onPropertyChange('opacity', value / 100)}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Rotação</Label>
          <Input
            type="number"
            value={Math.round(selectedObject.angle || 0)}
            onChange={(e) => onPropertyChange('angle', parseInt(e.target.value))}
            min={0}
            max={360}
          />
        </div>
      </div>
    </div>
  );
};
