import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserX, AlertTriangle, Loader2 } from 'lucide-react';

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

      const isAdmin = user.isAdmin && team.admin_id === user.id;
      
      if (isAdmin) {
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

    if (needsAdminTransfer && !selectedNewAdmin) {
      toast.error('Selecione um membro para ser o novo administrador');
      return;
    }

    setIsLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: password,
      });

      if (signInError) {
        toast.error('Senha incorreta');
        setIsLoading(false);
        return;
      }

      const { data, error: functionError } = await supabase.functions.invoke('deactivate-account', {
        body: {
          newAdminId: needsAdminTransfer ? selectedNewAdmin : null,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao inativar conta');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Conta inativada com sucesso. Você será desconectado.');
      
      await logout();
      navigate('/');
      onOpenChange(false);
      setPassword('');
      setSelectedNewAdmin('');
    } catch (error: any) {
      console.error('Erro ao inativar conta:', error);
      toast.error(error.message || 'Erro ao inativar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPassword('');
    setSelectedNewAdmin('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-muted/20 border border-border/50 shadow-xl [&>div]:p-0 [&>div]:overflow-visible overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6 space-y-0">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted-foreground/10 rounded-xl">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Inativar Conta
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Sua conta será desativada e você não poderá mais acessá-la. Seus dados serão
              preservados e você poderá reativar sua conta a qualquer momento cadastrando-se
              novamente com o mesmo email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-5">
            {needsAdminTransfer && (
              <div className="space-y-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                <Label htmlFor="new-admin" className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Transferir administração
                </Label>
                <p className="text-xs text-muted-foreground">
                  Você é administrador da equipe. Selecione um novo administrador antes de continuar.
                </p>
                <Select value={selectedNewAdmin} onValueChange={setSelectedNewAdmin}>
                  <SelectTrigger id="new-admin" className="h-11 rounded-lg">
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

            <div className="space-y-2.5">
              <Label htmlFor="deactivate-password" className="text-sm font-semibold">
                Confirme sua senha
              </Label>
              <Input
                id="deactivate-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="h-11 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 p-4 flex flex-col sm:flex-row gap-3 bg-background/80 backdrop-blur-sm">
          <Button
            variant="outline"
            className="w-full sm:flex-1 h-10 rounded-lg"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:flex-1 h-10 rounded-lg"
            onClick={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Inativando...
              </>
            ) : (
              'Inativar Conta'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
