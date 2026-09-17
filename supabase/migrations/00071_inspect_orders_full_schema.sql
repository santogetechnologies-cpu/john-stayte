CREATE OR REPLACE FUNCTION public.get_orders_table_schema_info()
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  column_default TEXT,
  is_nullable TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    column_default::text,
    is_nullable::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders';
$$;

CREATE OR REPLACE FUNCTION public.get_orders_triggers()
RETURNS TABLE (
  trigger_name TEXT,
  event_manipulation TEXT,
  action_statement TEXT,
  action_orientation TEXT,
  action_timing TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    trigger_name::text,
    event_manipulation::text,
    action_statement::text,
    action_orientation::text,
    action_timing::text
  FROM information_schema.triggers
  WHERE event_object_schema = 'public' AND event_object_table = 'orders';
$$;
