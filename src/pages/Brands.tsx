'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Plus, Tag } from 'lucide-react';
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
import { Coins } from 'lucide-react';

// Definindo o tipo para os dados do formulário, que é um Brand parcial
type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function MarcasPage() {
  const { user, team, refreshTeamData } = useAuth();
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

  // Load brands from database
  useEffect(() => {
    const loadBrands = async () => {
      if (!user?.teamId) return;
      
      setIsLoadingBrands(true);
      try {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        
        const { data, error, count } = await supabase
          .from('brands')
          .select('id, name, responsible, created_at, updated_at', { count: 'exact' })
          .eq('team_id', user.teamId)
          .order('name', { ascending: true })
          .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

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
  }, [user?.teamId, currentPage]);

  const handleOpenDialog = useCallback((brand: Brand | null = null) => {
    // Para edição, abrir direto
    if (brand) {
      setBrandToEdit(brand);
      setIsDialogOpen(true);
      return;
    }

    // Para nova marca, verificar se team está carregado
    if (!team) {
      toast.error('Carregando dados da equipe...');
      return;
    }

    const freeBrandsUsed = team.free_brands_used || 0;
    const isFree = freeBrandsUsed < 3;

    // Se não for gratuita, verificar créditos
    if (!isFree && team.credits < 1) {
      toast.error('Créditos insuficientes. Criar uma marca custa 1 crédito (as 3 primeiras são gratuitas).');
      return;
    }

    // Abrir diálogo de confirmação
    setBrandToEdit(null);
    setIsConfirmDialogOpen(true);
  }, [team, brands.length, t]);

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
    if (!user?.teamId || !user.id) {
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
        const freeBrandsUsed = team.free_brands_used || 0;
        const isFree = freeBrandsUsed < 3;

        const { data, error } = await supabase
          .from('brands')
          .insert({
            team_id: user.teamId,
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
          teamId: user.teamId,
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
        
        // Atualizar contador ou deduzir crédito
        if (isFree) {
          // Incrementar contador de marcas gratuitas
          await supabase
            .from('teams')
            .update({ free_brands_used: freeBrandsUsed + 1 } as any)
            .eq('id', user.teamId);
        } else {
          // Deduzir 1 crédito
          await supabase
            .from('teams')
            .update({ credits: team.credits - 1 } as any)
            .eq('id', user.teamId);

          // Registrar no histórico de créditos
          await supabase
            .from('credit_history')
            .insert({
              team_id: user.teamId,
              user_id: user.id,
              action_type: 'CREATE_BRAND',
              credits_used: 1,
              credits_before: team.credits,
              credits_after: team.credits - 1,
              description: `Criação da marca: ${formData.name}`,
              metadata: { brand_id: data.id, brand_name: formData.name }
            });
        }
        
        // Atualizar créditos sem reload
        await refreshTeamData();
        
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

  // Desabilitar apenas se não tiver créditos ou se team não carregou
  const isButtonDisabled = !team || team.credits < 1;

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 overflow-hidden">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0">
        <CardHeader className="pb-3 lg:pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2 lg:p-3">
                <Tag className="h-6 w-6 lg:h-8 lg:w-8" />
              </div>
              <div>
                <CardTitle className="text-xl lg:text-2xl font-bold">
                  {t.brands.pageTitle}
                </CardTitle>
                <p className="text-sm lg:text-base text-muted-foreground">
                  {t.brands.pageDescription}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              disabled={isButtonDisabled}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 lg:px-6 py-3 lg:py-5 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title={!team ? 'Carregando...' : (team.credits < 1 ? 'Créditos insuficientes' : undefined)}
            >
              <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              {t.brands.newBrand}
              <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                <Coins className="h-3 w-3" />
                1
              </span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <main className="grid gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden grid-cols-1">
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
        currentBalance={team?.credits || 0}
        cost={1}
        resourceType="marca"
      />
    </div>
  );
}