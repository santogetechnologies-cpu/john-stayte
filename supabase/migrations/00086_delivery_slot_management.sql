-- ====================================================================
-- JOHN STAYTE SERVICES - DELIVERY SLOT MANAGEMENT MODULE
-- Migration: 00086_delivery_slot_management.sql
-- ====================================================================

-- 1. Create delivery_slots Table
CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 12 CHECK (capacity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  operating_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6], -- 0=Sun, 1=Mon, ..., 6=Sat
  slot_type TEXT NOT NULL DEFAULT 'both' CHECK (slot_type IN ('delivery', 'pickup', 'both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create delivery_slot_closures Table for Date Closures & Overrides
CREATE TABLE IF NOT EXISTS public.delivery_slot_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.delivery_slots(id) ON DELETE CASCADE, -- NULL means all slots closed on that date
  closure_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Depot Closed / Holiday',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_slot_date_closure UNIQUE NULLS NOT DISTINCT (slot_id, closure_date)
);

-- 3. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_delivery_slots_active ON public.delivery_slots(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_delivery_slot_closures_date ON public.delivery_slot_closures(closure_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_slot ON public.orders(delivery_slot);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_slot ON public.delivery_assignments(time_slot);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slot_closures ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- delivery_slots: Public Read (Customers booking orders must view slots); Admin/Manager Write
DROP POLICY IF EXISTS "Allow public read access to delivery_slots" ON public.delivery_slots;
CREATE POLICY "Allow public read access to delivery_slots"
  ON public.delivery_slots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin/manager write access to delivery_slots" ON public.delivery_slots;
CREATE POLICY "Allow admin/manager write access to delivery_slots"
  ON public.delivery_slots FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- delivery_slot_closures: Public Read; Admin/Manager Write
DROP POLICY IF EXISTS "Allow public read access to delivery_slot_closures" ON public.delivery_slot_closures;
CREATE POLICY "Allow public read access to delivery_slot_closures"
  ON public.delivery_slot_closures FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin/manager write access to delivery_slot_closures" ON public.delivery_slot_closures;
CREATE POLICY "Allow admin/manager write access to delivery_slot_closures"
  ON public.delivery_slot_closures FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- 6. Seed Default Initial Time Slots (Idempotent)
INSERT INTO public.delivery_slots (slot_name, start_time, end_time, capacity, is_active, operating_days, slot_type, sort_order)
SELECT 'Morning Window (08:00 - 12:00)', '08:00', '12:00', 12, true, ARRAY[1, 2, 3, 4, 5, 6], 'both', 1
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_slots WHERE start_time = '08:00' AND end_time = '12:00');

INSERT INTO public.delivery_slots (slot_name, start_time, end_time, capacity, is_active, operating_days, slot_type, sort_order)
SELECT 'Afternoon Window (12:00 - 16:00)', '12:00', '16:00', 12, true, ARRAY[1, 2, 3, 4, 5, 6], 'both', 2
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_slots WHERE start_time = '12:00' AND end_time = '16:00');

INSERT INTO public.delivery_slots (slot_name, start_time, end_time, capacity, is_active, operating_days, slot_type, sort_order)
SELECT 'Evening Window (16:00 - 19:00)', '16:00', '19:00', 8, true, ARRAY[1, 2, 3, 4, 5, 6], 'both', 3
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_slots WHERE start_time = '16:00' AND end_time = '19:00');

