-- Bucket público para fontes
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-fonts', 'custom-fonts', true)
ON CONFLICT (id) DO NOTHING;

-- Tabela de metadados das fontes customizadas
CREATE TABLE IF NOT EXISTS public.custom_fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  family_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  format TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_fonts_user_id ON public.custom_fonts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_fonts_team_id ON public.custom_fonts(team_id);

ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team custom fonts"
ON public.custom_fonts
FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create custom fonts"
ON public.custom_fonts
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update custom fonts"
ON public.custom_fonts
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Owner can delete custom fonts"
ON public.custom_fonts
FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_custom_fonts_updated_at
BEFORE UPDATE ON public.custom_fonts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies para o bucket custom-fonts
CREATE POLICY "Custom fonts are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'custom-fonts');

CREATE POLICY "Users can upload own custom fonts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'custom-fonts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own custom fonts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'custom-fonts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own custom fonts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'custom-fonts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);