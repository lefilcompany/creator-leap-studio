import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { Palette, Loader2 } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="font-bold">Nome</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="font-bold">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Descreva o propósito desta categoria..." />
      </div>

      <div className="space-y-2">
        <Label className="font-bold">Cor</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform active:scale-90 hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
              }}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-transform active:scale-90 hover:scale-110 flex items-center justify-center",
                  !COLORS.includes(color) ? "border-foreground" : "border-border"
                )}
                style={{
                  backgroundColor: !COLORS.includes(color) ? color : 'transparent',
                }}
              >
                <Palette className="h-3.5 w-3.5 text-muted-foreground" style={{
                  color: !COLORS.includes(color) ? 'white' : undefined,
                  mixBlendMode: !COLORS.includes(color) ? 'difference' : undefined,
                }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" side="bottom" align="start">
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
                    className="h-8 text-xs font-mono"
                    maxLength={6}
                  />
                  <div className="w-8 h-8 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: color }} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasChanges && (
        <Button onClick={handleSave} disabled={!name.trim() || isSaving} className="w-full">
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      )}
    </div>
  );
}
