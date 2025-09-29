'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Users, MapPin, Briefcase, Calendar, Target, Frown, Activity, Smartphone, Heart, Book, Home } from 'lucide-react';
import type { Persona } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';

interface PersonaDetailsProps {
  persona: Persona | null;
  brands: BrandSummary[];
  onEdit: (persona: Persona) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// Componente de skeleton para os detalhes
const PersonaDetailsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
    
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="border-primary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

function PersonaDetailsContent({ persona, brands, onEdit, onDelete, isLoading }: PersonaDetailsProps) {
  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Marca não encontrada';
  };

  if (isLoading) {
    return <PersonaDetailsSkeleton />;
  }

  if (!persona) {
    return (
      <div className="h-full bg-card p-6 rounded-2xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center text-center space-y-2">
        <Users className="h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-foreground">Nenhuma persona selecionada</h3>
        <p className="text-muted-foreground">Selecione uma persona na lista para ver os detalhes ou crie uma nova.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header da persona */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl">
            {persona.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">{persona.name}</h2>
            <p className="text-muted-foreground">Marca: {getBrandName(persona.brandId)}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete}
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </Button>
          <Button 
            onClick={() => onEdit(persona)} 
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar persona
          </Button>
        </div>
      </div>

      {/* Informações básicas */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Idade:</span>
              <span className="font-medium">{persona.age} anos</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Profissão:</span>
              <span className="font-medium">{persona.occupation}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Localização:</span>
              <span className="font-medium">{persona.location}</span>
            </div>
          </div>
          <Separator />
          <p className="text-sm">{persona.description}</p>
        </CardContent>
      </Card>

      {/* Demografia */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações Demográficas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Gênero:</span>
              <p className="font-medium">{persona.demographics.gender}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Renda:</span>
              <p className="font-medium">{persona.demographics.income}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Educação:</span>
              <p className="font-medium">{persona.demographics.education}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estado Civil:</span>
              <p className="font-medium">{persona.demographics.familyStatus}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objetivos e Frustrações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{persona.goals}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Frown className="h-5 w-5" />
              Frustrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{persona.frustrations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Comportamento */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Comportamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{persona.behaviors}</p>
        </CardContent>
      </Card>

      {/* Canais de comunicação */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Canais de Comunicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {persona.channels.map((channel, index) => (
              <Badge key={index} variant="secondary">{channel}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Psicografia */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Psicografia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Valores:</h4>
            <p className="text-sm text-muted-foreground">{persona.psychographics.values}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Interesses:</h4>
            <p className="text-sm text-muted-foreground">{persona.psychographics.interests}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Estilo de vida:</h4>
            <p className="text-sm text-muted-foreground">{persona.psychographics.lifestyle}</p>
          </div>
        </CardContent>
      </Card>

      {/* Traços de personalidade */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Traços de Personalidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{persona.personalityTraits}</p>
        </CardContent>
      </Card>

      {/* Informações de criação */}
      <div className="text-xs text-muted-foreground pt-4 pb-8 border-t">
        <p>Criado em: {formatDate(persona.createdAt)}</p>
        <p>Última atualização: {formatDate(persona.updatedAt)}</p>
      </div>
    </div>
  );
}

export default function PersonaDetails(props: PersonaDetailsProps) {
  return (
    <div className="h-full p-6 flex flex-col overflow-hidden">
      <PersonaDetailsContent {...props} />
    </div>
  );
}