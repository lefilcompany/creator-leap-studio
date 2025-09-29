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
import type { Team } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

type ThemeFormData = Omit<StrategicTheme, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

export default function Themes() {
  const { user } = useAuth();
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
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isThemeDetailsOpen, setIsThemeDetailsOpen] = useState(false);

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
        },
        { 
          id: '4', 
          name: 'Grupo Cornélio Brennand', 
          responsible: 'Ana Oliveira',
          createdAt: '2025-01-04T00:00:00Z',
          updatedAt: '2025-01-04T00:00:00Z'
        }
      ];

      // Mock themes data
      const mockThemes: StrategicThemeSummary[] = [
        {
          id: '1',
          brandId: '1',
          title: 'Acolhimento e Suporte em Momentos de Despedida',
          createdAt: '2025-09-10T00:00:00Z'
        },
        {
          id: '2',
          brandId: '2',
          title: 'Acolhimento em Momento de Despedida Pet',
          createdAt: '2025-09-18T00:00:00Z'
        },
        {
          id: '3',
          brandId: '3',
          title: 'AEIOU - Marketing do Futuro',
          createdAt: '2025-09-12T00:00:00Z'
        },
        {
          id: '4',
          brandId: '4',
          title: 'Atiaia Renováveis: Destaque no GPTW pelo Segundo Ano Consecutivo',
          createdAt: '2025-09-25T00:00:00Z'
        }
      ];

      // Mock team data
      const mockTeam: Team = {
        id: 'team-1',
        name: 'LeFil',
        code: 'lefil-123',
        admin: 'copy@lefil.com.br',
        members: ['copy@lefil.com.br'],
        pending: [],
        plan: {
          name: 'PREMIUM',
          limits: {
            members: 10,
            themes: 10,
            brands: 20,
            personas: 15,
            calendars: 5,
            contentSuggestions: 100,
            contentReviews: 50
          }
        }
      };

      setBrands(mockBrands);
      setThemes(mockThemes);
      setTeam(mockTeam);
      setIsLoadingBrands(false);
      setIsLoadingThemes(false);
      setIsLoadingTeam(false);
    };

    if (user?.teamId) {
      loadMockData();
    }
  }, [user]);

  const handleOpenDialog = useCallback((theme: StrategicTheme | null = null) => {
    // Check limit before opening dialog for new theme
    if (!theme && team && typeof team.plan === 'object') {
      const planLimits = team.plan.limits;
      const currentThemesCount = themes.length;
      const maxThemes = planLimits?.themes || 3;

      if (currentThemesCount >= maxThemes) {
        toast({
          title: "Limite atingido!",
          description: `Seu plano ${team.plan.name} permite apenas ${maxThemes} tema${maxThemes > 1 ? 's' : ''}.`,
          variant: "destructive"
        });
        return;
      }
    }

    setThemeToEdit(theme);
    setIsDialogOpen(true);
  }, [themes.length, team, toast]);

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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const saved: StrategicTheme = {
        ...formData,
        id: themeToEdit?.id || Date.now().toString(),
        createdAt: themeToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teamId: user.teamId,
        userId: user.id
      };

      const summary: StrategicThemeSummary = {
        id: saved.id,
        brandId: saved.brandId,
        title: saved.title,
        createdAt: saved.createdAt,
      };

      // Update themes list
      setThemes(prev => {
        if (themeToEdit) {
          return prev.map(theme => theme.id === summary.id ? summary : theme);
        }
        return [...prev, summary];
      });

      // Update selected theme if necessary
      if (themeToEdit && selectedTheme?.id === saved.id) {
        setSelectedTheme(saved);
        setSelectedThemeSummary(summary);
      } else if (!themeToEdit) {
        setSelectedTheme(saved);
        setSelectedThemeSummary(summary);
      }
      
      // Close dialog after successful save
      setIsDialogOpen(false);
      setThemeToEdit(null);

      toast({
        title: "Sucesso!",
        description: themeToEdit ? 'Tema atualizado com sucesso!' : 'Tema criado com sucesso!'
      });
      
      return saved;
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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove theme from list and clear selection
    setThemes(prev => prev.filter(theme => theme.id !== selectedTheme.id));
    setSelectedTheme(null);
    setSelectedThemeSummary(null);
    
    // Close dialog if open
    setIsDialogOpen(false);
    setThemeToEdit(null);
    
    toast({
      title: "Sucesso!",
      description: "Tema deletado com sucesso!"
    });
  }, [selectedTheme, user, toast]);

  const handleSelectTheme = useCallback(async (theme: StrategicThemeSummary) => {
    setSelectedThemeSummary(theme);
    setIsLoadingThemeDetails(true);
    setIsThemeDetailsOpen(true); // Abre o slider para todos os dispositivos
    
    try {
      // Simulate API call to get full theme details
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock full theme data
      const fullTheme: StrategicTheme = {
        id: theme.id,
        brandId: theme.brandId,
        title: theme.title,
        description: 'Este é um tema estratégico focado em oferecer acolhimento e suporte em momentos difíceis, proporcionando conforto e paz para as famílias.',
        targetAudience: 'Famílias com idosos, pessoas que sofreram perdas recentes, adultos entre 40-60 anos.',
        toneOfVoice: 'profissional, sério',
        objectives: 'Transmitir confiança e segurança, demonstrar empatia e cuidado, oferecer suporte emocional',
        colorPalette: '#2C3E50, #3498DB, #95A5A6',
        hashtags: '#cuidado #familia #confianca #acolhimento',
        contentFormat: 'Posts informativos, depoimentos, conteúdo educativo',
        macroThemes: 'Cuidado humanizado, suporte familiar, momentos de paz',
        bestFormats: 'Carrossel, posts únicos, stories',
        platforms: 'Instagram, Facebook, WhatsApp',
        expectedAction: 'Engajamento, geração de leads, fortalecimento da marca',
        additionalInfo: 'Foco em transmitir serenidade e profissionalismo',
        createdAt: theme.createdAt,
        updatedAt: new Date().toISOString(),
        teamId: user?.teamId || '',
        userId: user?.id || ''
      };
      
      setSelectedTheme(fullTheme);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao carregar detalhes do tema",
        variant: "destructive"
      });
    } finally {
      setIsLoadingThemeDetails(false);
    }
  }, [user, toast]);

  // Check if at theme limit
  const isAtThemeLimit = team && typeof team.plan === 'object'
    ? themes.length >= (team.plan.limits?.themes || 3)
    : false;

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
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo tema
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