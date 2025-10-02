-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update existing team admin assignments to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT admin_id, 'admin'::app_role
FROM public.teams
WHERE admin_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Add trigger to automatically assign admin role when creating a team
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_team_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.admin_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created_assign_admin
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_on_team_creation();