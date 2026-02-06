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
import { CreditConfirmationDialog } from '@/components/CreditConfirmationDialog';
import { Coins } from 'lucide-react';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { personasSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import personasBanner from '@/assets/personas-banner.jpg';

// Definindo o tipo para os dados do formulário, que é uma Persona parcial
type PersonaFormData = Omit<Persona, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function PersonasPage() {
  const { user, team, refreshTeamData, refreshUserCredits } = useAuth();
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Load brands from database - user can see own brands OR team brands
  useEffect(() => {
    const loadBrands = async () => {
      if (!user?.id) return;
      
      setIsLoadingBrands(true);
      try {
        // Query brands user has access to (via RLS can_access_resource)
        const { data, error } = await supabase
          .from('brands')
          .select('id, name, responsible, created_at, updated_at')
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
  }, [user?.id]);

  // Load personas from database - user can see own personas OR team personas
  useEffect(() => {
    const loadPersonas = async () => {
      if (!user?.id) return;
      
      setIsLoadingPersonas(true);
      try {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        
        // Query personas user has access to (via RLS can_access_resource)
        const { data, error, count } = await supabase
          .from('personas')
          .select('id, brand_id, name, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

        if (error) throw error;

        const personas: PersonaSummary[] = (data || []).map(persona => ({
          id: persona.id,
          brandId: persona.brand_id,
          name: persona.name,
          createdAt: persona.created_at
        }));

        setPersonas(personas);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Erro ao carregar personas:', error);
        toast.error('Erro ao carregar personas');
      } finally {
        setIsLoadingPersonas(false);
      }
    };
    
    loadPersonas();
  }, [user?.id, currentPage]);

  const handleOpenDialog = useCallback((persona: Persona | null = null) => {
    // Para edição, abrir direto
    if (persona) {
      setPersonaToEdit(persona);
      setIsDialogOpen(true);
      return;
    }

    // Para nova persona, verificar se user está carregado
    if (!user) {
      toast.error('Carregando dados do usuário...');
      return;
    }

    const freePersonasUsed = team?.free_personas_used || 0;
    const isFree = freePersonasUsed < 3;

    // Se não for gratuita, verificar créditos individuais
    if (!isFree && (user.credits || 0) < 1) {
      toast.error('Créditos insuficientes. Criar uma persona custa 1 crédito (as 3 primeiras são gratuitas).');
      return;
    }

    // Abrir diálogo de confirmação
    setPersonaToEdit(null);
    setIsConfirmDialogOpen(true);
  }, [user, team, personas.length]);

  const handleConfirmCreate = useCallback(() => {
    setIsConfirmDialogOpen(false);
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
    if (!user?.id) {
      toast.error('Usuário não autenticado');
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
            team_id: user.teamId || null, // Optional team association
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
          teamId: user.teamId || '',
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
        
        // Atualizar contador ou deduzir crédito individual
        const freePersonasUsed = team?.free_personas_used || 0;
        const isFree = freePersonasUsed < 3;

        if (isFree && user.teamId) {
          // Incrementar contador de personas gratuitas (apenas se tiver equipe)
          await supabase
            .from('teams')
            .update({ free_personas_used: freePersonasUsed + 1 } as any)
            .eq('id', user.teamId);
          await refreshTeamData();
        } else if (!isFree) {
          // Deduzir 1 crédito do usuário individual
          const currentCredits = user.credits || 0;
          await supabase
            .from('profiles')
            .update({ credits: currentCredits - 1 })
            .eq('id', user.id);

          // Registrar no histórico de créditos
          await supabase
            .from('credit_history')
            .insert({
              team_id: user.teamId || null,
              user_id: user.id,
              action_type: 'CREATE_PERSONA',
              credits_used: 1,
              credits_before: currentCredits,
              credits_after: currentCredits - 1,
              description: `Criação da persona: ${formData.name}`,
              metadata: { persona_id: data.id, persona_name: formData.name }
            });
          
          // Atualizar créditos do usuário
          await refreshUserCredits();
        }
        
        toast.success(isFree 
          ? `Persona criada com sucesso! (${3 - freePersonasUsed - 1} personas gratuitas restantes)` 
          : 'Persona criada com sucesso!', 
          { id: toastId }
        );
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

  // Desabilitar apenas se não tiver créditos ou se user não carregou
  const isButtonDisabled = !user || (user.credits || 0) < 1;

  return (
    <div className="h-full flex flex-col overflow-hidden -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 flex-shrink-0 overflow-hidden">
        <img 
          src={personasBanner} 
          alt="" 
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 85%' }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header section overlapping the banner */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 lg:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <Users className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Suas Personas
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Gerencie, edite ou crie novas personas para seus projetos.
              </p>
            </div>
          </div>

          <Button 
            id="personas-create-button"
            onClick={() => handleOpenDialog()} 
            disabled={isButtonDisabled}
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
            title={!user ? 'Carregando...' : ((user.credits || 0) < 1 ? 'Créditos insuficientes' : undefined)}
          >
            <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
            Nova persona
            <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
              <Coins className="h-3 w-3" />
              1
            </span>
          </Button>
        </div>

        <TourSelector 
          tours={[
            {
              tourType: 'navbar',
              steps: navbarSteps,
              label: 'Tour da Navegação',
              targetElement: '#sidebar-logo'
            },
            {
              tourType: 'personas',
              steps: personasSteps,
              label: 'Tour de Personas',
              targetElement: '#personas-create-button'
            }
          ]}
          startDelay={500}
        />
      </div>

      {/* Table */}
      <main id="personas-list" className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <PersonaList
          personas={personas}
          brands={brands}
          selectedPersona={selectedPersonaSummary}
          onSelectPersona={handleSelectPersona}
          isLoading={isLoadingPersonas}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
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

      <CreditConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={handleConfirmCreate}
        currentBalance={user?.credits || 0}
        cost={1}
        resourceType="persona"
        isFreeResource={(team?.free_personas_used || 0) < 3}
        freeResourcesRemaining={3 - (team?.free_personas_used || 0)}
      />
    </div>
  );
}
