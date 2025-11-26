import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamGrowthChartProps {
  teams: Array<{ created_at: string }>;
  users: Array<{ created_at: string }>;
  startDate: Date;
  endDate: Date;
}

export const TeamGrowthChart = ({ teams, users, startDate, endDate }: TeamGrowthChartProps) => {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let intervals: Date[];
  let formatStr: string;
  
  if (daysDiff <= 30) {
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
    formatStr = "dd/MM";
  } else if (daysDiff <= 90) {
    intervals = eachWeekOfInterval({ start: startDate, end: endDate });
    formatStr = "dd/MM";
  } else {
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    formatStr = "MMM/yy";
  }

  let cumulativeTeams = 0;
  let cumulativeUsers = 0;

  const chartData = intervals.map(interval => {
    const intervalStart = startOfDay(interval);
    const intervalEnd = daysDiff <= 30 
      ? new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000)
      : daysDiff <= 90
      ? new Date(intervalStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 0);

    const newTeams = teams.filter(team => {
      const teamDate = new Date(team.created_at);
      return teamDate >= intervalStart && teamDate < intervalEnd;
    }).length;

    const newUsers = users.filter(user => {
      const userDate = new Date(user.created_at);
      return userDate >= intervalStart && userDate < intervalEnd;
    }).length;

    cumulativeTeams += newTeams;
    cumulativeUsers += newUsers;

    return {
      date: format(interval, formatStr, { locale: ptBR }),
      equipes: cumulativeTeams,
      usuarios: cumulativeUsers,
      novasEquipes: newTeams,
      novosUsuarios: newUsers
    };
  });

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Crescimento de Equipes e Usuários</CardTitle>
        <CardDescription>Evolução cumulativa de cadastros ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="equipes" 
              name="Total de Equipes"
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="usuarios" 
              name="Total de Usuários"
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-2))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
