import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Palette } from "lucide-react";
import type { StrategicThemeSummary } from "@/types/theme";
import type { BrandSummary } from "@/types/brand";

interface ThemeListProps {
  themes: StrategicThemeSummary[];
  brands: BrandSummary[];
  selectedTheme: StrategicThemeSummary | null;
  onSelectTheme: (theme: StrategicThemeSummary) => void;
  isLoading: boolean;
}

export default function ThemeList({ 
  themes, 
  brands, 
  selectedTheme, 
  onSelectTheme, 
  isLoading 
}: ThemeListProps) {
  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Marca não encontrada';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-1 h-full">
        <CardHeader>
          <CardTitle>Todos os temas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-1 h-full">
      <CardHeader>
        <CardTitle>Todos os temas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {themes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum tema criado ainda.</p>
            <p className="text-sm">Clique em "Novo tema" para começar.</p>
          </div>
        ) : (
          themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme)}
              className={`group cursor-pointer rounded-lg border p-4 transition-all hover:bg-accent hover:border-accent-foreground/20 ${
                selectedTheme?.id === theme.id 
                  ? 'bg-primary/5 border-primary/30 shadow-sm' 
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {theme.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {theme.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Marca: {getBrandName(theme.brandId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criado em: {formatDate(theme.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}