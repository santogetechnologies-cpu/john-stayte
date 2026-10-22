import { supabase } from "@/lib/supabase";

export interface DeliverySlotRecord {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  operating_days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  slot_type: "delivery" | "pickup" | "both";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliverySlotClosureRecord {
  id: string;
  slot_id: string | null;
  closure_date: string; // YYYY-MM-DD
  reason: string;
  created_at: string;
  slot_name?: string | null;
}

export interface SlotAvailabilityResult {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  operating_days: number[];
  slot_type: "delivery" | "pickup" | "both";
  sort_order: number;
  is_operating_day: boolean;
  is_closed: boolean;
  closure_reason: string | null;
  booked_count: number;
  remaining_capacity: number;
  is_available: boolean;
}

export interface ConfirmedBookingRecord {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  order_status: string;
  payment_status: string;
  total: number;
  created_at: string;
}

export interface CreateSlotInput {
  slot_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active?: boolean;
  operating_days?: number[];
  slot_type?: "delivery" | "pickup" | "both";
  sort_order?: number;
}

export interface UpdateSlotInput {
  slot_name?: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  is_active?: boolean;
  operating_days?: number[];
  slot_type?: "delivery" | "pickup" | "both";
  sort_order?: number;
}

export interface CreateClosureInput {
  slot_id?: string | null;
  closure_date: string; // YYYY-MM-DD
  reason: string;
}

/**
 * Fetch all configured delivery slots ordered by sort_order
 */
export async function getAllDeliverySlots(): Promise<DeliverySlotRecord[]> {
  const { data, error } = await (supabase.from("delivery_slots") as any)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[DeliverySlotService] Error fetching delivery slots:", error);
    throw new Error(error.message || "Failed to load delivery slots from database.");
  }

  return (data || []).map((s: any) => ({
    ...s,
    operating_days: Array.isArray(s.operating_days) ? s.operating_days : [1, 2, 3, 4, 5, 6],
  }));
}

/**
 * Create a new delivery slot in the database (Admin action)
 */
export async function createDeliverySlot(input: CreateSlotInput): Promise<DeliverySlotRecord> {
  const {
    slot_name,
    start_time,
    end_time,
    capacity,
    is_active = true,
    operating_days = [1, 2, 3, 4, 5, 6],
    slot_type = "both",
    sort_order = 0,
  } = input;

  if (!slot_name?.trim()) throw new Error("Slot name is required.");
  if (!start_time?.trim() || !end_time?.trim())
    throw new Error("Start and end times are required.");
  if (capacity < 0) throw new Error("Capacity must be a non-negative number.");

  const { data, error } = await (supabase.from("delivery_slots") as any)
    .insert([
      {
        slot_name: slot_name.trim(),
        start_time: start_time.trim(),
        end_time: end_time.trim(),
        capacity: Number(capacity),
        is_active: Boolean(is_active),
        operating_days,
        slot_type,
        sort_order: Number(sort_order),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("[DeliverySlotService] Create slot error:", error);
    throw new Error(error.message || "Failed to create delivery slot.");
  }

  return data;
}

/**
 * Update an existing delivery slot (Admin action)
 */
export async function updateDeliverySlot(
  id: string,
  input: UpdateSlotInput,
): Promise<DeliverySlotRecord> {
  if (!id) throw new Error("Slot ID is required for update.");

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.slot_name !== undefined) updates.slot_name = input.slot_name.trim();
  if (input.start_time !== undefined) updates.start_time = input.start_time.trim();
  if (input.end_time !== undefined) updates.end_time = input.end_time.trim();
  if (input.capacity !== undefined) updates.capacity = Number(input.capacity);
  if (input.is_active !== undefined) updates.is_active = Boolean(input.is_active);
  if (input.operating_days !== undefined) updates.operating_days = input.operating_days;
  if (input.slot_type !== undefined) updates.slot_type = input.slot_type;
  if (input.sort_order !== undefined) updates.sort_order = Number(input.sort_order);

  const { data, error } = await (supabase.from("delivery_slots") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[DeliverySlotService] Update slot error:", error);
    throw new Error(error.message || "Failed to update delivery slot.");
  }

  return data;
}

/**
 * Delete a delivery slot (Admin action)
 */
export async function deleteDeliverySlot(id: string): Promise<void> {
  if (!id) throw new Error("Slot ID is required for deletion.");

  const { error } = await (supabase.from("delivery_slots") as any).delete().eq("id", id);

  if (error) {
    console.error("[DeliverySlotService] Delete slot error:", error);
    throw new Error(error.message || "Failed to delete delivery slot.");
  }
}

/**
 * Fetch date closures
 */
export async function getSlotClosures(
  startDate?: string,
  endDate?: string,
): Promise<DeliverySlotClosureRecord[]> {
  let query = (supabase.from("delivery_slot_closures") as any)
    .select(
      `
      id,
      slot_id,
      closure_date,
      reason,
      created_at,
      delivery_slots ( slot_name )
    `,
    )
    .order("closure_date", { ascending: true });

  if (startDate) query = query.gte("closure_date", startDate);
  if (endDate) query = query.lte("closure_date", endDate);

  const { data, error } = await query;

  if (error) {
    console.error("[DeliverySlotService] Error fetching closures:", error);
    throw new Error(error.message || "Failed to fetch delivery slot closures.");
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    slot_id: c.slot_id,
    closure_date: c.closure_date,
    reason: c.reason,
    created_at: c.created_at,
    slot_name: c.delivery_slots?.slot_name || "All Slots (Depot Wide)",
  }));
}

