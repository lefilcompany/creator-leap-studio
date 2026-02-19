import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateReturnUrl } from '@/lib/auth-urls';

export function useOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (!accessToken || isProcessing) return;
      
      setIsProcessing(true);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session) {
          toast.error("Não foi possível obter a sessão do usuário.");
          setIsProcessing(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id, name, email')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('team_id, name, email')
            .eq('id', session.user.id)
            .single();

          if (retryError) {
            toast.error("Não foi possível carregar seus dados. Tente fazer login novamente.");
            await supabase.auth.signOut();
            navigate('/');
            setIsProcessing(false);
            return;
          }

          if (!retryProfile.team_id) {
            setShowTeamDialog(true);
          } else {
            const destination = validateReturnUrl(searchParams.get('returnUrl'));
            toast.success(`Bem-vindo(a), ${retryProfile.name}!`);
            navigate(destination);
          }
        } else {
          if (!profile.team_id) {
            setShowTeamDialog(true);
          } else {
            const destination = validateReturnUrl(searchParams.get('returnUrl'));
            toast.success(`Bem-vindo(a), ${profile.name}!`);
            navigate(destination);
          }
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error("Ocorreu um erro durante a autenticação. Tente novamente.");
        navigate('/');
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, isProcessing, searchParams]);

  const handleTeamDialogClose = () => {
    setShowTeamDialog(false);
    navigate('/dashboard');
  };

  return {
    showTeamDialog,
    handleTeamDialogClose,
  };
}
