import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import logoCreatorPreta from '@/assets/logoCreatorPreta.png';
import logoCreatorBranca from '@/assets/logoCreatorBranca.png';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X, Camera, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Check, Users, Coins, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (workspaceId: string) => void;
}

type Step = 1 | 2 | 3;

export function CreateWorkspaceWizard({ open, onClose, onCreated }: Props) {
  const { user, refreshProfile } = useAuth();
  const { reload, switchWorkspace } = useWorkspace();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [creditMode, setCreditMode] = useState<'personal' | 'shared'>('personal');
  const [initialTransfer, setInitialTransfer] = useState<number | ''>('');
  const [defaultMemberLimit, setDefaultMemberLimit] = useState<number | ''>(0);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(
    () => (name || 'W').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
    [name]
  );

  const reset = () => {
    setStep(1);
    setName('');
    setAvatarFile(null);
    setAvatarPreview(null);
    setCreditMode('personal');
    setInitialTransfer('');
    setDefaultMemberLimit(0);
    setSubmitting(false);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Selecione uma imagem válida');
    if (f.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB');
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const canContinue1 = name.trim().length >= 2;
  const userCredits = user?.credits ?? 0;
  const transferAmt = initialTransfer === '' ? 0 : Number(initialTransfer);
  const canContinue2 =
    creditMode === 'personal' ||
    (transferAmt >= 0 && transferAmt <= userCredits && (defaultMemberLimit === '' || Number(defaultMemberLimit) >= 0));

  const submit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    let workspaceId: string | null = null;
    try {
      // 1) Create workspace
      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          owner_id: user.id,
          is_personal: false,
          credit_mode: creditMode,
        })
        .select('id')
        .single();
      if (wsErr) throw wsErr;
      workspaceId = ws.id as string;

      // 2) Owner membership
      const { error: memErr } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });
      if (memErr) throw memErr;

      // 3) Avatar upload (best-effort)
      if (avatarFile) {
        try {
          const ext = avatarFile.name.split('.').pop() || 'png';
          const path = `${workspaceId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('workspace-avatars')
            .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('workspace-avatars').getPublicUrl(path);
            await supabase.from('workspaces').update({ avatar_url: publicUrl }).eq('id', workspaceId);
          }
        } catch (e) {
          console.warn('avatar upload failed', e);
        }
      }

      // 4) Initial transfer (shared mode only)
      if (creditMode === 'shared' && transferAmt > 0) {
        const { error: trErr } = await supabase.rpc('workspace_transfer_personal_to_shared', {
          p_workspace_id: workspaceId,
          p_amount: transferAmt,
        });
        if (trErr) {
          toast.warning(`Workspace criado, mas a transferência falhou: ${trErr.message}`);
        }
      }

      // 5) Set as current workspace
      await supabase.from('profiles').update({ current_workspace_id: workspaceId }).eq('id', user.id);

      await refreshProfile();
      await reload();
      await switchWorkspace(workspaceId);

      toast.success('Workspace criado!');
      onCreated?.(workspaceId);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao criar workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const { theme } = useTheme();
  const logo = theme === 'dark' ? logoCreatorBranca : logoCreatorPreta;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const stepsMeta = [
    { n: 1, label: 'Identidade', desc: 'Nome e foto do workspace' },
    { n: 2, label: 'Créditos', desc: 'Modelo e limites' },
    { n: 3, label: 'Confirmar', desc: 'Ajustar e criar' },
  ] as const;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top: close button only */}
      <div className="flex items-center justify-end px-8 pt-6 pb-2 shrink-0">
        <button
          onClick={close}
          disabled={submitting}
          className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body: vertical stepper (left) + conveyor content (right) */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] gap-8 px-8 pb-4">
        {/* Vertical stepper */}
        <aside className="flex flex-col justify-center gap-6">
          <img src={logo} alt="Creator" className="h-10 w-auto self-start pl-1" />
          <ol className="space-y-2">

            {stepsMeta.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <li key={s.n} className="relative flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold border-2 transition-all duration-300 shrink-0',
                        active && 'bg-primary border-primary text-primary-foreground scale-110 shadow-md',
                        done && 'bg-primary border-primary text-primary-foreground',
                        !active && !done && 'border-muted-foreground/30 text-muted-foreground bg-card'
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : s.n}
                    </div>
                    {i < stepsMeta.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 flex-1 my-1 min-h-8 rounded transition-colors duration-300',
                          done ? 'bg-primary' : 'bg-muted-foreground/20'
                        )}
                      />
                    )}
                  </div>
                  <div className="pt-1">
                    <div className={cn(
                      'text-sm font-semibold transition-colors',
                      active ? 'text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground'
                    )}>
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Nav controls below steps */}
          <div className="flex flex-col gap-2 pl-1">
            <Button
              variant="outline"
              size="lg"
              className="justify-start gap-2"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={submitting || step === 1}
              aria-label="Etapa anterior"
            >
              <ChevronUp className="h-4 w-4" />
              Etapa anterior
            </Button>

            {step < 3 ? (
              <Button
                size="lg"
                className="justify-start gap-2"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={(step === 1 && !canContinue1) || (step === 2 && !canContinue2)}
                aria-label="Próxima etapa"
              >
                <ChevronDown className="h-4 w-4" />
                Próxima etapa
              </Button>
            ) : (
              <Button
                size="lg"
                className="justify-start gap-2"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>
                ) : (
                  <><Check className="h-4 w-4" /> Criar workspace</>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={close}
              disabled={submitting}
              className="justify-start text-muted-foreground"
            >
              Cancelar
            </Button>
          </div>
        </aside>

        {/* Conveyor content */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateY(-${(step - 1) * 100}%)` }}
          >
            {/* Step 1 */}
            <div className="h-full w-full flex items-center">
              <div className="w-full max-w-xl mx-auto space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Crie seu workspace</h1>
                  <p className="text-muted-foreground">
                    Um espaço para você colaborar com sua equipe e organizar marcas, conteúdos e calendários.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <Avatar className="h-20 w-20 border-4 border-card shadow-md">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {avatarFile ? 'Trocar foto' : 'Adicionar foto'}
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ws-name">Nome do workspace</Label>
                  <Input
                    id="ws-name"
                    autoFocus
                    placeholder="Ex: Agência Lefil, Time Marketing..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canContinue1 && setStep(2)}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 2 caracteres. Você pode mudar depois.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="h-full w-full flex items-center">
              <div className="w-full max-w-xl mx-auto space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Como os créditos funcionam aqui?</h1>
                  <p className="text-muted-foreground">
                    Escolha o modelo que mais combina com a forma como sua equipe trabalha.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCreditMode('personal')}
                    className={cn(
                      'text-left rounded-2xl border-2 p-5 transition-all bg-card hover:shadow-md',
                      creditMode === 'personal' ? 'border-primary shadow-md' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Individuais</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cada membro usa os próprios créditos. Sem transferências, sem limites para configurar.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditMode('shared')}
                    className={cn(
                      'text-left rounded-2xl border-2 p-5 transition-all bg-card hover:shadow-md',
                      creditMode === 'shared' ? 'border-primary shadow-md' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Compartilhados</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você disponibiliza créditos para o workspace e define quanto cada membro pode gastar por mês.
                    </p>
                  </button>
                </div>

                {creditMode === 'shared' && (
                  <div className="grid sm:grid-cols-2 gap-4 rounded-2xl border bg-card p-5">
                    <div className="space-y-2">
                      <Label htmlFor="initial-transfer">Disponibilizar agora</Label>
                      <Input
                        id="initial-transfer"
                        type="number"
                        min={0}
                        max={userCredits}
                        placeholder="0"
                        value={initialTransfer}
                        onChange={(e) =>
                          setInitialTransfer(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Você tem <strong>{userCredits}</strong> disponíveis.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-limit">Limite mensal por membro</Label>
                      <Input
                        id="default-limit"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={defaultMemberLimit}
                        onChange={(e) =>
                          setDefaultMemberLimit(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Pode ajustar depois.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="h-full w-full flex items-center">
              <div className="w-full max-w-xl mx-auto space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Tudo certo?</h1>
                  <p className="text-muted-foreground">Confira os detalhes antes de criar.</p>
                </div>

                <div className="rounded-2xl border bg-card p-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{name}</div>
                      <div className="text-xs text-muted-foreground">Workspace de equipe</div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo de créditos</span>
                      <span className="font-medium">
                        {creditMode === 'personal' ? 'Individuais' : 'Compartilhados'}
                      </span>
                    </div>
                    {creditMode === 'shared' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disponibilizar agora</span>
                          <span className="font-medium">{transferAmt} créditos</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limite mensal por membro</span>
                          <span className="font-medium">
                            {defaultMemberLimit === '' ? 0 : Number(defaultMemberLimit)} créditos
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

