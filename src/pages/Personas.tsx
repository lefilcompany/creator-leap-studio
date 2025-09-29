'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Plus, Users } from 'lucide-react';
import PersonaList from '@/components/personas/PersonaList';
import PersonaDetails from '@/components/personas/PersonaDetails';
import PersonaDialog from '@/components/personas/PersonaDialog';
import type { Persona, PersonaSummary } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

// Definindo o tipo para os dados do formulário, que é uma Persona parcial
type PersonaFormData = Omit<Persona, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

// Mock data for demonstration
const mockBrands: BrandSummary[] = [
  {
    id: "acucar-petribu",
    name: "Açúcar Petribu", 
    responsible: "copy@lefil.com.br",
    createdAt: "2025-09-02T10:00:00.000Z",
    updatedAt: "2025-09-02T10:00:00.000Z"
  },
  {
    id: "ceramica-brennand",
    name: "Cerâmica Brennand",
    responsible: "julia.lima@lefil.com.br", 
    createdAt: "2025-09-18T10:00:00.000Z",
    updatedAt: "2025-09-18T10:00:00.000Z"
  },
  {
    id: "iclub",
    name: "Iclub",
    responsible: "marianna.monteiro.ext@lefil.com.br",
    createdAt: "2025-09-08T10:00:00.000Z",
    updatedAt: "2025-09-08T10:00:00.000Z"
  }
];

const mockPersonas: PersonaSummary[] = [
  {
    id: "persona-1",
    brandId: "acucar-petribu",
    name: "Maria Santos",
    createdAt: "2025-09-15T10:00:00.000Z"
  },
  {
    id: "persona-2",
    brandId: "ceramica-brennand", 
    name: "João Silva",
    createdAt: "2025-09-20T10:00:00.000Z"
  },
  {
    id: "persona-3",
    brandId: "iclub",
    name: "Ana Costa",
    createdAt: "2025-09-10T10:00:00.000Z"
  }
];

const mockFullPersona: Persona = {
  id: "persona-1",
  brandId: "acucar-petribu",
  name: "Maria Santos",
  age: "35",
  gender: "Feminino",
  professionalContext: "Gerente de Marketing",
  location: "São Paulo, SP",
  beliefsAndInterests: "Profissional experiente em marketing digital, mãe de dois filhos, sempre em busca de produtos que facilitem sua rotina familiar.",
  mainGoal: "Crescer profissionalmente, equilibrar vida pessoal e profissional, encontrar produtos que economizem tempo no dia a dia.",
  challenges: "Falta de tempo, produtos que não cumprem o que prometem, dificuldade em conciliar trabalho e família.",
  contentConsumptionRoutine: "Pesquisa muito antes de comprar, lê reviews, prefere compras online, muito ativa nas redes sociais.",
  preferredToneOfVoice: "Profissional",
  purchaseJourneyStage: "Consideração", 
  interestTriggers: "Produtos que economizem tempo, reviews positivos, promoções exclusivas",
  createdAt: "2025-09-15T10:00:00.000Z",
  updatedAt: "2025-09-15T10:00:00.000Z",
  teamId: "team-1",
  userId: "1"
};

