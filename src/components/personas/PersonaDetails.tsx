'use client';

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
import { Edit, Trash2, Users } from 'lucide-react';
import type { Persona } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';
import { Skeleton } from '@/components/ui/skeleton';

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
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DetailField = ({ label, value }: { label: string, value?: string }) => {
  if (!value) return null;
  return (
    <div className="p-3 bg-muted/50 rounded-lg break-words">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
};

export default function PersonaDetails({ persona, onEdit, onDelete, brands, isLoading = false }: PersonaDetailsProps) {
  if (isLoading) {
    return (
      <div className="h-full bg-card p-6 flex flex-col animate-pulse">
        <div className="flex items-center mb-6 flex-shrink-0">
          <Skeleton className="w-16 h-16 rounded-xl mr-4" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="flex gap-3 mt-6 flex-shrink-0">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="h-full bg-card p-6 flex flex-col items-center justify-center text-center">
        <Users className="h-16 w-16 text-muted-foreground/50" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-foreground">Nenhuma persona selecionada</h3>
        <p className="text-muted-foreground">Selecione uma persona na lista para ver os detalhes ou crie uma nova.</p>
      </div>
    );
  }

  const wasUpdated = persona.createdAt !== persona.updatedAt;
  const brandName = brands.find(b => b.id === persona.brandId)?.name || 'Marca não encontrada';

  return (
    <div className="h-full p-6 flex flex-col overflow-hidden">
      <div className="flex items-center mb-6 flex-shrink-0">
        <div className="bg-gradient-to-br from-secondary to-primary text-white rounded-xl w-16 h-16 flex items-center justify-center font-bold text-3xl mr-4 flex-shrink-0">
          {persona.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground break-words">{persona.name}</h2>
          <p className="text-md text-muted-foreground">Marca: {brandName}</p>
        </div>
      </div>

      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        <div className="space-y-4 text-left">
          {/* Informações Demográficas */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Informações Demográficas</h3>
            <DetailField label="Idade" value={persona.age.toString()} />
            <DetailField label="Gênero" value={persona.demographics.gender} />
            <DetailField label="Localização" value={persona.location} />
            <DetailField label="Profissão" value={persona.occupation} />
            <DetailField label="Renda" value={persona.demographics.income} />
            <DetailField label="Educação" value={persona.demographics.education} />
            <DetailField label="Estado Civil" value={persona.demographics.familyStatus} />
          </div>

          {/* Descrição */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Descrição</h3>
            <DetailField label="Perfil da Persona" value={persona.description} />
          </div>

          {/* Objetivos e Frustrações */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Objetivos e Desafios</h3>
            <DetailField label="Objetivos" value={persona.goals} />
            <DetailField label="Frustrações" value={persona.frustrations} />
          </div>

          {/* Comportamento */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Comportamento</h3>
            <DetailField label="Comportamentos" value={persona.behaviors} />
            <DetailField label="Traços de Personalidade" value={persona.personalityTraits} />
          </div>

          {/* Canais de Comunicação */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Canais de Comunicação</h3>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Canais Preferidos</p>
              <div className="flex flex-wrap gap-2">
                {persona.channels.map((channel, index) => (
                  <span 
                    key={index}
                    className="bg-gradient-to-r from-primary/15 to-primary/5 border-2 border-primary/30 text-primary text-xs font-semibold px-2 py-1 rounded-lg"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Psicografia */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Psicografia</h3>
            <DetailField label="Valores" value={persona.psychographics.values} />
            <DetailField label="Interesses" value={persona.psychographics.interests} />
            <DetailField label="Estilo de Vida" value={persona.psychographics.lifestyle} />
          </div>

          {/* Metadados */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Informações do Sistema</h3>
            <DetailField label="Data de Criação" value={formatDate(persona.createdAt)} />
            {wasUpdated && (
              <DetailField label="Última Atualização" value={formatDate(persona.updatedAt)} />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-6 mb-8 flex-shrink-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full flex-1 rounded-full py-5">
              <Trash2 className="mr-2 h-4 w-4" /> Deletar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso irá deletar permanentemente a persona &quot;{persona.name}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={() => onEdit(persona)} className="w-full flex-1 rounded-full py-5">
          <Edit className="mr-2 h-4 w-4" /> Editar persona
        </Button>
      </div>
    </div>
  );
}