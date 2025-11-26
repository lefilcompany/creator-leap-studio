import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CreditsDistributionChartProps {
  teams: Array<{ plan_name: string; credits: number }>;
}

export const CreditsDistributionChart = ({ teams }: CreditsDistributionChartProps) => {
  // Agregar créditos por plano
  const creditsByPlan = teams.reduce((acc, team) => {
    const planName = team.plan_name || "Desconhecido";
    if (!acc[planName]) {
      acc[planName] = { total: 0, count: 0 };
    }
    acc[planName].total += team.credits;
    acc[planName].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const chartData = Object.entries(creditsByPlan).map(([name, data]) => ({
    name,
    total: data.total,
    media: Math.round(data.total / data.count),
    equipes: data.count
  }));

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Distribuição de Créditos por Plano</CardTitle>
        <CardDescription>Total e média de créditos por tipo de plano</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="total" name="Total de Créditos" fill="hsl(var(--primary))" />
            <Bar dataKey="media" name="Média por Equipe" fill="hsl(var(--chart-2))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
