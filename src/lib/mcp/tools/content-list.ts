import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAGINATION_DEFAULT, PAGINATION_MAX, fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "content_list",
  title: "Listar conteúdos",
  description:
    "Lista conteúdos gerados (imagens, vídeos, textos, carrosséis) acessíveis ao usuário. Suporta filtros por marca, tipo, aprovado, incluir/excluir arquivados, e paginação.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    type: z.string().max(64).optional(),
    approved: z.boolean().optional(),
    include_archived: z.boolean().default(false),
    only_root: z.boolean().default(true).describe("Apenas ações raiz (sem parent_action_id)."),
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, type, approved, include_archived, only_root, limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("actions")
      .select("id, type, status, approved, brand_id, parent_action_id, created_at, deleted_at, brands(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (!include_archived) q = q.is("deleted_at", null);
    if (only_root) q = q.is("parent_action_id", null);
    if (brand_id) q = q.eq("brand_id", brand_id);
    if (type) q = q.eq("type", type);
    if (approved !== undefined) q = q.eq("approved", approved);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok({ items: data ?? [], total: count ?? 0, limit, offset }, `${data?.length ?? 0} conteúdo(s).`);
  },
});
