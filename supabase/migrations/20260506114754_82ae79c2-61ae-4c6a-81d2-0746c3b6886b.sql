
-- =============================================================
-- WORKSPACES — nova arquitetura colaborativa
-- =============================================================

-- 1) Tabelas principais

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  owner_id uuid NOT NULL,
  avatar_url text,
  is_personal boolean NOT NULL DEFAULT false,
  credit_mode text NOT NULL DEFAULT 'personal' CHECK (credit_mode IN ('personal','shared')),
  shared_credits integer NOT NULL DEFAULT 0,
  legacy_team_id uuid, -- mapeamento das equipes antigas
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_legacy_team ON public.workspaces(legacy_team_id);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active')),
  monthly_credit_limit integer,
  credits_used_this_month integer NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{
    "brands":{"view":true,"create":true,"edit":true,"delete":true},
    "content":{"view":true,"create":true},
    "history":{"view":true,"delete":true},
    "calendars":{"view":true,"create":true,"edit":true,"delete":true},
    "personas":{"view":true,"create":true,"edit":true,"delete":true},
    "themes":{"view":true,"create":true,"edit":true,"delete":true},
    "members":{"manage":false},
    "billing":{"manage":false}
  }'::jsonb,
  invited_by uuid,
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_members_user
  ON public.workspace_members(workspace_id, user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'member',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  monthly_credit_limit integer,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_ws ON public.workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);

-- 2) profiles: workspace ativo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_workspace_id uuid;

-- 3) workspace_id em todas as tabelas que usam team_id
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'actions','brands','personas','strategic_themes','content_briefings',
    'content_calendars','calendar_items','creation_feedback','agent_feedback',
    'brand_style_preferences','custom_fonts','action_categories','action_favorites',
    'notifications','text_style_templates','credit_history','credit_purchases'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_workspace ON public.%I(workspace_id)', t, t);
  END LOOP;
END $$;

-- 4) Trigger updated_at em workspaces / workspace_members
CREATE TRIGGER trg_workspaces_updated
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_workspace_resource(
  resource_user_id uuid,
  resource_workspace_id uuid,
  resource_team_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    resource_user_id = auth.uid()
    OR (resource_workspace_id IS NOT NULL AND public.is_workspace_member(resource_workspace_id, auth.uid()))
    OR (resource_team_id IS NOT NULL AND resource_team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))
$$;

-- Policies básicas para as novas tabelas
CREATE POLICY "Members can view own workspaces"
  ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update workspace"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete workspace"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid() AND is_personal = false);

CREATE POLICY "Members can view workspace_members"
  ON public.workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_owner(workspace_id, auth.uid())
  );

CREATE POLICY "Owner can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owner can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Owner or self can delete member"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owner can view invites"
  ON public.workspace_invites FOR SELECT
  USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Owner can create invites"
  ON public.workspace_invites FOR INSERT
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "Owner can delete invites"
  ON public.workspace_invites FOR DELETE
  USING (public.is_workspace_owner(workspace_id, auth.uid()));

-- 6) Trigger handle_new_user → cria workspace pessoal automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ws_id uuid;
  v_first_name text;
BEGIN
  INSERT INTO public.profiles (id, email, name, credits, plan_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    0,
    'free',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  v_first_name := split_part(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), ' ', 1);

  INSERT INTO public.workspaces (name, owner_id, is_personal, credit_mode)
  VALUES (v_first_name || ' workspace', NEW.id, true, 'personal')
  RETURNING id INTO v_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, joined_at)
  VALUES (v_ws_id, NEW.id, 'owner', 'active', now());

  UPDATE public.profiles SET current_workspace_id = v_ws_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 7) Migração de dados existentes
-- 7a) Para cada team existente, cria 1 workspace
INSERT INTO public.workspaces (name, owner_id, is_personal, credit_mode, legacy_team_id, created_at)
SELECT t.name, t.admin_id, false, 'personal', t.id, t.created_at
FROM public.teams t
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.legacy_team_id = t.id);

-- 7b) Adiciona owner como membro
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, joined_at)
SELECT w.id, w.owner_id, 'owner', 'active', now()
FROM public.workspaces w
WHERE w.legacy_team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
  );

-- 7c) Adiciona membros (profiles.team_id)
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, joined_at)
SELECT w.id, p.id, 'member', 'active', now()
FROM public.profiles p
JOIN public.workspaces w ON w.legacy_team_id = p.team_id
WHERE p.team_id IS NOT NULL
  AND p.id <> w.owner_id
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = p.id
  );

-- 7d) Cria workspace pessoal para todos os usuários
INSERT INTO public.workspaces (name, owner_id, is_personal, credit_mode)
SELECT split_part(COALESCE(p.name, p.email), ' ', 1) || ' workspace', p.id, true, 'personal'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_id = p.id AND w.is_personal = true
);

INSERT INTO public.workspace_members (workspace_id, user_id, role, status, joined_at)
SELECT w.id, w.owner_id, 'owner', 'active', now()
FROM public.workspaces w
WHERE w.is_personal = true
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
  );

-- 7e) Define current_workspace_id default = workspace pessoal
UPDATE public.profiles p
SET current_workspace_id = w.id
FROM public.workspaces w
WHERE w.owner_id = p.id
  AND w.is_personal = true
  AND p.current_workspace_id IS NULL;

-- 7f) Backfill workspace_id em todas as tabelas (usa workspace da equipe se houver, senão pessoal)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'actions','brands','personas','strategic_themes','content_briefings',
    'content_calendars','calendar_items','creation_feedback','agent_feedback',
    'brand_style_preferences','custom_fonts','action_categories','action_favorites',
    'notifications','text_style_templates','credit_history','credit_purchases'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Se a linha tem team_id, usa o workspace da equipe
    EXECUTE format($q$
      UPDATE public.%I r
      SET workspace_id = w.id
      FROM public.workspaces w
      WHERE r.workspace_id IS NULL
        AND r.team_id IS NOT NULL
        AND w.legacy_team_id = r.team_id
    $q$, t);

    -- Caso contrário, usa o workspace pessoal do user_id
    EXECUTE format($q$
      UPDATE public.%I r
      SET workspace_id = w.id
      FROM public.workspaces w
      WHERE r.workspace_id IS NULL
        AND w.owner_id = r.user_id
        AND w.is_personal = true
    $q$, t);
  END LOOP;
END $$;
