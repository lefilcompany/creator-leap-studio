import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, ImageIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MoodboardFile } from '@/types/brand';

interface VisualFileUploadProps {
  label: string;
  file: MoodboardFile | null;
  brandId: string;
  folder: string;
  onUpdate: (file: MoodboardFile | null) => void;
}

function VisualFileUpload({ label, file, brandId, folder, onUpdate }: VisualFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem.');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const ext = selected.name.split('.').pop() || 'png';
      const path = `${brandId}/${folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-avatars')
        .upload(path, selected, { cacheControl: '3600', upsert: true, contentType: selected.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('brand-avatars')
        .getPublicUrl(path);

      onUpdate({
        name: selected.name,
        type: selected.type,
        content: urlData.publicUrl,
      });

      toast.success(`${label} carregado com sucesso!`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Erro ao fazer upload do ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (file?.content) {
      try {
        const urlParts = file.content.split('/brand-avatars/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('brand-avatars').remove([filePath]);
        }
      } catch (err) {
        console.error('Error removing file:', err);
      }
    }
    onUpdate(null);
  };

  const isImage = file?.content && (file.type?.startsWith('image/') || file.content.startsWith('http'));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>

      {file?.content ? (
        <div className="relative group rounded-xl overflow-hidden border border-border/10 shadow-sm">
          {isImage ? (
            <img src={file.content} alt={file.name || label} className="w-full max-h-48 object-cover" />
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted/30">
              <ImageIcon className="h-8 w-8 text-primary flex-shrink-0" />
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
            {isImage && (
              <a
                href={file.content}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ExternalLink className="text-white h-5 w-5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-full bg-destructive/80 hover:bg-destructive transition-colors"
            >
              <X className="text-white h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex flex-col items-center gap-1.5 p-4 border-2 border-dashed border-border/30 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isUploading ? 'Enviando...' : `Enviar ${label.toLowerCase()}`}
          </span>
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
  );
}

interface BrandVisualIdentityProps {
  brandId: string;
  logo: MoodboardFile | null;
  referenceImage: MoodboardFile | null;
  moodboard: MoodboardFile | null;
  onUpdate: (field: 'logo' | 'referenceImage' | 'moodboard', file: MoodboardFile | null) => void;
}

export function BrandVisualIdentity({ brandId, logo, referenceImage, moodboard, onUpdate }: BrandVisualIdentityProps) {
  return (
    <div className="space-y-5">
      <VisualFileUpload
        label="Logo da Marca"
        file={logo}
        brandId={brandId}
        folder="logo"
        onUpdate={(f) => onUpdate('logo', f)}
      />
      <VisualFileUpload
        label="Imagem de Referência"
        file={referenceImage}
        brandId={brandId}
        folder="reference"
        onUpdate={(f) => onUpdate('referenceImage', f)}
      />
      <VisualFileUpload
        label="Moodboard"
        file={moodboard}
        brandId={brandId}
        folder="moodboard"
        onUpdate={(f) => onUpdate('moodboard', f)}
      />
    </div>
  );
}
