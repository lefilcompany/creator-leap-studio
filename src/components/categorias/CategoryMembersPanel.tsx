import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Crown, UserPlus, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamData';
import { useCategoryMembers, type CategoryMemberWithProfile } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

interface CategoryMembersPanelProps {
  categoryId: string;
  ownerId: string;
  visibility: string;
  isOwner: boolean;
}

export function CategoryMembersPanel({ categoryId, ownerId, visibility, isOwner }: CategoryMembersPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useCategoryMembers(categoryId);
  const { data: teamMembers = [] } = useTeamMembers(user?.teamId);
  const [showAddPanel, setShowAddPanel] = useState(false);

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

  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('action_category_members')
        .insert({ category_id: categoryId, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Membro adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar membro'),
  });

  // Owner profile
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
    <div className="space-y-3">
      {/* Owner */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
        <Avatar className="h-8 w-8">
          <AvatarImage src={ownerFromUser ? (user?.avatarUrl || '') : (ownerProfile?.avatar_url || '')} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(ownerFromUser ? (user?.name || 'U') : (ownerProfile?.name || 'U'))}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {ownerFromUser ? user?.name : ownerProfile?.name || 'Dono'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {ownerFromUser ? user?.email : ownerProfile?.email || ''}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md whitespace-nowrap">
          <Crown className="h-3 w-3" />
          Dono
        </span>
      </div>

      {/* Team access indicator */}
      {visibility === 'team' && members.length === 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          Toda a equipe tem acesso
        </div>
      )}

      {/* Members list */}
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-muted">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          {isOwner ? (
            <>
              <NativeSelect
                value={member.role}
                onValueChange={(v) => updateRole.mutate({ memberId: member.id, role: v })}
                options={[
                  { value: 'viewer', label: 'Leitor' },
                  { value: 'editor', label: 'Editor' },
                ]}
                triggerClassName="w-24 h-8 text-xs"
              />
              <button
                type="button"
                onClick={() => removeMember.mutate(member.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                disabled={removeMember.isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {member.role === 'editor' ? 'Editor' : 'Leitor'}
            </span>
          )}
        </div>
      ))}

      {/* Add member */}
      {isOwner && user?.teamId && (
        <>
          {!showAddPanel ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed"
              onClick={() => setShowAddPanel(true)}
              disabled={availableToAdd.length === 0}
            >
              <UserPlus className="h-4 w-4" />
              {availableToAdd.length === 0 ? 'Todos os membros adicionados' : 'Adicionar membro'}
            </Button>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-sm font-medium">Membros da equipe</span>
                <button
                  type="button"
                  onClick={() => setShowAddPanel(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {availableToAdd.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Todos já foram adicionados.</p>
                ) : (
                  availableToAdd.map(tm => (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => addMember.mutate({ userId: tm.id, role: 'viewer' })}
                      disabled={addMember.isPending}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/60 transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={tm.avatar_url || ''} />
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(tm.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tm.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tm.email}</p>
                      </div>
                      <span className="text-muted-foreground text-lg leading-none flex-shrink-0">+</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* No team message */}
      {!user?.teamId && members.length === 0 && (
        <p className="text-xs text-muted-foreground">Apenas o dono tem acesso. Crie ou entre em uma equipe para compartilhar.</p>
      )}
    </div>
  );
}
