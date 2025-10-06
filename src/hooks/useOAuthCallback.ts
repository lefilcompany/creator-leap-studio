import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useOAuthCallback() {
  const navigate = useNavigate();
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we're in an OAuth callback
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (!accessToken || isProcessing) return;
      
      setIsProcessing(true);

      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session) {
          toast({
            title: "Erro de autenticação",
            description: "Não foi possível obter a sessão do usuário.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        // Check if user has a profile and team
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id, name, email')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Profile might not exist yet, wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('team_id, name, email')
            .eq('id', session.user.id)
            .single();

          if (retryError) {
            toast({
              title: "Erro ao carregar perfil",
              description: "Não foi possível carregar seus dados. Tente fazer login novamente.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            navigate('/login');
            setIsProcessing(false);
            return;
          }

          if (!retryProfile.team_id) {
            setShowTeamDialog(true);
          } else {
            navigate('/dashboard');
          }
        } else {
          if (!profile.team_id) {
            setShowTeamDialog(true);
          } else {
            toast({
              title: "Login realizado com sucesso!",
              description: `Bem-vindo(a), ${profile.name}!`,
            });
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Erro no login",
          description: "Ocorreu um erro durante a autenticação. Tente novamente.",
          variant: "destructive",
        });
        navigate('/login');
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, isProcessing]);

  const handleTeamDialogClose = () => {
    setShowTeamDialog(false);
    navigate('/dashboard');
  };

  return {
    showTeamDialog,
    handleTeamDialogClose,
  };
}
