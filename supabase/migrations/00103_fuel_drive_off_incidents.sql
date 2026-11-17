-- ==============================================================================
-- Migration: 00103_fuel_drive_off_incidents.sql
-- Description: Production-grade fuel drive-off incidents and payments system.
-- Security & Integrity Hardening:
--   1. Payment Status Preservation: Partial/full payments never overwrite active
--      'police_investigation' or 'disputed' incident statuses.
--   2. Payment Deletion Safety: Reversing a payment preserves active police investigation,
--      disputed, or written-off statuses instead of blindly resetting to 'unpaid'.
--   3. Immutability & WITH CHECK: Branch ID & Name cannot be mutated between forecourts;
--      strict WITH CHECK on UPDATE ensures branch staff cannot bypass isolation.
--   4. Universal Branch ID Compatibility: Exact matching against assigned_branch_id,
--      assigned_branch, auto_gas_stations, and stations without fuzzy ILIKE leakage.
--   5. Atomic Concurrency Lock: Row-level lock (FOR UPDATE) prevents payment race conditions.
--   6. Overpayment Prevention: Rejects any payment exceeding outstanding balance.
-- ==============================================================================

-- 1. Create Enums idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drive_off_status') THEN
    CREATE TYPE public.drive_off_status AS ENUM (
      'unpaid',
      'partial_payment',
      'paid',
      'police_investigation',
      'written_off',
      'disputed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drive_off_incident_type') THEN
    CREATE TYPE public.drive_off_incident_type AS ENUM (
      'drive_off',
      'no_means_to_pay'
    );
  END IF;
END $$;

-- 2. Create Incidents Table
CREATE TABLE IF NOT EXISTS public.fuel_drive_off_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  
  -- Station & Pump Details
  branch_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  pump_number INTEGER NOT NULL CHECK (pump_number > 0),
  
  -- Date & Timestamps
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_time TIME NOT NULL DEFAULT CURRENT_TIME,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Vehicle Information
  vehicle_registration_number TEXT NOT NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_colour TEXT,
  
  -- Fuel & Financials
  fuel_type TEXT NOT NULL,
  litres_dispensed NUMERIC(8, 2) NOT NULL CHECK (litres_dispensed > 0),
  price_per_litre NUMERIC(6, 3) NOT NULL CHECK (price_per_litre > 0),
  total_amount_due NUMERIC(10, 2) NOT NULL CHECK (total_amount_due > 0),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  balance_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance_remaining >= 0),
  
  -- Classification & Status
  incident_type public.drive_off_incident_type NOT NULL DEFAULT 'drive_off',
  status public.drive_off_status NOT NULL DEFAULT 'unpaid',
  
  -- Evidence & Police
  cctv_image_url TEXT,
  cctv_footage_timestamp TEXT,
  police_crime_reference TEXT,
  police_constabulary TEXT DEFAULT 'Gloucestershire Constabulary',
  
  -- Offender / Customer details (if NMTP declaration provided)
  driver_name TEXT,
  driver_contact_phone TEXT,
  driver_address TEXT,
  
  -- Notes & Creator Info
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Guard: amount_paid cannot exceed total_amount_due
  CONSTRAINT chk_amount_paid_within_total CHECK (amount_paid <= total_amount_due)
);

-- 3. Create Payments Sub-Table
CREATE TABLE IF NOT EXISTS public.fuel_drive_off_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.fuel_drive_off_incidents(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL, -- 'Cash', 'Card', 'BACS', 'Online'
  receipt_reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Initial Incident Balance Calculation Trigger (for new incidents)
CREATE OR REPLACE FUNCTION public.calculate_initial_drive_off_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance_remaining IS NULL OR NEW.balance_remaining = 0.00 THEN
    NEW.balance_remaining := GREATEST(0.00, ROUND(NEW.total_amount_due - COALESCE(NEW.amount_paid, 0.00), 2));
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_initial_drive_off_balance ON public.fuel_drive_off_incidents;
CREATE TRIGGER trg_calculate_initial_drive_off_balance
  BEFORE INSERT ON public.fuel_drive_off_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_initial_drive_off_balance();

-- 5. Forecourt Immutability Trigger (Prevents moving incidents between branches)
CREATE OR REPLACE FUNCTION public.protect_fuel_drive_off_branch_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.branch_id IS DISTINCT FROM NEW.branch_id OR OLD.branch_name IS DISTINCT FROM NEW.branch_name) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: branch_id and branch_name are immutable and cannot be moved between forecourt stations.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_fuel_drive_off_branch_immutability ON public.fuel_drive_off_incidents;
CREATE TRIGGER trg_protect_fuel_drive_off_branch_immutability
  BEFORE UPDATE ON public.fuel_drive_off_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fuel_drive_off_branch_immutability();

