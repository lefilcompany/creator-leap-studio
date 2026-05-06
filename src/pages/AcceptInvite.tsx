import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'invalid' | 'expired' | 'ready' | 'accepting' | 'done'>('loading');
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from('workspace_invites')
        .select('*, workspaces(name)')
        .eq('token', token)
        .maybeSingle();
      if (!data) return setStatus('invalid');
      if (data.accepted_at) return setStatus('done');
      if (new Date(data.expires_at) < new Date()) return setStatus('expired');
      setInvite(data);
      setStatus('ready');
    })();
  }, [token]);

  useEffect(() => {
    if (status !== 'ready' || isLoading) return;
    if (!isAuthenticated) {
      // Redireciona para auth com retorno após login
      navigate(`/?invite=${token}&mode=register&email=${encodeURIComponent(invite.email)}`, { replace: true });
    }
  }, [status, isAuthenticated, isLoading, navigate, invite, token]);

  const accept = async () => {
    setStatus('accepting');
    try {
      const { error } = await supabase.functions.invoke('workspace-accept-invite', { body: { token } });
      if (error) throw error;
      toast.success('Convite aceito!');
      navigate('/workspace');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao aceitar convite');
      setStatus('ready');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl p-8 shadow-xl max-w-md w-full text-center space-y-4">
        {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
        {status === 'invalid' && <p>Convite inválido.</p>}
        {status === 'expired' && <p>Este convite expirou.</p>}
        {status === 'done' && <p>Este convite já foi utilizado.</p>}
        {status === 'ready' && isAuthenticated && (
          <>
            <h1 className="text-2xl font-bold">Convite para workspace</h1>
            <p className="text-muted-foreground">
              Você foi convidado para entrar em <strong>{invite?.workspaces?.name}</strong>.
            </p>
            <Button onClick={accept} className="w-full">Aceitar convite</Button>
          </>
        )}
        {status === 'accepting' && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
      </div>
    </div>
  );
}
