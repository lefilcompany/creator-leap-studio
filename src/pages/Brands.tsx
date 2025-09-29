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
import type { Brand, BrandSummary } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

// Definindo o tipo para os dados do formulário, que é um Brand parcial
type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

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
    id: "escola-marketing",
    name: "Escola de Marketing do Futuro",
    responsible: "thalles.silva.ext@lefil.com.br",
    createdAt: "2025-09-03T10:00:00.000Z",
    updatedAt: "2025-09-03T10:00:00.000Z"
  },
  {
    id: "grupo-cornelio",
    name: "Grupo Cornélio Brennand",
    responsible: "copy@lefil.com.br",
    createdAt: "2025-09-02T10:00:00.000Z", 
    updatedAt: "2025-09-02T10:00:00.000Z"
  },
  {
    id: "iclub",
    name: "Iclub",
    responsible: "marianna.monteiro.ext@lefil.com.br",
    createdAt: "2025-09-08T10:00:00.000Z",
    updatedAt: "2025-09-08T10:00:00.000Z"
  },
  {
    id: "juq", 
    name: "JUQ",
    responsible: "copy@lefil.com.br",
    createdAt: "2025-09-11T10:00:00.000Z",
    updatedAt: "2025-09-11T10:00:00.000Z"
  }
];

const mockFullBrand: Brand = {
  id: "acucar-petribu",
  name: "Açúcar Petribu",
  responsible: "copy@lefil.com.br", 
  segment: "Alimentício / Confeitaria / Doméstico / Açúcares",
  values: "Sabor, Tradição, Memória, Afeto, Família, Doçura, Regionalidade, Conexão.",
  keywords: "Sabor, Tradição, Afeto, Família, Açúcar, Saudável.",
  goals: "Fortalecer a conexão emocional com os consumidores, Valorizar a tradição e o sabor regional, Inspirar o uso do açúcar em receitas afetivas, Reforçar a presença da marca no dia a dia das famílias.",
  inspirations: "Marcas que valorizam tradição e família, como Nestle e Vigor.",
  successMetrics: "Aumento de 20% nas vendas, 15% de crescimento no engajamento digital.",
  references: "Posts no Instagram que mostram receitas caseiras e momentos em família.",
  specialDates: "Festa Junina, Natal, Dia das Mães, aniversários familiares.",
  promise: "O açúcar que adoça as memórias e fortalece os laços familiares.",
  crisisInfo: "Possível crise relacionada a questões de saúde e consumo de açúcar.",
  milestones: "Empresa familiar fundada há 50 anos, líder regional em açúcar refinado.",
  collaborations: "Parcerias com chefs locais e influenciadores de culinária.",
  restrictions: "Evitar associações diretas com problemas de saúde, não usar imagens de pessoas obesas.",
  moodboard: null,
  logo: null,
  referenceImage: null,
  colorPalette: [
    {
      id: "1",
      name: "Azul Petribu", 
      hex: "#1e40af",
      rgb: { r: 30, g: 64, b: 175 }
    },
    {
      id: "2",
      name: "Branco Açúcar",
      hex: "#ffffff", 
      rgb: { r: 255, g: 255, b: 255 }
    }
  ],
  createdAt: "2025-09-02T10:00:00.000Z",
  updatedAt: "2025-09-02T10:00:00.000Z",
  teamId: "team-1",
  userId: "1"
};

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

  // Simulate loading brands
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingBrands(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setBrands(mockBrands);
      setIsLoadingBrands(false);
    };
    
    loadData();
  }, []);

  const handleOpenDialog = useCallback((brand: Brand | null = null) => {
    setBrandToEdit(brand);
    setIsDialogOpen(true);
  }, []);

  const handleSelectBrand = useCallback(async (brand: BrandSummary) => {
    setSelectedBrandSummary(brand);
    setIsLoadingBrandDetails(true);
    setIsBrandDetailsOpen(true); // Abre o slider para todos os dispositivos
    
    try {
      // Simulate API call to get full brand details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock: return different data based on selected brand
      const fullBrand = {
        ...mockFullBrand,
        id: brand.id,
        name: brand.name,
        responsible: brand.responsible,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt
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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (brandToEdit) {
        // Update existing brand
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
        const newBrand: Brand = {
          ...formData,
          id: `brand-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamId: user?.teamId || 'team-1',
          userId: user?.id || '1'
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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setBrands(prev => prev.filter(brand => brand.id !== selectedBrand.id));
      setSelectedBrand(null);
      setSelectedBrandSummary(null);
      
      // Select first remaining brand if any
      const remainingBrands = brands.filter(b => b.id !== selectedBrand.id);
      if (remainingBrands.length > 0) {
        handleSelectBrand(remainingBrands[0]);
      }
      
      toast.success('Marca deletada com sucesso!', { id: toastId });
    } catch (error) {
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
          <SheetContent side="right" className="w-[75vw] max-w-none">
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
          <DrawerContent className="h-[75vh]">
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