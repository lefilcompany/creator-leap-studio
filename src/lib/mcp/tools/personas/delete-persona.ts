import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "delete_persona",
  title: "Excluir persona",
  description: "Remove uma persona.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { error } = await supabaseForUser(ctx).from("personas").delete().eq("id", id);
    if (error) return errorResult(error.message);
    return okResult({ id, deleted: true }, "persona");
  },
});
