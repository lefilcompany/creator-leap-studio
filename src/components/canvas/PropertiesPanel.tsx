import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AVAILABLE_FONTS, FONT_WEIGHTS } from "@/types/canvas";
import { FabricObject, Textbox } from 'fabric';
import { PropertySection } from "./PropertySection";
import { PropertyInput } from "./PropertyInput";

interface PropertiesPanelProps {
  selectedObject: FabricObject | null;
  onPropertyChange: (property: string, value: any) => void;
}

export const PropertiesPanel = ({ selectedObject, onPropertyChange }: PropertiesPanelProps) => {
  if (!selectedObject) {
    return (
      <div className="w-80 bg-card border-l border-border p-8 flex items-center justify-center">
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
    <ScrollArea className="w-80 bg-card border-l border-border h-full">
      <div className="p-4 space-y-6">
        <div className="border-b border-border pb-2">
          <h3 className="font-semibold text-sm">Propriedades</h3>
        </div>

        {/* Propriedades Gerais */}
        <PropertySection title="Geral">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Opacidade</Label>
            <div className="space-y-2">
              <Slider
                value={[opacity]}
                onValueChange={([value]) => onPropertyChange('opacity', value / 100)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-right text-muted-foreground">
                {Math.round(opacity)}%
              </div>
            </div>
          </div>
        </PropertySection>

        {/* Posição & Tamanho */}
        <PropertySection title="Posição & Tamanho">
          <div className="grid grid-cols-2 gap-2">
            <PropertyInput
              label="X"
              type="number"
              value={Math.round(selectedObject.left || 0)}
              onChange={(v) => onPropertyChange('left', v)}
            />
            <PropertyInput
              label="Y"
              type="number"
              value={Math.round(selectedObject.top || 0)}
              onChange={(v) => onPropertyChange('top', v)}
            />
            <PropertyInput
              label="Largura"
              type="number"
              value={Math.round(selectedObject.getScaledWidth())}
              onChange={(v) => {
                const scale = v / (selectedObject.width || 1);
                onPropertyChange('scaleX', scale);
              }}
            />
            <PropertyInput
              label="Altura"
              type="number"
              value={Math.round(selectedObject.getScaledHeight())}
              onChange={(v) => {
                const scale = v / (selectedObject.height || 1);
                onPropertyChange('scaleY', scale);
              }}
            />
          </div>
          <PropertyInput
            label="Rotação"
            type="number"
            value={Math.round(selectedObject.angle || 0)}
            onChange={(v) => onPropertyChange('angle', v)}
            suffix="°"
            min={0}
            max={360}
          />
        </PropertySection>

        {/* Propriedades de Texto */}
        {isText && (
          <>
            <PropertySection title="Texto">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fonte</Label>
                  <Select
                    value={(selectedObject as Textbox).fontFamily || 'Roboto'}
                    onValueChange={(value) => onPropertyChange('fontFamily', value)}
                  >
                    <SelectTrigger className="h-8">
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

                <PropertyInput
                  label="Tamanho"
                  type="number"
                  value={(selectedObject as Textbox).fontSize || 24}
                  onChange={(v) => onPropertyChange('fontSize', v)}
                  min={8}
                  max={200}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Peso</Label>
                  <Select
                    value={String((selectedObject as Textbox).fontWeight || 400)}
                    onValueChange={(value) => onPropertyChange('fontWeight', parseInt(value))}
                  >
                    <SelectTrigger className="h-8">
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

                <PropertyInput
                  label="Cor do Texto"
                  type="color"
                  value={fill}
                  onChange={(v) => onPropertyChange('fill', v)}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Alinhamento</Label>
                  <Select
                    value={(selectedObject as Textbox).textAlign || 'left'}
                    onValueChange={(value) => onPropertyChange('textAlign', value)}
                  >
                    <SelectTrigger className="h-8">
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
            </PropertySection>
          </>
        )}

        {/* Propriedades de Forma */}
        {!isText && (
          <PropertySection title="Aparência">
            <div className="space-y-3">
              <PropertyInput
                label="Preenchimento"
                type="color"
                value={fill}
                onChange={(v) => onPropertyChange('fill', v)}
              />

              <PropertyInput
                label="Borda"
                type="color"
                value={stroke}
                onChange={(v) => onPropertyChange('stroke', v)}
              />

              <PropertyInput
                label="Espessura da Borda"
                type="number"
                value={(selectedObject as any).strokeWidth || 0}
                onChange={(v) => onPropertyChange('strokeWidth', v)}
                min={0}
                max={20}
              />
            </div>
          </PropertySection>
        )}
      </div>
    </ScrollArea>
  );
};
