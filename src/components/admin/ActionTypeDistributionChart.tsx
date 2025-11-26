import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CreditHistoryItem {
  action_type: string;
  credits_used: number;
}

interface ActionTypeDistributionChartProps {
  creditHistory: CreditHistoryItem[];
}

const ACTION_LABELS: Record<string, string> = {
  'quick_content': 'Criação Rápida',
  'create_content': 'Criação Personalizada',
  'create_video': 'Criação de Vídeo',
  'review_content': 'Revisão de Conteúdo',
  'plan_content': 'Planejamento',
  'adjust_image': 'Ajuste de Imagem',
  'subscription': 'Assinatura',
  'coupon': 'Cupom'
};

export const ActionTypeDistributionChart = ({ creditHistory }: ActionTypeDistributionChartProps) => {
  // Agregar por tipo de ação
  const actionStats = creditHistory.reduce((acc, item) => {
    const actionType = item.action_type;
    if (!acc[actionType]) {
      acc[actionType] = { count: 0, totalCredits: 0 };
    }
    acc[actionType].count += 1;
    acc[actionType].totalCredits += item.credits_used;
    return acc;
  }, {} as Record<string, { count: number; totalCredits: number }>);

  const chartData = Object.entries(actionStats)
    .map(([type, stats]) => ({
      name: ACTION_LABELS[type] || type,
      acoes: stats.count,
      creditos: stats.totalCredits
    }))
    .sort((a, b) => b.creditos - a.creditos);

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Distribuição por Tipo de Ação</CardTitle>
        <CardDescription>Quantidade e consumo de créditos por tipo de ação</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="acoes" name="Quantidade de Ações" fill="hsl(var(--chart-3))" />
            <Bar dataKey="creditos" name="Créditos Consumidos" fill="hsl(var(--chart-4))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
