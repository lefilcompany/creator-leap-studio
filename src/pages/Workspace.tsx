import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace, type WorkspacePermissions, type WorkspaceRole, defaultPermsForRole, CUSTOM_PRESETS } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { toast } from 'sonner';
import {
  Mail, Trash2, UserPlus, Settings as SettingsIcon, Crown, Loader2,
  ArrowRightLeft, Send, Building2, Users, Coins, ShieldCheck,
  ChevronRight, Camera, Save, ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateWorkspaceWizard } from '@/components/workspace/CreateWorkspaceWizard';

interface Member {
  id: string;
  user_id: string | null;
  email: string | null;
  role: WorkspaceRole;
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

const DEFAULT_PERMS: WorkspacePermissions = defaultPermsForRole('editor');

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Dono',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Leitor',
  custom: 'Personalizado',
  member: 'Editor',
};

const ROLE_DESCRIPTIONS: Record<Exclude<WorkspaceRole, 'owner'>, string> = {
  admin: 'Gerencia membros, faturamento e todo o conteúdo',
  editor: 'Cria e edita conteúdo, marcas, calendários',
  viewer: 'Apenas visualiza — não pode criar nem editar',
  custom: 'Permissões granulares definidas manualmente',
  member: 'Cria e edita conteúdo, marcas, calendários',
};

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer', 'custom'];

type SectionKey = 'overview' | 'members' | 'invites' | 'credits';

