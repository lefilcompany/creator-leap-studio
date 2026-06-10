
-- 1) Tabela brand_templates
CREATE TABLE public.brand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  workspace_id uuid,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('pdf','png')),
  source_file_path text NOT NULL,
  preview_path text,
  clean_background_path text,
  width int,
  height int,
  text_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  logo_slot jsonb,
  font_assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','failed')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brand_templates_brand_active_idx
  ON public.brand_templates (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX brand_templates_workspace_idx ON public.brand_templates (workspace_id);
CREATE INDEX brand_templates_user_idx ON public.brand_templates (user_id);
CREATE INDEX brand_templates_deleted_at_idx ON public.brand_templates (deleted_at);

-- 2) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_templates TO authenticated;
GRANT ALL ON public.brand_templates TO service_role;

-- 3) RLS
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_templates_select" ON public.brand_templates
  FOR SELECT TO authenticated
  USING (
    public.can_access_workspace_resource(
      user_id,
      workspace_id,
      (SELECT team_id FROM public.brands WHERE id = brand_id)
    )
  );

CREATE POLICY "brand_templates_insert" ON public.brand_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_workspace_resource(
      user_id,
      workspace_id,
      (SELECT team_id FROM public.brands WHERE id = brand_id)
    )
  );

CREATE POLICY "brand_templates_update" ON public.brand_templates
  FOR UPDATE TO authenticated
  USING (
    public.can_access_workspace_resource(
      user_id,
      workspace_id,
      (SELECT team_id FROM public.brands WHERE id = brand_id)
    )
  )
  WITH CHECK (
    public.can_access_workspace_resource(
      user_id,
      workspace_id,
      (SELECT team_id FROM public.brands WHERE id = brand_id)
    )
  );

CREATE POLICY "brand_templates_delete" ON public.brand_templates
  FOR DELETE TO authenticated
  USING (
    public.can_access_workspace_resource(
      user_id,
      workspace_id,
      (SELECT team_id FROM public.brands WHERE id = brand_id)
    )
  );

-- 4) Triggers
CREATE TRIGGER brand_templates_set_workspace
  BEFORE INSERT ON public.brand_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id_from_user();

CREATE TRIGGER brand_templates_set_updated_at
  BEFORE UPDATE ON public.brand_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Limite de 10 templates ativos por marca
CREATE OR REPLACE FUNCTION public.enforce_brand_template_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO v_count
  FROM public.brand_templates
  WHERE brand_id = NEW.brand_id AND deleted_at IS NULL;
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 templates por marca atingido'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER brand_templates_enforce_limit
  BEFORE INSERT ON public.brand_templates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_brand_template_limit();

-- 6) Storage policies para bucket brand-templates
-- Path: {workspace_id}/{brand_id}/{template_id}/arquivo

CREATE POLICY "brand_templates_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-templates'
    AND public.is_workspace_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "brand_templates_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-templates'
    AND public.is_workspace_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "brand_templates_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brand-templates'
    AND public.is_workspace_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "brand_templates_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-templates'
    AND public.is_workspace_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
