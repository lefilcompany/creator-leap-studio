import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Target, MessageSquare, Palette } from "lucide-react";
import type { StrategicTheme } from "@/types/theme";
import type { BrandSummary } from "@/types/brand";

interface ThemeDetailsProps {
  theme: StrategicTheme | null;
  brands: BrandSummary[];
  onEdit: (theme: StrategicTheme) => void;
  onDelete: () => void;
  isLoading: boolean;
}

export default function ThemeDetails({ 
  theme, 
  brands, 
  onEdit, 
  onDelete, 
  isLoading 
}: ThemeDetailsProps) {
  if (isLoading) {
    return (
      <Card className="lg:col-span-2 h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[300px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!theme) {
    return null;
  }

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Marca não encontrada';
  };

  return (
    <Card className="lg:col-span-2 h-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">
              {theme.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl mb-1">{theme.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Marca: {getBrandName(theme.brandId)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </Button>
            <Button 
              onClick={() => onEdit(theme)}
              size="sm"
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar tema
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 max-h-[500px] overflow-y-auto">
        {/* Descrição */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Descrição
          </h3>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {theme.description}
          </p>
        </div>

        {/* Tom de Voz */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Tom de Voz
          </h3>
          <Badge variant="secondary" className="text-sm">
            {theme.tone}
          </Badge>
        </div>

        {/* Público-Alvo */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Público-Alvo
          </h3>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {theme.targetAudience}
          </p>
        </div>

        {/* Objetivos */}
        {theme.objectives && theme.objectives.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Objetivos</h3>
            <ul className="space-y-1">
              {theme.objectives.map((objective, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mensagens-Chave */}
        {theme.keyMessages && theme.keyMessages.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Mensagens-Chave</h3>
            <div className="flex flex-wrap gap-2">
              {theme.keyMessages.map((message, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {message}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}