import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, UserX, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import DeactivateAccountDialog from './DeactivateAccountDialog';
import DeleteAccountDialog from './DeleteAccountDialog';

export default function AccountManagement() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isExpanded) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <span>Mostrar Opções Avançadas</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 rounded-t-xl pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-destructive/10 text-destructive rounded-lg p-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Configurações Avançadas</CardTitle>
              <CardDescription>Gerencie as opções avançadas da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Warning Alert */}
          <Alert className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200 ml-2">
              <span className="font-bold">Atenção!</span>
              <br />
              As ações abaixo são irreversíveis. Certifique-se antes de prosseguir.
            </AlertDescription>
          </Alert>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deactivate Account */}
            <Card className="border-border bg-muted/20 hover:bg-muted/30 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-center">
                  <div className="bg-muted rounded-full p-4">
                    <UserX className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-lg">Inativar Conta</h3>
                  <p className="text-sm text-muted-foreground">
                    Dados preservados. Reative facilmente cadastrando-se novamente.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-border hover:bg-muted"
                  onClick={() => setIsDeactivateDialogOpen(true)}
                >
                  Inativar Conta
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-center">
                  <div className="bg-destructive/10 rounded-full p-4">
                    <Trash2 className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-lg text-destructive">Deletar Conta</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-destructive">PERMANENTE!</span> Todos os dados serão removidos.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Deletar Conta
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Hide Button */}
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <span>Ocultar Opções Avançadas</span>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <DeactivateAccountDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      />
      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}
