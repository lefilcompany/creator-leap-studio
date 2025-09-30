import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, UserX, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import DeactivateAccountDialog from './DeactivateAccountDialog';
import DeleteAccountDialog from './DeleteAccountDialog';

export default function AccountManagement() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeactivateExpanded, setIsDeactivateExpanded] = useState(false);
  const [isDeleteExpanded, setIsDeleteExpanded] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isExpanded) {
    return (
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-muted/[0.02] to-accent/[0.03] backdrop-blur-sm">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="w-full h-12 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground rounded-lg transition-all duration-300 hover:bg-muted/50"
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
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-muted/[0.02] to-accent/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <CardHeader className="relative bg-gradient-to-r from-destructive/8 via-accent/5 to-primary/8 border-b border-destructive/10 p-8">
          <div className="flex items-start gap-4">
            <div className="relative p-3 bg-gradient-to-br from-destructive/20 to-accent/20 rounded-2xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive to-accent opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
              <AlertTriangle className="h-7 w-7 text-destructive relative z-10" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-destructive via-accent to-primary bg-clip-text text-transparent mb-2">
                Configurações Avançadas
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm md:text-base">
                Gerencie as opções avançadas da sua conta
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-8 relative">
          {/* Warning Alert */}
          <Alert className="bg-gradient-to-r from-destructive/5 to-accent/5 border-2 border-destructive/20 rounded-xl shadow-sm">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDescription className="text-foreground ml-2">
              <span className="font-bold">Atenção!</span>
              <br />
              As ações abaixo são irreversíveis. Certifique-se antes de prosseguir.
            </AlertDescription>
          </Alert>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deactivate Account */}
            <Card className="group/card border-0 bg-gradient-to-br from-muted/50 to-accent/5 hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-muted/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-6 space-y-4 relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsDeactivateExpanded(!isDeactivateExpanded)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDeactivateExpanded(!isDeactivateExpanded); }}
                  className="w-full flex flex-col items-center gap-3 cursor-pointer bg-transparent border-0 hover:opacity-80 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-center">
                    <div className="relative p-4 bg-gradient-to-br from-muted to-accent/20 rounded-2xl shadow-md group-hover/card:shadow-lg transition-all duration-300">
                      <UserX className="h-8 w-8 text-muted-foreground relative z-10" />
                    </div>
                  </div>
                  <div className="text-center space-y-2 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-bold text-lg bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Inativar Conta
                      </h3>
                      {isDeactivateExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                
                {isDeactivateExpanded && (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground leading-relaxed px-2 text-center">
                      Dados preservados. Reative facilmente cadastrando-se novamente.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setIsDeactivateDialogOpen(true)}
                    >
                      Inativar Conta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="group/card border-0 bg-gradient-to-br from-destructive/5 to-destructive/10 hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-destructive/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-6 space-y-4 relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsDeleteExpanded(!isDeleteExpanded)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDeleteExpanded(!isDeleteExpanded); }}
                  className="w-full flex flex-col items-center gap-3 cursor-pointer bg-transparent border-0 hover:opacity-80 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-center">
                    <div className="relative p-4 bg-gradient-to-br from-destructive/20 to-destructive/30 rounded-2xl shadow-md group-hover/card:shadow-lg transition-all duration-300">
                      <Trash2 className="h-8 w-8 text-destructive relative z-10" />
                    </div>
                  </div>
                  <div className="text-center space-y-2 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-bold text-lg text-destructive">
                        Deletar Conta
                      </h3>
                      {isDeleteExpanded ? (
                        <ChevronUp className="h-4 w-4 text-destructive" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
                
                {isDeleteExpanded && (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground leading-relaxed px-2 text-center">
                      <span className="font-bold text-destructive">PERMANENTE!</span> Todos os dados serão removidos.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full h-11 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      Deletar Conta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hide Button */}
          <div className="border-t border-primary/10 pt-6">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="w-full h-11 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground rounded-lg transition-all duration-300 hover:bg-muted/50"
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
      />
    </>
  );
}

