import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "delete_brand",
  title: "Excluir marca",
  description: "Remove uma marca definitivamente. A marca sai imediatamente da lista.",
  inputSchema: { id: z.string().uuid().describe("ID da marca.") },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { error } = await supabaseForUser(ctx).from("brands").delete().eq("id", id);
    if (error) return errorResult(error.message);
    return okResult({ id, deleted: true }, "brand");
  },
});