-- 6. Atomic Payment Processing Trigger with Row Lock (Preserves Investigation & Dispute Statuses)
CREATE OR REPLACE FUNCTION public.process_fuel_drive_off_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC(10, 2);
  v_already_paid NUMERIC(10, 2);
  v_current_balance NUMERIC(10, 2);
  v_current_status public.drive_off_status;
  v_new_paid NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
  v_new_status public.drive_off_status;
BEGIN
  -- Row-lock the parent incident record to prevent race conditions from concurrent payments
  SELECT total_amount_due, amount_paid, balance_remaining, status
  INTO v_total, v_already_paid, v_current_balance, v_current_status
  FROM public.fuel_drive_off_incidents
  WHERE id = NEW.incident_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drive-off incident with ID % does not exist.', NEW.incident_id;
  END IF;

  -- Validate payment amount does not exceed the current outstanding balance
  IF NEW.amount > v_current_balance THEN
    RAISE EXCEPTION 'Payment of £% exceeds the outstanding incident balance of £%.',
      ROUND(NEW.amount, 2), ROUND(v_current_balance, 2);
  END IF;

  -- Calculate updated amounts
  v_new_paid := ROUND(v_already_paid + NEW.amount, 2);
  v_new_balance := GREATEST(0.00, ROUND(v_total - v_new_paid, 2));

  -- Status Determination:
  -- If currently under police investigation, dispute, or written off, PRESERVE that status
  -- during both partial and full payments!
  -- Accurate payment tracking is maintained via amount_paid and balance_remaining.
  IF v_current_status IN ('police_investigation', 'disputed', 'written_off') THEN
    v_new_status := v_current_status;
  ELSIF v_new_balance = 0.00 THEN
    v_new_status := 'paid'::public.drive_off_status;
  ELSE
    v_new_status := 'partial_payment'::public.drive_off_status;
  END IF;

  -- Atomically update the incident record
  UPDATE public.fuel_drive_off_incidents
  SET amount_paid = v_new_paid,
      balance_remaining = v_new_balance,
      status = v_new_status,
      updated_at = NOW()
  WHERE id = NEW.incident_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_fuel_drive_off_payment ON public.fuel_drive_off_payments;
CREATE TRIGGER trg_process_fuel_drive_off_payment
  BEFORE INSERT ON public.fuel_drive_off_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_fuel_drive_off_payment();

-- 7. Payment Deletion / Refund Recalculation Trigger (Safely Preserves Non-Payment Statuses)
CREATE OR REPLACE FUNCTION public.recalculate_drive_off_after_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC(10, 2);
  v_total_due NUMERIC(10, 2);
  v_balance NUMERIC(10, 2);
  v_current_status public.drive_off_status;
  v_status public.drive_off_status;
BEGIN
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
  FROM public.fuel_drive_off_payments
  WHERE incident_id = OLD.incident_id;

  SELECT total_amount_due, status INTO v_total_due, v_current_status
  FROM public.fuel_drive_off_incidents
  WHERE id = OLD.incident_id;

  v_balance := GREATEST(0.00, ROUND(v_total_due - v_total_paid, 2));

  -- Preserve active police investigation, disputed, or written-off statuses!
  IF v_current_status IN ('police_investigation', 'disputed', 'written_off') THEN
    v_status := v_current_status;
  ELSIF v_total_paid >= v_total_due AND v_total_due > 0 THEN
    v_status := 'paid'::public.drive_off_status;
  ELSIF v_total_paid > 0 THEN
    v_status := 'partial_payment'::public.drive_off_status;
  ELSE
    v_status := 'unpaid'::public.drive_off_status;
  END IF;

  UPDATE public.fuel_drive_off_incidents
  SET amount_paid = v_total_paid,
      balance_remaining = v_balance,
      status = v_status,
      updated_at = NOW()
  WHERE id = OLD.incident_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_drive_off_after_payment_delete ON public.fuel_drive_off_payments;
