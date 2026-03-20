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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Crown } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  members: TeamMember[];
  onSuccess: () => void;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  members,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const { user } = useAuth();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otherMembers = members.filter(m => m.id !== user?.id);

  const handleTransfer = async () => {
    if (!selectedMember || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ admin_id: selectedMember })
        .eq('id', teamId);

      if (error) throw error;

      const selectedName = otherMembers.find(m => m.id === selectedMember)?.name || '';
      toast.success(`Administração transferida para ${selectedName}!`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao transferir administração:', error);
      toast.error('Erro ao transferir administração. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Transferir Administração
          </AlertDialogTitle>
          <AlertDialogDescription>
            Selecione o novo administrador da equipe <span className="font-semibold">{teamName}</span>. 
            Você continuará como membro da equipe.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 max-h-60 overflow-y-auto py-2">
          {otherMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                selectedMember === member.id
                  ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                  : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
              }`}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {member.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-medium text-sm">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
            </button>
          ))}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={isLoading || !selectedMember}>
            {isLoading ? 'Transferindo...' : 'Transferir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
