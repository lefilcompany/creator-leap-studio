import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Crown, UserPlus, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamData';
import { useCategoryMembers } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
}

interface CategoryMembersPanelProps {
  categoryId: string;
  ownerId: string;
  visibility: string;
  isOwner: boolean;
  onOpenAddPanel?: () => void;
}

export function CategoryMembersPanel({ categoryId, ownerId, visibility, isOwner, onOpenAddPanel }: CategoryMembersPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useCategoryMembers(categoryId);
  const { data: teamMembers = [] } = useTeamMembers(user?.teamId);

  // Detect if whole team is active
  const nonOwnerTeamMembers = useMemo(
    () => teamMembers.filter(tm => tm.id !== ownerId),
    [teamMembers, ownerId]
  );

  const isWholeTeam = useMemo(() => {
    if (nonOwnerTeamMembers.length === 0 || members.length === 0) return false;
    const allAdded = nonOwnerTeamMembers.every(tm => members.some(m => m.user_id === tm.id));
    const allSameRole = members.every(m => m.role === members[0].role);
    return allAdded && allSameRole;
  }, [nonOwnerTeamMembers, members]);

  const [wholeTeam, setWholeTeam] = useState(false);
  const [wholeTeamRole, setWholeTeamRole] = useState<'viewer' | 'editor'>('viewer');

  useEffect(() => {
    if (isWholeTeam) {
      setWholeTeam(true);
      setWholeTeamRole(members[0]?.role as 'viewer' | 'editor' || 'viewer');
    } else if (members.length === 0) {
      setWholeTeam(false);
    }
  }, [isWholeTeam, members]);

  const updateRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from('action_category_members')
        .update({ role })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      toast.success('Permissão atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar permissão'),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('action_category_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Membro removido!');
    },
    onError: () => toast.error('Erro ao remover membro'),
  });

  // Toggle whole team: add all or remove all
  const toggleWholeTeam = useMutation({
    mutationFn: async ({ enable, role }: { enable: boolean; role: string }) => {
      // Delete all current members first
      const { error: deleteError } = await supabase
        .from('action_category_members')
        .delete()
        .eq('category_id', categoryId);
      if (deleteError) throw deleteError;

      if (enable && nonOwnerTeamMembers.length > 0) {
        const { error: insertError } = await supabase
          .from('action_category_members')
          .insert(nonOwnerTeamMembers.map(tm => ({
            category_id: categoryId,
            user_id: tm.id,
            role,
          })));
        if (insertError) throw insertError;
      }

      // Update visibility
      const { error: visError } = await supabase
        .from('action_categories')
        .update({ visibility: enable ? 'team' : 'personal' })
        .eq('id', categoryId);
      if (visError) throw visError;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      toast.success(vars.enable ? 'Equipe adicionada!' : 'Acesso restrito ao dono.');
    },
    onError: () => toast.error('Erro ao atualizar acesso'),
  });

  // Change whole team role
  const changeWholeTeamRole = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase
        .from('action_category_members')
        .update({ role })
        .eq('category_id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      toast.success('Permissão da equipe atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar permissão'),
  });

  const ownerProfile = teamMembers.find(tm => tm.id === ownerId);
  const ownerFromUser = ownerId === user?.id;

  const availableToAdd = teamMembers.filter(
    tm => tm.id !== ownerId && !members.some(m => m.user_id === tm.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Owner */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Proprietário</p>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Avatar className="h-9 w-9">
            <AvatarImage src={ownerFromUser ? (user?.avatarUrl || '') : (ownerProfile?.avatar_url || '')} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {getInitials(ownerFromUser ? (user?.name || 'U') : (ownerProfile?.name || 'U'))}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {getDisplayName(ownerFromUser ? (user?.name || '') : (ownerProfile?.name || 'Dono'))}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ownerFromUser ? user?.email : ownerProfile?.email || ''}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg whitespace-nowrap">
            <Crown className="h-3 w-3" />
            Dono
          </span>
        </div>
      </div>

      {/* Whole Team Toggle — only for owner with team */}
      {isOwner && user?.teamId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Toda a equipe</p>
                <p className="text-xs text-muted-foreground">Liberar para todos os membros</p>
              </div>
            </div>
            <Switch
              checked={wholeTeam}
              disabled={toggleWholeTeam.isPending}
              onCheckedChange={(checked) => {
                setWholeTeam(checked);
                toggleWholeTeam.mutate({ enable: checked, role: wholeTeamRole });
              }}
            />
          </div>

          {/* Team role selector */}
          {wholeTeam && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm flex-1 font-medium">Permissão da equipe:</p>
              <NativeSelect
                value={wholeTeamRole}
                onValueChange={(v) => {
                  setWholeTeamRole(v as 'viewer' | 'editor');
                  changeWholeTeamRole.mutate(v);
                }}
                options={[
                  { value: 'viewer', label: 'Leitor' },
                  { value: 'editor', label: 'Editor' },
                ]}
                triggerClassName="w-24 h-8 text-xs rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Members list — only show individual members when NOT whole team */}
      {!wholeTeam && members.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Membros ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="text-xs bg-muted font-semibold">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{getDisplayName(member.name)}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-1.5">
                    <NativeSelect
                      value={member.role}
                      onValueChange={(v) => updateRole.mutate({ memberId: member.id, role: v })}
                      options={[
                        { value: 'viewer', label: 'Leitor' },
                        { value: 'editor', label: 'Editor' },
                      ]}
                      triggerClassName="w-[90px] h-8 text-xs rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeMember.mutate(member.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                      disabled={removeMember.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                    {member.role === 'editor' ? 'Editor' : 'Leitor'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add member button — only when not whole team */}
      {isOwner && user?.teamId && !wholeTeam && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed rounded-xl h-10 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all"
          onClick={onOpenAddPanel}
          disabled={availableToAdd.length === 0}
        >
          <UserPlus className="h-4 w-4" />
          {availableToAdd.length === 0 ? 'Todos os membros já foram adicionados' : 'Adicionar membro'}
        </Button>
      )}

      {/* No team message */}
      {!user?.teamId && members.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Apenas o dono tem acesso. Crie ou entre em uma equipe para compartilhar.</p>
        </div>
      )}
    </div>
  );
}
