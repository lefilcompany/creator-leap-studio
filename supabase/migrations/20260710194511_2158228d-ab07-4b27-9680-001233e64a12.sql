-- MCP audit log for write/admin operations
CREATE TABLE public.mcp_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  request_id TEXT,
  client_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_audit_log_user_id ON public.mcp_audit_log(user_id, created_at DESC);
CREATE INDEX idx_mcp_audit_log_tool ON public.mcp_audit_log(tool_name, created_at DESC);

GRANT SELECT, INSERT ON public.mcp_audit_log TO authenticated;
GRANT ALL ON public.mcp_audit_log TO service_role;

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own audit rows (server-side, via user-scoped client)
CREATE POLICY "Users can insert their own audit rows"
  ON public.mcp_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own audit rows
CREATE POLICY "Users can view their own audit rows"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- System admins can view all
CREATE POLICY "System admins can view all audit rows"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'system'));