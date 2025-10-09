import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Palette, Plus } from 'lucide-react';
import ThemeList from '@/components/temas/ThemeList';
import ThemeDetails from '@/components/temas/ThemeDetails';
import ThemeDialog from '@/components/temas/ThemeDialog';
import type { StrategicTheme, StrategicThemeSummary } from '@/types/theme';
import type { BrandSummary } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ThemeFormData = Omit<StrategicTheme, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function Themes() {
  const { user, team } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [themes, setThemes] = useState<StrategicThemeSummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [selectedThemeSummary, setSelectedThemeSummary] = useState<StrategicThemeSummary | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<StrategicTheme | null>(null);
  const [isLoadingThemeDetails, setIsLoadingThemeDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [themeToEdit, setThemeToEdit] = useState<StrategicTheme | null>(null);
  const [isThemeDetailsOpen, setIsThemeDetailsOpen] = useState(false);

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
        toast({
          title: "Erro",
          description: "Erro ao carregar marcas",
          variant: "destructive"
        });
      } finally {
        setIsLoadingBrands(false);
      }
    };
    
    loadBrands();
  }, [user?.teamId, toast]);

  // Load themes from database
  useEffect(() => {
    const loadThemes = async () => {
      if (!user?.teamId) return;
      
      setIsLoadingThemes(true);
      try {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        
        const { data, error, count } = await supabase
          .from('strategic_themes')
          .select('id, brand_id, title, created_at', { count: 'exact' })
          .eq('team_id', user.teamId)
          .order('created_at', { ascending: false })
          .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

        if (error) throw error;

        const themes: StrategicThemeSummary[] = (data || []).map(theme => ({
          id: theme.id,
          brandId: theme.brand_id,
          title: theme.title,
          createdAt: theme.created_at
        }));

        setThemes(themes);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Erro ao carregar temas:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar temas",
          variant: "destructive"
        });
      } finally {
        setIsLoadingThemes(false);
      }
    };
    
    loadThemes();
  }, [user?.teamId, currentPage, toast]);

  const handleOpenDialog = useCallback((theme: StrategicTheme | null = null) => {
    // Check if at limit before opening dialog for new theme
    if (!theme && team && themes.length >= team.plan.maxStrategicThemes) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${team.plan.maxStrategicThemes} temas do seu plano. Faça upgrade para criar mais temas.`,
        variant: "destructive"
      });
      return;
    }
    setThemeToEdit(theme);
    setIsDialogOpen(true);
  }, [team, themes.length, toast]);

  const handleSaveTheme = useCallback(
    async (formData: ThemeFormData): Promise<StrategicTheme> => {
      if (!user?.teamId || !user.id) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado ou sem equipe",
          variant: "destructive"
        });
        throw new Error('User not authenticated');
      }

      try {
        if (themeToEdit) {
          // Update existing theme
          const { error } = await supabase
            .from('strategic_themes')
            .update({
              brand_id: formData.brandId,
              title: formData.title,
              description: formData.description,
              target_audience: formData.targetAudience,
              tone_of_voice: formData.toneOfVoice,
              objectives: formData.objectives,
              color_palette: formData.colorPalette,
              hashtags: formData.hashtags,
              content_format: formData.contentFormat,
              macro_themes: formData.macroThemes,
              best_formats: formData.bestFormats,
              platforms: formData.platforms,
              expected_action: formData.expectedAction,
              additional_info: formData.additionalInfo,
            })
            .eq('id', themeToEdit.id);

          if (error) throw error;

          const saved: StrategicTheme = {
            ...themeToEdit,
            ...formData,
            updatedAt: new Date().toISOString(),
          };

          const summary: StrategicThemeSummary = {
            id: saved.id,
            brandId: saved.brandId,
            title: saved.title,
            createdAt: saved.createdAt,
          };

          setThemes(prev => prev.map(theme => theme.id === summary.id ? summary : theme));
          
          if (selectedTheme?.id === saved.id) {
            setSelectedTheme(saved);
            setSelectedThemeSummary(summary);
          }

          toast({
            title: "Sucesso!",
            description: 'Tema atualizado com sucesso!'
          });

          setIsDialogOpen(false);
          setThemeToEdit(null);
          
          return saved;
        } else {
          // Create new theme
          const { data, error } = await supabase
            .from('strategic_themes')
            .insert({
              team_id: user.teamId,
              user_id: user.id,
              brand_id: formData.brandId,
              title: formData.title,
              description: formData.description,
              target_audience: formData.targetAudience,
              tone_of_voice: formData.toneOfVoice,
              objectives: formData.objectives,
              color_palette: formData.colorPalette,
              hashtags: formData.hashtags,
              content_format: formData.contentFormat,
              macro_themes: formData.macroThemes,
              best_formats: formData.bestFormats,
              platforms: formData.platforms,
              expected_action: formData.expectedAction,
              additional_info: formData.additionalInfo,
            })
            .select()
            .single();

          if (error) throw error;

          const saved: StrategicTheme = {
            ...formData,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            teamId: user.teamId,
            userId: user.id
          };

          const summary: StrategicThemeSummary = {
            id: saved.id,
            brandId: saved.brandId,
            title: saved.title,
            createdAt: saved.createdAt,
          };

          setThemes(prev => [...prev, summary]);
          setSelectedTheme(saved);
          setSelectedThemeSummary(summary);

          toast({
            title: "Sucesso!",
            description: 'Tema criado com sucesso!'
          });

          setIsDialogOpen(false);
          setThemeToEdit(null);
          
          return saved;
        }
      } catch (error) {
        console.error('Erro ao salvar tema:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar tema. Tente novamente.",
          variant: "destructive"
        });
        throw error;
      }
    },
    [themeToEdit, selectedTheme?.id, user, toast]
  );

  const handleDeleteTheme = useCallback(async () => {
    if (!selectedTheme || !user?.teamId || !user?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar o tema. Verifique se você está logado.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', selectedTheme.id);

      if (error) throw error;

      setThemes(prev => prev.filter(theme => theme.id !== selectedTheme.id));
      setSelectedTheme(null);
      setSelectedThemeSummary(null);
      setIsThemeDetailsOpen(false);
      setIsDialogOpen(false);
      setThemeToEdit(null);
      
      toast({
        title: "Sucesso!",
        description: "Tema deletado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao deletar tema:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar tema. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [selectedTheme, user, toast]);

  const handleSelectTheme = useCallback(async (theme: StrategicThemeSummary) => {
    setSelectedThemeSummary(theme);
    setIsLoadingThemeDetails(true);
    setIsThemeDetailsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', theme.id)
        .single();

      if (error) throw error;

      const fullTheme: StrategicTheme = {
        id: data.id,
        brandId: data.brand_id,
        title: data.title,
        description: data.description,
        targetAudience: data.target_audience,
        toneOfVoice: data.tone_of_voice,
        objectives: data.objectives,
        colorPalette: data.color_palette,
        hashtags: data.hashtags,
        contentFormat: data.content_format,
        macroThemes: data.macro_themes,
        bestFormats: data.best_formats,
        platforms: data.platforms,
        expectedAction: data.expected_action,
        additionalInfo: data.additional_info || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        teamId: data.team_id,
        userId: data.user_id
      };
      
      setSelectedTheme(fullTheme);
    } catch (error) {
      console.error('Erro ao carregar detalhes do tema:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do tema",
        variant: "destructive"
      });
    } finally {
      setIsLoadingThemeDetails(false);
    }
  }, [toast]);

  // Verificar se o limite foi atingido
  const isAtThemeLimit = team ? themes.length >= team.plan.maxStrategicThemes : false;

  return (
    <div className="min-h-full flex flex-col gap-6">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-3">
                <Palette className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Seus Temas Estratégicos
                </CardTitle>
                <p className="text-muted-foreground">
                  Gerencie, edite ou crie novos temas para seus projetos.
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              disabled={isAtThemeLimit}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              title={isAtThemeLimit ? `Limite de ${team?.plan.maxStrategicThemes} temas atingido` : undefined}
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo tema {team && `(${themes.length}/${team.plan.maxStrategicThemes})`}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <main className="grid gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden grid-cols-1">
        <ThemeList
          themes={themes}
          brands={brands}
          selectedTheme={selectedThemeSummary}
          onSelectTheme={handleSelectTheme}
          isLoading={isLoadingThemes}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </main>

      {/* Sheet para desktop/tablet (da direita) */}
      {!isMobile && (
        <Sheet open={isThemeDetailsOpen} onOpenChange={setIsThemeDetailsOpen}>
          <SheetContent side="right" className="w-[85vw] max-w-none">
            <SheetTitle className="text-left mb-4">Detalhes do Tema</SheetTitle>
            <ThemeDetails
              theme={selectedTheme}
              brands={brands}
              onEdit={handleOpenDialog}
              onDelete={handleDeleteTheme}
              isLoading={isLoadingThemeDetails}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Drawer para mobile (de baixo) */}
      {isMobile && (
        <Drawer open={isThemeDetailsOpen} onOpenChange={setIsThemeDetailsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="text-left p-6 pb-0">Detalhes do Tema</DrawerTitle>
            <ThemeDetails
              theme={selectedTheme}
              brands={brands}
              onEdit={handleOpenDialog}
              onDelete={handleDeleteTheme}
              isLoading={isLoadingThemeDetails}
            />
          </DrawerContent>
        </Drawer>
      )}

      <ThemeDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveTheme}
        themeToEdit={themeToEdit}
        brands={brands}
      />
    </div>
  );
}