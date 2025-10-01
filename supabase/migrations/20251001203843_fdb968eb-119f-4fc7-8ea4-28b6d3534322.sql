-- Add status column to actions table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'actions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.actions ADD COLUMN status text DEFAULT 'pending';
    
    -- Update existing records to have a status
    UPDATE public.actions SET status = 'completed' WHERE result IS NOT NULL;
  END IF;
END $$;