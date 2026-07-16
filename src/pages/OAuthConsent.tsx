import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth consent page for Lovable-managed OAuth 2.1 server (MCP).
 * Mounted at /.lovable/oauth/consent — required by Supabase Auth.
 */

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = {
  name?: string;
  client_name?: string;
  redirect_uri?: string;
};
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function getOAuthApi(): OAuthApi {
  const oauth = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  if (!oauth?.getAuthorizationDetails || !oauth.approveAuthorization || !oauth.denyAuthorization) {
    throw new Error(
      "Cliente OAuth indisponível. Recarregue a página e tente conectar novamente.",
    );
  }
  return oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente na URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserva a URL completa de consentimento para o login voltar aqui.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await getOAuthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await getOAuthApi().approveAuthorization(authorizationId)
        : await getOAuthApi().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("O servidor de autorização não retornou uma URL de redirecionamento.");
        return;
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 space-y-4">
          <h1 className="text-xl font-semibold">Não foi possível carregar a autorização</h1>
          <p className="text-sm text-muted-foreground break-words">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "um aplicativo";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            Conectar {clientName} ao Creator
          </h1>
          <p className="text-sm text-muted-foreground">
            Isso permite que <strong>{clientName}</strong> chame ferramentas do Creator agindo
            como você. Suas políticas de acesso (RLS, equipe, créditos) continuam se aplicando.
          </p>
        </div>

        {details.client?.redirect_uri && (
          <div className="text-xs text-muted-foreground break-all">
            <span className="font-medium">Redirect:</span> {details.client.redirect_uri}
          </div>
        )}

        {details.scope && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Escopos solicitados:</span> {details.scope}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
          >
            Aprovar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium disabled:opacity-60"
          >
            Recusar
          </button>
        </div>
      </div>
    </main>
  );
}
