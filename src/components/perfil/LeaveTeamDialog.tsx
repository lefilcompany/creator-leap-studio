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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LeaveTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
}

export default function LeaveTeamDialog({ open, onOpenChange, teamName }: LeaveTeamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLeaveTeam = async () => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se o usuário é admin da equipe
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (!profile?.team_id) {
        toast.error('Você não está em nenhuma equipe');
        return;
      }

      // Verificar se é admin
      const { data: team } = await supabase
        .from('teams')
        .select('admin_id')
        .eq('id', profile.team_id)
        .single();

      if (team?.admin_id === user.id) {
        // Verificar se há outros membros
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', profile.team_id)
          .neq('id', user.id);

        if (count && count > 0) {
          toast.error('Você precisa transferir a administração da equipe antes de sair. Vá até as configurações da equipe.');
          setIsLoading(false);
          return;
        }
      }

      // Remover usuário da equipe (definir team_id como null)
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Você saiu da equipe com sucesso!');
      onOpenChange(false);
      
      // Fazer logout e redirecionar para home
      await logout();
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao sair da equipe:', error);
      toast.error(error.message || 'Erro ao sair da equipe. Tente novamente.');
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
            Você perderá acesso a todas as marcas, temas e conteúdos da equipe e será desconectado.
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
