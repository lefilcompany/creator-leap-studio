import { useState } from "react";
import { Loader2, LogOut, Copy, Check, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMcpAuth } from "@/contexts/McpAuthContext";

export function AuthPanel() {
  const { session, token, signIn, signOut } = useMcpAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const expiresLabel = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString("pt-BR")
    : null;

  const maskedToken = token
    ? `${token.slice(0, 12)}…${token.slice(-8)}`
    : "";

  const userName =
    (session?.user?.user_metadata?.name as string | undefined) ??
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    session?.user?.email ??
    "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <KeyRound className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Gerar token de teste</h3>
          <p className="text-xs text-muted-foreground">
            Faça login com sua conta do Creator para preencher o Bearer token
            automaticamente no playground abaixo.
          </p>
        </div>
      </div>

      {session ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <p className="font-medium">Autenticado como</p>
              <p className="text-muted-foreground">{userName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono truncate">{maskedToken}</code>
              <Button variant="ghost" size="sm" onClick={copyToken}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </>
                )}
              </Button>
            </div>
            {expiresLabel ? (
              <p className="text-xs text-muted-foreground">
                Expira em <strong>{expiresLabel}</strong>
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Este token corresponde à sua sessão real. Não compartilhe. Use apenas para testes nesta página.
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando…
              </>
            ) : (
              "Entrar e gerar token"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
