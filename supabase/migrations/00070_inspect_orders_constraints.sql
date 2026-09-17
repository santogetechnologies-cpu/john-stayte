-- Create temporary or persistent diagnostic function to inspect orders constraints
CREATE OR REPLACE FUNCTION public.get_orders_table_constraints()
RETURNS TABLE (
  constraint_name TEXT,
  constraint_type TEXT,
  constraint_definition TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    conname::text AS constraint_name,
    contype::text AS constraint_type,
    pg_get_constraintdef(oid)::text AS constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass;
$$;
