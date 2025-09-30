import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, UserX, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import DeactivateAccountDialog from './DeactivateAccountDialog';
import DeleteAccountDialog from './DeleteAccountDialog';

interface AccountManagementProps {
  userEmail: string;
}

export default function AccountManagement({ userEmail }: AccountManagementProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isExpanded) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card via-muted/[0.02] to-accent/[0.03]">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="w-full h-12 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
          >
            <Settings className="h-4 w-4" />
            <span>Mostrar Opções Avançadas</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card via-muted/[0.02] to-accent/[0.03]">
        <CardHeader className="bg-gradient-to-r from-destructive/8 via-accent/5 to-primary/8 border-b border-destructive/10 p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-destructive/20 to-accent/20 rounded-2xl shadow-md">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-destructive via-accent to-primary bg-clip-text text-transparent mb-2 truncate">
                Configurações Avançadas
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Gerencie as opções avançadas da sua conta
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">{/* Warning Alert */}
          <Alert className="bg-gradient-to-r from-destructive/5 to-accent/5 border-2 border-destructive/20 rounded-xl shadow-sm">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            <AlertDescription className="text-foreground ml-2 text-xs sm:text-sm">
              <span className="font-bold">Atenção!</span>
              <br />
              As ações abaixo são irreversíveis. Certifique-se antes de prosseguir.
            </AlertDescription>
          </Alert>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Deactivate Account Card */}
            <Card className="border-0 bg-gradient-to-br from-muted/50 to-accent/5 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-muted to-accent/20 rounded-2xl shadow-md">
                    <UserX className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Inativar Conta
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Dados preservados. Reative facilmente cadastrando-se novamente.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10 sm:h-11 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                  onClick={() => setIsDeactivateDialogOpen(true)}
                >
                  Inativar Conta
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account Card */}
            <Card className="border-0 bg-gradient-to-br from-destructive/5 to-destructive/10 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-destructive/20 to-destructive/30 rounded-2xl shadow-md">
                    <Trash2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-destructive" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-destructive">
                    Deletar Conta
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    <span className="font-bold text-destructive">PERMANENTE!</span> Todos os dados serão removidos.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full h-10 sm:h-11 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Deletar Conta
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Hide Button */}
          <div className="border-t border-primary/10 pt-4 sm:pt-6">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 text-sm sm:text-base"
            >
              <span>Ocultar Opções Avançadas</span>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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

