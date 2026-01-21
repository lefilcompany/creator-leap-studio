-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own presence" ON public.user_presence_history;
DROP POLICY IF EXISTS "Users can view their own presence" ON public.user_presence_history;
DROP POLICY IF EXISTS "Users can update their own presence" ON public.user_presence_history;

-- Create proper RLS policies for user_presence_history
CREATE POLICY "Users can insert their own presence" 
ON public.user_presence_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own presence" 
ON public.user_presence_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" 
ON public.user_presence_history 
FOR UPDATE 
USING (auth.uid() = user_id);