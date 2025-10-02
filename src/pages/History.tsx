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
import { supabase } from '@/integrations/supabase/client';

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

  // Load data in parallel for better performance
  useEffect(() => {
    const loadData = async () => {
      if (!user?.teamId) return;
      
      setIsLoadingBrands(true);
      setIsLoadingActions(true);

      try {
        // Load brands and actions in parallel
        const [brandsResult, actionsResult] = await Promise.all([
          // Load brands
          supabase
            .from('brands')
            .select('id, name, responsible, created_at, updated_at')
            .eq('team_id', user.teamId)
            .order('name'),
          
          // Load actions with count in single query
          (async () => {
            let query = supabase
              .from('actions')
              .select(`
                id,
                type,
                created_at,
                approved,
                brand_id,
                brands!inner(id, name)
              `, { count: 'exact' })
              .eq('team_id', user.teamId)
              .order('created_at', { ascending: false });

            // Apply brand filter if needed
            if (brandFilter !== 'all') {
              query = query.eq('brand_id', brandFilter);
            }

            // Apply type filter
            if (typeFilter !== 'all') {
              const selectedType = Object.entries(ACTION_TYPE_DISPLAY).find(
                ([_, display]) => display === typeFilter
              )?.[0];
              if (selectedType) {
                query = query.eq('type', selectedType);
              }
            }

            // Apply pagination
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

            return query;
          })()
        ]);

        // Process brands
        if (brandsResult.error) throw brandsResult.error;
        const brandSummaries: BrandSummary[] = (brandsResult.data || []).map(brand => ({
          id: brand.id,
          name: brand.name,
          responsible: brand.responsible,
          createdAt: brand.created_at,
          updatedAt: brand.updated_at
        }));
        setBrands(brandSummaries);

        // Process actions
        if (actionsResult.error) throw actionsResult.error;
        const actionSummaries: ActionSummary[] = (actionsResult.data || []).map(action => ({
          id: action.id,
          type: action.type as any,
          createdAt: action.created_at,
          approved: action.approved,
          brand: action.brands ? {
            id: action.brands.id,
            name: action.brands.name
          } : null
        }));
        setActions(actionSummaries);
        setTotalPages(Math.ceil((actionsResult.count || 0) / ITEMS_PER_PAGE));

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados",
          variant: "destructive"
        });
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingActions(false);
      }
    };

    loadData();
  }, [user?.teamId, brandFilter, typeFilter, currentPage, toast]);

  const handleSelectAction = useCallback(async (action: ActionSummary) => {
    setSelectedActionSummary(action);
    setIsLoadingActionDetails(true);
    setIsActionDetailsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          brand_id,
          team_id,
          user_id,
          created_at,
          updated_at,
          status,
          approved,
          revisions,
          details,
          result,
          brands(id, name)
        `)
        .eq('id', action.id)
        .single();

      if (error) throw error;

      const fullAction: Action = {
        id: data.id,
        type: data.type as any,
        brandId: data.brand_id,
        teamId: data.team_id,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        status: data.status,
        approved: data.approved,
        revisions: data.revisions,
        details: data.details as any,
        result: data.result as any,
        brand: data.brands ? {
          id: data.brands.id,
          name: data.brands.name
        } : undefined
      };
      
      setSelectedAction(fullAction);
    } catch (error) {
      console.error('Error loading action details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da ação",
        variant: "destructive"
      });
    } finally {
      setIsLoadingActionDetails(false);
    }
  }, [toast]);

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
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
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