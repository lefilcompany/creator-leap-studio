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
        <div className="bg-card rounded-xl shadow-lg overflow-hidden border-0">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-3 sm:px-6 sm:py-3.5 hover:bg-muted/40 transition-colors duration-200">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-destructive/10 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground text-base">Configurações Avançadas</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Gerenciamento de conta e ações irreversíveis</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-5 sm:px-6 pb-6 space-y-5 border-t border-border/50">
              {/* Warning */}
              <Alert className="bg-destructive/5 border border-destructive/20 rounded-xl mt-5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-sm ml-2">
                  <span className="font-bold">Atenção!</span> As ações abaixo são irreversíveis. Tenha certeza antes de prosseguir.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  className="group p-5 rounded-xl border border-border/60 hover:border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 transition-all duration-200 flex items-start gap-4 text-left"
                  onClick={() => setIsDeactivateDialogOpen(true)}
                >
                  <div className="p-2.5 bg-muted-foreground/10 rounded-xl group-hover:bg-muted-foreground/15 transition-colors shrink-0">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground block">Inativar Conta</span>
                    <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">
                      Sua conta será desativada, mas seus dados serão preservados
                    </span>
                  </div>
                </button>

                <button
                  className="group p-5 rounded-xl border border-destructive/20 hover:border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-all duration-200 flex items-start gap-4 text-left"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <div className="p-2.5 bg-destructive/10 rounded-xl group-hover:bg-destructive/15 transition-colors shrink-0">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-destructive block">Deletar Conta</span>
                    <span className="text-xs text-destructive/70 mt-1 block leading-relaxed">
                      Ação permanente — todos os dados serão removidos
                    </span>
                  </div>
                </button>
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
