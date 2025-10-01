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

// Definindo o tipo para os dados do formulário, que é um Brand parcial
type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function MarcasPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [selectedBrandSummary, setSelectedBrandSummary] = useState<BrandSummary | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoadingBrandDetails, setIsLoadingBrandDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isBrandDetailsOpen, setIsBrandDetailsOpen] = useState(false);

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

  const handleOpenDialog = useCallback((brand: Brand | null = null) => {
    setBrandToEdit(brand);
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
      toast.error('Erro ao carregar detalhes da marca');
    } finally {
      setIsLoadingBrandDetails(false);
    }
  }, []);

  const handleSaveBrand = useCallback(async (formData: BrandFormData) => {
    if (!user?.teamId || !user.id) {
      toast.error('Usuário não autenticado ou sem equipe');
      return;
    }

    const toastId = 'brand-operation';
    try {
      toast.loading(brandToEdit ? 'Atualizando marca...' : 'Criando marca...', { id: toastId });
      
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
        
        toast.success('Marca atualizada com sucesso!', { id: toastId });
      } else {
        // Create new brand
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
        toast.success('Marca criada com sucesso!', { id: toastId });
      }
      
      setIsDialogOpen(false);
      setBrandToEdit(null);
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      toast.error('Erro ao salvar marca. Tente novamente.', { id: toastId });
      throw error;
    }
  }, [brandToEdit, selectedBrand?.id, user]);

  const handleDeleteBrand = useCallback(async () => {
    if (!selectedBrand || !user?.teamId || !user?.id) {
      toast.error('Não foi possível deletar a marca. Verifique se você está logado.');
      return;
    }
    
    const toastId = 'brand-operation';
    try {
      toast.loading('Deletando marca...', { id: toastId });
      
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
      
      toast.success('Marca deletada com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Erro ao deletar marca:', error);
      toast.error('Erro ao deletar marca. Tente novamente.', { id: toastId });
    }
  }, [selectedBrand, user, brands, handleSelectBrand]);

  // Verificar se o limite foi atingido
  const isAtBrandLimit = team && typeof team.plan === 'object' 
    ? brands.length >= (team.plan.limits?.brands || 1)
    : false;

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
                  Suas Marcas
                </CardTitle>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Gerencie, edite ou crie novas marcas para seus projetos.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              disabled={isAtBrandLimit || isLoadingTeam}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 lg:px-6 py-3 lg:py-5 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Nova marca
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
        />
      </main>

      {/* Sheet para desktop/tablet (da direita) */}
      {!isMobile && (
        <Sheet open={isBrandDetailsOpen} onOpenChange={setIsBrandDetailsOpen}>
          <SheetContent side="right" className="w-1/2 max-w-none">
            <SheetTitle className="text-left mb-4">Detalhes da Marca</SheetTitle>
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
            <DrawerTitle className="text-left p-6 pb-0">Detalhes da Marca</DrawerTitle>
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
    </div>
  );
}