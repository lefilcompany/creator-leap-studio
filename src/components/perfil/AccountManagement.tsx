import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, UserX, Trash2, ShieldAlert, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DeactivateAccountDialog from './DeactivateAccountDialog';
import DeleteAccountDialog from './DeleteAccountDialog';

interface AccountManagementProps {
  userEmail: string;
}

export default function AccountManagement({ userEmail }: AccountManagementProps) {
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Configurações Avançadas</h3>
                  <p className="text-xs text-muted-foreground">Gerenciamento de conta e ações irreversíveis</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
              {/* Warning */}
              <Alert className="bg-destructive/5 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-sm ml-2">
                  <span className="font-bold">Atenção!</span> As ações abaixo são irreversíveis.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 px-4 rounded-lg border-muted-foreground/20 hover:bg-muted-foreground/10 hover:border-muted-foreground/40 transition-all duration-200 flex items-center gap-3 justify-start"
                  onClick={() => setIsDeactivateDialogOpen(true)}
                >
                  <div className="p-1.5 bg-muted rounded-lg">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">Inativar Conta</span>
                    <span className="text-xs text-muted-foreground">Dados preservados</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 px-4 rounded-lg border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive transition-all duration-200 flex items-center gap-3 justify-start"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <div className="p-1.5 bg-destructive/10 rounded-lg">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">Deletar Conta</span>
                    <span className="text-xs text-muted-foreground text-destructive/70">Permanente</span>
                  </div>
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <DeactivateAccountDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      />
      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        userEmail={userEmail}
      />
    </>
  );
}
