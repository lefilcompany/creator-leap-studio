import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { Palette, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface CategorySettingsPanelProps {
  name: string;
  description: string | null;
  color: string;
  onSave: (data: { name: string; description?: string; color: string }) => void;
  isSaving: boolean;
}

export function CategorySettingsPanel({ name: initialName, description: initialDesc, color: initialColor, onSave, isSaving }: CategorySettingsPanelProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDesc || '');
  const [color, setColor] = useState(initialColor || COLORS[0]);

  const hasChanges = name !== initialName || description !== (initialDesc || '') || color !== (initialColor || COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, color });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-bold text-sm">Nome</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da categoria"
          className="rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-sm">
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Descreva o propósito desta categoria..."
          className="rounded-lg resize-none"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="font-bold text-sm">Cor</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-lg border-2 transition-all active:scale-90 hover:scale-105 flex items-center justify-center"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
              }}
            >
              {color === c && <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-8 h-8 rounded-lg border-2 transition-all active:scale-90 hover:scale-105 flex items-center justify-center",
                  !COLORS.includes(color) ? "border-foreground" : "border-border"
                )}
                style={{
                  backgroundColor: !COLORS.includes(color) ? color : 'transparent',
                }}
              >
                <Palette className="h-3.5 w-3.5" style={{
                  color: !COLORS.includes(color) ? 'white' : 'hsl(var(--muted-foreground))',
                  mixBlendMode: !COLORS.includes(color) ? 'difference' : undefined,
                }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 rounded-xl" side="bottom" align="start">
              <div className="space-y-3">
                <HexColorPicker color={color} onChange={setColor} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono select-none">#</span>
                  <Input
                    value={color.replace('#', '')}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                      if (v.length === 6) setColor('#' + v);
                    }}
                    className="h-8 text-xs font-mono rounded-lg"
                    maxLength={6}
                  />
                  <div className="w-8 h-8 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: color }} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-5 h-5 rounded-md" style={{ backgroundColor: color }} />
          <span className="text-xs text-muted-foreground font-mono">{color}</span>
        </div>
      </div>

      {hasChanges && (
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="w-full rounded-xl h-10 font-semibold transition-all active:scale-[0.98]"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      )}
    </div>
  );
}
