
-- Add missing columns to actions table
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS thumb_path text,
  ADD COLUMN IF NOT EXISTS asset_path text;

-- Create index for cursor-based pagination performance
CREATE INDEX IF NOT EXISTS idx_actions_cursor 
  ON public.actions (created_at DESC, id DESC);

-- Create index on team_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_actions_team_id 
  ON public.actions (team_id);

-- Drop existing overloaded functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_action_summaries(uuid, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_action_summaries(uuid, uuid, text, integer, integer, timestamptz, uuid);

-- Recreate the function with cursor pagination and thumb_path support
CREATE OR REPLACE FUNCTION public.get_action_summaries(
  p_team_id uuid,
  p_brand_filter uuid DEFAULT NULL,
  p_type_filter text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  type text,
  created_at timestamptz,
  approved boolean,
  brand_id uuid,
  brand_name text,
  image_url text,
  title text,
  platform text,
  objective text,
  total_count bigint,
  thumb_path text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM actions a
  WHERE a.team_id = p_team_id
    AND (p_brand_filter IS NULL OR a.brand_id = p_brand_filter)
    AND (p_type_filter IS NULL OR a.type = p_type_filter);

  RETURN QUERY
  SELECT
    a.id,
    a.type,
    a.created_at,
    a.approved,
    a.brand_id,
    b.name as brand_name,
    CASE 
      WHEN a.thumb_path IS NOT NULL AND a.thumb_path != '' THEN NULL
      WHEN (a.result->>'imageUrl') IS NOT NULL THEN a.result->>'imageUrl'
      WHEN (a.result->>'originalImage') IS NOT NULL THEN a.result->>'originalImage'
      ELSE NULL
    END::text as image_url,
    COALESCE(a.result->>'title', a.result->>'description')::text as title,
    (a.details->>'platform')::text as platform,
    (a.details->>'objective')::text as objective,
    v_total as total_count,
    a.thumb_path
  FROM actions a
  LEFT JOIN brands b ON a.brand_id = b.id
  WHERE a.team_id = p_team_id
    AND (p_brand_filter IS NULL OR a.brand_id = p_brand_filter)
    AND (p_type_filter IS NULL OR a.type = p_type_filter)
    AND (
      p_cursor_created_at IS NULL
      OR a.created_at < p_cursor_created_at
      OR (a.created_at = p_cursor_created_at AND a.id < p_cursor_id)
    )
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT p_limit;
END;
$$;
