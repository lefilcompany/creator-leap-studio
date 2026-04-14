import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ComplianceCheckData {
  approved: boolean;
  score: number;
  flags: string[];
  details: string;
  correctionInstructions?: string;
  wasAutoCorreted?: boolean;
}

interface ComplianceAlertProps {
  data: ComplianceCheckData | null | undefined;
  className?: string;
}

export function ComplianceAlert({ data, className }: ComplianceAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;

  const { approved, score, flags, details, wasAutoCorreted } = data;

  // Determine severity
  const isWarning = approved && flags.length > 0;
  const isDanger = !approved;
  const isSafe = approved && flags.length === 0;

  if (isSafe) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20",
        className
      )}>
        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-xs text-green-700 dark:text-green-400 font-medium">
          Conteúdo verificado — sem problemas detectados
        </span>
        <Badge variant="outline" className="ml-auto text-[10px] border-green-500/30 text-green-600">
          {score}/100
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      isDanger 
        ? "bg-destructive/10 border-destructive/30" 
        : "bg-yellow-500/10 border-yellow-500/30",
      className
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {isDanger ? (
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
        )}
        <span className={cn(
          "text-xs font-medium flex-1",
          isDanger ? "text-destructive" : "text-yellow-700 dark:text-yellow-400"
        )}>
          {isDanger 
            ? `Atenção: ${flags.length} problema(s) identificado(s)` 
            : `Aviso: ${flags.length} ponto(s) de atenção`}
        </span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px]",
            isDanger ? "border-destructive/30 text-destructive" : "border-yellow-500/30 text-yellow-600"
          )}
        >
          {score}/100
        </Badge>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground">{details}</p>
          {flags.length > 0 && (
            <ul className="space-y-1">
              {flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className={cn(
                    "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                    isDanger ? "bg-destructive" : "bg-yellow-500"
                  )} />
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
