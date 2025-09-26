import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Palette } from 'lucide-react';
import type { ColorItem } from '@/types/brand';

interface ColorPickerProps {
  colors: ColorItem[];
  onColorsChange: (colors: ColorItem[]) => void;
  maxColors?: number;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export function ColorPicker({ colors, onColorsChange, maxColors = 8 }: ColorPickerProps) {
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const addColor = () => {
    if (colors.length >= maxColors) return;
    
    const rgb = hexToRgb(newColorHex);
    if (!rgb) return;

    const newColor: ColorItem = {
      id: Date.now().toString(),
      name: newColorName || `Cor ${colors.length + 1}`,
      hex: newColorHex,
      rgb,
    };

    onColorsChange([...colors, newColor]);
    setNewColorName('');
    setNewColorHex('#000000');
  };

  const removeColor = (id: string) => {
    onColorsChange(colors.filter(color => color.id !== id));
  };

  const updateColor = (id: string, field: 'name' | 'hex', value: string) => {
    onColorsChange(
      colors.map(color =>
        color.id === id
          ? {
              ...color,
              [field]: value,
              ...(field === 'hex' ? { rgb: hexToRgb(value) || color.rgb } : {}),
            }
          : color
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-muted-foreground" />
        <Label className="text-base font-medium">Paleta de Cores</Label>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {colors.length}/{maxColors}
        </span>
      </div>

      {colors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colors.map(color => (
            <div key={color.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="color"
                value={color.hex}
                onChange={e => updateColor(color.id, 'hex', e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
              />
              <div className="flex-1 space-y-2">
                <Input
                  value={color.name}
                  onChange={e => updateColor(color.id, 'name', e.target.value)}
                  placeholder="Nome da cor"
                  className="h-8 text-sm"
                />
                <Input
                  value={color.hex}
                  onChange={e => updateColor(color.id, 'hex', e.target.value)}
                  className="h-8 text-sm font-mono"
                  maxLength={7}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeColor(color.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {colors.length < maxColors && (
        <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
          <input
            type="color"
            value={newColorHex}
            onChange={e => setNewColorHex(e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
          />
          <Input
            value={newColorName}
            onChange={e => setNewColorName(e.target.value)}
            placeholder="Nome da cor"
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addColor()}
          />
          <Button onClick={addColor} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}