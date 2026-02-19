import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateReturnUrl } from '@/lib/auth-urls';

export function useOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (isProcessing.current) return;

      const hash = window.location.hash;
      const code = searchParams.get('code');
      const hasHashToken = hash.includes('access_token');
      const hasHashError = hash.includes('error=');

      console.log('[OAuth] Callback check:', {
        origin: window.location.origin,
        hasHashToken,
        hasHashError,
        hasCode: !!code,
        hash: hasHashError ? hash : (hash ? hash.substring(0, 50) + '...' : '(empty)'),
        pathname: window.location.pathname,
      });

      // Handle OAuth errors in hash BEFORE processing tokens
      if (hasHashError) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const error = hashParams.get('error') || 'unknown_error';
        const errorDescription = hashParams.get('error_description') || '';

        console.error('[OAuth] Callback error detected in hash:', {
          error,
          errorDescription,
          origin: window.location.origin,
          fullHash: hash,
        });

        // Map error to user-friendly message
        let userMessage: string;
        if (error === 'access_denied') {
          userMessage = 'Acesso negado. Você cancelou a autorização ou não tem permissão.';
        } else if (errorDescription.includes('failed to exchange authorization code')) {
          userMessage = 'Falha ao trocar o código de autorização. Verifique se o redirect URI está configurado corretamente.';
        } else {
          userMessage = errorDescription
            ? `Erro na autenticação: ${decodeURIComponent(errorDescription)}`
            : 'Ocorreu um erro durante a autenticação com Google. Tente novamente.';
        }

        toast.error(userMessage);

        // Clean hash to prevent reprocessing
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      // No OAuth signal detected - skip
      if (!hasHashToken && !code) {
        return;
      }

      isProcessing.current = true;

      try {
        let session = null;

        // Strategy 1: If there's a code param (PKCE flow), exchange it
        if (code) {
          console.log('[OAuth] Exchanging code for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[OAuth] Code exchange failed:', error.message);
          } else {
            session = data.session;
            console.log('[OAuth] Code exchange successful, user:', session?.user?.email);
          }
        }

        // Strategy 2: If hash has access_token (implicit flow) or code exchange succeeded,
        // Supabase auto-detects hash tokens via onAuthStateChange, so just get the session
        if (!session) {
          // Wait briefly for Supabase to process hash tokens
          if (hasHashToken) {
            console.log('[OAuth] Hash token detected, waiting for Supabase to process...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[OAuth] getSession error:', error.message);
          } else {
            session = data.session;
          }
        }

        // Final check: do we have a valid session?
        if (!session) {
          console.error('[OAuth] No valid session after callback processing');
          toast.error("Não foi possível obter a sessão. Tente fazer login novamente.");
          isProcessing.current = false;
          return;
        }

        console.log('[OAuth] Session obtained:', {
          userId: session.user.id,
          email: session.user.email,
          hasAccessToken: !!session.access_token,
          hasRefreshToken: !!session.refresh_token,
        });

        // Fetch user profile with retry
        let profile = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('team_id, name, email')
            .eq('id', session.user.id)
            .single();

          if (!error && data) {
            profile = data;
            break;
          }

          if (attempt === 0) {
            console.warn('[OAuth] Profile fetch failed, retrying in 1.5s...', error?.message);
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            console.error('[OAuth] Profile fetch failed after retry:', error?.message);
          }
        }

        if (!profile) {
          // Profile might still be creating via trigger - don't sign out, redirect to dashboard
          console.warn('[OAuth] Profile not found, redirecting to dashboard anyway');
          toast.success('Bem-vindo(a)!');
          navigate('/dashboard', { replace: true });
          return;
        }

        if (!profile.team_id) {
          console.log('[OAuth] User has no team, showing team dialog');
          setShowTeamDialog(true);
        } else {
          const destination = validateReturnUrl(searchParams.get('returnUrl'));
          console.log('[OAuth] Redirecting to:', destination);
          toast.success(`Bem-vindo(a), ${profile.name}!`);
          navigate(destination, { replace: true });
        }
      } catch (error) {
        console.error('[OAuth] Callback error:', error);
        toast.error("Ocorreu um erro durante a autenticação. Tente novamente.");
        navigate('/', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams]);

  const handleTeamDialogClose = () => {
    setShowTeamDialog(false);
    navigate('/dashboard', { replace: true });
  };

  return {
    showTeamDialog,
    handleTeamDialogClose,
  };
}
