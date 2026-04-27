-- ============================================
-- CONTENT CALENDARS: agrupa pautas de conteúdo
-- ============================================
CREATE TABLE public.content_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  brand_id UUID,
  persona_id UUID,
  theme_id UUID,
  user_input TEXT, -- briefing livre que o usuário escreveu ao criar
  reference_month DATE, -- mês de referência do calendário
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  ai_context JSONB DEFAULT '{}'::jsonb, -- contexto/raw da geração
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team calendars"
ON public.content_calendars FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create calendars"
ON public.content_calendars FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team calendars"
ON public.content_calendars FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team calendars"
ON public.content_calendars FOR DELETE
USING (public.can_access_resource(user_id, team_id));

CREATE INDEX idx_content_calendars_user ON public.content_calendars(user_id);
CREATE INDEX idx_content_calendars_team ON public.content_calendars(team_id);
CREATE INDEX idx_content_calendars_brand ON public.content_calendars(brand_id);

CREATE TRIGGER update_content_calendars_updated_at
BEFORE UPDATE ON public.content_calendars
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CALENDAR ITEMS: cada pauta dentro de um calendário
-- ============================================
-- stage values:
--   'calendar'  : pauta criada, aguardando ir pra briefing (check inicial)
--   'briefing'  : em criação/ajuste de briefing (texto + imagem)
--   'design'    : briefing aprovado, designer criando imagem
--   'review'    : imagem criada, em revisão final
--   'done'      : fluxo concluído

CREATE TABLE public.calendar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.content_calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_id UUID,
  title TEXT NOT NULL,
  theme TEXT, -- editoria/tema sugerido
  scheduled_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'calendar',
  calendar_approved BOOLEAN NOT NULL DEFAULT false, -- check da etapa 1
  text_briefing TEXT,
  image_briefing TEXT,
  briefing_approved BOOLEAN NOT NULL DEFAULT false, -- check da etapa 2
  briefing_approved_by UUID,
  briefing_approved_at TIMESTAMPTZ,
  design_action_id UUID, -- link para a action gerada na etapa de design
  design_approved BOOLEAN NOT NULL DEFAULT false, -- check da etapa 3
  final_approved BOOLEAN NOT NULL DEFAULT false, -- check da etapa 4
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team calendar items"
ON public.calendar_items FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create calendar items"
ON public.calendar_items FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team calendar items"
ON public.calendar_items FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team calendar items"
ON public.calendar_items FOR DELETE
USING (public.can_access_resource(user_id, team_id));

CREATE INDEX idx_calendar_items_calendar ON public.calendar_items(calendar_id);
CREATE INDEX idx_calendar_items_user ON public.calendar_items(user_id);
CREATE INDEX idx_calendar_items_team ON public.calendar_items(team_id);
CREATE INDEX idx_calendar_items_stage ON public.calendar_items(stage);

CREATE TRIGGER update_calendar_items_updated_at
BEFORE UPDATE ON public.calendar_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();