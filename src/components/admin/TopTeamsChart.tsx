import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TopTeamsChartProps {
  teams: Array<{ name: string; credits: number; member_count: number }>;
}

export const TopTeamsChart = ({ teams }: TopTeamsChartProps) => {
  // Top 10 equipes com mais créditos
  const topTeams = [...teams]
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 10)
    .map(team => ({
      name: team.name.length > 20 ? team.name.substring(0, 20) + '...' : team.name,
      credits: team.credits,
      membros: team.member_count
    }));

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Top 10 Equipes por Créditos</CardTitle>
        <CardDescription>Equipes com maior quantidade de créditos disponíveis</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topTeams} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--foreground))" />
            <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="credits" name="Créditos" fill="hsl(var(--chart-3))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
