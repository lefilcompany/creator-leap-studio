-- Drop the 7-param overload that causes PostgREST ambiguity
DROP FUNCTION IF EXISTS public.get_action_summaries(uuid, uuid, text, integer, integer, timestamptz, uuid);
