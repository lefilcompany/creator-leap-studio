import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { CreatorLogo } from "@/components/CreatorLogo";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string };
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

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
        setError("Parâmetro authorization_id ausente.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
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
    setError(null);
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

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-6 border border-border/40">
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Não foi possível carregar esta autorização
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "esse aplicativo";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-6 border border-border/40">
        <div className="flex items-center gap-3 mb-4">
          <CreatorLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Conectar {clientName} ao Creator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Isso permite que {clientName} use as ferramentas do Creator agindo como você.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 border border-border/40 p-3 mb-4 space-y-1.5 text-sm">
          <p className="text-foreground">
            <span className="text-muted-foreground">Ao aprovar, {clientName} poderá:</span>
          </p>
          <ul className="list-disc list-inside text-foreground space-y-0.5 text-sm">
            <li>Consultar seu saldo de créditos.</li>
            <li>Listar suas marcas.</li>
            <li>Listar seus conteúdos recentes.</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            As políticas de acesso do Creator continuam valendo — nada além disso será exposto.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Cancelar conexão
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Aprovar
          </Button>
        </div>
      </div>
    </main>
  );
}