/**
 * Add a slot closure for a specific date (Admin action)
 */
export async function addSlotClosure(
  input: CreateClosureInput,
): Promise<DeliverySlotClosureRecord> {
  const { slot_id = null, closure_date, reason } = input;

  if (!closure_date?.trim()) throw new Error("Closure date is required.");
  if (!reason?.trim()) throw new Error("Closure reason is required.");

  const { data, error } = await (supabase.from("delivery_slot_closures") as any)
    .insert([
      {
        slot_id: slot_id || null,
        closure_date: closure_date.trim(),
        reason: reason.trim(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("[DeliverySlotService] Add closure error:", error);
    throw new Error(error.message || "Failed to add date closure.");
  }

  return data;
}

/**
 * Delete a slot closure (Admin action)
 */
export async function deleteSlotClosure(id: string): Promise<void> {
  if (!id) throw new Error("Closure ID is required.");

  const { error } = await (supabase.from("delivery_slot_closures") as any).delete().eq("id", id);

  if (error) {
    console.error("[DeliverySlotService] Delete closure error:", error);
    throw new Error(error.message || "Failed to delete slot closure.");
  }
}

/**
 * Real-Time Slot Availability & Remaining Capacity calculation via RPC
 */
export async function getDeliverySlotsAvailability(
  targetDate: string,
  checkType: "delivery" | "pickup" | "both" = "delivery",
): Promise<SlotAvailabilityResult[]> {
  if (!targetDate) return [];

  const { data, error } = await supabase.rpc("get_delivery_slots_availability", {
    target_date: targetDate,
    check_type: checkType,
  });

  if (error) {
    console.error("[DeliverySlotService] RPC get_delivery_slots_availability error:", error);
    throw new Error(error.message || "Failed to calculate slot availability.");
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    slot_name: row.slot_name,
    start_time: row.start_time,
    end_time: row.end_time,
    capacity: Number(row.capacity),
    is_active: Boolean(row.is_active),
    operating_days: Array.isArray(row.operating_days) ? row.operating_days : [1, 2, 3, 4, 5, 6],
    slot_type: row.slot_type,
    sort_order: Number(row.sort_order),
    is_operating_day: Boolean(row.is_operating_day),
    is_closed: Boolean(row.is_closed),
    closure_reason: row.closure_reason || null,
    booked_count: Number(row.booked_count || 0),
    remaining_capacity: Number(row.remaining_capacity || 0),
    is_available: Boolean(row.is_available),
  }));
}

/**
 * Revalidates and atomic checks slot booking availability before confirming order
 */
export async function validateDeliverySlotBooking(
  slotName: string,
  targetDate: string,
  excludeOrderId?: string,
): Promise<{
  valid: boolean;
  slot_id?: string;
  slot_name?: string;
  capacity?: number;
  booked?: number;
  remaining?: number;
  error?: string;
  message?: string;
}> {
  if (!slotName || !targetDate) {
    return {
      valid: false,
      error: "MISSING_PARAMS",
      message: "Please select both a delivery date and a delivery time slot.",
    };
  }

  const { data, error } = await supabase.rpc("validate_delivery_slot_booking", {
    target_slot_name: slotName,
    target_date: targetDate,
    exclude_order_id: excludeOrderId || null,
  });

  if (error) {
    console.error("[DeliverySlotService] RPC validate_delivery_slot_booking error:", error);
    return {
      valid: false,
      error: "RPC_ERROR",
      message: error.message || "Failed to validate delivery slot availability.",
    };
  }

  return data as any;
}

/**
 * Admin: Get list of confirmed bookings for a specific slot and date
 */
export async function getSlotConfirmedBookings(
  slotId: string,
  targetDate: string,
): Promise<ConfirmedBookingRecord[]> {
  if (!slotId || !targetDate) return [];

  const { data, error } = await supabase.rpc("get_slot_confirmed_bookings", {
    target_slot_id: slotId,
    target_date: targetDate,
  });

  if (error) {
    console.error("[DeliverySlotService] RPC get_slot_confirmed_bookings error:", error);
    throw new Error(error.message || "Failed to fetch slot bookings.");
  }

  return (data || []).map((b: any) => ({
    order_id: b.order_id,
    order_number: b.order_number,
    customer_name: b.customer_name || "Unknown Customer",
    customer_email: b.customer_email || "",
    customer_phone: b.customer_phone || "",
    delivery_address: b.delivery_address || "",
    order_status: b.order_status || "Pending",
    payment_status: b.payment_status || "Pending",
    total: Number(b.total || 0),
    created_at: b.created_at,
  }));
}
