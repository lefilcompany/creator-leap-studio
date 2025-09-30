import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeaveTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
}

export default function LeaveTeamDialog({ open, onOpenChange, teamName }: LeaveTeamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLeaveTeam = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Você saiu da equipe com sucesso');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao sair da equipe. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sair da Equipe</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja sair da equipe <span className="font-bold">{teamName}</span>?
            <br /><br />
            Você perderá acesso a todas as marcas, temas e conteúdos da equipe.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeaveTeam}
            disabled={isLoading}
          >
            {isLoading ? 'Saindo...' : 'Sair da Equipe'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
