import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditHistoryItem {
  created_at: string;
  credits_used: number;
  action_type: string;
}

interface CreditUsageOverTimeChartProps {
  creditHistory: CreditHistoryItem[];
  startDate: Date;
  endDate: Date;
}

export const CreditUsageOverTimeChart = ({ creditHistory, startDate, endDate }: CreditUsageOverTimeChartProps) => {
  // Determinar granularidade baseado no período
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let intervals: Date[];
  let formatStr: string;
  
  if (daysDiff <= 30) {
    // Diário
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
    formatStr = "dd/MM";
  } else if (daysDiff <= 90) {
    // Semanal
    intervals = eachWeekOfInterval({ start: startDate, end: endDate });
    formatStr = "dd/MM";
  } else {
    // Mensal
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    formatStr = "MMM/yy";
  }

  // Agregar dados por intervalo
  const chartData = intervals.map(interval => {
    const intervalStart = startOfDay(interval);
    const intervalEnd = daysDiff <= 30 
      ? new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000)
      : daysDiff <= 90
      ? new Date(intervalStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 0);

    const creditsInInterval = creditHistory.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= intervalStart && itemDate < intervalEnd;
    });

    const totalCredits = creditsInInterval.reduce((sum, item) => sum + item.credits_used, 0);

    return {
      date: format(interval, formatStr, { locale: ptBR }),
      creditos: totalCredits,
      acoes: creditsInInterval.length
    };
  });

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/10">
      <CardHeader>
        <CardTitle>Evolução de Consumo de Créditos</CardTitle>
        <CardDescription>Créditos consumidos ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCreditos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
            <Area 
              type="monotone" 
              dataKey="creditos" 
              name="Créditos Consumidos"
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorCreditos)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