export default function PersonasPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [selectedPersonaSummary, setSelectedPersonaSummary] = useState<PersonaSummary | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isLoadingPersonaDetails, setIsLoadingPersonaDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<Persona | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isPersonaDetailsOpen, setIsPersonaDetailsOpen] = useState(false);

  // Simulate loading personas and brands
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingPersonas(true);
      setIsLoadingBrands(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 800));
      setPersonas(mockPersonas);
      setBrands(mockBrands);
      
      setIsLoadingPersonas(false);
      setIsLoadingBrands(false);
    };
    
    loadData();
  }, []);

  const handleOpenDialog = useCallback((persona: Persona | null = null) => {
    setPersonaToEdit(persona);
    setIsDialogOpen(true);
  }, []);

  const handleSelectPersona = useCallback(async (persona: PersonaSummary) => {
    setSelectedPersonaSummary(persona);
    setIsLoadingPersonaDetails(true);
    setIsPersonaDetailsOpen(true); // Abre o slider para todos os dispositivos
    
    try {
      // Simulate API call to get full persona details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock: return different data based on selected persona
      const fullPersona = {
        ...mockFullPersona,
        id: persona.id,
        brandId: persona.brandId,
        name: persona.name,
        createdAt: persona.createdAt,
        updatedAt: persona.createdAt
      };
      
      setSelectedPersona(fullPersona);
    } catch (error) {
      console.error('Erro ao carregar detalhes da persona:', error);
      toast.error('Erro ao carregar detalhes da persona');
    } finally {
      setIsLoadingPersonaDetails(false);
    }
  }, []);

  const handleSavePersona = useCallback(async (formData: PersonaFormData) => {
    if (!user?.teamId || !user.id) {
      toast.error('Usuário não autenticado ou sem equipe');
      return;
    }

    const toastId = 'persona-operation';
    try {
      toast.loading(personaToEdit ? 'Atualizando persona...' : 'Criando persona...', { id: toastId });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (personaToEdit) {
        // Update existing persona
        const updatedPersona: Persona = {
          ...personaToEdit,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        
        setPersonas(prev => prev.map(p => 
          p.id === personaToEdit.id 
            ? { ...p, name: formData.name, brandId: formData.brandId, createdAt: p.createdAt }
            : p
        ));
        
        if (selectedPersona?.id === personaToEdit.id) {
          setSelectedPersona(updatedPersona);
          setSelectedPersonaSummary(prev => prev ? { ...prev, name: formData.name, brandId: formData.brandId } : null);
        }
        
        toast.success('Persona atualizada com sucesso!', { id: toastId });
      } else {
        // Create new persona
        const newPersona: Persona = {
          ...formData,
          id: `persona-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamId: user?.teamId || 'team-1',
          userId: user?.id || '1'
        };
        
        const newPersonaSummary: PersonaSummary = {
          id: newPersona.id,
          brandId: newPersona.brandId,
          name: newPersona.name,
          createdAt: newPersona.createdAt
        };
        
        setPersonas(prev => [...prev, newPersonaSummary]);
        setSelectedPersona(newPersona);
        setSelectedPersonaSummary(newPersonaSummary);
        toast.success('Persona criada com sucesso!', { id: toastId });
      }
      
      setIsDialogOpen(false);
      setPersonaToEdit(null);
    } catch (error) {
      toast.error('Erro ao salvar persona. Tente novamente.', { id: toastId });
      throw error;
    }
  }, [personaToEdit, selectedPersona?.id, user]);

  const handleDeletePersona = useCallback(async () => {
    if (!selectedPersona || !user?.teamId || !user?.id) {
      toast.error('Não foi possível deletar a persona. Verifique se você está logado.');
      return;
    }
    
    const toastId = 'persona-operation';
    try {
      toast.loading('Deletando persona...', { id: toastId });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPersonas(prev => prev.filter(persona => persona.id !== selectedPersona.id));
      setSelectedPersona(null);
      setSelectedPersonaSummary(null);
      
      toast.success('Persona deletada com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao deletar persona. Tente novamente.', { id: toastId });
    }
  }, [selectedPersona, user]);

  // Verificar se o limite foi atingido
  const isAtPersonaLimit = team && typeof team.plan === 'object' 
    ? personas.length >= (team.plan.limits?.personas || 2)
    : false;

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 overflow-hidden">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0">
        <CardHeader className="pb-3 lg:pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2 lg:p-3">
                <Users className="h-6 w-6 lg:h-8 lg:w-8" />
              </div>
              <div>
                <CardTitle className="text-xl lg:text-2xl font-bold">
                  Suas Personas
                </CardTitle>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Gerencie, edite ou crie novas personas para seus projetos.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              disabled={isAtPersonaLimit || isLoadingTeam}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 lg:px-6 py-3 lg:py-5 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Nova persona
            </Button>
          </div>
        </CardHeader>
      </Card>

      <main className="grid gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden grid-cols-1">
        <PersonaList
          personas={personas}
          brands={brands}
          selectedPersona={selectedPersonaSummary}
          onSelectPersona={handleSelectPersona}
          isLoading={isLoadingPersonas}
        />
      </main>

      {/* Sheet para desktop/tablet (da direita) */}
      {!isMobile && (
        <Sheet open={isPersonaDetailsOpen} onOpenChange={setIsPersonaDetailsOpen}>
          <SheetContent side="right" className="w-[85vw] max-w-none">
            <SheetTitle className="text-left mb-4">Detalhes da Persona</SheetTitle>
            <PersonaDetails
              persona={selectedPersona}
              brands={brands}
              onEdit={handleOpenDialog}
              onDelete={handleDeletePersona}
              isLoading={isLoadingPersonaDetails}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Drawer para mobile (de baixo) */}
      {isMobile && (
        <Drawer open={isPersonaDetailsOpen} onOpenChange={setIsPersonaDetailsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="text-left p-6 pb-0">Detalhes da Persona</DrawerTitle>
            <PersonaDetails
              persona={selectedPersona}
              brands={brands}
              onEdit={handleOpenDialog}
              onDelete={handleDeletePersona}
              isLoading={isLoadingPersonaDetails}
            />
          </DrawerContent>
        </Drawer>
      )}

      <PersonaDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePersona}
        personaToEdit={personaToEdit}
        brands={brands}
      />
    </div>
  );
}