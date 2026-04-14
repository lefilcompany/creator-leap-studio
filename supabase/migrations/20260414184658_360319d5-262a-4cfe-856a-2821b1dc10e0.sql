
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_history;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_presence_history;
  END IF;
END $$;
