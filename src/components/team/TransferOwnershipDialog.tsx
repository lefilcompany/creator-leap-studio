import { useMemo, useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Search } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  const otherMembers = members.filter(m => m.id !== user?.id);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return otherMembers;
    const q = search.toLowerCase().trim();
    return otherMembers.filter(
      m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [otherMembers, search]);

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
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(''); }}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col">
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 max-h-80 py-1 -mx-1 px-1">
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro encontrado</p>
          ) : (
            filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  selectedMember === member.id
                    ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                    : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                }`}
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {member.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </button>
            ))
          )}
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
