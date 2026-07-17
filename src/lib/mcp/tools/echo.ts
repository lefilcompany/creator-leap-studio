import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Simple echo tool for testing input handling from MCP clients.
export default defineTool({
  name: "echo",
  title: "Creator — Echo",
  description:
    "Echoes back the provided text along with the authenticated user id and a timestamp. Use this to verify that arguments flow correctly from the MCP client to the server.",
  inputSchema: {
    text: z.string().min(1).describe("Texto que será ecoado de volta."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ text }, ctx) => {
    const authed = ctx.isAuthenticated();
    const payload = {
      echoed: text,
      authenticated: authed,
      userId: authed ? ctx.getUserId() : null,
      timestamp: new Date().toISOString(),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
