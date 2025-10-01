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
import { supabase } from '@/integrations/supabase/client';

// Definindo o tipo para os dados do formulário, que é uma Persona parcial
type PersonaFormData = Omit<Persona, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

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
  const [isPersonaDetailsOpen, setIsPersonaDetailsOpen] = useState(false);

  // Load brands from database
  useEffect(() => {
    const loadBrands = async () => {
      if (!user?.teamId) return;
      
      setIsLoadingBrands(true);
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('id, name, responsible, created_at, updated_at')
          .eq('team_id', user.teamId)
          .order('name', { ascending: true });

        if (error) throw error;

        const brands: BrandSummary[] = data.map(brand => ({
          id: brand.id,
          name: brand.name,
          responsible: brand.responsible,
          createdAt: brand.created_at,
          updatedAt: brand.updated_at
        }));

        setBrands(brands);
      } catch (error) {
        console.error('Erro ao carregar marcas:', error);
        toast.error('Erro ao carregar marcas');
      } finally {
        setIsLoadingBrands(false);
      }
    };
    
    loadBrands();
  }, [user?.teamId]);

  // Load personas from database
  useEffect(() => {
    const loadPersonas = async () => {
      if (!user?.teamId) return;
      
      setIsLoadingPersonas(true);
      try {
        const { data, error } = await supabase
          .from('personas')
          .select('id, brand_id, name, created_at')
          .eq('team_id', user.teamId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const personas: PersonaSummary[] = data.map(persona => ({
          id: persona.id,
          brandId: persona.brand_id,
          name: persona.name,
          createdAt: persona.created_at
        }));

        setPersonas(personas);
      } catch (error) {
        console.error('Erro ao carregar personas:', error);
        toast.error('Erro ao carregar personas');
      } finally {
        setIsLoadingPersonas(false);
      }
    };
    
    loadPersonas();
  }, [user?.teamId]);

  const handleOpenDialog = useCallback((persona: Persona | null = null) => {
    setPersonaToEdit(persona);
    setIsDialogOpen(true);
  }, []);

  const handleSelectPersona = useCallback(async (persona: PersonaSummary) => {
    setSelectedPersonaSummary(persona);
    setIsLoadingPersonaDetails(true);
    setIsPersonaDetailsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', persona.id)
        .single();

      if (error) throw error;

      const fullPersona: Persona = {
        id: data.id,
        brandId: data.brand_id,
        teamId: data.team_id,
        userId: data.user_id,
        name: data.name,
        age: data.age,
        gender: data.gender,
        professionalContext: data.professional_context,
        location: data.location,
        beliefsAndInterests: data.beliefs_and_interests,
        mainGoal: data.main_goal,
        challenges: data.challenges,
        contentConsumptionRoutine: data.content_consumption_routine,
        preferredToneOfVoice: data.preferred_tone_of_voice,
        purchaseJourneyStage: data.purchase_journey_stage,
        interestTriggers: data.interest_triggers,
        createdAt: data.created_at,
        updatedAt: data.updated_at
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
      
      if (personaToEdit) {
        // Update existing persona
        const { error } = await supabase
          .from('personas')
          .update({
            brand_id: formData.brandId,
            name: formData.name,
            age: formData.age,
            gender: formData.gender,
            professional_context: formData.professionalContext,
            location: formData.location,
            beliefs_and_interests: formData.beliefsAndInterests,
            main_goal: formData.mainGoal,
            challenges: formData.challenges,
            content_consumption_routine: formData.contentConsumptionRoutine,
            preferred_tone_of_voice: formData.preferredToneOfVoice,
            purchase_journey_stage: formData.purchaseJourneyStage,
            interest_triggers: formData.interestTriggers,
          })
          .eq('id', personaToEdit.id);

        if (error) throw error;

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
        const { data, error } = await supabase
          .from('personas')
          .insert({
            team_id: user.teamId,
            user_id: user.id,
            brand_id: formData.brandId,
            name: formData.name,
            age: formData.age,
            gender: formData.gender,
            professional_context: formData.professionalContext,
            location: formData.location,
            beliefs_and_interests: formData.beliefsAndInterests,
            main_goal: formData.mainGoal,
            challenges: formData.challenges,
            content_consumption_routine: formData.contentConsumptionRoutine,
            preferred_tone_of_voice: formData.preferredToneOfVoice,
            purchase_journey_stage: formData.purchaseJourneyStage,
            interest_triggers: formData.interestTriggers,
          })
          .select()
          .single();

        if (error) throw error;

        const newPersona: Persona = {
          ...formData,
          id: data.id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          teamId: user.teamId,
          userId: user.id
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
      console.error('Erro ao salvar persona:', error);
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
      
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', selectedPersona.id);

      if (error) throw error;
      
      setPersonas(prev => prev.filter(persona => persona.id !== selectedPersona.id));
      setSelectedPersona(null);
      setSelectedPersonaSummary(null);
      setIsPersonaDetailsOpen(false);
      
      toast.success('Persona deletada com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Erro ao deletar persona:', error);
      toast.error('Erro ao deletar persona. Tente novamente.', { id: toastId });
    }
  }, [selectedPersona, user]);

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
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 lg:px-6 py-3 lg:py-5 text-sm lg:text-base shrink-0"
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
