'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Tag, Calendar, User, Save, Loader2, Sparkles, Target, LayoutGrid, List, Info, Palette } from 'lucide-react';
import type { ColorItem } from '@/types/brand';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'input' | 'textarea';
  placeholder?: string;
}

const EditableField = ({ label, value, onChange, type = 'textarea', placeholder }: EditableFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</Label>
    {type === 'input' ? (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="bg-background/80 backdrop-blur-sm border-border/20 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
      />
    ) : (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="bg-background/80 backdrop-blur-sm border-border/20 focus:border-primary/50 focus:ring-primary/20 min-h-[100px] max-h-[200px] resize-y transition-all duration-200"
      />
    )}
  </div>
);

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
}

const SectionCard = ({ title, icon, children, accentColor }: SectionCardProps) => (
  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
    <div
      className="px-5 py-3.5 border-b border-border/10 flex items-center gap-2.5"
      style={accentColor ? { background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03)` } : {}}
    >
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface ThemeData {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  target_audience: string;
  tone_of_voice: string;
  objectives: string;
  color_palette: string;
  hashtags: string;
  content_format: string;
  macro_themes: string;
  best_formats: string;
  platforms: string;
  expected_action: string;
  additional_info: string | null;
  created_at: string;
  updated_at: string;
  team_id: string | null;
  user_id: string;
}

interface BrandData {
  id: string;
  name: string;
  brand_color: string | null;
  avatar_url: string | null;
}

export default function ThemeView() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const viewMode = (location.state as any)?.viewMode || 'grid';
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [colorPalette, setColorPalette] = useState<ColorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef<Record<string, string>>({});
  const originalColorPaletteRef = useRef<ColorItem[]>([]);

  const loadTheme = useCallback(async () => {
    if (!themeId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('strategic_themes').select('*').eq('id', themeId).single();
      if (error) throw error;
      setTheme(data);

      // Load brand info
      const { data: brandData } = await supabase
        .from('brands')
        .select('id, name, brand_color, avatar_url')
        .eq('id', data.brand_id)
        .single();
      setBrand(brandData || null);

      // Parse color palette
      let parsedColors: ColorItem[] = [];
      if (data.color_palette) {
        try {
          parsedColors = JSON.parse(data.color_palette);
        } catch (e) { /* ignore */ }
      }
      setColorPalette(parsedColors);
      originalColorPaletteRef.current = [...parsedColors];

      const initial: Record<string, string> = {
        title: data.title,
        description: data.description,
        toneOfVoice: data.tone_of_voice,
        targetAudience: data.target_audience,
        objectives: data.objectives,
        macroThemes: data.macro_themes,
        expectedAction: data.expected_action,
        contentFormat: data.content_format,
        bestFormats: data.best_formats,
        platforms: data.platforms,
        hashtags: data.hashtags,
        additionalInfo: data.additional_info || '',
      };
      setFormData(initial);
      originalRef.current = { ...initial };
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      toast.error('Erro ao carregar detalhes do tema');
      navigate('/themes');
    } finally {
      setIsLoading(false);
    }
  }, [themeId, navigate]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const colorPaletteRef = useRef<ColorItem[]>([]);
  useEffect(() => { colorPaletteRef.current = colorPalette; }, [colorPalette]);

  const checkHasChanges = useCallback((nextFormData: Record<string, string>, nextPalette?: ColorItem[]) => {
    const textChanged = Object.keys(nextFormData).some(k => nextFormData[k] !== originalRef.current[k]);
    const paletteToCheck = nextPalette ?? colorPaletteRef.current;
    const paletteChanged = JSON.stringify(paletteToCheck) !== JSON.stringify(originalColorPaletteRef.current);
    setHasChanges(textChanged || paletteChanged);
  }, []);

  const updateField = (key: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      checkHasChanges(next);
      return next;
    });
  };

  const handleColorPaletteChange = useCallback((colors: ColorItem[]) => {
    setColorPalette(colors);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !theme) return;
    setIsSaving(true);
    const toastId = 'theme-update';
    try {
      toast.loading('Salvando alterações...', { id: toastId });
      const { error } = await supabase
        .from('strategic_themes')
        .update({
          title: formData.title,
          description: formData.description,
          tone_of_voice: formData.toneOfVoice,
          target_audience: formData.targetAudience,
          objectives: formData.objectives,
          macro_themes: formData.macroThemes,
          expected_action: formData.expectedAction,
          content_format: formData.contentFormat,
          best_formats: formData.bestFormats,
          platforms: formData.platforms,
          hashtags: formData.hashtags,
          additional_info: formData.additionalInfo,
          color_palette: colorPalette.length > 0 ? JSON.stringify(colorPalette) : '',
        })
        .eq('id', theme.id);

      if (error) throw error;
      toast.success('Tema atualizado com sucesso!', { id: toastId });
      originalRef.current = { ...formData };
      originalColorPaletteRef.current = [...colorPalette];
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['theme', theme.id] });
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      toast.error('Erro ao salvar tema', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [theme, user, formData, colorPalette, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!theme) return;
    const toastId = 'theme-delete';
    try {
      toast.loading('Deletando tema...', { id: toastId });
      const { error } = await supabase.from('strategic_themes').delete().eq('id', theme.id);
      if (error) throw error;
      toast.success('Tema deletado com sucesso!', { id: toastId });
      navigate('/themes');
    } catch (error) {
      console.error('Erro ao deletar tema:', error);
      toast.error('Erro ao deletar tema', { id: toastId });
    }
  }, [theme, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Palette className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold">Tema não encontrado</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/themes')}>
          Voltar para temas
        </Button>
      </div>
    );
  }

  const brandColor = brand?.brand_color || 'hsl(var(--primary))';
  const wasUpdated = theme.created_at !== theme.updated_at;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Hero Header with gradient */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brandColor}18, ${brandColor}08, hsl(var(--background)))`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] blur-3xl"
          style={{ backgroundColor: brandColor }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-[0.03] blur-3xl"
          style={{ backgroundColor: brandColor }}
        />

        <div className="relative px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <PageBreadcrumb
              items={[
                { 
                  label: 'Temas', 
                  href: '/themes',
                  state: { viewMode },
                  icon: viewMode === 'list' 
                    ? <List className="h-3.5 w-3.5" /> 
                    : <LayoutGrid className="h-3.5 w-3.5" />
                },
                { label: formData.title || theme.title },
              ]}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {brand?.avatar_url ? (
                <img
                  src={brand.avatar_url}
                  alt={brand.name}
                  className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-4 ring-white/20"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg ring-4 ring-white/20"
                  style={{ backgroundColor: brandColor }}
                >
                  {(brand?.name || theme.title).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{formData.title || theme.title}</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {brand?.name || 'Marca não definida'}</span>
                  <span className="text-border/50">•</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(theme.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl border-border/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                    <Trash2 className="mr-1.5 h-4 w-4" /> Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser desfeita. Isso irá deletar permanentemente o tema &quot;{theme.title}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editable fields */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Informações Gerais" icon={<Info className="h-4 w-4" />} accentColor={brandColor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EditableField label="Título" value={formData.title || ''} onChange={(v) => updateField('title', v)} type="input" />
                <EditableField label="Descrição" value={formData.description || ''} onChange={(v) => updateField('description', v)} />
                <EditableField label="Tom de Voz" value={formData.toneOfVoice || ''} onChange={(v) => updateField('toneOfVoice', v)} />
                <EditableField label="Público-Alvo" value={formData.targetAudience || ''} onChange={(v) => updateField('targetAudience', v)} />
              </div>
            </SectionCard>

            <SectionCard title="Estratégia" icon={<Target className="h-4 w-4" />} accentColor={brandColor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EditableField label="Objetivos" value={formData.objectives || ''} onChange={(v) => updateField('objectives', v)} />
                <EditableField label="Macro Temas" value={formData.macroThemes || ''} onChange={(v) => updateField('macroThemes', v)} />
                <EditableField label="Ação Esperada" value={formData.expectedAction || ''} onChange={(v) => updateField('expectedAction', v)} />
                <EditableField label="Hashtags" value={formData.hashtags || ''} onChange={(v) => updateField('hashtags', v)} />
              </div>
            </SectionCard>

            <SectionCard title="Formatos e Plataformas" icon={<Sparkles className="h-4 w-4" />} accentColor={brandColor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EditableField label="Formato de Conteúdo" value={formData.contentFormat || ''} onChange={(v) => updateField('contentFormat', v)} />
                <EditableField label="Melhores Formatos" value={formData.bestFormats || ''} onChange={(v) => updateField('bestFormats', v)} />
                <EditableField label="Plataformas" value={formData.platforms || ''} onChange={(v) => updateField('platforms', v)} />
                <EditableField label="Informações Adicionais" value={formData.additionalInfo || ''} onChange={(v) => updateField('additionalInfo', v)} />
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SectionCard title="Paleta de Cores" icon={<Palette className="h-4 w-4" />} accentColor={brandColor}>
              <ColorPicker
                colors={colorPalette}
                onColorsChange={handleColorPaletteChange}
                maxColors={8}
                compact
              />
            </SectionCard>

            <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 text-xs text-muted-foreground space-y-1.5 border border-border/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary/60" />
                <p>Criado em: {formatDate(theme.created_at)}</p>
              </div>
              {wasUpdated && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary/60" />
                  <p>Atualizado em: {formatDate(theme.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
