import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "content_approve",
  title: "Aprovar conteúdo",
  description: "Marca um conteúdo como aprovado.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("actions").update({ approved: true }).eq("id", id).select("id, approved").maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Conteúdo não encontrado ou sem permissão.")
        : ok(data, "Conteúdo aprovado.");
    return withAudit(ctx, { toolName: "content_approve", action: "approve", resourceType: "action", resourceId: id }, result);
  },
});
