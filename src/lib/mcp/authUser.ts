import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve o auth.uid() do token que o MCP recebeu — necessário para
 * preencher `user_id` em inserts (RLS exige `user_id = auth.uid()`).
 */
export async function getAuthUserId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error("Não foi possível resolver o usuário autenticado");
  }
  return data.user.id;
}
