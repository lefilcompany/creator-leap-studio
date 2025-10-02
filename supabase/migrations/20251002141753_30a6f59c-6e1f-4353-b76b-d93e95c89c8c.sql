-- Adicionar campos faltantes na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT false;

-- Atualizar a função handle_new_user para salvar todos os campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, state, city, tutorial_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário Creator'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'city',
    COALESCE((NEW.raw_user_meta_data->>'tutorial_completed')::boolean, false)
  );
  RETURN NEW;
END;
$function$;