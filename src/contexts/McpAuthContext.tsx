import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

// Cliente Supabase ISOLADO — não persiste sessão nem interfere com o cliente
// principal do app (`@/integrations/supabase/client`). Existe apenas para o
// painel de teste em /mcp-docs.
const supabaseTest = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: "mcp-docs-test",
    },
  },
);

type McpAuthState = {
  session: Session | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
};

const McpAuthContext = createContext<McpAuthState | null>(null);

export function McpAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const value = useMemo<McpAuthState>(
    () => ({
      session,
      token: session?.access_token ?? null,
      async signIn(email, password) {
        const { data, error } = await supabaseTest.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.session) {
          return { error: error?.message ?? "Não foi possível autenticar." };
        }
        setSession(data.session);
        return { error: null };
      },
      signOut() {
        setSession(null);
        // Não chamamos signOut do supabaseTest — a sessão nunca foi persistida.
      },
    }),
    [session],
  );

  return <McpAuthContext.Provider value={value}>{children}</McpAuthContext.Provider>;
}

export function useMcpAuth(): McpAuthState {
  const ctx = useContext(McpAuthContext);
  if (!ctx) throw new Error("useMcpAuth deve ser usado dentro de <McpAuthProvider>");
  return ctx;
}
