import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Cria um cliente Supabase autenticado como o usuário do MCP.
 * O token OAuth vem no ctx e é encaminhado no header Authorization,
 * de modo que RLS aplica normalmente.
 *
 * Import-safe: lê env apenas quando a função é chamada (dentro do handler).
 */
export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated" }],
    isError: true,
  };
}

export function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function okResult<T>(data: T, key: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: { [key]: data } as Record<string, T>,
  };
}
