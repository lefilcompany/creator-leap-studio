import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Rocket, Users, Package, Palette, UserCircle, Sparkles, Calendar, FileText, CheckCircle } from 'lucide-react';
import type { Plan, TeamCredits } from '@/types/plan';

const Plans = () => {
  const { team } = useAuth();

  // Mock data - substituir com dados reais
  const mockPlan: Plan = {
    id: '1',
    name: 'premium',
    displayName: 'Premium',
    price: 299,
    trialDays: 14,
    maxMembers: 10,
    maxBrands: 20,
    maxStrategicThemes: 50,
    maxPersonas: 30,
    quickContentCreations: 1000,
    customContentSuggestions: 500,
    contentPlans: 100,
    contentReviews: 200,
    isActive: true,
    stripePriceId: null,
  };

  const mockCredits: TeamCredits = {
    quickContentCreations: 736,
    contentSuggestions: 350,
    contentReviews: 145,
    contentPlans: 67,
  };

  const totalCredits = mockPlan.quickContentCreations + mockPlan.customContentSuggestions + mockPlan.contentPlans + mockPlan.contentReviews;
  const usedCredits = 
    (mockPlan.quickContentCreations - mockCredits.quickContentCreations) +
    (mockPlan.customContentSuggestions - mockCredits.contentSuggestions) +
    (mockPlan.contentPlans - mockCredits.contentPlans) +
    (mockPlan.contentReviews - mockCredits.contentReviews);
  const remainingCredits = totalCredits - usedCredits;
  const usagePercentage = (usedCredits / totalCredits) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Planos e Uso</h1>
        <p className="text-muted-foreground">
          Acompanhe seus créditos, uso e informações do plano da equipe
        </p>
      </div>

      {/* Card de Créditos Restantes */}
      <Card className="p-6 border-2 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Créditos Restantes
            </h2>
          </div>
          <Badge variant="secondary" className="text-sm">
            {mockPlan.displayName}
          </Badge>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-5xl font-bold text-foreground mb-2">{remainingCredits.toLocaleString()}</p>
            <p className="text-muted-foreground">de {totalCredits.toLocaleString()} créditos disponíveis</p>
          </div>
          
          <Progress value={100 - usagePercentage} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usado: {usedCredits.toLocaleString()}</span>
            <span className="text-muted-foreground">{(100 - usagePercentage).toFixed(1)}% disponível</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Uso Detalhado */}
        <Card className="p-6 border-2">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Uso Detalhado de Créditos
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Criações Rápidas
                </span>
                <span className="font-medium">
                  {mockCredits.quickContentCreations} / {mockPlan.quickContentCreations}
                </span>
              </div>
              <Progress 
                value={(mockCredits.quickContentCreations / mockPlan.quickContentCreations) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Sugestões Personalizadas
                </span>
                <span className="font-medium">
                  {mockCredits.contentSuggestions} / {mockPlan.customContentSuggestions}
                </span>
              </div>
              <Progress 
                value={(mockCredits.contentSuggestions / mockPlan.customContentSuggestions) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Planejamentos
                </span>
                <span className="font-medium">
                  {mockCredits.contentPlans} / {mockPlan.contentPlans}
                </span>
              </div>
              <Progress 
                value={(mockCredits.contentPlans / mockPlan.contentPlans) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Revisões
                </span>
                <span className="font-medium">
                  {mockCredits.contentReviews} / {mockPlan.contentReviews}
                </span>
              </div>
              <Progress 
                value={(mockCredits.contentReviews / mockPlan.contentReviews) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </Card>

        {/* Informações do Plano */}
        <Card className="p-6 border-2">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Plano {mockPlan.displayName}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros
              </span>
              <span className="font-medium">até {mockPlan.maxMembers}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Marcas
              </span>
              <span className="font-medium">até {mockPlan.maxBrands}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Temas Estratégicos
              </span>
              <span className="font-medium">até {mockPlan.maxStrategicThemes}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Personas
              </span>
              <span className="font-medium">até {mockPlan.maxPersonas}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor mensal</span>
              <span className="text-2xl font-bold text-primary">
                R$ {mockPlan.price.toFixed(2)}
              </span>
            </div>
            {mockPlan.trialDays > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Inclui {mockPlan.trialDays} dias de teste grátis
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Informações da Equipe */}
      <Card className="p-6 border-2">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Informações da Equipe
        </h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Nome da Equipe</p>
            <p className="font-medium text-foreground">{team?.name || 'Minha Equipe'}</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Administrador</p>
            <p className="font-medium text-foreground">{team?.admin || 'admin@example.com'}</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Status do Plano</p>
            <Badge variant="secondary" className="mt-1">
              {mockPlan.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Plans;
