
-- Função que resolve o workspace ativo de um usuário
CREATE OR REPLACE FUNCTION public.get_user_active_workspace_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_workspace_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Trigger genérico: se workspace_id estiver NULL no insert, preenche com o workspace ativo do user_id
CREATE OR REPLACE FUNCTION public.set_workspace_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- tenta NEW.user_id, senão auth.uid()
  BEGIN
    v_user := NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  IF v_user IS NULL THEN
    v_user := auth.uid();
  END IF;

  IF v_user IS NOT NULL THEN
    NEW.workspace_id := public.get_user_active_workspace_id(v_user);
  END IF;

  RETURN NEW;
END;
$$;

-- Aplica trigger em todas as tabelas que possuem workspace_id
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'brands','personas','strategic_themes','actions','content_briefings',
    'content_calendars','calendar_items','action_categories','action_favorites',
    'custom_fonts','creation_feedback','agent_feedback','brand_style_preferences',
    'credit_history','credit_purchases','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_workspace_id ON public.%I;
       CREATE TRIGGER trg_set_workspace_id
       BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id_from_user();',
      t, t
    );
  END LOOP;
END $$;

-- Backfill: registros existentes sem workspace_id recebem o workspace pessoal do dono
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'brands','personas','strategic_themes','actions','content_briefings',
    'content_calendars','calendar_items','action_categories','action_favorites',
    'custom_fonts','creation_feedback','agent_feedback','brand_style_preferences',
    'credit_history','credit_purchases','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'UPDATE public.%I tgt
       SET workspace_id = w.id
       FROM public.workspaces w
       WHERE tgt.workspace_id IS NULL
         AND tgt.user_id = w.owner_id
         AND w.is_personal = true;',
      t
    );
  END LOOP;
END $$;
