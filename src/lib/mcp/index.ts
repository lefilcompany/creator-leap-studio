import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getProfileTool from "./tools/get-profile";
import listBrandsTool from "./tools/list-brands";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// Build it from the project ref, which Vite inlines as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creator-mcp",
  title: "Creator MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Creator app. Use `echo` to verify connectivity, `get_profile` to read the signed-in user's profile, and `list_brands` to list their brands.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, getProfileTool, listBrandsTool],
});
