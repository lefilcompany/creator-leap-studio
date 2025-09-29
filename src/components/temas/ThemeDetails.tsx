import { Edit2, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { StrategicTheme } from '@/types/theme';
import type { BrandSummary } from '@/types/brand';

interface ThemeDetailsProps {
  theme: StrategicTheme | null;
  onEdit: (theme: StrategicTheme) => void;
  onDelete: (themeId: string) => void;
  brands: BrandSummary[];
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const DetailField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/10">
    <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
    {value ? (
      typeof value === 'string' ? (
        <p className="font-semibold text-foreground break-words">{value}</p>
      ) : (
        value
      )
    ) : (
      <p className="text-muted-foreground italic">Não informado</p>
    )}
  </div>
);

export default function ThemeDetails({ theme, onEdit, onDelete, brands, isLoading = false }: ThemeDetailsProps) {
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="bg-secondary/10 rounded-full p-6 mb-4">
          <Palette className="h-12 w-12 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum tema selecionado
        </h3>
        <p className="text-muted-foreground text-sm">
          Selecione um tema na lista para ver os detalhes.
        </p>
      </div>
    );
  }

  const brandName = brands.find(b => b.id === theme.brandId)?.name || 'Marca não encontrada';

  return (
    <div className="h-full bg-card/80 backdrop-blur-sm rounded-2xl border border-secondary/20 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-secondary/10 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-full p-4">
              <Palette className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">{theme.title}</h2>
              <p className="text-sm text-muted-foreground">{brandName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onEdit(theme)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O tema "{theme.title}" será permanentemente deletado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(theme.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Informações Básicas */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações Básicas</h3>
          <div className="space-y-4">
            <DetailField label="Descrição" value={theme.description} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Tom de Voz" value={theme.toneOfVoice} />
              <DetailField label="Paleta de Cores" value={theme.colorPalette} />
            </div>
          </div>
        </div>

        {/* Estratégia */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Estratégia</h3>
          <div className="space-y-4">
            <DetailField label="Público-Alvo" value={theme.targetAudience} />
            <DetailField label="Objetivos" value={theme.objectives} />
            <DetailField label="Macro Temas" value={theme.macroThemes} />
            <DetailField label="Ação Esperada" value={theme.expectedAction} />
          </div>
        </div>

        {/* Formato e Plataformas */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Formato e Plataformas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Formato de Conteúdo" value={theme.contentFormat} />
            <DetailField label="Melhores Formatos" value={theme.bestFormats} />
            <DetailField label="Plataformas" value={theme.platforms} />
            <DetailField label="Hashtags" value={theme.hashtags} />
          </div>
        </div>

        {/* Informações Adicionais */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações Adicionais</h3>
          <div className="space-y-4">
            <DetailField label="Informações Extras" value={theme.additionalInfo} />
          </div>
        </div>

        {/* Informações do Sistema */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Criado em" value={formatDate(theme.createdAt)} />
            <DetailField label="Última atualização" value={formatDate(theme.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}