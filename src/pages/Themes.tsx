import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Palette, Plus, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ThemeList from '@/components/temas/ThemeList';
import ThemeDetails from '@/components/temas/ThemeDetails';
import ThemeDialog from '@/components/temas/ThemeDialog';
import type { StrategicTheme, StrategicThemeSummary } from '@/types/theme';
import type { BrandSummary } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditConfirmationDialog } from '@/components/CreditConfirmationDialog';
import { Coins } from 'lucide-react';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { themesSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import themesBanner from '@/assets/themes-banner.jpg';

type ThemeFormData = Omit<StrategicTheme, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function Themes() {
  const { user, team, refreshTeamData, refreshUserCredits } = useAuth();
  const isMobile = useIsMobile();
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
          brandColor: null,
          avatarUrl: null,
          createdAt: brand.created_at,
          updatedAt: brand.updated_at
        }));

        setBrands(brands);
      } catch (error) {
        console.error('Erro ao carregar marcas:', error);
        toast.error("Não foi possível carregar as marcas");
      } finally {
        setIsLoadingBrands(false);
      }
    };
    
    loadBrands();
  }, [user?.id]);

  // Load themes from database - user can see own themes OR team themes
  useEffect(() => {
    const loadThemes = async () => {
      if (!user?.id) return;
      
      setIsLoadingThemes(true);
      try {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        
        // Query themes user has access to (via RLS can_access_resource)
        const { data, error, count } = await supabase
          .from('strategic_themes')
          .select('id, brand_id, title, created_at', { count: 'exact' })
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
        toast.error("Não foi possível carregar os temas estratégicos");
      } finally {
        setIsLoadingThemes(false);
      }
    };
    
    loadThemes();
  }, [user?.id, currentPage]);

  const handleOpenDialog = useCallback((theme: StrategicTheme | null = null) => {
    // Para edição, abrir direto
    if (theme) {
      setThemeToEdit(theme);
      setIsDialogOpen(true);
      return;
    }

    // Para novo tema, verificar se user está carregado
    if (!user) {
      toast.error('Carregando dados do usuário...');
      return;
    }

    const freeThemesUsed = team?.free_themes_used || 0;
    const isFree = freeThemesUsed < 3;

    // Se não for gratuito, verificar créditos individuais
    if (!isFree && (user.credits || 0) < 1) {
      toast.error('Créditos insuficientes. Criar um tema custa 1 crédito (os 3 primeiros são gratuitos).');
      return;
    }

    // Abrir diálogo de confirmação
    setThemeToEdit(null);
    setIsConfirmDialogOpen(true);
  }, [user, team, themes.length]);

  const handleConfirmCreate = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setIsDialogOpen(true);
  }, []);

  const handleSaveTheme = useCallback(
    async (formData: ThemeFormData): Promise<StrategicTheme> => {
      if (!user?.id) {
        toast.error("Informações do usuário não disponíveis");
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

          toast.success(themeToEdit ? 'Tema atualizado com sucesso!' : 'Tema criado com sucesso!');

          setIsDialogOpen(false);
          setThemeToEdit(null);
          
          return saved;
        } else {
          // Create new theme
          const { data, error } = await supabase
            .from('strategic_themes')
            .insert({
              team_id: user.teamId || null, // Optional team association
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
            teamId: user.teamId || '',
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

          // Atualizar contador ou deduzir crédito individual
          const freeThemesUsed = team?.free_themes_used || 0;
          const isFree = freeThemesUsed < 3;

          if (isFree && user.teamId) {
            // Incrementar contador de temas gratuitos (apenas se tiver equipe)
            await supabase
              .from('teams')
              .update({ free_themes_used: freeThemesUsed + 1 } as any)
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
                action_type: 'CREATE_THEME',
                credits_used: 1,
                credits_before: currentCredits,
                credits_after: currentCredits - 1,
                description: `Criação do tema: ${formData.title}`,
                metadata: { theme_id: saved.id, theme_title: formData.title }
              });
            
            // Atualizar créditos do usuário
            await refreshUserCredits();
          }

          toast.success(isFree 
            ? `Tema criado com sucesso! (${3 - freeThemesUsed - 1} temas gratuitos restantes)` 
            : 'Tema criado com sucesso!'
          );

          setIsDialogOpen(false);
          setThemeToEdit(null);
          
          return saved;
        }
      } catch (error) {
        console.error('Erro ao salvar tema:', error);
        toast.error("Erro ao salvar tema. Tente novamente.");
        throw error;
      }
    },
    [themeToEdit, selectedTheme?.id, user]
  );

  const handleDeleteTheme = useCallback(async () => {
    if (!selectedTheme || !user?.teamId || !user?.id) {
      toast.error("Não foi possível deletar o tema. Verifique se você está logado.");
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
      
      toast.success("Tema deletado com sucesso!");
    } catch (error) {
      console.error('Erro ao deletar tema:', error);
      toast.error("Erro ao deletar tema. Tente novamente.");
    }
  }, [selectedTheme, user]);

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
      toast.error("Erro ao carregar detalhes do tema");
    } finally {
      setIsLoadingThemeDetails(false);
    }
  }, []);

  // Desabilitar apenas se não tiver créditos ou se user não carregou
  const isButtonDisabled = !user || (user.credits || 0) < 1;

  return (
    <div className="h-full flex flex-col overflow-hidden -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 flex-shrink-0 overflow-hidden">
        <img 
          src={themesBanner} 
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
            <div className="bg-secondary/10 border border-secondary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <Palette className="h-8 w-8 lg:h-10 lg:w-10 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Seus Temas Estratégicos
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" side="bottom" align="start">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">O que são Temas Estratégicos?</h4>
                      <p className="text-muted-foreground">
                        Temas estratégicos são diretrizes de conteúdo que definem o tom, estilo e objetivos das suas publicações. Eles garantem consistência na comunicação da marca.
                      </p>
                      <h4 className="font-semibold text-foreground mt-3">Como usar?</h4>
                      <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Crie um tema vinculado a uma marca existente</li>
                        <li>Defina público-alvo, tom de voz e objetivos</li>
                        <li>Use o tema ao criar conteúdos para manter a estratégia alinhada</li>
                      </ul>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        Os 3 primeiros temas são gratuitos. Depois, cada novo tema custa 1 crédito.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Gerencie, edite ou crie novos temas para seus projetos.
              </p>
            </div>
          </div>

          <Button
            id="themes-create-button"
            onClick={() => handleOpenDialog()}
            disabled={isButtonDisabled}
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
            title={!user ? 'Carregando...' : ((user.credits || 0) < 1 ? 'Créditos insuficientes' : undefined)}
          >
            <Plus className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
            Novo tema
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
              tourType: 'themes',
              steps: themesSteps,
              label: 'Tour de Temas',
              targetElement: '#themes-create-button'
            }
          ]}
          startDelay={500}
        />
      </div>

      {/* Table */}
      <main id="themes-list" className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
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

      <CreditConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={handleConfirmCreate}
        currentBalance={user?.credits || 0}
        cost={1}
        resourceType="tema estratégico"
        isFreeResource={(team?.free_themes_used || 0) < 3}
        freeResourcesRemaining={3 - (team?.free_themes_used || 0)}
      />

      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'themes',
            steps: themesSteps,
            label: 'Tour de Temas Estratégicos',
            targetElement: '#themes-create-button'
          }
        ]}
        startDelay={500}
      />
    </div>
  );
}