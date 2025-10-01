import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { JoinTeamDialog } from "./JoinTeamDialog";

interface TeamSelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TeamSelectionDialog({ open, onClose }: TeamSelectionDialogProps) {
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);

  return (
    <>
      <Dialog open={open && !showCreateTeam && !showJoinTeam} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Participar de uma equipe</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Para começar a usar o sistema, você precisa estar em uma equipe. Escolha uma das opções abaixo:
            </p>
            
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-foreground">• Criar equipe:</p>
                <p className="text-muted-foreground ml-4">
                  Você se tornará o administrador e poderá convidar outros membros.
                </p>
              </div>
              
              <div className="text-sm">
                <p className="font-semibold text-foreground">• Entrar em equipe:</p>
                <p className="text-muted-foreground ml-4">
                  Solicite acesso usando o código fornecido pelo administrador.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreateTeam(true)}
              className="flex-1 sm:flex-none"
            >
              Criar equipe
            </Button>
            <Button
              onClick={() => setShowJoinTeam(true)}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              Entrar em equipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateTeamDialog
        open={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        onSuccess={onClose}
      />

      <JoinTeamDialog
        open={showJoinTeam}
        onClose={() => setShowJoinTeam(false)}
        onBack={() => setShowJoinTeam(false)}
        onSuccess={onClose}
      />
    </>
  );
}
