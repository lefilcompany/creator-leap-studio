import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins } from "lucide-react";

interface CreditConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentBalance: number;
  cost: number;
  resourceType: string;
  title?: string;
  freeResourcesRemaining?: number;
  isFreeResource?: boolean;
}

export function CreditConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  currentBalance,
  cost,
  resourceType,
  title,
  freeResourcesRemaining,
  isFreeResource = false,
}: CreditConfirmationDialogProps) {
  const newBalance = currentBalance - cost;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || `Criar ${resourceType}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {isFreeResource && freeResourcesRemaining !== undefined ? (
              <div className="text-base p-4 rounded-lg bg-success/10 border border-success/20">
                <span className="font-semibold text-success">✨ Recurso gratuito!</span>
                <br />
                Você tem <span className="font-bold text-foreground">{freeResourcesRemaining}</span> {resourceType}s gratuitos restantes (de 3 no total).
              </div>
            ) : (
              <div className="text-base">
                Esta ação irá consumir <span className="font-semibold text-foreground">{cost} crédito{cost > 1 ? 's' : ''}</span>.
              </div>
            )}
            
            {!isFreeResource && (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Saldo atual</span>
                  </div>
                  <span className="text-lg font-bold">{currentBalance}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Novo saldo</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{newBalance}</span>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar e criar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
