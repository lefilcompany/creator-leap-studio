CREATE OR REPLACE FUNCTION public.get_action_summaries(
  p_team_id uuid,
  p_brand_filter uuid DEFAULT NULL::uuid,
  p_type_filter text DEFAULT NULL::text,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  type text,
  created_at timestamp with time zone,
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;