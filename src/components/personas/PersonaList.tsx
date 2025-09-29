'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Users } from 'lucide-react';
import type { PersonaSummary } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';

interface PersonaListProps {
  personas: PersonaSummary[] | undefined;
  brands: BrandSummary[];
  selectedPersona: PersonaSummary | null;
  onSelectPersona: (persona: PersonaSummary) => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// Componente de loading profissional
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Carregando personas</h3>
      <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
    </div>
  </div>
);

export default function PersonaList({ personas, brands, selectedPersona, onSelectPersona, isLoading = false }: PersonaListProps) {
  const sortedPersonas = useMemo(() => {
    if (!personas || !Array.isArray(personas)) return [];
    return [...personas].sort((a, b) => a.name.localeCompare(b.name));
  }, [personas]);

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Marca não encontrada';
  };

  return (
    <div className="lg:col-span-2 bg-card p-4 md:p-6 rounded-2xl border-2 border-primary/10 flex flex-col h-full overflow-hidden">
      <h2 className="text-2xl font-semibold text-foreground mb-4 px-2 flex-shrink-0">Todas as personas</h2>
      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : sortedPersonas.length > 0 ? (
          <ul className="space-y-3 animate-fade-in">
            {sortedPersonas.map((persona) => (
              <li key={persona.id}>
                <button
                  onClick={() => onSelectPersona(persona)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between hover-scale",
                    selectedPersona?.id === persona.id
                      ? "bg-primary/10 border-primary shadow-md"
                      : "bg-muted/50 border-transparent hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
                      {persona.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{persona.name}</p>
                      <p className="text-sm text-muted-foreground">Marca: {getBrandName(persona.brandId)}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    Criado em: {formatDate(persona.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8 animate-fade-in">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base">Nenhuma persona encontrada</p>
            <p className="text-sm mt-1 opacity-75">Clique em "Nova persona" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}