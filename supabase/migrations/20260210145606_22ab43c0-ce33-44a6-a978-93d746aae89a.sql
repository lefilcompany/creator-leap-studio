
CREATE OR REPLACE FUNCTION public.get_action_summaries(
  p_team_id uuid,
  p_brand_filter uuid DEFAULT NULL,
  p_type_filter text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
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
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.id,
    a.type,
    a.created_at,
    a.approved,
    a.brand_id,
    b.name as brand_name,
    COALESCE(a.result->>'imageUrl', a.result->>'originalImage') as image_url,
    COALESCE(a.result->>'title', a.result->>'description') as title,
    a.details->>'platform' as platform,
    a.details->>'objective' as objective,
    COUNT(*) OVER() as total_count
  FROM actions a
  LEFT JOIN brands b ON a.brand_id = b.id
  WHERE a.team_id = p_team_id
    AND (p_brand_filter IS NULL OR a.brand_id = p_brand_filter)
    AND (p_type_filter IS NULL OR a.type = p_type_filter)
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
