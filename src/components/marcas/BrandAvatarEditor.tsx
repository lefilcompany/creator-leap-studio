'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AVATAR_COLORS = [
  '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#319795',
  '#3182CE', '#5A67D8', '#805AD5', '#D53F8C', '#718096',
  '#E11D48', '#0891B2', '#059669', '#7C3AED', '#EA580C',
  '#2563EB', '#4F46E5', '#9333EA', '#C026D3', '#475569',
];

interface BrandAvatarEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
  currentColor: string | null;
  currentAvatarUrl: string | null;
  onSave: (color: string | null, avatarUrl: string | null) => void;
}

export function BrandAvatarEditor({
  open,
  onOpenChange,
  brandId,
  brandName,
  currentColor,
  currentAvatarUrl,
  onSave,
}: BrandAvatarEditorProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(currentColor);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = brandName.charAt(0).toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${brandId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('brand-avatars')
        .getPublicUrl(path);

      setAvatarUrl(urlData.publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!avatarUrl) return;

    try {
      // Extract path from URL
      const urlParts = avatarUrl.split('/brand-avatars/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('brand-avatars').remove([filePath]);
      }
    } catch (err) {
      console.error('Error removing file:', err);
    }

    setAvatarUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(selectedColor, avatarUrl);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedColor(currentColor);
      setAvatarUrl(currentAvatarUrl);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Top accent bar */}
        <div className="flex justify-center -mt-2 mb-2">
          <div
            className="h-1.5 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: selectedColor || 'hsl(var(--primary))',
              width: '60%',
            }}
          />
        </div>

        <DialogHeader>
          <DialogTitle>Editar avatar da marca</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Preview */}
          <div
            className="flex justify-center py-6 rounded-xl transition-colors duration-300"
            style={{
              backgroundColor: selectedColor
                ? `${selectedColor}18`
                : 'hsl(var(--muted))',
            }}
          >
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={brandName}
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-border/10"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 ring-border/10"
                  style={{ backgroundColor: selectedColor || 'hsl(var(--primary))' }}
                >
                  {initial}
                </div>
              )}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Cor identificadora</p>
            <div className="grid grid-cols-10 gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center text-white text-xs font-bold ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-110 hover:ring-2 hover:ring-offset-1 hover:ring-border'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {initial}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Foto / Logo da marca</p>
            
            {avatarUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/20">
                <img
                  src={avatarUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">Imagem da marca</p>
                  <p className="text-xs text-muted-foreground">Clique em remover para trocar</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border/30 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isUploading ? 'Enviando...' : 'Clique para enviar uma imagem'}
                </span>
                <span className="text-xs text-muted-foreground/60">PNG, JPG ou WebP até 5MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
