import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2, X, Crown, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamData';
import { useCategoryMembers, type CategoryMemberInput } from '@/hooks/useCategories';
import type { ActionCategory } from '@/types/category';
import { cn } from '@/lib/utils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface MemberEntry {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'viewer' | 'editor';
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ActionCategory | null;
  onSave: (data: { name: string; description?: string; color: string; members?: CategoryMemberInput[] }) => void;
  isSaving: boolean;
  hasTeam: boolean;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function CategoryDialog({ open, onOpenChange, category, onSave, isSaving, hasTeam }: CategoryDialogProps) {
  const { user } = useAuth();
  const { data: teamMembers } = useTeamMembers(user?.teamId);
  const { data: existingMembers } = useCategoryMembers(category?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color);
    } else {
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      setMembers([]);
    }
    setMembersOpen(false);
  }, [category, open]);

  // Load existing members when editing
  useEffect(() => {
    if (category && existingMembers && existingMembers.length > 0) {
      setMembers(existingMembers.map(m => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatar_url,
        role: m.role as 'viewer' | 'editor',
      })));
    }
  }, [existingMembers, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      members: members.map(m => ({ userId: m.userId, role: m.role })),
    });
  };

  const addMember = (member: { id: string; name: string; email: string; avatar_url?: string | null }) => {
    if (member.id === user?.id) return;
    if (members.some(m => m.userId === member.id)) return;
    setMembers(prev => [...prev, {
      userId: member.id,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatar_url || null,
      role: 'viewer',
    }]);
  };

  const removeMember = (userId: string) => {
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const updateMemberRole = (userId: string, role: 'viewer' | 'editor') => {
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
  };

  const availableMembers = (teamMembers || []).filter(
    tm => tm.id !== user?.id && !members.some(m => m.userId === tm.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-visible bg-transparent border-none shadow-none transition-all duration-300 ease-in-out",
          membersOpen ? "sm:max-w-[52rem]" : "sm:max-w-md"
        )}
      >
        <div className="flex items-stretch gap-3">
          {/* Main Form Panel */}
          <div className={cn(
            "flex flex-col bg-background rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 ease-in-out max-h-[85vh]",
            membersOpen ? "w-full sm:w-[26rem] flex-shrink-0" : "w-full"
          )}>
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <Label className="font-bold">Nome</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Campanhas de Natal" autoFocus />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o propósito desta categoria..." rows={2} />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="w-7 h-7 rounded-full border-2 transition-transform active:scale-90 hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Access / Members Section */}
                <div className="space-y-3">
                  <Label className="font-bold">Acesso</Label>

                  {/* Owner */}
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatarUrl || ''} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md whitespace-nowrap">
                      <Crown className="h-3 w-3" />
                      Dono
                    </span>
                  </div>

                  {/* Added Members */}
                  {members.map(member => (
                    <div key={member.userId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl || ''} />
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <NativeSelect
                        value={member.role}
                        onValueChange={(v) => updateMemberRole(member.userId, v as 'viewer' | 'editor')}
                        options={[
                          { value: 'viewer', label: 'Leitor' },
                          { value: 'editor', label: 'Editor' },
                        ]}
                        triggerClassName="w-24 h-8 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(member.userId)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add Member Button */}
                  {hasTeam && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-dashed"
                      onClick={() => setMembersOpen(!membersOpen)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Adicionar membro
                    </Button>
                  )}

                  {!hasTeam && members.length === 0 && (
                    <p className="text-xs text-muted-foreground">Apenas você tem acesso. Crie ou entre em uma equipe para compartilhar.</p>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={!name.trim() || isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {category ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Members Side Panel — visually separate card */}
          {membersOpen && (
            <div className="hidden sm:flex flex-col w-80 flex-shrink-0 bg-background rounded-xl shadow-lg border border-border max-h-[85vh] animate-in fade-in-0 slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                <h3 className="font-semibold text-base">Membros da equipe</h3>
                <button
                  type="button"
                  onClick={() => setMembersOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {availableMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8 px-2">
                    Todos os membros já foram adicionados.
                  </p>
                )}
                {availableMembers.map(tm => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => addMember(tm)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left active:scale-[0.98]"
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
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
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
