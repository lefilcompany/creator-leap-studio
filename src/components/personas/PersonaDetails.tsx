import { Edit, Trash2, User } from 'lucide-react';
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
import type { Persona } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';

interface PersonaDetailsProps {
  persona: Persona | null;
  brands: BrandSummary[];
  onEdit: (persona: Persona) => void;
  onDelete: (personaId: string) => void;
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

const DetailField = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="p-3 bg-muted/50 rounded-lg break-words">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
};

export default function PersonaDetails({ persona, brands, onEdit, onDelete, isLoading = false }: PersonaDetailsProps) {
  
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

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="bg-secondary/10 rounded-full p-6 mb-4">
          <User className="h-12 w-12 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhuma persona selecionada
        </h3>
        <p className="text-muted-foreground text-sm">
          Selecione uma persona na lista para ver os detalhes.
        </p>
      </div>
    );
  }

  const brandName = brands.find(b => b.id === persona.brandId)?.name || 'Marca não encontrada';

  return (
    <div className="h-full p-4 md:p-6 flex flex-col overflow-hidden">
      <div className="flex items-center mb-4 flex-shrink-0">
        <div className="bg-primary/10 rounded-full p-4 mr-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{persona.name}</h2>
          <p className="text-sm text-muted-foreground">{brandName}</p>
        </div>
      </div>

      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        <div className="space-y-6 text-left">
          {/* Informações Básicas */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Gênero" value={persona.gender} />
              <DetailField label="Idade" value={persona.age} />
              <DetailField label="Localização" value={persona.location} />
              <DetailField label="Contexto Profissional" value={persona.professionalContext} />
            </div>
          </div>

          {/* Estratégia e Objetivos */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Estratégia e Objetivos</h3>
            <div className="space-y-4">
              <DetailField label="Principal Objetivo" value={persona.mainGoal} />
              <DetailField label="Desafios" value={persona.challenges} />
              <DetailField label="Crenças e Interesses" value={persona.beliefsAndInterests} />
            </div>
          </div>

          {/* Comportamento de Consumo */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Comportamento de Consumo</h3>
            <div className="space-y-4">
              <DetailField label="Rotina de Consumo de Conteúdo" value={persona.contentConsumptionRoutine} />
              <DetailField label="Tom de Voz Preferido" value={persona.preferredToneOfVoice} />
              <DetailField label="Estágio da Jornada de Compra" value={persona.purchaseJourneyStage} />
              <DetailField label="Gatilhos de Interesse" value={persona.interestTriggers} />
            </div>
          </div>

          {/* Informações do Sistema */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Informações do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Criado em" value={formatDate(persona.createdAt)} />
              <DetailField label="Última atualização" value={formatDate(persona.updatedAt)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-4 flex-shrink-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full flex-1 rounded-full">
              <Trash2 className="mr-2 h-4 w-4" /> Deletar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A persona "{persona.name}" será permanentemente deletada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(persona.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={() => onEdit(persona)} className="w-full flex-1 rounded-full">
          <Edit className="mr-2 h-4 w-4" /> Editar persona
        </Button>
      </div>
    </div>
  );
}