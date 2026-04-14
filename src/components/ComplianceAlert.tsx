import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComplianceData {
  approved: boolean;
  score: number;
  flags: string[];
  details: string;
  category?: string;
  wasAutoCorrected?: boolean;
  originalIssues?: string[];
  correctionInstructions?: string;
}

interface ComplianceAlertProps {
  compliance: ComplianceData | null | undefined;
  mediaType?: "image" | "video";
  className?: string;
}

export function ComplianceAlert({ compliance, mediaType = "image", className }: ComplianceAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!compliance) return null;

  const { approved, score, flags, details, wasAutoCorrected, originalIssues } = compliance;

  // Determinar nível de severidade
  const severity = approved
    ? wasAutoCorrected
      ? "corrected"
      : "safe"
    : score >= 50
      ? "warning"
      : "danger";

  const config = {
    safe: {
      icon: ShieldCheck,
      label: "Conteúdo Seguro",
      badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      alertClass: "border-emerald-500/30 bg-emerald-500/5",
      iconClass: "text-emerald-500",
    },
    corrected: {
      icon: RefreshCw,
      label: "Auto-corrigido",
      badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      alertClass: "border-blue-500/30 bg-blue-500/5",
      iconClass: "text-blue-500",
    },
    warning: {
      icon: ShieldAlert,
      label: "Atenção",
      badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      alertClass: "border-amber-500/30 bg-amber-500/5",
      iconClass: "text-amber-500",
    },
    danger: {
      icon: ShieldX,
      label: "Problema Detectado",
      badgeClass: "bg-red-500/10 text-red-600 border-red-500/30",
      alertClass: "border-red-500/30 bg-red-500/5",
      iconClass: "text-red-500",
    },
  };

  const { icon: Icon, label, badgeClass, alertClass, iconClass } = config[severity];

  return (
    <Alert className={cn(alertClass, "transition-all", className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs font-medium", badgeClass)}>
              {label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Score: {score}/100
            </span>
            {mediaType === "video" && !approved && (
              <span className="text-xs text-muted-foreground italic">
                (vídeos não são regenerados automaticamente)
              </span>
            )}
          </div>

          {wasAutoCorrected && originalIssues && originalIssues.length > 0 && (
            <AlertDescription className="mt-2 text-sm text-blue-600">
              ✅ A {mediaType === "image" ? "imagem" : "mídia"} foi regenerada automaticamente para corrigir:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {originalIssues.map((issue, i) => (
                  <li key={i} className="text-xs">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          )}

          {flags.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 mt-1 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <><ChevronUp className="h-3 w-3 mr-1" /> Ocultar detalhes</>
                ) : (
                  <><ChevronDown className="h-3 w-3 mr-1" /> Ver {flags.length} {flags.length === 1 ? "alerta" : "alertas"}</>
                )}
              </Button>

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {flags.map((flag, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-background">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                  {details && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{details}</p>
                  )}
                </div>
              )}
            </>
          )}

          {approved && !wasAutoCorrected && flags.length === 0 && (
            <AlertDescription className="mt-1 text-xs text-muted-foreground">
              Nenhuma violação de diretrizes ou legislação detectada.
            </AlertDescription>
          )}
        </div>
      </div>
    </Alert>
  );
}
