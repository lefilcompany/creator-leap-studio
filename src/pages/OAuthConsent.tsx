import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Loader2 } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace
type OAuthClient = {
  name?: string;
  client_name?: string;
  redirect_uri?: string;
  redirect_uris?: string[];
};
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [account, setAccount] = useState<{ email?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Solicitação de autorização inválida (authorization_id ausente).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        try {
          window.localStorage.setItem("auth_return_url", next);
        } catch {
          // ignore
        }
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setAccount({ email: sess.session.user.email ?? undefined });
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
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
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
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
  }

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "um aplicativo";
  const redirectUri = details?.client?.redirect_uri ?? details?.client?.redirect_uris?.[0];
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  const scopeLabel = (s: string) => {
    if (s === "openid") return "Verificar sua identidade";
    if (s === "email") return "Compartilhar seu e-mail";
    if (s === "profile") return "Compartilhar seu perfil básico";
    return `Permissão adicional: ${s}`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-center"><CreatorLogo /></div>

        {error ? (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-semibold">Não foi possível carregar</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>Voltar</Button>
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando solicitação…</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold">Conectar {clientName} à sua conta Creator</h1>
              <p className="text-sm text-muted-foreground">
                Isto permite que {clientName} use as ferramentas do Creator como você.
              </p>
            </div>

            {account?.email && (
              <div className="text-xs text-center text-muted-foreground">
                Conectado como <span className="font-medium text-foreground">{account.email}</span>
              </div>
            )}

            {redirectUri && (
              <div className="rounded-lg border p-3 text-xs break-all">
                <div className="text-muted-foreground mb-1">Redirecionará para:</div>
                <div className="font-mono">{redirectUri}</div>
              </div>
            )}

            {scopes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permissões solicitadas</div>
                <ul className="space-y-1 text-sm">
                  {scopes.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="text-primary">•</span><span>{scopeLabel(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Isto não substitui as permissões e políticas de segurança do Creator.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
