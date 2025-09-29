import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History as HistoryIcon } from 'lucide-react';
import ActionList from '@/components/historico/ActionList';
import ActionDetails from '@/components/historico/ActionDetails';
import type { Action, ActionSummary } from '@/types/action';
import type { BrandSummary } from '@/types/brand';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

export default function History() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [actions, setActions] = useState<ActionSummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [selectedActionSummary, setSelectedActionSummary] = useState<ActionSummary | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingActionDetails, setIsLoadingActionDetails] = useState(false);
  const [isActionDetailsOpen, setIsActionDetailsOpen] = useState(false);

  // Estados para os filtros
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Mock data - In a real app, this would come from API calls
  useEffect(() => {
    const loadMockData = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock brands data
      const mockBrands: BrandSummary[] = [
        { 
          id: '1', 
          name: 'Morada da Paz', 
          responsible: 'João Silva',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        { 
          id: '2', 
          name: 'Morada da Paz Pet', 
          responsible: 'Maria Santos',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z'
        },
        { 
          id: '3', 
          name: 'LeFil Company', 
          responsible: 'Pedro Costa',
          createdAt: '2025-01-03T00:00:00Z',
          updatedAt: '2025-01-03T00:00:00Z'
        }
      ];

      // Mock actions data with more items for pagination
      const mockActions: ActionSummary[] = [
        {
          id: '1',
          type: 'CRIAR_CONTEUDO',
          brandId: '1',
          brand: { id: '1', name: 'Morada da Paz' },
          approved: true,
          createdAt: '2025-09-29T10:30:00Z'
        },
        {
          id: '2',
          type: 'REVISAR_CONTEUDO',
          brandId: '2',
          brand: { id: '2', name: 'Morada da Paz Pet' },
          approved: true,
          createdAt: '2025-09-29T09:15:00Z'
        },
        {
          id: '3',
          type: 'PLANEJAR_CONTEUDO',
          brandId: '3',
          brand: { id: '3', name: 'LeFil Company' },
          approved: true,
          createdAt: '2025-09-29T08:45:00Z'
        },
        {
          id: '4',
          type: 'CRIAR_CONTEUDO',
          brandId: '1',
          brand: { id: '1', name: 'Morada da Paz' },
          approved: false,
          createdAt: '2025-09-28T16:20:00Z'
        },
        {
          id: '5',
          type: 'REVISAR_CONTEUDO',
          brandId: '2',
          brand: { id: '2', name: 'Morada da Paz Pet' },
          approved: true,
          createdAt: '2025-09-28T14:30:00Z'
        },
        {
          id: '6',
          type: 'PLANEJAR_CONTEUDO',
          brandId: '3',
          brand: { id: '3', name: 'LeFil Company' },
          approved: true,
          createdAt: '2025-09-28T13:15:00Z'
        },
        {
          id: '7',
          type: 'CRIAR_CONTEUDO',
          brandId: '1',
          brand: { id: '1', name: 'Morada da Paz' },
          approved: true,
          createdAt: '2025-09-28T11:45:00Z'
        },
        {
          id: '8',
          type: 'REVISAR_CONTEUDO',
          brandId: '2',
          brand: { id: '2', name: 'Morada da Paz Pet' },
          approved: false,
          createdAt: '2025-09-28T10:20:00Z'
        },
        {
          id: '9',
          type: 'PLANEJAR_CONTEUDO',
          brandId: '3',
          brand: { id: '3', name: 'LeFil Company' },
          approved: true,
          createdAt: '2025-09-28T09:00:00Z'
        },
        {
          id: '10',
          type: 'CRIAR_CONTEUDO',
          brandId: '1',
          brand: { id: '1', name: 'Morada da Paz' },
          approved: true,
          createdAt: '2025-09-27T17:30:00Z'
        },
        {
          id: '11',
          type: 'REVISAR_CONTEUDO',
          brandId: '2',
          brand: { id: '2', name: 'Morada da Paz Pet' },
          approved: true,
          createdAt: '2025-09-27T16:15:00Z'
        },
        {
          id: '12',
          type: 'PLANEJAR_CONTEUDO',
          brandId: '3',
          brand: { id: '3', name: 'LeFil Company' },
          approved: false,
          createdAt: '2025-09-27T15:00:00Z'
        },
        {
          id: '13',
          type: 'CRIAR_CONTEUDO',
          brandId: '1',
          brand: { id: '1', name: 'Morada da Paz' },
          approved: true,
          createdAt: '2025-09-27T14:20:00Z'
        },
        {
          id: '14',
          type: 'REVISAR_CONTEUDO',
          brandId: '2',
          brand: { id: '2', name: 'Morada da Paz Pet' },
          approved: true,
          createdAt: '2025-09-27T13:10:00Z'
        },
        {
          id: '15',
          type: 'PLANEJAR_CONTEUDO',
          brandId: '3',
          brand: { id: '3', name: 'LeFil Company' },
          approved: true,
          createdAt: '2025-09-27T12:00:00Z'
        }
      ];

      // Apply filters
      let filteredActions = mockActions;
      
      if (brandFilter !== 'all') {
        filteredActions = filteredActions.filter(action => action.brand?.name === brandFilter);
      }
      
      if (typeFilter !== 'all') {
        filteredActions = filteredActions.filter(action => ACTION_TYPE_DISPLAY[action.type] === typeFilter);
      }

      // Apply pagination
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedActions = filteredActions.slice(startIndex, endIndex);

      setBrands(mockBrands);
      setActions(paginatedActions);
      setTotalPages(Math.ceil(filteredActions.length / ITEMS_PER_PAGE));
      setIsLoadingBrands(false);
      setIsLoadingActions(false);
    };

    if (user?.teamId) {
      loadMockData();
    }
  }, [user, brandFilter, typeFilter, currentPage]);

  const handleSelectAction = useCallback(async (action: ActionSummary) => {
    setSelectedActionSummary(action);
    setIsLoadingActionDetails(true);
    setIsActionDetailsOpen(true);
    
    try {
      // Simulate API call to get full action details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock full action data
      const fullAction: Action = {
        id: action.id,
        type: action.type,
        brandId: action.brandId,
        brand: action.brand,
        details: {
          platform: action.type === 'CRIAR_CONTEUDO' ? 'Instagram' : action.type === 'PLANEJAR_CONTEUDO' ? 'Instagram' : undefined,
          quantity: action.type === 'PLANEJAR_CONTEUDO' ? '5 posts' : undefined
        },
        result: {
          title: action.type === 'CRIAR_CONTEUDO' ? 'Descubra o sabor que chegou da Amazon!' : undefined,
          body: action.type === 'CRIAR_CONTEUDO' ? 'Nossos novos produtos chegaram diretamente da floresta amazônica para sua mesa. Experimente sabores únicos e autênticos que conectam você com a natureza. 🌿✨\n\n#SaboresAmazonicos #NaturezaPura #NovosProdutos' : undefined,
          feedback: action.type === 'REVISAR_CONTEUDO' ? 'O conteúdo está bem estruturado e alinhado com a identidade da marca. Sugestões: adicionar mais elementos visuais que remetam à natureza e incluir call-to-action mais direto para aumentar o engajamento.' : undefined,
          plan: action.type === 'PLANEJAR_CONTEUDO' ? '<h3>Planejamento de Conteúdo - 5 Posts Instagram</h3><ul><li><strong>Post 1:</strong> Apresentação dos novos produtos amazônicos</li><li><strong>Post 2:</strong> História por trás dos produtos</li><li><strong>Post 3:</strong> Benefícios e propriedades</li><li><strong>Post 4:</strong> Depoimentos de clientes</li><li><strong>Post 5:</strong> Call-to-action para compra</li></ul>' : undefined,
          imageUrl: action.type === 'CRIAR_CONTEUDO' ? 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop' : undefined,
          originalImage: action.type === 'REVISAR_CONTEUDO' ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop' : undefined
        },
        approved: action.approved,
        createdAt: action.createdAt,
        updatedAt: action.createdAt,
        teamId: user?.teamId || '',
        userId: user?.id || ''
      };
      
      setSelectedAction(fullAction);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao carregar detalhes da ação",
        variant: "destructive"
      });
    } finally {
      setIsLoadingActionDetails(false);
    }
  }, [user, toast]);

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [brandFilter, typeFilter, currentPage]);

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-3">
                <HistoryIcon className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Histórico de Ações
                </CardTitle>
                <p className="text-muted-foreground">
                  Visualize e filtre todas as ações realizadas no sistema.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Filtro de Marca */}
              <Select onValueChange={setBrandFilter} value={brandFilter}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                  <SelectValue placeholder="Filtrar por marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Marcas</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Filtro de Ação */}
              <Select onValueChange={setTypeFilter} value={typeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  {Object.values(ACTION_TYPE_DISPLAY).map(displayType => (
                    <SelectItem key={displayType} value={displayType}>{displayType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ActionList
          actions={actions}
          selectedAction={selectedActionSummary}
          onSelectAction={handleSelectAction}
          isLoading={isLoadingActions}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Sheet para desktop/tablet (da direita) */}
      {!isMobile && (
        <Sheet open={isActionDetailsOpen} onOpenChange={setIsActionDetailsOpen}>
          <SheetContent side="right" className="w-[60vw] max-w-none">
            <SheetTitle className="text-left mb-4">Detalhes da Ação</SheetTitle>
            <ActionDetails
              action={selectedAction}
              isLoading={isLoadingActionDetails}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Drawer para mobile (de baixo) */}
      {isMobile && (
        <Drawer open={isActionDetailsOpen} onOpenChange={setIsActionDetailsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="text-left p-6 pb-0">Detalhes da Ação</DrawerTitle>
            <ActionDetails
              action={selectedAction}
              isLoading={isLoadingActionDetails}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}