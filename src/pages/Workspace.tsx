import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace, type WorkspacePermissions, type WorkspaceRole, defaultPermsForRole } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { toast } from 'sonner';
import {
  Mail, Trash2, UserPlus, Crown, Loader2, ArrowRightLeft, Send, Building2,
  Users, Coins, Camera, Save, ImageIcon, Search, MoreHorizontal,
  LayoutDashboard, Sparkles, CreditCard, Workflow, Bell, ShieldCheck,
  Plug, History, AlertTriangle, RefreshCw, Filter, Download, CheckCircle2,
  Clock, Wallet, TrendingUp, Calendar, ExternalLink, ChevronDown,
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

const DEFAULT_PERMS: WorkspacePermissions = defaultPermsForRole('member');

type SectionKey =
  | 'overview' | 'identity' | 'members' | 'invites' | 'credits' | 'billing'
  | 'workflow' | 'notifications' | 'security' | 'integrations' | 'audit' | 'danger';

type SectionGroup = { label: string; items: Array<{ key: SectionKey; label: string; icon: any; soon?: boolean }> };

const SECTION_GROUPS: SectionGroup[] = [
  {
    label: 'Geral',
    items: [
      { key: 'overview',  label: 'Visão geral',           icon: LayoutDashboard },
      { key: 'identity',  label: 'Identidade',            icon: Sparkles },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { key: 'members',   label: 'Membros e permissões', icon: Users },
      { key: 'invites',   label: 'Convites',              icon: Mail },
    ],
  },
  {
    label: 'Operação',
    items: [
      { key: 'credits',       label: 'Créditos e plano',  icon: Coins },
      { key: 'billing',       label: 'Cobrança',          icon: CreditCard, soon: true },
      { key: 'workflow',      label: 'Fluxo e preferências', icon: Workflow, soon: true },
      { key: 'notifications', label: 'Notificações',      icon: Bell, soon: true },
    ],
  },
  {
    label: 'Confiança',
    items: [
      { key: 'security',     label: 'Segurança',         icon: ShieldCheck, soon: true },
      { key: 'integrations', label: 'Integrações',       icon: Plug, soon: true },
      { key: 'audit',        label: 'Auditoria',         icon: History, soon: true },
      { key: 'danger',       label: 'Zona de risco',     icon: AlertTriangle },
    ],
  },
];

const SECTION_META: Record<SectionKey, { label: string; subtitle: string; icon: any }> = {
  overview:      { label: 'Visão geral',          subtitle: 'Resumo executivo do workspace.', icon: LayoutDashboard },
  identity:      { label: 'Identidade',           subtitle: 'Como o seu workspace aparece na plataforma.', icon: Sparkles },
  members:       { label: 'Membros e permissões', subtitle: 'Controle quem participa, o papel de cada pessoa e o que ela pode acessar.', icon: Users },
  invites:       { label: 'Convites',             subtitle: 'Acompanhe convites pendentes e reenvie quando precisar.', icon: Mail },
  credits:       { label: 'Créditos e plano',     subtitle: 'Acompanhe consumo, plano, limites e renovação.', icon: Coins },
  billing:       { label: 'Cobrança',             subtitle: 'Plano, faturas e dados financeiros do workspace.', icon: CreditCard },
  workflow:      { label: 'Fluxo e preferências', subtitle: 'Etapas, aprovações e padrões operacionais do time.', icon: Workflow },
  notifications: { label: 'Notificações',         subtitle: 'Como o workspace e os membros são avisados.', icon: Bell },
  security:      { label: 'Segurança',            subtitle: 'Políticas de acesso, sessões e proteções da conta.', icon: ShieldCheck },
  integrations:  { label: 'Integrações',          subtitle: 'Conecte o workspace a outras ferramentas.', icon: Plug },
  audit:         { label: 'Auditoria',            subtitle: 'Histórico de ações administrativas.', icon: History },
  danger:        { label: 'Zona de risco',        subtitle: 'Ações irreversíveis. Tome cuidado.', icon: AlertTriangle },
};

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
  const [inviteLimit, setInviteLimit] = useState<number | ''>(0);
  const [sending, setSending] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferring, setTransferring] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'owner' | 'member'>('all');

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

  useEffect(() => {
    if (params.get('invite') === '1') {
      setInviteOpen(true);
      const next = new URLSearchParams(params);
      next.delete('invite');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    setCreateOpen(params.get('action') === 'create');
  }, [params]);

  const closeCreateWizard = () => {
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });
    setCreateOpen(false);
  };

  const setTab = (key: SectionKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
          role: 'member',
          permissions: DEFAULT_PERMS,
          monthly_credit_limit: inviteLimit === '' ? null : Number(inviteLimit),
        },
      });
      if (error) throw error;
      toast.success('Convite enviado!');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteLimit(0);
      fetchInvites();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (m: Member) => {
    if (!currentWorkspace || !confirm(`Remover ${m.profile?.name || m.email}?`)) return;
    const { error } = await supabase.from('workspace_members').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
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

  const totalSharedUsed = useMemo(
    () => members.reduce((sum, m) => sum + (m.credits_used_this_month || 0), 0),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter(m => {
      if (memberRoleFilter !== 'all' && m.role !== memberRoleFilter) return false;
      if (!q) return true;
      const name = (m.profile?.name || '').toLowerCase();
      const email = (m.profile?.email || m.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, memberSearch, memberRoleFilter]);

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

  const planName = currentWorkspace.owner_plan_name ?? 'Plano Free';
  const subStatus = currentWorkspace.owner_subscription_status ?? null;

  const meta = SECTION_META[tab] ?? SECTION_META.overview;
  const Icon = meta.icon;

  return (
    <div className="space-y-6 pb-12">
      <PageBreadcrumb items={[{ label: 'Configurações' }, { label: 'Workspace' }]} />

      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_60%)]" />
        <div className="relative p-5 sm:p-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-4 ring-card shadow-md">
                <AvatarImage src={currentWorkspace.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 ring-2 ring-card" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {currentWorkspace.is_personal ? 'Workspace pessoal' : 'Workspace de equipe'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Configurações do Workspace
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
                Gerencie identidade, acesso, permissões, créditos e preferências operacionais do time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Chip icon={Users} label={`${members.length} membros`} />
            <Chip icon={Mail} label={`${invites.length} convites`} tone={invites.length ? 'warning' : 'default'} />
            <Chip icon={Coins} label={`${(user?.credits ?? 0).toLocaleString('pt-BR')} créditos`} />
            <Chip icon={Sparkles} label={planName} tone="primary" />
            {isOwner && (
              <Button onClick={() => setInviteOpen(true)} size="sm" className="ml-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar membro
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/credits')}>
              <Wallet className="h-4 w-4 mr-2" /> Gerenciar créditos
            </Button>
          </div>
        </div>
      </div>

      {/* TWO COL */}
      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* SIDE NAV */}
        <aside className="space-y-5 min-w-0 xl:sticky xl:top-4">
          <nav className="bg-card rounded-2xl border shadow-sm p-2">
            {SECTION_GROUPS.map((g, gi) => {
              const containsActive = g.items.some(it => it.key === tab);
              const isOpen = openGroups[g.label] ?? containsActive;
              return (
                <div key={g.label} className={cn(gi > 0 && 'mt-1 pt-1 border-t')}>
                  <button
                    type="button"
                    onClick={() => setOpenGroups(prev => ({ ...prev, [g.label]: !isOpen }))}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] uppercase tracking-wide text-muted-foreground font-semibold hover:bg-muted/40 transition-colors"
                  >
                    <span>{g.label}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="space-y-1 mt-1 mb-1">
                      {g.items.map(it => {
                        const ItIcon = it.icon;
                        const active = it.key === tab;
                        return (
                          <button
                            key={it.key}
                            onClick={() => setTab(it.key)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all',
                              active
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-foreground hover:bg-muted/60'
                            )}
                          >
                            <ItIcon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                            <span className="flex-1 truncate">{it.label}</span>
                            {it.soon && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                em breve
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* CONTENT */}
        <section className="bg-card rounded-2xl border shadow-sm p-5 sm:p-7 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b mb-6">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{meta.label}</h2>
                <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </div>
            {tab === 'identity' && isOwner && (
              <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="shrink-0">
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            )}
            {tab === 'members' && isOwner && (
              <Button onClick={() => setInviteOpen(true)} size="sm" className="shrink-0">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar
              </Button>
            )}
          </div>

          {tab === 'overview' && (
            <OverviewSection
              workspace={currentWorkspace}
              members={members}
              invites={invites}
              userCredits={user?.credits ?? 0}
              creditMode={creditMode}
              sharedCredits={sharedCredits}
              totalSharedUsed={totalSharedUsed}
              planName={planName}
              subStatus={subStatus}
              ownerName={members.find(m => m.role === 'owner')?.profile?.name ?? '—'}
              onGo={setTab}
            />
          )}

          {tab === 'identity' && (
            <IdentitySection
              isOwner={isOwner}
              workspace={currentWorkspace}
              name={name} setName={setName}
              uploadingAvatar={uploadingAvatar}
              avatarInputRef={avatarInputRef}
              handleAvatarUpload={handleAvatarUpload}
            />
          )}

          {tab === 'members' && (
            <MembersSection
              members={filteredMembers}
              isOwner={isOwner}
              creditMode={creditMode}
              memberSearch={memberSearch} setMemberSearch={setMemberSearch}
              memberRoleFilter={memberRoleFilter} setMemberRoleFilter={setMemberRoleFilter}
              onUpdateLimit={updateMemberLimit}
              onRemove={removeMember}
              onTransferOwnership={transferOwnership}
              totalActive={members.length}
              pendingCount={invites.length}
              onGoInvites={() => setTab('invites')}
            />
          )}

          {tab === 'invites' && (
            <InvitesSection
              invites={invites}
              isOwner={isOwner}
              onResend={resendInvite}
              onCancel={cancelInvite}
              onInvite={() => setInviteOpen(true)}
            />
          )}

          {tab === 'credits' && (
            <CreditsSection
              isOwner={isOwner}
              creditMode={creditMode}
              changeCreditMode={changeCreditMode}
              savingCredits={savingCredits}
              sharedCredits={sharedCredits}
              totalSharedUsed={totalSharedUsed}
              userCredits={user?.credits ?? 0}
              transferAmount={transferAmount}
              setTransferAmount={setTransferAmount}
              transferring={transferring}
              transferToShared={transferToShared}
              members={members}
              planName={planName}
              onGoCredits={() => navigate('/credits')}
            />
          )}

          {tab === 'billing' && (
            <ComingSoon
              icon={CreditCard}
              title="Cobrança chega em breve"
              text="Gerencie plano, faturas, método de pagamento e dados fiscais do workspace direto por aqui."
              cta={{ label: 'Ver planos', onClick: () => navigate('/credits') }}
            />
          )}
          {tab === 'workflow' && (
            <ComingSoon
              icon={Workflow}
              title="Fluxo e preferências"
              text="Defina etapas padrão, responsáveis, aprovações, prazos e templates do time. Em construção."
            />
          )}
          {tab === 'notifications' && (
            <ComingSoon
              icon={Bell}
              title="Central de notificações"
              text="Configure e-mails, alertas no app, resumos e gatilhos para o workspace inteiro."
            />
          )}
          {tab === 'security' && (
            <ComingSoon
              icon={ShieldCheck}
              title="Segurança e acesso"
              text="Política de senhas, 2FA obrigatório, domínios permitidos para convite, sessões e auditoria de ações críticas."
            />
          )}
          {tab === 'integrations' && (
            <ComingSoon
              icon={Plug}
              title="Integrações"
              text="Conecte calendário, Slack, e-mail, webhooks/API, armazenamento e canais de publicação."
            />
          )}
          {tab === 'audit' && (
            <ComingSoon
              icon={History}
              title="Auditoria do workspace"
              text="Histórico completo de alterações de papel, acesso, configuração, créditos e ações administrativas."
            />
          )}

          {tab === 'danger' && (
            <DangerSection isOwner={isOwner} workspaceName={currentWorkspace.name} />
          )}
        </section>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Limite mensal de créditos compartilhados</Label>
              <Input type="number" min={0} value={inviteLimit} onChange={e => setInviteLimit(e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" />
              <p className="text-xs text-muted-foreground mt-1">
                Quantos créditos do saldo do workspace este membro pode usar por mês. Deixe em <strong>0</strong> para bloquear até definir. Aplica-se apenas ao modo compartilhado.
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
              Todo membro do workspace tem acesso completo para criar, editar e excluir marcas, calendários, personas, temas e conteúdo. Apenas o dono gerencia membros e cobrança.
            </div>
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

      {/* Confirm switch shared -> personal with leftover pool */}
      <Dialog open={switchToPersonalOpen} onOpenChange={setSwitchToPersonalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Voltar para créditos individuais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Você está saindo do modo <strong>Compartilhado</strong>. Hoje o workspace tem
              <strong> {sharedCredits} créditos </strong> guardados em conjunto.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <div className="font-medium text-sm">Devolver para mim</div>
                <p className="text-xs text-muted-foreground">
                  Os <strong>{sharedCredits} créditos</strong> voltam para a sua conta pessoal.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <div className="font-medium text-sm">Deixar no workspace</div>
                <p className="text-xs text-muted-foreground">
                  Os créditos ficam guardados no workspace até reativar o modo Compartilhado.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setSwitchToPersonalOpen(false)} disabled={savingCredits}>Cancelar</Button>
            <Button variant="outline" onClick={keepAndSwitchToPersonal} disabled={savingCredits}>Deixar no workspace</Button>
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

/* ─────────────── Building blocks ─────────────── */

function Chip({
  icon: I, label, tone = 'default',
}: { icon: any; label: string; tone?: 'default' | 'primary' | 'warning' }) {
  const toneCls =
    tone === 'primary' ? 'bg-primary/10 text-primary border-primary/20'
    : tone === 'warning' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400'
    : 'bg-muted/60 text-foreground border-border';
  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium', toneCls)}>
      <I className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function StatCard({
  icon: I, label, value, hint, tone = 'default',
}: { icon: any; label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'primary' | 'warning' | 'success' }) {
  const iconBg =
    tone === 'primary' ? 'bg-primary/10 text-primary'
    : tone === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : tone === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'bg-muted text-foreground';
  return (
    <div className="rounded-2xl border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconBg)}>
          <I className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ComingSoon({ icon: I, title, text, cta }: { icon: any; title: string; text: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary flex items-center justify-center mb-4">
        <I className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mt-1">{text}</p>
      <Badge variant="outline" className="mt-3 text-[10px] uppercase tracking-wider">Em breve</Badge>
      {cta && <Button className="mt-5" onClick={cta.onClick}>{cta.label}</Button>}
    </div>
  );
}

/* ─────────────── Sections ─────────────── */

function OverviewSection({
  workspace, members, invites, userCredits, creditMode, sharedCredits, totalSharedUsed,
  planName, subStatus, ownerName, onGo,
}: any) {
  const renewalRaw = workspace?.owner_subscription_status; // not exact; leave hint
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Building2} label="Workspace" value={workspace.name} hint={workspace.is_personal ? 'Pessoal' : 'Equipe'} />
        <StatCard icon={Crown} label="Proprietário" value={ownerName} tone="primary" />
        <StatCard icon={Sparkles} label="Plano atual" value={planName} hint={subStatus ?? 'Ativo'} tone="primary" />
        <StatCard icon={Users} label="Membros ativos" value={members.length} hint={`${members.length} pessoas no workspace`} />
        <StatCard
          icon={Mail}
          label="Convites pendentes"
          value={invites.length}
          hint={invites.length ? 'Aguardando resposta' : 'Tudo em dia'}
          tone={invites.length ? 'warning' : 'default'}
        />
        <StatCard
          icon={Coins}
          label={creditMode === 'shared' ? 'Saldo do workspace' : 'Seus créditos'}
          value={(creditMode === 'shared' ? sharedCredits : userCredits).toLocaleString('pt-BR')}
          hint={creditMode === 'shared' ? `${totalSharedUsed} usados neste ciclo` : 'Modo individual'}
          tone="success"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <ActionTile icon={Users}    title="Gerenciar membros"  text="Convide, remova e ajuste limites do time." onClick={() => onGo('members')} />
        <ActionTile icon={Coins}    title="Créditos e plano"   text="Acompanhe consumo, modo e renovação."       onClick={() => onGo('credits')} />
        <ActionTile icon={Sparkles} title="Identidade"         text="Atualize nome e avatar do workspace."        onClick={() => onGo('identity')} />
      </div>
    </div>
  );
}

function ActionTile({ icon: I, title, text, onClick }: any) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all group">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
          <I className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{text}</div>
        </div>
      </div>
    </button>
  );
}

function IdentitySection({ isOwner, workspace, name, setName, uploadingAvatar, avatarInputRef, handleAvatarUpload }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4 rounded-2xl border bg-muted/30 p-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={workspace.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <ImageIcon className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-medium text-sm">Foto do workspace</div>
          <div className="text-xs text-muted-foreground">JPG, PNG ou WebP • máximo 2MB</div>
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
            {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
            Alterar
          </Button>
        )}
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome do workspace</Label>
        <Input value={name} onChange={e => setName(e.target.value)} disabled={!isOwner} placeholder="Ex: Minha Empresa" maxLength={60} />
        <p className="text-xs text-muted-foreground">Esse nome aparece no seletor de workspaces e nas notificações do time.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</div>
          <div className="text-sm font-medium">{workspace.is_personal ? 'Workspace pessoal' : 'Workspace compartilhado'}</div>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Identificador</div>
          <div className="text-sm font-mono text-muted-foreground truncate">{workspace.id.slice(0, 8)}…</div>
        </div>
      </div>
    </div>
  );
}

function MembersSection({
  members, isOwner, creditMode, memberSearch, setMemberSearch, memberRoleFilter, setMemberRoleFilter,
  onUpdateLimit, onRemove, onTransferOwnership, totalActive, pendingCount, onGoInvites,
}: any) {
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9 h-10"
          />
        </div>
        <Select value={memberRoleFilter} onValueChange={(v: any) => setMemberRoleFilter(v)}>
          <SelectTrigger className="w-[170px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="owner">Apenas dono</SelectItem>
            <SelectItem value="member">Apenas membros</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled title="Em breve">
          <Download className="h-4 w-4 mr-2" /> Exportar
        </Button>
      </div>

      {/* Stats line */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {totalActive} ativos</Badge>
        <button onClick={onGoInvites} className="inline-flex">
          <Badge variant="outline" className="gap-1 hover:bg-muted cursor-pointer"><Clock className="h-3 w-3" /> {pendingCount} convites pendentes</Badge>
        </button>
      </div>

      {/* Members list */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-5">Membro</div>
          <div className="col-span-2">Papel</div>
          <div className="col-span-2 hidden md:block">Entrou em</div>
          <div className="col-span-2 hidden md:block">Uso / Limite</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>
        {members.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>
        )}
        {members.map((m: Member) => (
          <div key={m.id} className="grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-muted/30 transition-colors">
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                <AvatarFallback>{(m.profile?.name || m.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{m.profile?.name || '—'}</div>
                <div className="text-xs text-muted-foreground truncate">{m.profile?.email || m.email}</div>
              </div>
            </div>
            <div className="col-span-2">
              {m.role === 'owner'
                ? <Badge className="gap-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0"><Crown className="h-3 w-3" /> Dono</Badge>
                : <Badge variant="secondary">Membro</Badge>}
            </div>
            <div className="col-span-2 hidden md:block text-xs text-muted-foreground">
              {m.joined_at ? new Date(m.joined_at).toLocaleDateString('pt-BR') : '—'}
            </div>
            <div className="col-span-2 hidden md:block">
              {m.role === 'owner' ? (
                <span className="text-xs text-muted-foreground">Sem limite</span>
              ) : creditMode !== 'shared' ? (
                <span className="text-xs text-muted-foreground">Modo individual</span>
              ) : isOwner ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{m.credits_used_this_month} /</span>
                  <Input
                    type="number" min={0}
                    className="h-8 w-20"
                    defaultValue={m.monthly_credit_limit ?? 0}
                    onBlur={(e) => {
                      const v = e.target.value === '' ? 0 : Number(e.target.value);
                      if (v !== (m.monthly_credit_limit ?? 0)) onUpdateLimit(m.id, v);
                    }}
                  />
                </div>
              ) : (
                <span className="text-xs">{m.credits_used_this_month} / {m.monthly_credit_limit ?? 0}</span>
              )}
            </div>
            <div className="col-span-1 text-right">
              {isOwner && m.role !== 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.user_id && (
                      <DropdownMenuItem onClick={() => onTransferOwnership(m)}>
                        <ArrowRightLeft className="h-4 w-4 mr-2" /> Transferir propriedade
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRemove(m)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvitesSection({ invites, isOwner, onResend, onCancel, onInvite }: any) {
  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">Nenhum convite pendente</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">Convide alguém para começar a colaborar neste workspace.</p>
        {isOwner && (
          <Button onClick={onInvite} className="mt-5">
            <UserPlus className="h-4 w-4 mr-2" /> Convidar membro
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border overflow-hidden">
      {invites.map((i: Invite) => (
        <div key={i.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{i.email}</div>
            <div className="text-xs text-muted-foreground">
              Enviado em {new Date(i.created_at).toLocaleDateString('pt-BR')} · Expira em {new Date(i.expires_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>
          {isOwner && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onResend(i)} title="Reenviar">
                <Send className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onCancel(i.id)} title="Cancelar">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function CreditsSection({
  isOwner, creditMode, changeCreditMode, savingCredits, sharedCredits, totalSharedUsed,
  userCredits, transferAmount, setTransferAmount, transferring, transferToShared, members, planName, onGoCredits,
}: any) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard
          icon={Wallet}
          label={creditMode === 'shared' ? 'Saldo do workspace' : 'Seus créditos'}
          value={(creditMode === 'shared' ? sharedCredits : userCredits).toLocaleString('pt-BR')}
          tone="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Consumo no ciclo"
          value={creditMode === 'shared' ? totalSharedUsed : '—'}
          hint={creditMode === 'shared' ? 'Soma de todos os membros' : 'Modo individual'}
          tone="primary"
        />
        <StatCard icon={Sparkles} label="Plano atual" value={planName} hint="Renovação automática" />
      </div>

      <div className="rounded-2xl border p-5 space-y-3 max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Modo de créditos</Label>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Individual:</strong> cada pessoa usa os próprios créditos. <strong>Compartilhado:</strong> o workspace tem um saldo único usado pela equipe conforme o limite mensal.
            </p>
          </div>
          {savingCredits && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Select value={creditMode} onValueChange={(v: any) => changeCreditMode(v)} disabled={!isOwner || savingCredits}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Individual</SelectItem>
            <SelectItem value="shared">Compartilhado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {creditMode === 'shared' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {isOwner && (
            <div className="rounded-2xl border p-5 space-y-3">
              <div>
                <div className="font-medium text-sm">Transferir para o workspace</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Você tem <strong>{userCredits}</strong> créditos pessoais. O valor sai do seu saldo e fica guardado no workspace.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number" min={1} placeholder="Quantidade"
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

          <div className="rounded-2xl border p-5 space-y-3">
            <div className="font-medium text-sm">Consumo por membro neste ciclo</div>
            <div className="space-y-2">
              {members.filter((m: Member) => m.role !== 'owner').slice(0, 6).map((m: Member) => {
                const used = m.credits_used_this_month || 0;
                const limit = m.monthly_credit_limit || 0;
                const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{m.profile?.name || m.email}</span>
                      <span className="text-muted-foreground">{used} / {limit || '∞'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {members.filter((m: Member) => m.role !== 'owner').length === 0 && (
                <p className="text-xs text-muted-foreground">Sem outros membros para listar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onGoCredits} className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
          <Coins className="h-4 w-4 mr-2" /> Comprar mais créditos
        </Button>
        <Button variant="outline" onClick={onGoCredits}>
          <ExternalLink className="h-4 w-4 mr-2" /> Gerenciar plano
        </Button>
      </div>
    </div>
  );
}

function DangerSection({ isOwner, workspaceName }: { isOwner: boolean; workspaceName: string }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Ações irreversíveis</div>
            <p className="text-sm text-muted-foreground">
              As ações abaixo afetam permanentemente o workspace <strong>{workspaceName}</strong>. Tenha certeza antes de prosseguir.
            </p>
          </div>
        </div>
      </div>

      <DangerRow
        title="Sair do workspace"
        text="Você perde acesso a marcas, calendários e conteúdos deste workspace."
        cta="Sair"
        disabled={isOwner}
        disabledHint={isOwner ? 'Como dono, transfira a propriedade antes de sair.' : undefined}
      />
      <DangerRow
        title="Transferir propriedade"
        text="Repasse o controle do workspace para outro membro. Você passa a ser membro comum."
        cta="Transferir"
        disabled
        disabledHint="Use o menu de ações na lista de membros."
      />
      <DangerRow
        title="Arquivar workspace"
        text="O workspace fica somente leitura para todos os membros. Pode ser reativado depois."
        cta="Arquivar"
        disabled
        disabledHint="Em breve."
      />
      <DangerRow
        title="Excluir workspace"
        text="Remove o workspace e todos os dados associados. Esta ação não pode ser desfeita."
        cta="Excluir"
        destructive
        disabled
        disabledHint="Em breve."
      />
    </div>
  );
}

function DangerRow({ title, text, cta, destructive, disabled, disabledHint }:
  { title: string; text: string; cta: string; destructive?: boolean; disabled?: boolean; disabledHint?: string }) {
  return (
    <div className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
        {disabledHint && <div className="text-[11px] text-muted-foreground mt-1 italic">{disabledHint}</div>}
      </div>
      <Button
        variant={destructive ? 'destructive' : 'outline'}
        size="sm"
        disabled={disabled}
      >
        {cta}
      </Button>
    </div>
  );
}
