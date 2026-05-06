import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X, Camera, ChevronRight, ChevronLeft, Check, Users, Coins, Building2 } from 'lucide-react';
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="max-w-none w-screen h-screen rounded-none p-0 border-0 bg-background flex flex-col gap-0 sm:rounded-none"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Novo workspace
          </div>
          <button
            onClick={close}
            disabled={submitting}
            className="rounded-full p-2 hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-8 pb-2 flex justify-center">
          <div className="flex items-center gap-3 w-full max-w-xl">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold border-2 transition-colors',
                    step >= n
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                {i < 2 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 rounded',
                      step > n ? 'bg-primary' : 'bg-muted-foreground/20'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-xl">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Crie seu workspace</h1>
                  <p className="text-muted-foreground">
                    Um espaço para você colaborar com sua equipe e organizar marcas, conteúdos e calendários.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 pt-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-card shadow-md">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="h-6 w-6 text-white" />
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
                    {avatarFile ? 'Trocar foto' : 'Adicionar foto (opcional)'}
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 2 caracteres. Você pode mudar depois.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
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
                    <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
                      Você disponibiliza créditos para o workspace e define quanto cada membro pode gastar por mês.
                    </p>
                  </button>
                </div>

                {creditMode === 'shared' && (
                  <div className="space-y-4 rounded-2xl border bg-card p-5">
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
                        Você tem <strong>{userCredits}</strong> créditos individuais disponíveis. Pode deixar em 0 e disponibilizar depois.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-limit">Limite mensal padrão por membro</Label>
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
                        Por padrão, novos membros começam com <strong>0</strong> e não conseguem gastar créditos do workspace até você liberar.
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Você pode ajustar tudo depois em Configurações do Workspace.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
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
                          <span className="text-muted-foreground">Limite mensal padrão por membro</span>
                          <span className="font-medium">
                            {defaultMemberLimit === '' ? 0 : Number(defaultMemberLimit)} créditos
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={step === 1 ? close : () => setStep((s) => (s - 1) as Step)}
            disabled={submitting}
          >
            {step === 1 ? 'Cancelar' : (<><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>)}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !canContinue1) || (step === 2 && !canContinue2)}
            >
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : 'Criar workspace'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
