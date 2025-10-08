import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface DeactivateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export default function DeactivateAccountDialog({ open, onOpenChange }: DeactivateAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string>('');
  const [needsAdminTransfer, setNeedsAdminTransfer] = useState(false);
  const { user, team, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!open || !user || !team) return;

      // Verificar se o usuário é admin da equipe
      const isAdmin = user.isAdmin && team.admin_id === user.id;
      
      if (isAdmin) {
        // Buscar membros da equipe (exceto o próprio usuário)
        const { data: members, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('team_id', team.id)
          .neq('id', user.id);

        if (error) {
          console.error('Erro ao buscar membros:', error);
          return;
        }

        if (members && members.length > 0) {
          setTeamMembers(members);
          setNeedsAdminTransfer(true);
        } else {
          setNeedsAdminTransfer(false);
          setTeamMembers([]);
        }
      } else {
        setNeedsAdminTransfer(false);
        setTeamMembers([]);
      }
    };

    checkAdminStatus();
  }, [open, user, team]);

  const handleDeactivate = async () => {
    if (!password) {
      toast.error('Digite sua senha para confirmar');
      return;
    }

    // Se precisa transferir admin e não selecionou ninguém
    if (needsAdminTransfer && !selectedNewAdmin) {
      toast.error('Selecione um membro para ser o novo administrador');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar a senha
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: password,
      });

      if (signInError) {
        toast.error('Senha incorreta');
        setIsLoading(false);
        return;
      }

      // Se precisa transferir administração
      if (needsAdminTransfer && selectedNewAdmin && team) {
        // Atualizar o admin da equipe
        const { error: updateTeamError } = await supabase
          .from('teams')
          .update({ admin_id: selectedNewAdmin })
          .eq('id', team.id);

        if (updateTeamError) {
          throw updateTeamError;
        }

        // Remover role de admin do usuário atual
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user?.id)
          .eq('role', 'admin');

        if (deleteRoleError) {
          throw deleteRoleError;
        }

        // Adicionar role de admin ao novo usuário
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedNewAdmin,
            role: 'admin'
          });

        if (insertRoleError) {
          throw insertRoleError;
        }
      }

      // Remover usuário da equipe
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', user?.id);

      if (updateProfileError) {
        throw updateProfileError;
      }

      toast.success('Conta inativada com sucesso');
      
      // Fazer logout
      await logout();
      navigate('/login');
      onOpenChange(false);
      setPassword('');
      setSelectedNewAdmin('');
    } catch (error) {
      console.error('Erro ao inativar conta:', error);
      toast.error('Erro ao inativar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inativar Conta</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sua conta será desativada e você não poderá mais acessá-la. Seus dados serão
              preservados e você poderá reativar sua conta a qualquer momento cadastrando-se
              novamente com o mesmo email.
            </p>

            {needsAdminTransfer && (
              <div className="space-y-2 pt-2 border-t border-destructive/20">
                <Label htmlFor="new-admin" className="text-destructive font-semibold">
                  Você é administrador da equipe. Selecione um novo administrador:
                </Label>
                <Select value={selectedNewAdmin} onValueChange={setSelectedNewAdmin}>
                  <SelectTrigger id="new-admin">
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="deactivate-password">Digite sua senha para confirmar</Label>
              <Input
                id="deactivate-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            className="border-accent text-accent hover:bg-accent hover:border-accent hover:text-white"
            onClick={() => {
              onOpenChange(false);
              setPassword('');
              setSelectedNewAdmin('');
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading ? 'Inativando...' : 'Inativar Conta'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