-- 7. Real-Time Slot Availability & Capacity RPC
-- Calculates capacity based on active orders, operating days, and closures
CREATE OR REPLACE FUNCTION public.get_delivery_slots_availability(
  target_date DATE,
  check_type TEXT DEFAULT 'delivery'
)
RETURNS TABLE (
  id UUID,
  slot_name TEXT,
  start_time TEXT,
  end_time TEXT,
  capacity INTEGER,
  is_active BOOLEAN,
  operating_days INTEGER[],
  slot_type TEXT,
  sort_order INTEGER,
  is_operating_day BOOLEAN,
  is_closed BOOLEAN,
  closure_reason TEXT,
  booked_count INTEGER,
  remaining_capacity INTEGER,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_dow INTEGER;
BEGIN
  -- Extract day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  v_dow := EXTRACT(DOW FROM target_date)::INTEGER;

  RETURN QUERY
  SELECT 
    s.id,
    s.slot_name,
    s.start_time,
    s.end_time,
    s.capacity,
    s.is_active,
    s.operating_days,
    s.slot_type,
    s.sort_order,
    -- Operating day check
    (v_dow = ANY(s.operating_days)) AS is_operating_day,
    -- Closure check (specific slot closure or whole-day closure)
    EXISTS (
      SELECT 1 FROM public.delivery_slot_closures c
      WHERE c.closure_date = target_date
        AND (c.slot_id = s.id OR c.slot_id IS NULL)
    ) AS is_closed,
    -- Closure reason
    (
      SELECT c.reason FROM public.delivery_slot_closures c
      WHERE c.closure_date = target_date
        AND (c.slot_id = s.id OR c.slot_id IS NULL)
      LIMIT 1
    ) AS closure_reason,
    -- Booked count from active orders (excludes cancelled orders to release capacity)
    COALESCE(
      (
        SELECT count(DISTINCT o.id)::INTEGER
        FROM public.orders o
        WHERE o.delivery_date = target_date
          AND (
            o.delivery_slot = s.slot_name
            OR o.delivery_slot ILIKE ('%' || s.start_time || '%')
            OR (o.delivery_address->>'delivery_slot') = s.slot_name
            OR (o.delivery_address->>'delivery_slot') ILIKE ('%' || s.start_time || '%')
          )
          AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'returned')
          AND LOWER(COALESCE(o.payment_status, '')) NOT IN ('cancelled')
      ), 0
    ) AS booked_count,
    -- Remaining capacity
    GREATEST(
      0,
      s.capacity - COALESCE(
        (
          SELECT count(DISTINCT o.id)::INTEGER
          FROM public.orders o
          WHERE o.delivery_date = target_date
            AND (
              o.delivery_slot = s.slot_name
              OR o.delivery_slot ILIKE ('%' || s.start_time || '%')
              OR (o.delivery_address->>'delivery_slot') = s.slot_name
              OR (o.delivery_address->>'delivery_slot') ILIKE ('%' || s.start_time || '%')
            )
            AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'returned')
            AND LOWER(COALESCE(o.payment_status, '')) NOT IN ('cancelled')
        ), 0
      )
    ) AS remaining_capacity,
    -- Available boolean
    (
      s.is_active = true
      AND (v_dow = ANY(s.operating_days))
      AND NOT EXISTS (
        SELECT 1 FROM public.delivery_slot_closures c
        WHERE c.closure_date = target_date
          AND (c.slot_id = s.id OR c.slot_id IS NULL)
      )
      AND (
        s.capacity - COALESCE(
          (
            SELECT count(DISTINCT o.id)::INTEGER
            FROM public.orders o
            WHERE o.delivery_date = target_date
              AND (
                o.delivery_slot = s.slot_name
                OR o.delivery_slot ILIKE ('%' || s.start_time || '%')
                OR (o.delivery_address->>'delivery_slot') = s.slot_name
                OR (o.delivery_address->>'delivery_slot') ILIKE ('%' || s.start_time || '%')
              )
              AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'returned')
              AND LOWER(COALESCE(o.payment_status, '')) NOT IN ('cancelled')
          ), 0
        )
      ) > 0
    ) AS is_available
  FROM public.delivery_slots s
  WHERE (check_type = 'both' OR s.slot_type = 'both' OR s.slot_type = check_type)
  ORDER BY s.sort_order ASC, s.start_time ASC;
END;
$$;