const SECTIONS: Array<{ key: SectionKey; label: string; subtitle: string; icon: any }> = [
  { key: 'overview', label: 'Workspace',  subtitle: 'Identidade e nome',     icon: Building2 },
  { key: 'members',  label: 'Membros',    subtitle: 'Pessoas e permissões', icon: Users },
  { key: 'invites',  label: 'Convites',   subtitle: 'Pendentes',             icon: Mail },
  { key: 'credits',  label: 'Créditos',   subtitle: 'Modo e limites',        icon: Coins },
];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { currentWorkspace, isOwner, reload } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as SectionKey) ?? 'overview';

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState('');
  const [creditMode, setCreditMode] = useState<'personal' | 'shared'>('personal');
  const [sharedCredits, setSharedCredits] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCredits, setSavingCredits] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('editor');
  const [inviteLimit, setInviteLimit] = useState<number | ''>(0);
  const [invitePerms, setInvitePerms] = useState<WorkspacePermissions>(DEFAULT_PERMS);
  const [sending, setSending] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferring, setTransferring] = useState(false);

  const [permsModal, setPermsModal] = useState<Member | null>(null);
  const [switchToPersonalOpen, setSwitchToPersonalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    setName(currentWorkspace.name);
    setCreditMode(currentWorkspace.credit_mode);
    setSharedCredits(currentWorkspace.shared_credits);
    fetchMembers();
    fetchInvites();
  }, [currentWorkspace?.id]);

  // Open invite modal via ?invite=1 (from sidebar switcher)
  useEffect(() => {
    if (params.get('invite') === '1') {
      setInviteOpen(true);
      const next = new URLSearchParams(params);
      next.delete('invite');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  // Open create workspace wizard via ?action=create (kept in URL so layout enters immersive mode)
  useEffect(() => {
    setCreateOpen(params.get('action') === 'create');
  }, [params]);

  const closeCreateWizard = () => {
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });
    setCreateOpen(false);
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
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

  const saveProfile = async () => {
    if (!currentWorkspace) return;
    if (!name.trim() || name.trim().length < 2) {
      return toast.error('O nome do workspace deve ter ao menos 2 caracteres.');
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ name: name.trim() })
      .eq('id', currentWorkspace.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success('Workspace atualizado');
    reload();
  };

  const applyCreditMode = async (mode: 'personal' | 'shared') => {
    if (!currentWorkspace) return false;
    const prev = creditMode;
    setCreditMode(mode);
    setSavingCredits(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ credit_mode: mode })
      .eq('id', currentWorkspace.id);
    setSavingCredits(false);
    if (error) {
      setCreditMode(prev);
      toast.error(error.message);
      return false;
    }
    toast.success(mode === 'shared' ? 'Modo compartilhado ativado' : 'Modo pessoal ativado');
    reload();
    return true;
  };

  const changeCreditMode = async (mode: 'personal' | 'shared') => {
    if (!currentWorkspace) return;
    // Switching shared -> personal with leftover pool: ask user
    if (mode === 'personal' && creditMode === 'shared' && (sharedCredits ?? 0) > 0) {
      setSwitchToPersonalOpen(true);
      return;
    }
    await applyCreditMode(mode);
  };

  const refundAndSwitchToPersonal = async () => {
    if (!currentWorkspace) return;
    const amount = sharedCredits;
    setSavingCredits(true);
    const { data, error } = await supabase.rpc('workspace_transfer_shared_to_personal', {
      p_workspace_id: currentWorkspace.id,
      p_amount: amount,
    });
    if (error) {
      setSavingCredits(false);
      return toast.error(error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.new_shared_credits != null) setSharedCredits(row.new_shared_credits);
    await refreshProfile();
    setSavingCredits(false);
    toast.success(`${amount} créditos devolvidos para você`);
    setSwitchToPersonalOpen(false);
    await applyCreditMode('personal');
  };

  const keepAndSwitchToPersonal = async () => {
    setSwitchToPersonalOpen(false);
    await applyCreditMode('personal');
  };


  const transferToShared = async () => {
    if (!currentWorkspace) return;
    const amt = transferAmount === '' ? 0 : Number(transferAmount);
    if (!amt || amt <= 0) return toast.error('Informe um valor maior que zero');
    setTransferring(true);
    const { data, error } = await supabase.rpc('workspace_transfer_personal_to_shared', {
      p_workspace_id: currentWorkspace.id,
      p_amount: amt,
    });
    setTransferring(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.new_shared_credits != null) setSharedCredits(row.new_shared_credits);
    setTransferAmount('');
    await refreshProfile();
    toast.success(`${amt} créditos transferidos para o workspace`);
    reload();
  };

  const updateMemberLimit = async (memberId: string, limit: number | null) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ monthly_credit_limit: limit })
      .eq('id', memberId);
    if (error) return toast.error(error.message);
    fetchMembers();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    try {
      setUploadingAvatar(true);
      const ext = file.name.split('.').pop() || 'png';
      const path = `${currentWorkspace.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('workspace-avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('workspace-avatars').getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('workspaces')
        .update({ avatar_url: publicUrl })
        .eq('id', currentWorkspace.id);
      if (updErr) throw updErr;
      toast.success('Foto do workspace atualizada');
      reload();
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const sendInvite = async () => {
    if (!currentWorkspace || !inviteEmail) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('workspace-invite', {
        body: {
          workspace_id: currentWorkspace.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          permissions: invitePerms,
          monthly_credit_limit: inviteLimit === '' ? null : Number(inviteLimit),
        },
      });
      if (error) throw error;
      toast.success('Convite enviado!');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('editor');
      setInviteLimit(0);
      setInvitePerms(defaultPermsForRole('editor'));
      fetchInvites();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  const updateMemberRole = async (m: Member, role: WorkspaceRole) => {
    if (!currentWorkspace) return;
    const { error } = await supabase
      .from('workspace_members')
      .update({ role, permissions: defaultPermsForRole(role) as any })
      .eq('id', m.id);
    if (error) return toast.error(error.message);
    toast.success('Papel atualizado');
    fetchMembers();
  };

  const removeMember = async (m: Member) => {
    if (!currentWorkspace || !confirm(`Remover ${m.profile?.name || m.email}?`)) return;
    const { error } = await supabase.from('workspace_members').delete().eq('id', m.id);
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
          monthly_credit_limit: 0,
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
      .from('workspaces').update({ owner_id: m.user_id }).eq('id', currentWorkspace.id);
    if (e1) return toast.error(e1.message);
    await supabase.from('workspace_members').update({ role: 'owner' }).eq('id', m.id);
    await supabase.from('workspace_members')
      .update({ role: 'member' })
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', user!.id);
    toast.success('Propriedade transferida');
    fetchMembers();
    reload();
  };

  const initials = useMemo(() => {
    const n = currentWorkspace?.name || '';
    return n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'W';
  }, [currentWorkspace?.name]);

  if (createOpen) {
    return <CreateWorkspaceWizard open onClose={closeCreateWizard} />;
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeSection = SECTIONS.find(s => s.key === tab) ?? SECTIONS[0];

  return (
    <div className="space-y-6 pb-12">
      <PageBreadcrumb items={[{ label: 'Workspace' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Workspace</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie identidade, membros, convites e créditos
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4 min-w-0">
          {/* Identity card */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative group/avatar">
                <Avatar className="h-24 w-24 border-4 border-card shadow-md">
                  <AvatarImage src={currentWorkspace.avatar_url ?? undefined} alt={currentWorkspace.name} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label="Alterar foto do workspace"
                  >
                    {uploadingAvatar
                      ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                      : <Camera className="h-6 w-6 text-white" />}
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <h2 className="font-semibold mt-3 text-base truncate max-w-full">{currentWorkspace.name}</h2>
              <p className="text-xs text-muted-foreground truncate max-w-full">
                {currentWorkspace.is_personal ? 'Workspace pessoal' : 'Workspace de equipe'}
              </p>
              <Badge variant="outline" className="mt-2 gap-1 text-[11px]">
                {isOwner ? <><Crown className="h-3 w-3" /> Dono</> : 'Membro'}
              </Badge>
              <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/40 rounded-lg p-2">
                  <div className="text-lg font-semibold">{members.length}</div>
                  <div className="text-[11px] text-muted-foreground">Membros</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <div className="text-lg font-semibold">{invites.length}</div>
                  <div className="text-[11px] text-muted-foreground">Convites</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section nav */}
          <nav className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const active = s.key === tab;
              return (
                <button
                  key={s.key}
                  onClick={() => setParams({ tab: s.key })}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2',
                    active
                      ? 'bg-primary/5 border-primary text-primary'
                      : 'border-transparent hover:bg-muted/40 text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.subtitle}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <section className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Section header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b mb-6">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <activeSection.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{activeSection.label}</h2>
                <p className="text-sm text-muted-foreground truncate">{activeSection.subtitle}</p>
              </div>
            </div>
            {tab === 'overview' && isOwner && (
              <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="shrink-0">
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                <span className="hidden sm:inline">Salvar alterações</span>
                <span className="sm:hidden">Salvar</span>
              </Button>
            )}
            {tab === 'members' && isOwner && (
              <Button onClick={() => setInviteOpen(true)} size="sm" className="shrink-0">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar
              </Button>
            )}
            {tab === 'credits' && isOwner && savingCredits && (
              <div className="flex items-center text-xs text-muted-foreground shrink-0">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…
              </div>
            )}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={currentWorkspace.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm">Foto do workspace</div>
                  <div className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máx 2MB</div>
                </div>
                {isOwner && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Camera className="h-4 w-4 mr-2" />}
                    Alterar foto
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome do workspace</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Ex: Minha Empresa"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Esse nome aparece no seletor de workspaces e nas notificações.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
                <div className="text-sm">
                  {currentWorkspace.is_personal ? 'Workspace pessoal' : 'Workspace compartilhado'}
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
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
                            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
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
                        ) : isOwner ? (
                          <Select value={m.role} onValueChange={(v) => updateMemberRole(m, v as WorkspaceRole)}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map(r => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-3">{creditMode === 'shared' ? m.credits_used_this_month : '—'}</td>
                      <td className="p-3">
                        {m.role === 'owner'
                          ? <span className="text-muted-foreground">Sem limite</span>
                          : creditMode !== 'shared'
                            ? <span className="text-muted-foreground">—</span>
                            : isOwner ? (
                              <Input
                                type="number"
                                min={0}
                                className="h-8 w-24"
                                defaultValue={m.monthly_credit_limit ?? 0}
                                onBlur={(e) => {
                                  const v = e.target.value === '' ? 0 : Number(e.target.value);
                                  if (v !== (m.monthly_credit_limit ?? 0)) updateMemberLimit(m.id, v);
                                }}
                              />
                            ) : (m.monthly_credit_limit ?? 0)}
                      </td>
                      <td className="p-3 text-right">
                        {isOwner && m.role !== 'owner' && (
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setPermsModal(m)} title="Permissões">
                              <SettingsIcon className="h-4 w-4" />
                            </Button>
                            {m.user_id && (
                              <Button variant="ghost" size="sm" onClick={() => transferOwnership(m)} title="Transferir propriedade">
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => removeMember(m)} title="Remover">
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
          )}

          {/* Invites */}
          {tab === 'invites' && (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
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
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => resendInvite(i)} title="Reenviar convite">
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelInvite(i.id)} title="Cancelar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
          )}

          {/* Credits */}
          {tab === 'credits' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Modo de créditos</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Individuais: cada pessoa usa os próprios créditos. Compartilhados: o workspace tem um saldo único usado pela equipe.
                </p>
                <Select value={creditMode} onValueChange={(v: any) => changeCreditMode(v)} disabled={!isOwner || savingCredits}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Individuais</SelectItem>
                    <SelectItem value="shared">Compartilhados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {creditMode === 'shared' && (
                <>
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Saldo do workspace</div>
                    <div className="text-2xl font-semibold">{sharedCredits} créditos</div>
                    <p className="text-xs text-muted-foreground">
                      Esses créditos pertencem ao workspace e são consumidos pelos membros conforme o limite mensal de cada um. Por padrão, novos membros têm limite <strong>0</strong> (não podem gastar nada). O dono não tem limite.
                    </p>
                  </div>

                  {isOwner && (
                    <div className="rounded-xl border p-4 space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Transferir dos seus créditos pessoais para o workspace</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você tem <strong>{user?.credits ?? 0}</strong> créditos pessoais. O valor transferido sai do seu saldo e passa a ficar guardado no workspace.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Quantidade"
                          value={transferAmount}
                          onChange={e => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <Button onClick={transferToShared} disabled={transferring || !transferAmount}>
                          {transferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Transferir
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="font-medium text-sm">Limite mensal por membro</div>
                    <p className="text-xs text-muted-foreground">
                      Defina quantos créditos do saldo do workspace cada membro pode usar por mês. Edite na aba <strong>Membros</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

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
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => {
                const r = v as WorkspaceRole;
                setInviteRole(r);
                setInvitePerms(defaultPermsForRole(r));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col items-start">
                        <span>{ROLE_LABELS[r]}</span>
                        <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r as Exclude<WorkspaceRole,'owner'>]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Limite mensal de créditos compartilhados</Label>
              <Input type="number" min={0} value={inviteLimit} onChange={e => setInviteLimit(e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" />
              <p className="text-xs text-muted-foreground mt-1">Quantos créditos do saldo do workspace este membro pode usar por mês. Deixe em branco para <strong>bloquear</strong> o consumo até definir. Aplica-se apenas ao modo compartilhado.</p>
            </div>
            {inviteRole === 'custom' && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Modelos rápidos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CUSTOM_PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setInvitePerms(p.perms)}
                      className="text-left rounded-md border bg-background hover:border-primary hover:bg-primary/5 transition px-3 py-2"
                    >
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Escolha um modelo e ajuste cada permissão abaixo conforme precisar.</p>
              </div>
            )}
            {(inviteRole === 'custom' || inviteRole === 'editor') && (
              <PermissionsEditor value={invitePerms} onChange={setInvitePerms} />
            )}
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

      {/* Confirm switch shared -> personal with leftover pool */}
      <Dialog open={switchToPersonalOpen} onOpenChange={setSwitchToPersonalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Voltar para créditos individuais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Você está saindo do modo <strong>Compartilhado</strong>. Hoje o workspace tem
              <strong> {sharedCredits} créditos </strong> guardados em conjunto. Esses créditos vieram do seu saldo pessoal quando você transferiu para o workspace.
            </p>
            <p className="text-muted-foreground">
              No modo <strong>Individual</strong>, cada pessoa usa apenas os próprios créditos. Por isso, antes de trocar, escolha o que fazer com os créditos que estão guardados no workspace:
            </p>
            <div className="grid sm:grid-cols-2 gap-5 pt-2">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <div className="font-medium text-sm">Devolver para mim</div>
                <p className="text-xs text-muted-foreground">
                  Os <strong>{sharedCredits} créditos</strong> voltam para a sua conta pessoal e o saldo do workspace fica em <strong>0</strong>.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <div className="font-medium text-sm">Deixar no workspace</div>
                <p className="text-xs text-muted-foreground">
                  Os <strong>{sharedCredits} créditos</strong> ficam guardados no workspace, sem serem usados, até você ativar de novo o modo Compartilhado.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button variant="ghost" onClick={() => setSwitchToPersonalOpen(false)} disabled={savingCredits}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={keepAndSwitchToPersonal} disabled={savingCredits}>
              Deixar no workspace
            </Button>
            <Button onClick={refundAndSwitchToPersonal} disabled={savingCredits}>
              {savingCredits && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Devolver para mim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  );
}

function MemberPermsForm({ member, onSave }: { member: Member; onSave: (m: Member, p: WorkspacePermissions, l: number | null) => void }) {
  const [perms, setPerms] = useState<WorkspacePermissions>(member.permissions || DEFAULT_PERMS);
  const [limit, setLimit] = useState<number | ''>(member.monthly_credit_limit ?? 0);
  return (
    <div className="space-y-4">
      <div>
        <Label>Limite mensal de créditos compartilhados</Label>
        <Input type="number" min={0} value={limit} onChange={e => setLimit(e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" />
        <p className="text-xs text-muted-foreground mt-1">0 bloqueia o consumo. Aplica-se apenas ao modo compartilhado.</p>
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

  const allOn = (key: keyof WorkspacePermissions, actions: string[]) =>
    actions.every(a => !!(value as any)[key]?.[a]);

  const toggleAll = (key: keyof WorkspacePermissions, actions: string[], on: boolean) => {
    const next = { ...(value as any)[key] };
    actions.forEach(a => { next[a] = on; });
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">
        Permissões
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {groups.map(g => {
          const all = allOn(g.key, g.actions);
          return (
            <div key={g.key} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                <div className="font-medium text-sm">{g.label}</div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Tudo</span>
                  <Switch
                    checked={all}
                    onCheckedChange={(c) => toggleAll(g.key, g.actions, c)}
                  />
                </label>
              </div>
              <div className="divide-y">
                {g.actions.map(a => (
                  <label key={a} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
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
          );
        })}
      </div>
    </div>
  );
}
