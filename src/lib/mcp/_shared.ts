import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Cliente Supabase escopado ao usuário autenticado.
 * Todas as políticas RLS são aplicadas como o usuário — nunca use service role aqui.
 */
export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function newRequestId(): string {
  // crypto.randomUUID exists in Deno + modern Node
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Envelope de sucesso padronizado.
 */
export function ok(
  data: unknown,
  message?: string,
  meta?: Record<string, unknown>,
): ToolResult {
  const requestId = newRequestId();
  const timestamp = new Date().toISOString();
  const summary =
    message ??
    (typeof data === "object" && data !== null
      ? JSON.stringify(data).slice(0, 800)
      : String(data));
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: {
      success: true,
      data,
      requestId,
      timestamp,
      ...(meta ?? {}),
    },
  };
}

/**
 * Envelope de erro padronizado.
 */
export function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ToolResult {
  const requestId = newRequestId();
  const timestamp = new Date().toISOString();
  return {
    content: [{ type: "text", text: `${code}: ${message}` }],
    structuredContent: {
      success: false,
      error: { code, message, ...(details ?? {}) },
      requestId,
      timestamp,
    },
    isError: true,
  };
}

/**
 * Requer autenticação. Retorna userId ou um ToolResult de erro.
 */
export function requireAuth(ctx: ToolContext): string | ToolResult {
  if (!ctx.isAuthenticated()) {
    return fail("unauthenticated", "Autenticação necessária.");
  }
  const uid = ctx.getUserId();
  if (!uid) return fail("unauthenticated", "Usuário não identificado.");
  return uid;
}

/**
 * Requer papel de administrador de sistema. Retorna userId ou ToolResult de erro.
 */
export async function requireSystemAdmin(
  ctx: ToolContext,
): Promise<string | ToolResult> {
  const uid = requireAuth(ctx);
  if (typeof uid !== "string") return uid;
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: uid,
    _role: "system",
  });
  if (error) return fail("permission_check_failed", error.message);
  if (!data) return fail("forbidden", "Requer papel de administrador de sistema.");
  return uid;
}

/**
 * Registra uma operação no log de auditoria. Falhas de escrita são silenciosas
 * (não devem impedir a resposta ao cliente), mas são logadas via console.
 */
export async function audit(
  ctx: ToolContext,
  params: {
    toolName: string;
    action: string;
    resourceType?: string;
    resourceId?: string | null;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const uid = ctx.getUserId();
    if (!uid) return;
    const supabase = supabaseForUser(ctx);
    await supabase.from("mcp_audit_log").insert({
      user_id: uid,
      tool_name: params.toolName,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      success: params.success,
      error_code: params.errorCode ?? null,
      error_message: params.errorMessage ?? null,
      client_id: ctx.getClientId?.() ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    // Auditoria nunca deve quebrar a resposta.
    console.warn("[mcp:audit] falha ao gravar auditoria", e);
  }
}

/**
 * Wrapper que executa uma escrita e escreve auditoria. Retorna o ToolResult.
 */
export async function withAudit(
  ctx: ToolContext,
  meta: {
    toolName: string;
    action: string;
    resourceType?: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  },
  result: ToolResult,
): Promise<ToolResult> {
  const success = !result.isError;
  const err = success
    ? undefined
    : (result.structuredContent?.error as
        | { code?: string; message?: string }
        | undefined);
  await audit(ctx, {
    ...meta,
    success,
    errorCode: err?.code,
    errorMessage: err?.message,
  });
  return result;
}

/**
 * Paginação padrão.
 */
export const PAGINATION_MAX = 100;
export const PAGINATION_DEFAULT = 20;

/**
 * Sanitiza um objeto removendo chaves sensíveis conhecidas.
 */
export function stripSensitive<T extends Record<string, unknown>>(row: T): T {
  const clone = { ...row };
  const DROP = [
    "password",
    "password_hash",
    "stripe_customer_id",
    "stripe_subscription_id",
    "force_password_change",
    "password_reset_sent_at",
  ];
  for (const key of DROP) delete (clone as Record<string, unknown>)[key];
  return clone;
}
