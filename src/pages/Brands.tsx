import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Search } from "lucide-react";
import { toast } from 'sonner';
import type { Brand, BrandSummary, MoodboardFile, ColorItem } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import BrandList from '@/components/marcas/BrandList';
import BrandDetails from '@/components/marcas/BrandDetails';
import BrandDialog from '@/components/marcas/BrandDialog';

const Brands = () => {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedBrandSummary, setSelectedBrandSummary] = useState<BrandSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

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

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setBrands(mockBrands);
      
      // Select first brand by default
      if (mockBrands.length > 0) {
        handleSelectBrand(mockBrands[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBrand = async (brandSummary: BrandSummary) => {
    setSelectedBrandSummary(brandSummary);
    setIsLoadingDetails(true);
    
    try {
      // Simulate API call to get full brand details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock: return different data based on selected brand
      const fullBrand = {
        ...mockFullBrand,
        id: brandSummary.id,
        name: brandSummary.name,
        responsible: brandSummary.responsible,
        createdAt: brandSummary.createdAt,
        updatedAt: brandSummary.updatedAt
      };
      
      setSelectedBrand(fullBrand);
    } catch (error) {
      console.error('Erro ao carregar detalhes da marca:', error);
      toast.error('Erro ao carregar detalhes da marca');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateBrand = () => {
    setBrandToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setBrandToEdit(brand);
    setIsDialogOpen(true);
  };

  const handleSaveBrand = async (formData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>) => {
    try {
      setIsLoading(true);
      
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
        
        toast.success('Marca atualizada com sucesso!');
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
        toast.success('Marca criada com sucesso!');
      }
      
      setIsDialogOpen(false);
      setBrandToEdit(null);
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      toast.error('Erro ao salvar marca');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrand) return;
    
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setBrands(prev => prev.filter(b => b.id !== selectedBrand.id));
      setSelectedBrand(null);
      setSelectedBrandSummary(null);
      
      // Select first remaining brand if any
      const remainingBrands = brands.filter(b => b.id !== selectedBrand.id);
      if (remainingBrands.length > 0) {
        handleSelectBrand(remainingBrands[0]);
      }
      
      toast.success('Marca deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar marca:', error);
      toast.error('Erro ao deletar marca');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.responsible.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0 mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                <Tag className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Suas Marcas
                </CardTitle>
                <p className="text-muted-foreground">
                  Gerencie, edite ou crie novas marcas para seus projetos.
                </p>
              </div>
            </div>
            <Button 
              onClick={handleCreateBrand} 
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-5 text-base"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova marca
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brands List */}
        <Card className="lg:col-span-2 border-2 border-primary/10 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">Todas as marcas</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar marcas..." 
                className="pl-10 border-border/50 focus:border-primary/50 bg-background/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <BrandList
              brands={filteredBrands}
              selectedBrand={selectedBrandSummary}
              onSelectBrand={handleSelectBrand}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Brand Details */}
        <BrandDetails
          brand={selectedBrand}
          onEdit={handleEditBrand}
          onDelete={handleDeleteBrand}
          isLoading={isLoadingDetails}
        />
      </div>

      {/* Brand Dialog */}
      <BrandDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveBrand}
        brandToEdit={brandToEdit}
      />
    </div>
  );
};

export default Brands;