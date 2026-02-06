'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Plus, Tag, Coins, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import BrandList from '@/components/marcas/BrandList';
import BrandDetails from '@/components/marcas/BrandDetails';
import BrandDialog from '@/components/marcas/BrandDialog';
import type { Brand, BrandSummary, MoodboardFile, ColorItem } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';
import { CreditConfirmationDialog } from '@/components/CreditConfirmationDialog';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { brandsSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import brandsBanner from '@/assets/brands-banner.jpg';

// Definindo o tipo para os dados do formulário, que é um Brand parcial
type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function MarcasPage() {
  const { user, team, refreshTeamData, refreshUserCredits } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [selectedBrandSummary, setSelectedBrandSummary] = useState<BrandSummary | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoadingBrandDetails, setIsLoadingBrandDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
  const [isBrandDetailsOpen, setIsBrandDetailsOpen] = useState(false);
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
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        
        // Query brands user has access to (via RLS can_access_resource)
        let query = supabase
          .from('brands')
          .select('id, name, responsible, created_at, updated_at', { count: 'exact' })
          .order('name', { ascending: true })
          .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        const brands: BrandSummary[] = (data || []).map(brand => ({
          id: brand.id,
          name: brand.name,
          responsible: brand.responsible,
          createdAt: brand.created_at,
          updatedAt: brand.updated_at
        }));

        setBrands(brands);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Erro ao carregar marcas:', error);
        toast.error(t.brands.loadError);
      } finally {
        setIsLoadingBrands(false);
      }
    };
    
    loadBrands();
  }, [user?.id, currentPage]);

  const handleOpenDialog = useCallback((brand: Brand | null = null) => {
    // Para edição, abrir direto
    if (brand) {
      setBrandToEdit(brand);
      setIsDialogOpen(true);
      return;
    }

    // Para nova marca, verificar se user está carregado
    if (!user) {
      toast.error('Carregando dados do usuário...');
      return;
    }

    const freeBrandsUsed = team?.free_brands_used || 0;
    const isFree = freeBrandsUsed < 3;

    // Se não for gratuita, verificar créditos individuais
    if (!isFree && (user.credits || 0) < 1) {
      toast.error('Créditos insuficientes. Criar uma marca custa 1 crédito (as 3 primeiras são gratuitas).');
      return;
    }

    // Abrir diálogo de confirmação
    setBrandToEdit(null);
    setIsConfirmDialogOpen(true);
  }, [user, team, brands.length, t]);

  const handleConfirmCreate = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setIsDialogOpen(true);
  }, []);

  const handleSelectBrand = useCallback(async (brand: BrandSummary) => {
    setSelectedBrandSummary(brand);
    setIsLoadingBrandDetails(true);
    setIsBrandDetailsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brand.id)
        .single();

      if (error) throw error;

      const fullBrand: Brand = {
        id: data.id,
        teamId: data.team_id,
        userId: data.user_id,
        name: data.name,
        responsible: data.responsible,
        segment: data.segment,
        values: data.values || '',
        keywords: data.keywords || '',
        goals: data.goals || '',
        inspirations: data.inspirations || '',
        successMetrics: data.success_metrics || '',
        references: data.brand_references || '',
        specialDates: data.special_dates || '',
        promise: data.promise || '',
        crisisInfo: data.crisis_info || '',
        milestones: data.milestones || '',
        collaborations: data.collaborations || '',
        restrictions: data.restrictions || '',
        moodboard: data.moodboard as unknown as MoodboardFile | null,
        logo: data.logo as unknown as MoodboardFile | null,
        referenceImage: data.reference_image as unknown as MoodboardFile | null,
        colorPalette: data.color_palette as unknown as ColorItem[] | null,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setSelectedBrand(fullBrand);
    } catch (error) {
      console.error('Erro ao carregar detalhes da marca:', error);
      toast.error(t.brands.loadDetailsError);
    } finally {
      setIsLoadingBrandDetails(false);
    }
  }, []);

  const handleSaveBrand = useCallback(async (formData: BrandFormData) => {
    if (!user?.id) {
      toast.error(t.brands.notAuthenticated);
      return;
    }

    const toastId = 'brand-operation';
    try {
      toast.loading(brandToEdit ? t.brands.updating : t.brands.creating, { id: toastId });
      
      if (brandToEdit) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({
            name: formData.name,
            responsible: formData.responsible,
            segment: formData.segment,
            values: formData.values,
            keywords: formData.keywords,
            goals: formData.goals,
            inspirations: formData.inspirations,
            success_metrics: formData.successMetrics,
            brand_references: formData.references,
            special_dates: formData.specialDates,
            promise: formData.promise,
            crisis_info: formData.crisisInfo,
            milestones: formData.milestones,
            collaborations: formData.collaborations,
            restrictions: formData.restrictions,
            moodboard: formData.moodboard as any,
            logo: formData.logo as any,
            reference_image: formData.referenceImage as any,
            color_palette: formData.colorPalette as any,
          })
          .eq('id', brandToEdit.id);

        if (error) throw error;

        const updatedBrand: Brand = {
          ...brandToEdit,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        
        setBrands(prev => prev.map(b => 
          b.id === brandToEdit.id 
            ? { ...b, name: formData.name, responsible: formData.responsible, updatedAt: updatedBrand.updatedAt }
            : b
        ));
        
        if (selectedBrand?.id === brandToEdit.id) {
          setSelectedBrand(updatedBrand);
        }
        
        toast.success(t.brands.updateSuccess, { id: toastId });
      } else {
        // Create new brand
        const freeBrandsUsed = team?.free_brands_used || 0;
        const isFree = freeBrandsUsed < 3;

        const { data, error } = await supabase
          .from('brands')
          .insert({
            team_id: user.teamId || null, // Optional team association
            user_id: user.id,
            name: formData.name,
            responsible: formData.responsible,
            segment: formData.segment,
            values: formData.values,
            keywords: formData.keywords,
            goals: formData.goals,
            inspirations: formData.inspirations,
            success_metrics: formData.successMetrics,
            brand_references: formData.references,
            special_dates: formData.specialDates,
            promise: formData.promise,
            crisis_info: formData.crisisInfo,
            milestones: formData.milestones,
            collaborations: formData.collaborations,
            restrictions: formData.restrictions,
            moodboard: formData.moodboard as any,
            logo: formData.logo as any,
            reference_image: formData.referenceImage as any,
            color_palette: formData.colorPalette as any,
          })
          .select()
          .single();

        if (error) throw error;

        const newBrand: Brand = {
          ...formData,
          id: data.id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          teamId: user.teamId || '',
          userId: user.id
        };
        
        const newBrandSummary: BrandSummary = {
          id: newBrand.id,
          name: newBrand.name,
          responsible: newBrand.responsible,
          createdAt: newBrand.createdAt,
          updatedAt: newBrand.updatedAt
        };
        
        setBrands(prev => [...prev, newBrandSummary]);
        setSelectedBrand(newBrand);
        setSelectedBrandSummary(newBrandSummary);
        
        // Atualizar contador ou deduzir crédito individual
        if (isFree && user.teamId) {
          // Incrementar contador de marcas gratuitas (apenas se tiver equipe)
          await supabase
            .from('teams')
            .update({ free_brands_used: freeBrandsUsed + 1 } as any)
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
              action_type: 'CREATE_BRAND',
              credits_used: 1,
              credits_before: currentCredits,
              credits_after: currentCredits - 1,
              description: `Criação da marca: ${formData.name}`,
              metadata: { brand_id: data.id, brand_name: formData.name }
            });
          
          // Atualizar créditos do usuário
          await refreshUserCredits();
        }
        
        toast.success(isFree 
          ? `${t.brands.createSuccess} (${3 - freeBrandsUsed - 1} marcas gratuitas restantes)` 
          : t.brands.createSuccess, 
          { id: toastId }
        );
      }
      
      setIsDialogOpen(false);
      setBrandToEdit(null);
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      toast.error(t.brands.saveError, { id: toastId });
      throw error;
    }
  }, [brandToEdit, selectedBrand?.id, user, t]);

  const handleDeleteBrand = useCallback(async () => {
    if (!selectedBrand || !user?.teamId || !user?.id) {
      toast.error(t.brands.deleteConfirm);
      return;
    }
    
    const toastId = 'brand-operation';
    try {
      toast.loading(t.brands.deleting, { id: toastId });
      
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', selectedBrand.id);

      if (error) throw error;
      
      setBrands(prev => prev.filter(brand => brand.id !== selectedBrand.id));
      setSelectedBrand(null);
      setSelectedBrandSummary(null);
      setIsBrandDetailsOpen(false);
      
      // Select first remaining brand if any
      const remainingBrands = brands.filter(b => b.id !== selectedBrand.id);
      if (remainingBrands.length > 0) {
        handleSelectBrand(remainingBrands[0]);
      }
      
      toast.success(t.brands.deleteSuccess, { id: toastId });
    } catch (error) {
      console.error('Erro ao deletar marca:', error);
      toast.error(t.brands.deleteError, { id: toastId });
    }
  }, [selectedBrand, user, brands, handleSelectBrand, t]);

  // Desabilitar apenas se não tiver créditos ou se user não carregou
  const isButtonDisabled = !user || (user.credits || 0) < 1;

  return (
    <div className="h-full flex flex-col overflow-hidden -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 flex-shrink-0 overflow-hidden">
        <img 
          src={brandsBanner} 
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
            {/* Brand Icon */}
            <div className="bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <Tag className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                {t.brands.pageTitle}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" side="bottom" align="start">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">O que são Marcas?</h4>
                      <p className="text-muted-foreground">
                        Marcas são os perfis das empresas ou projetos para os quais você cria conteúdo. Cada marca contém informações como valores, metas, público-alvo e identidade visual.
                      </p>
                      <h4 className="font-semibold text-foreground mt-3">Como usar?</h4>
                      <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Crie uma marca com os dados do seu cliente ou projeto</li>
                        <li>Adicione personas e temas estratégicos à marca</li>
                        <li>Use a marca ao criar conteúdos para manter consistência</li>
                      </ul>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        As 3 primeiras marcas são gratuitas. Depois, cada nova marca custa 1 crédito.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                {t.brands.pageDescription}
              </p>
            </div>
          </div>

          <Button
            id="brands-create-button"
            onClick={() => handleOpenDialog()} 
            disabled={isButtonDisabled}
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
            title={!user ? 'Carregando...' : ((user.credits || 0) < 1 ? 'Créditos insuficientes' : undefined)}
          >
            <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
            {t.brands.newBrand}
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
              tourType: 'brands',
              steps: brandsSteps,
              label: 'Tour de Marcas',
              targetElement: '#brands-create-button'
            }
          ]}
          startDelay={500}
        />
      </div>

      {/* Table */}
      <main id="brands-list" className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <BrandList
          brands={brands}
          selectedBrand={selectedBrandSummary}
          onSelectBrand={handleSelectBrand}
          isLoading={isLoadingBrands}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </main>

      {/* Sheet para desktop/tablet (da direita) */}
      {!isMobile && (
        <Sheet open={isBrandDetailsOpen} onOpenChange={setIsBrandDetailsOpen}>
          <SheetContent side="right" className="w-1/2 max-w-none">
            <SheetTitle className="text-left mb-4">{t.brands.brandDetails}</SheetTitle>
            <BrandDetails
              brand={selectedBrand}
              onEdit={handleOpenDialog}
              onDelete={() => handleDeleteBrand()}
              isLoading={isLoadingBrandDetails}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Drawer para mobile (de baixo) */}
      {isMobile && (
        <Drawer open={isBrandDetailsOpen} onOpenChange={setIsBrandDetailsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="text-left p-6 pb-0">{t.brands.brandDetails}</DrawerTitle>
            <BrandDetails
              brand={selectedBrand}
              onEdit={handleOpenDialog}
              onDelete={() => handleDeleteBrand()}
              isLoading={isLoadingBrandDetails}
            />
          </DrawerContent>
        </Drawer>
      )}

      <BrandDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveBrand}
        brandToEdit={brandToEdit}
      />

      <CreditConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={handleConfirmCreate}
        currentBalance={user?.credits || 0}
        cost={1}
        resourceType="marca"
        isFreeResource={(team?.free_brands_used || 0) < 3}
        freeResourcesRemaining={3 - (team?.free_brands_used || 0)}
      />
    </div>
  );
}