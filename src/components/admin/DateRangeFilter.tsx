import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

export const DateRangeFilter = ({ startDate, endDate, onRangeChange }: DateRangeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: "Últimos 7 dias",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { start, end };
      }
    },
    {
      label: "Últimos 30 dias",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { start, end };
      }
    },
    {
      label: "Últimos 3 meses",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        return { start, end };
      }
    },
    {
      label: "Últimos 6 meses",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        return { start, end };
      }
    },
    {
      label: "Último ano",
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        return { start, end };
      }
    },
    {
      label: "Todo período",
      getValue: () => {
        const end = new Date();
        const start = new Date(2024, 0, 1); // 1 de janeiro de 2024
        return { start, end };
      }
    }
  ];

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-background to-muted/10">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <p className="text-sm font-medium mb-2">Período Personalizado</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Data Inicial</label>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && onRangeChange(date, endDate)}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Data Final</label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && onRangeChange(startDate, date)}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex flex-wrap gap-2">
            {presetRanges.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const { start, end } = preset.getValue();
                  onRangeChange(start, end);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
