import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace, type WorkspacePermissions } from '@/contexts/WorkspaceContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { toast } from 'sonner';
import { Mail, Trash2, UserPlus, Settings as SettingsIcon, Crown, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  user_id: string | null;
  email: string | null;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  monthly_credit_limit: number | null;
  credits_used_this_month: number;
  permissions: WorkspacePermissions;
  joined_at: string | null;
  profile?: { name: string; email: string; avatar_url: string | null };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

const DEFAULT_PERMS: WorkspacePermissions = {
  brands: { view: true, create: true, edit: true, delete: true },
  content: { view: true, create: true },
  history: { view: true, delete: true },
  calendars: { view: true, create: true, edit: true, delete: true },
  personas: { view: true, create: true, edit: true, delete: true },
  themes: { view: true, create: true, edit: true, delete: true },
  members: { manage: false },
  billing: { manage: false },
};

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, isOwner, reload } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [name, setName] = useState('');
  const [creditMode, setCreditMode] = useState<'personal' | 'shared'>('personal');
  const [sharedCredits, setSharedCredits] = useState(0);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLimit, setInviteLimit] = useState<number | ''>('');
  const [invitePerms, setInvitePerms] = useState<WorkspacePermissions>(DEFAULT_PERMS);
  const [sending, setSending] = useState(false);

  const [permsModal, setPermsModal] = useState<Member | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    setName(currentWorkspace.name);
    setCreditMode(currentWorkspace.credit_mode);
    setSharedCredits(currentWorkspace.shared_credits);
    fetchMembers();
    fetchInvites();
  }, [currentWorkspace?.id]);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    setLoadingMembers(true);
    try {
      const { data: memData } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('joined_at', { ascending: true });
      const userIds = (memData || []).map(m => m.user_id).filter(Boolean) as string[];
      let profiles: any[] = [];
      if (userIds.length) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', userIds);
        profiles = data || [];
      }
      const enriched = (memData || []).map((m: any) => ({
        ...m,
        profile: profiles.find(p => p.id === m.user_id),
      }));
      setMembers(enriched as Member[]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvites = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    setInvites((data || []) as Invite[]);
  };

  const saveSettings = async () => {
    if (!currentWorkspace) return;
    const { error } = await supabase
      .from('workspaces')
      .update({ name, credit_mode: creditMode, shared_credits: sharedCredits })
      .eq('id', currentWorkspace.id);
    if (error) return toast.error(error.message);
    toast.success('Workspace atualizado');
    reload();
  };

  const sendInvite = async () => {
    if (!currentWorkspace || !inviteEmail) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-invite', {
        body: {
          workspace_id: currentWorkspace.id,
          email: inviteEmail.trim().toLowerCase(),
          role: 'member',
          permissions: invitePerms,
          monthly_credit_limit: inviteLimit === '' ? null : Number(inviteLimit),
        },
      });
      if (error) throw error;
      toast.success('Convite enviado!');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteLimit('');
      setInvitePerms(DEFAULT_PERMS);
      fetchInvites();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (m: Member) => {
    if (!currentWorkspace || !confirm(`Remover ${m.profile?.name || m.email}?`)) return;
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', m.id);
    if (error) return toast.error(error.message);
    fetchMembers();
  };

  const updateMemberPerms = async (member: Member, perms: WorkspacePermissions, limit: number | null) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ permissions: perms as any, monthly_credit_limit: limit })
      .eq('id', member.id);
    if (error) return toast.error(error.message);
    toast.success('Permissões atualizadas');
    setPermsModal(null);
    fetchMembers();
  };

  const cancelInvite = async (id: string) => {
    await supabase.from('workspace_invites').delete().eq('id', id);
    fetchInvites();
  };

  const resendInvite = async (inv: Invite) => {
    if (!currentWorkspace) return;
    try {
      const { error } = await supabase.functions.invoke('workspace-invite', {
        body: {
          workspace_id: currentWorkspace.id,
          email: inv.email,
          role: inv.role,
          permissions: DEFAULT_PERMS,
          monthly_credit_limit: null,
          resend_invite_id: inv.id,
        },
      });
      if (error) throw error;
      toast.success('Convite reenviado');
      fetchInvites();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao reenviar');
    }
  };

  const transferOwnership = async (m: Member) => {
    if (!currentWorkspace) return;
    if (!confirm(`Transferir propriedade do workspace para ${m.profile?.name || m.email}? Você se tornará membro.`)) return;
    const { error: e1 } = await supabase
      .from('workspaces')
      .update({ owner_id: m.user_id })
      .eq('id', currentWorkspace.id);
    if (e1) return toast.error(e1.message);
    await supabase.from('workspace_members').update({ role: 'owner' }).eq('id', m.id);
    await supabase
      .from('workspace_members')
      .update({ role: 'member' })
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', user!.id);
    toast.success('Propriedade transferida');
    fetchMembers();
    reload();
  };

  if (!currentWorkspace) {
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: 'Workspace' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentWorkspace.name}</h1>
          <p className="text-muted-foreground text-sm">
            {currentWorkspace.is_personal ? 'Workspace pessoal' : 'Workspace de equipe'}
            {' · '}{members.length} membros
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Convidar membros
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-sm border space-y-4 max-w-xl">
            <div>
              <Label>Nome do workspace</Label>
              <Input value={name} onChange={e => setName(e.target.value)} disabled={!isOwner} />
            </div>
            {isOwner && <Button onClick={saveSettings}>Salvar</Button>}
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="bg-card rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Papel</th>
                  <th className="p-3 font-medium">Entrou em</th>
                  <th className="p-3 font-medium">Uso mensal</th>
                  <th className="p-3 font-medium">Limite</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{(m.profile?.name || m.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{m.profile?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{m.profile?.email || m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {m.role === 'owner' ? (
                        <Badge variant="outline" className="gap-1"><Crown className="h-3 w-3" /> Dono</Badge>
                      ) : (
                        <Badge variant="secondary">Membro</Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-3">{m.credits_used_this_month}</td>
                    <td className="p-3">{m.monthly_credit_limit ?? '∞'}</td>
                    <td className="p-3 text-right">
                      {isOwner && m.role !== 'owner' && (
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setPermsModal(m)}>
                            <SettingsIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeMember(m)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum membro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <div className="bg-card rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-medium">E-mail</th>
                  <th className="p-3 font-medium">Enviado em</th>
                  <th className="p-3 font-medium">Expira em</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{i.email}</td>
                    <td className="p-3 text-muted-foreground">{new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-muted-foreground">{new Date(i.expires_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-right">
                      {isOwner && (
                        <Button variant="ghost" size="sm" onClick={() => cancelInvite(i.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum convite pendente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <div className="bg-card rounded-2xl p-6 shadow-sm border space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Modo de créditos</Label>
                <p className="text-sm text-muted-foreground">
                  Pessoais: cada membro usa seus próprios créditos. Compartilhados: pool único do workspace.
                </p>
              </div>
            </div>
            <Select value={creditMode} onValueChange={(v: any) => setCreditMode(v)} disabled={!isOwner}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoais</SelectItem>
                <SelectItem value="shared">Compartilhados</SelectItem>
              </SelectContent>
            </Select>
            {creditMode === 'shared' && (
              <div>
                <Label>Saldo compartilhado</Label>
                <Input
                  type="number"
                  value={sharedCredits}
                  onChange={e => setSharedCredits(Number(e.target.value))}
                  disabled={!isOwner}
                />
              </div>
            )}
            {isOwner && <Button onClick={saveSettings}>Salvar</Button>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>E-mail</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Limite mensal de créditos (opcional)</Label>
              <Input type="number" value={inviteLimit} onChange={e => setInviteLimit(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Sem limite" />
            </div>
            <PermissionsEditor value={invitePerms} onChange={setInvitePerms} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={sendInvite} disabled={sending || !inviteEmail}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member perms modal */}
      <Dialog open={!!permsModal} onOpenChange={(o) => !o && setPermsModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Permissões de {permsModal?.profile?.name}</DialogTitle></DialogHeader>
          {permsModal && <MemberPermsForm member={permsModal} onSave={updateMemberPerms} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberPermsForm({ member, onSave }: { member: Member; onSave: (m: Member, p: WorkspacePermissions, l: number | null) => void }) {
  const [perms, setPerms] = useState<WorkspacePermissions>(member.permissions || DEFAULT_PERMS);
  const [limit, setLimit] = useState<number | ''>(member.monthly_credit_limit ?? '');
  return (
    <div className="space-y-4">
      <div>
        <Label>Limite mensal de créditos</Label>
        <Input type="number" value={limit} onChange={e => setLimit(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Sem limite" />
      </div>
      <PermissionsEditor value={perms} onChange={setPerms} />
      <DialogFooter>
        <Button onClick={() => onSave(member, perms, limit === '' ? null : Number(limit))}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

function PermissionsEditor({ value, onChange }: { value: WorkspacePermissions; onChange: (p: WorkspacePermissions) => void }) {
  const groups: Array<{ key: keyof WorkspacePermissions; label: string; actions: string[] }> = [
    { key: 'brands', label: 'Marcas', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'content', label: 'Conteúdo', actions: ['view', 'create'] },
    { key: 'history', label: 'Histórico', actions: ['view', 'delete'] },
    { key: 'calendars', label: 'Calendários', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'personas', label: 'Personas', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'themes', label: 'Temas', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'members', label: 'Gestão de membros', actions: ['manage'] },
    { key: 'billing', label: 'Cobrança', actions: ['manage'] },
  ];
  const labelMap: Record<string, string> = { view: 'Ver', create: 'Criar', edit: 'Editar', delete: 'Excluir', manage: 'Gerenciar' };
  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
      {groups.map(g => (
        <div key={g.key} className="border rounded-lg p-3">
          <div className="font-medium text-sm mb-2">{g.label}</div>
          <div className="grid grid-cols-2 gap-2">
            {g.actions.map(a => (
              <label key={a} className="flex items-center justify-between text-sm">
                <span>{labelMap[a]}</span>
                <Switch
                  checked={!!(value as any)[g.key]?.[a]}
                  onCheckedChange={(c) => onChange({
                    ...value,
                    [g.key]: { ...(value as any)[g.key], [a]: c },
                  })}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