CREATE TRIGGER trg_recalculate_drive_off_after_payment_delete
  AFTER DELETE ON public.fuel_drive_off_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_drive_off_after_payment_delete();

-- 8. Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_drive_offs_branch ON public.fuel_drive_off_incidents(branch_id);
CREATE INDEX IF NOT EXISTS idx_drive_offs_vrn ON public.fuel_drive_off_incidents(vehicle_registration_number);
CREATE INDEX IF NOT EXISTS idx_drive_offs_status ON public.fuel_drive_off_incidents(status);
CREATE INDEX IF NOT EXISTS idx_drive_offs_occurred_at ON public.fuel_drive_off_incidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_drive_off_payments_incident ON public.fuel_drive_off_payments(incident_id);

-- 9. Enable Row-Level Security
ALTER TABLE public.fuel_drive_off_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_drive_off_payments ENABLE ROW LEVEL SECURITY;

-- 10. Hardened Incidents Policies (Exact multi-source branch compatibility & WITH CHECK)

-- SELECT: Admins & Managers can view all incidents
DROP POLICY IF EXISTS "Admins and Managers can view all incidents" ON public.fuel_drive_off_incidents;
CREATE POLICY "Admins and Managers can view all incidents"
  ON public.fuel_drive_off_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- SELECT: Branch staff can ONLY view incidents at their assigned forecourt
DROP POLICY IF EXISTS "Branch staff can view branch incidents" ON public.fuel_drive_off_incidents;
CREATE POLICY "Branch staff can view branch incidents"
  ON public.fuel_drive_off_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'branch_staff'
      AND p.assigned_branch IS NOT NULL
      AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
      AND (
        (p.assigned_branch_id IS NOT NULL AND fuel_drive_off_incidents.branch_id = p.assigned_branch_id::text)
        OR (fuel_drive_off_incidents.branch_id = p.assigned_branch)
        OR (LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(p.assigned_branch)))
        OR (
          p.assigned_branch_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.auto_gas_stations ags
            WHERE ags.id = p.assigned_branch_id
            AND (
              LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(ags.name))
              OR fuel_drive_off_incidents.branch_id = ags.slug
            )
          )
        )
      )
    )
  );

-- INSERT: Admin, Manager, and Branch Staff (strictly scoped to their branch)
DROP POLICY IF EXISTS "Authorized staff can insert incidents" ON public.fuel_drive_off_incidents;
CREATE POLICY "Authorized staff can insert incidents"
  ON public.fuel_drive_off_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager')
        OR (
          p.role = 'branch_staff'
          AND p.assigned_branch IS NOT NULL
          AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
          AND (
            (p.assigned_branch_id IS NOT NULL AND fuel_drive_off_incidents.branch_id = p.assigned_branch_id::text)
            OR (fuel_drive_off_incidents.branch_id = p.assigned_branch)
            OR (LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(p.assigned_branch)))
            OR (
              p.assigned_branch_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.auto_gas_stations ags
                WHERE ags.id = p.assigned_branch_id
                AND (
                  LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(ags.name))
                  OR fuel_drive_off_incidents.branch_id = ags.slug
                )
              )
            )
          )
        )
      )
    )
  );