-- 8. Atomic Booking Validation Function
-- Called during order placement to guarantee capacity is not exceeded concurrently
CREATE OR REPLACE FUNCTION public.validate_delivery_slot_booking(
  target_slot_name TEXT,
  target_date DATE,
  exclude_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_slot RECORD;
  v_dow INTEGER;
  v_is_closed BOOLEAN;
  v_closure_reason TEXT;
  v_booked INTEGER;
  v_remaining INTEGER;
BEGIN
  -- 1. Find slot record by name or time
  SELECT * INTO v_slot
  FROM public.delivery_slots
  WHERE slot_name = target_slot_name
     OR target_slot_name ILIKE ('%' || start_time || '%')
  LIMIT 1;

  IF v_slot.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'INVALID_SLOT',
      'message', 'Selected delivery time slot does not exist.'
    );
  END IF;

  -- 2. Check if active
  IF NOT v_slot.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'SLOT_INACTIVE',
      'message', 'This delivery slot has been disabled by operations.'
    );
  END IF;

  -- 3. Check operating day
  v_dow := EXTRACT(DOW FROM target_date)::INTEGER;
  IF NOT (v_dow = ANY(v_slot.operating_days)) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'NON_OPERATING_DAY',
      'message', 'Delivery is not scheduled on this day of the week for this time slot.'
    );
  END IF;

  -- 4. Check date closures
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_slot_closures c
    WHERE c.closure_date = target_date
      AND (c.slot_id = v_slot.id OR c.slot_id IS NULL)
  ), (
    SELECT c.reason FROM public.delivery_slot_closures c
    WHERE c.closure_date = target_date
      AND (c.slot_id = v_slot.id OR c.slot_id IS NULL)
    LIMIT 1
  ) INTO v_is_closed, v_closure_reason;

  IF v_is_closed THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'SLOT_CLOSED',
      'message', COALESCE(v_closure_reason, 'Delivery is unavailable on this date.')
    );
  END IF;

  -- 5. Count active bookings
  SELECT count(DISTINCT o.id)::INTEGER INTO v_booked
  FROM public.orders o
  WHERE o.delivery_date = target_date
    AND (
      o.delivery_slot = v_slot.slot_name
      OR o.delivery_slot ILIKE ('%' || v_slot.start_time || '%')
      OR (o.delivery_address->>'delivery_slot') = v_slot.slot_name
      OR (o.delivery_address->>'delivery_slot') ILIKE ('%' || v_slot.start_time || '%')
    )
    AND (exclude_order_id IS NULL OR o.id <> exclude_order_id)
    AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'returned')
    AND LOWER(COALESCE(o.payment_status, '')) NOT IN ('cancelled');

  v_remaining := v_slot.capacity - v_booked;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'FULLY_BOOKED',
      'slot_name', v_slot.slot_name,
      'capacity', v_slot.capacity,
      'booked', v_booked,
      'remaining', 0,
      'message', 'This delivery slot is fully booked for ' || to_char(target_date, 'DD Mon YYYY') || '. Please select another time window.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'slot_id', v_slot.id,
    'slot_name', v_slot.slot_name,
    'capacity', v_slot.capacity,
    'booked', v_booked,
    'remaining', v_remaining,
    'message', 'Slot is available.'
  );
END;
$$;

-- 9. Function for Admin to Inspect Confirmed Bookings per Slot and Date
CREATE OR REPLACE FUNCTION public.get_slot_confirmed_bookings(
  target_slot_id UUID,
  target_date DATE
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  order_status TEXT,
  payment_status TEXT,
  total NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Security check: Admin or Manager only
  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Unauthorized: Access restricted to administrators and managers.';
  END IF;

  SELECT * INTO v_slot FROM public.delivery_slots WHERE id = target_slot_id;
  IF v_slot.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    COALESCE(
      o.delivery_address->>'street',
      o.delivery_address->>'address',
      o.delivery_address::TEXT
    ) AS delivery_address,
    o.status AS order_status,
    o.payment_status,
    o.total,
    o.created_at
  FROM public.orders o
  WHERE o.delivery_date = target_date
    AND (
      o.delivery_slot = v_slot.slot_name
      OR o.delivery_slot ILIKE ('%' || v_slot.start_time || '%')
      OR (o.delivery_address->>'delivery_slot') = v_slot.slot_name
      OR (o.delivery_address->>'delivery_slot') ILIKE ('%' || v_slot.start_time || '%')
    )
    AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'returned')
  ORDER BY o.created_at DESC;
END;
$$;
