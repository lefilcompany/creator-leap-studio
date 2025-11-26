import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface SubscriptionStatusChartProps {
  teams: Array<{ subscription_status: string | null }>;
}

const STATUS_COLORS: Record<string, string> = {
  'active': 'hsl(142, 76%, 36%)',
  'trialing': 'hsl(45, 93%, 47%)',
  'expired': 'hsl(0, 84%, 60%)',
  'canceled': 'hsl(0, 0%, 50%)',
  'null': 'hsl(0, 0%, 70%)'
};

const STATUS_LABELS: Record<string, string> = {
  'active': 'Ativo',
  'trialing': 'Em Trial',
  'expired': 'Expirado',
  'canceled': 'Cancelado',
  'null': 'Sem Status'
};

export const SubscriptionStatusChart = ({ teams }: SubscriptionStatusChartProps) => {
  const statusDistribution = teams.reduce((acc, team) => {
    const status = team.subscription_status || 'null';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusDistribution).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
    percentage: ((value / teams.length) * 100).toFixed(1)
  }));

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Status de Assinaturas</CardTitle>
        <CardDescription>Distribuição de equipes por status de assinatura</CardDescription>
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
              {chartData.map((entry) => {
                const status = Object.keys(STATUS_LABELS).find(key => STATUS_LABELS[key] === entry.name) || 'null';
                return <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[status]} />;
              })}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} equipes`, "Total"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
