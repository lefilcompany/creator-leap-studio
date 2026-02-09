'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Edit, Trash2, Tag, ExternalLink, FileDown, Palette, Calendar, User } from 'lucide-react';
import type { Brand, MoodboardFile, ColorItem } from '@/types/brand';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import BrandDialog from '@/components/marcas/BrandDialog';
import { toast } from 'sonner';

type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl border border-border/20 overflow-hidden">
    <div className="px-5 py-3 border-b border-border/20 bg-muted/30">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const DetailField = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
};

const FileDetailField = ({ label, file }: { label: string; file?: MoodboardFile | null }) => {
  if (!file || !file.content) return null;
  const isImage = file.type.startsWith('image/');

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {isImage ? (
        <div className="relative group rounded-lg overflow-hidden border border-border/30">
          <img src={file.content} alt={file.name} className="w-full max-h-64 object-cover" />
          <a
            href={file.content}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ExternalLink className="text-white h-6 w-6" />
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <FileDown className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="flex-grow truncate">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <a href={file.content} download={file.name} className="text-xs text-primary hover:underline">
              Baixar arquivo
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const ColorPaletteDisplay = ({ colors }: { colors?: ColorItem[] | null }) => {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((color) => (
        <div key={color.id} className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-xl border-2 border-border/40 shadow-sm"
            style={{ backgroundColor: color.hex }}
            title={`${color.name || 'Cor'} - ${color.hex}`}
          />
          <div className="text-center">
            <div className="text-xs font-medium text-foreground truncate max-w-[70px]">{color.name || 'Sem nome'}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{color.hex.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function BrandView() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const { user, team, refreshTeamData, refreshUserCredits } = useAuth();
  const { t } = useTranslation();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadBrand = useCallback(async () => {
    if (!brandId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).single();
      if (error) throw error;

      setBrand({
        id: data.id,
        teamId: data.team_id,
        userId: data.user_id,
        name: data.name,
        responsible: data.responsible,
        segment: data.segment,
        values: data.values || '',
        keywords: data.keywords || '',
        goals: data.goals || '',
        inspirations: data.inspirations || '',
        successMetrics: data.success_metrics || '',
        references: data.brand_references || '',
        specialDates: data.special_dates || '',
        promise: data.promise || '',
        crisisInfo: data.crisis_info || '',
        milestones: data.milestones || '',
        collaborations: data.collaborations || '',
        restrictions: data.restrictions || '',
        moodboard: data.moodboard as unknown as MoodboardFile | null,
        logo: data.logo as unknown as MoodboardFile | null,
        referenceImage: data.reference_image as unknown as MoodboardFile | null,
        colorPalette: data.color_palette as unknown as ColorItem[] | null,
        brandColor: (data as any).brand_color || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } catch (error) {
      console.error('Erro ao carregar marca:', error);
      toast.error('Erro ao carregar detalhes da marca');
      navigate('/brands');
    } finally {
      setIsLoading(false);
    }
  }, [brandId, navigate]);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const handleSaveBrand = useCallback(async (formData: BrandFormData) => {
    if (!user?.id || !brand) return;
    const toastId = 'brand-update';
    try {
      toast.loading(t.brands.updating, { id: toastId });
      const { error } = await supabase
        .from('brands')
        .update({
          name: formData.name,
          responsible: formData.responsible,
          segment: formData.segment,
          values: formData.values,
          keywords: formData.keywords,
          goals: formData.goals,
          inspirations: formData.inspirations,
          success_metrics: formData.successMetrics,
          brand_references: formData.references,
          special_dates: formData.specialDates,
          promise: formData.promise,
          crisis_info: formData.crisisInfo,
          milestones: formData.milestones,
          collaborations: formData.collaborations,
          restrictions: formData.restrictions,
          moodboard: formData.moodboard as any,
          logo: formData.logo as any,
          reference_image: formData.referenceImage as any,
          color_palette: formData.colorPalette as any,
          brand_color: formData.brandColor,
        } as any)
        .eq('id', brand.id);

      if (error) throw error;
      toast.success(t.brands.updateSuccess, { id: toastId });
      setIsDialogOpen(false);
      loadBrand();
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      toast.error(t.brands.saveError, { id: toastId });
      throw error;
    }
  }, [brand, user, t, loadBrand]);

  const handleDeleteBrand = useCallback(async () => {
    if (!brand) return;
    const toastId = 'brand-delete';
    try {
      toast.loading(t.brands.deleting, { id: toastId });
      const { error } = await supabase.from('brands').delete().eq('id', brand.id);
      if (error) throw error;
      toast.success(t.brands.deleteSuccess, { id: toastId });
      navigate('/brands');
    } catch (error) {
      console.error('Erro ao deletar marca:', error);
      toast.error(t.brands.deleteError, { id: toastId });
    }
  }, [brand, navigate, t]);

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
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Tag className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold">Marca não encontrada</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/brands')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para marcas
        </Button>
      </div>
    );
  }

  const brandColor = brand.brandColor || 'hsl(var(--primary))';
  const wasUpdated = brand.createdAt !== brand.updatedAt;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-card border-b border-border/30 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/brands')} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{brand.name}</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {brand.responsible}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(brand.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso irá deletar permanentemente a marca &quot;{brand.name}&quot;.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteBrand} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" onClick={() => setIsDialogOpen(true)} className="rounded-lg">
              <Edit className="mr-1.5 h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Informações Gerais">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DetailField label="Segmento" value={brand.segment} />
                <DetailField label="Valores" value={brand.values} />
                <DetailField label="Palavras-Chave" value={brand.keywords} />
                <DetailField label="Promessa Única" value={brand.promise} />
              </div>
            </SectionCard>

            <SectionCard title="Estratégia">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DetailField label="Metas do Negócio" value={brand.goals} />
                <DetailField label="Indicadores de Sucesso" value={brand.successMetrics} />
                <DetailField label="Inspirações" value={brand.inspirations} />
                <DetailField label="Referências de Conteúdo" value={brand.references} />
              </div>
            </SectionCard>

            <SectionCard title="Detalhes Adicionais">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DetailField label="Datas Especiais" value={brand.specialDates} />
                <DetailField label="Marcos e Cases" value={brand.milestones} />
                <DetailField label="Restrições" value={brand.restrictions} />
                <DetailField label="Crises (Existentes ou Potenciais)" value={brand.crisisInfo} />
                <DetailField label="Colaborações e Ações com Influenciadores" value={brand.collaborations} />
              </div>
            </SectionCard>
          </div>

          {/* Sidebar - visual assets */}
          <div className="space-y-6">
            <SectionCard title="Identidade Visual">
              <div className="space-y-5">
                <FileDetailField label="Logo da Marca" file={brand.logo} />
                <FileDetailField label="Imagem de Referência" file={brand.referenceImage} />
                <FileDetailField label="Moodboard" file={brand.moodboard} />
              </div>
            </SectionCard>

            {brand.colorPalette && brand.colorPalette.length > 0 && (
              <SectionCard title="Paleta de Cores">
                <ColorPaletteDisplay colors={brand.colorPalette} />
              </SectionCard>
            )}

            {brand.brandColor && (
              <SectionCard title="Cor Identificadora">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-border/40" style={{ backgroundColor: brand.brandColor }} />
                  <span className="text-sm text-muted-foreground font-mono">{brand.brandColor}</span>
                </div>
              </SectionCard>
            )}

            <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
              <p>Criado em: {formatDate(brand.createdAt)}</p>
              {wasUpdated && <p>Atualizado em: {formatDate(brand.updatedAt)}</p>}
            </div>
          </div>
        </div>
      </div>

      <BrandDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveBrand}
        brandToEdit={brand}
      />
    </div>
  );
}
