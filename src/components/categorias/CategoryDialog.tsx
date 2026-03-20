import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2 } from 'lucide-react';
import type { ActionCategory } from '@/types/category';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ActionCategory | null;
  onSave: (data: { name: string; description?: string; color: string; visibility: 'personal' | 'team' }) => void;
  isSaving: boolean;
  hasTeam: boolean;
}

export function CategoryDialog({ open, onOpenChange, category, onSave, isSaving, hasTeam }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [visibility, setVisibility] = useState<'personal' | 'team'>('personal');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color);
      setVisibility(category.visibility);
    } else {
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      setVisibility('personal');
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, color, visibility });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Campanhas de Natal" autoFocus />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o propósito desta categoria..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Cor</Label>
            <div className="flex gap-2 flex-wrap">
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
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Visibilidade</Label>
            <NativeSelect
              value={visibility}
              onValueChange={(v) => setVisibility(v as 'personal' | 'team')}
              options={[
                { value: 'personal', label: 'Apenas eu' },
                ...(hasTeam ? [{ value: 'team', label: 'Visível para a equipe' }] : []),
              ]}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!name.trim() || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