-- UPDATE: Admin, Manager, and Branch Staff (with WITH CHECK preventing branch leakage)
DROP POLICY IF EXISTS "Authorized staff can update incidents" ON public.fuel_drive_off_incidents;
CREATE POLICY "Authorized staff can update incidents"
  ON public.fuel_drive_off_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager')
        OR (
          p.role = 'branch_staff'
          AND p.assigned_branch IS NOT NULL
          AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
          AND (
            (p.assigned_branch_id IS NOT NULL AND fuel_drive_off_incidents.branch_id = p.assigned_branch_id::text)
            OR (fuel_drive_off_incidents.branch_id = p.assigned_branch)
            OR (LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(p.assigned_branch)))
            OR (
              p.assigned_branch_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.auto_gas_stations ags
                WHERE ags.id = p.assigned_branch_id
                AND (
                  LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(ags.name))
                  OR fuel_drive_off_incidents.branch_id = ags.slug
                )
              )
            )
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager')
        OR (
          p.role = 'branch_staff'
          AND p.assigned_branch IS NOT NULL
          AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
          AND (
            (p.assigned_branch_id IS NOT NULL AND fuel_drive_off_incidents.branch_id = p.assigned_branch_id::text)
            OR (fuel_drive_off_incidents.branch_id = p.assigned_branch)
            OR (LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(p.assigned_branch)))
            OR (
              p.assigned_branch_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.auto_gas_stations ags
                WHERE ags.id = p.assigned_branch_id
                AND (
                  LOWER(TRIM(fuel_drive_off_incidents.branch_name)) = LOWER(TRIM(ags.name))
                  OR fuel_drive_off_incidents.branch_id = ags.slug
                )
              )
            )
          )
        )
      )
    )
  );

-- DELETE: Only Admin can delete incidents
DROP POLICY IF EXISTS "Only Admin can delete incidents" ON public.fuel_drive_off_incidents;
CREATE POLICY "Only Admin can delete incidents"
  ON public.fuel_drive_off_incidents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 11. Hardened Payments Policies

DROP POLICY IF EXISTS "Staff can view payments" ON public.fuel_drive_off_payments;
CREATE POLICY "Staff can view payments"
  ON public.fuel_drive_off_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager')
        OR (
          p.role = 'branch_staff'
          AND p.assigned_branch IS NOT NULL
          AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
          AND EXISTS (
            SELECT 1 FROM public.fuel_drive_off_incidents i
            WHERE i.id = fuel_drive_off_payments.incident_id
            AND (
              (p.assigned_branch_id IS NOT NULL AND i.branch_id = p.assigned_branch_id::text)
              OR (i.branch_id = p.assigned_branch)
              OR (LOWER(TRIM(i.branch_name)) = LOWER(TRIM(p.assigned_branch)))
              OR (
                p.assigned_branch_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM public.auto_gas_stations ags
                  WHERE ags.id = p.assigned_branch_id
                  AND (
                    LOWER(TRIM(i.branch_name)) = LOWER(TRIM(ags.name))
                    OR i.branch_id = ags.slug
                  )
                )
              )
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff can insert payments" ON public.fuel_drive_off_payments;
CREATE POLICY "Staff can insert payments"
  ON public.fuel_drive_off_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'manager')
        OR (
          p.role = 'branch_staff'
          AND p.assigned_branch IS NOT NULL
          AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
          AND EXISTS (
            SELECT 1 FROM public.fuel_drive_off_incidents i
            WHERE i.id = fuel_drive_off_payments.incident_id
            AND (
              (p.assigned_branch_id IS NOT NULL AND i.branch_id = p.assigned_branch_id::text)
              OR (i.branch_id = p.assigned_branch)
              OR (LOWER(TRIM(i.branch_name)) = LOWER(TRIM(p.assigned_branch)))
              OR (
                p.assigned_branch_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM public.auto_gas_stations ags
                  WHERE ags.id = p.assigned_branch_id
                  AND (
                    LOWER(TRIM(i.branch_name)) = LOWER(TRIM(ags.name))
                    OR i.branch_id = ags.slug
                  )
                )
              )
            )
          )
        )
      )
    )
  );

-- 12. Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fuel_drive_off_incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_drive_off_incidents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fuel_drive_off_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_drive_off_payments;
  END IF;
END $$;

ALTER TABLE public.fuel_drive_off_incidents REPLICA IDENTITY FULL;
ALTER TABLE public.fuel_drive_off_payments REPLICA IDENTITY FULL;

