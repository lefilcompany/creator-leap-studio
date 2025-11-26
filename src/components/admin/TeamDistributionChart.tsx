import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface TeamDistributionChartProps {
  teams: Array<{ plan_id: string; plan_name: string }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const TeamDistributionChart = ({ teams }: TeamDistributionChartProps) => {
  // Agregar equipes por plano
  const planDistribution = teams.reduce((acc, team) => {
    const planName = team.plan_name || "Desconhecido";
    acc[planName] = (acc[planName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(planDistribution).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / teams.length) * 100).toFixed(1)
  }));

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Distribuição de Equipes por Plano</CardTitle>
        <CardDescription>Visualização da divisão de equipes entre os planos</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} equipes`, "Total"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
