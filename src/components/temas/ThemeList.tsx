import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette } from 'lucide-react';
import type { StrategicThemeSummary } from "@/types/theme";
import type { BrandSummary } from "@/types/brand";

interface ThemeListProps {
  themes: StrategicThemeSummary[];
  brands: BrandSummary[]; // Recebe a lista de marcas
  selectedTheme: StrategicThemeSummary | null;
  onSelectTheme: (theme: StrategicThemeSummary) => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

const ThemeSkeleton = () => (
  <div className="w-full text-left p-3 lg:p-4 rounded-lg border-2 border-transparent bg-muted/50 flex items-center justify-between">
    <div className="flex items-center min-w-0 flex-1">
      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mr-3 lg:mr-4 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 sm:h-5 w-full max-w-[200px] mb-2" />
        <Skeleton className="h-3 sm:h-4 w-full max-w-[150px]" />
      </div>
    </div>
    <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 hidden sm:block ml-2 flex-shrink-0" />
  </div>
);

export default function ThemeList({ themes, brands, selectedTheme, onSelectTheme, isLoading = false }: ThemeListProps) {
  const sortedThemes = useMemo(() => {
    return [...themes].sort((a, b) => a.title.localeCompare(b.title));
  }, [themes]);

  const brandMap = useMemo(() => new Map(brands.map(b => [b.id, b.name])), [brands]);

  return (
    <div className="lg:col-span-2 bg-card p-3 sm:p-4 md:p-6 rounded-xl lg:rounded-2xl border border-primary/10 lg:border-2 flex flex-col max-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-16rem)] overflow-hidden">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-3 lg:mb-4 px-1 lg:px-2 flex-shrink-0">Todos os temas</h2>
      <div className="overflow-y-auto pr-1 lg:pr-2 flex-1 min-h-0">
        {isLoading ? (
          <ul className="space-y-2 lg:space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <ThemeSkeleton />
              </li>
            ))}
          </ul>
        ) : sortedThemes.length > 0 ? (
          <ul className="space-y-2 lg:space-y-3">
            {sortedThemes.map((theme) => (
              <li key={theme.id}>
                <button
                  onClick={() => onSelectTheme(theme)}
                  className={cn(
                    "w-full text-left p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between hover:shadow-sm",
                    selectedTheme?.id === theme.id
                      ? "bg-primary/10 border-primary shadow-md"
                      : "bg-muted/50 border-transparent hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-lg sm:text-xl mr-3 lg:mr-4 flex-shrink-0">
                      {theme.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base lg:text-lg text-foreground line-clamp-2 mb-1">{theme.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Marca: {brandMap.get(theme.brandId) || 'Não definida'}</p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block ml-2 flex-shrink-0">
                    Criado em: {formatDate(theme.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-6 lg:py-8">
            <Palette className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">Nenhum tema encontrado</p>
            <p className="text-xs sm:text-sm mt-1 opacity-75">Clique em "Novo tema" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}