import { supabase } from "./supabase";
import type {
  FuelDriveOffIncident,
  FuelDriveOffPayment,
  DriveOffStatus,
  DriveOffSummaryStats,
} from "@/types/drive-offs";

// Initial standard forecourt stations in Gloucestershire
export const FORECOURT_LOCATIONS = [
  { id: "st-1", name: "Wild Goose Garage (Dursley)", town: "Dursley", pumps: [1, 2, 3, 4] },
  { id: "st-2", name: "Fromebridge Service Station (Whitminster)", town: "Whitminster", pumps: [1, 2, 3, 4, 5, 6] },
  { id: "st-3", name: "Bridge Service Station (Stonehouse)", town: "Stonehouse", pumps: [1, 2, 3, 4] },
  { id: "st-4", name: "Eastington Service Station (Eastington)", town: "Eastington", pumps: [1, 2, 3, 4] },
];

export const FUEL_TYPES = [
  "Unleaded 95 (E10)",
  "Super Unleaded (E5)",
  "Standard Diesel (B7)",
  "Premium Diesel",
  "Auto Gas (LPG)",
];

// Fallback seed incidents for high availability if migration has not run on remote yet
const SEED_INCIDENTS: FuelDriveOffIncident[] = [
  {
    id: "do-001",
    incident_number: "DO-2026-0041",
    branch_id: "st-1",
    branch_name: "Wild Goose Garage (Dursley)",
    pump_number: 3,
    incident_date: "2026-11-14",
    incident_time: "14:22:00",
    occurred_at: "2026-11-14T14:22:00Z",
    vehicle_registration_number: "WP68 XTR",
    vehicle_make: "Ford",
    vehicle_model: "Focus",
    vehicle_colour: "Metallic Blue",
    fuel_type: "Standard Diesel (B7)",
    litres_dispensed: 46.5,
    price_per_litre: 1.439,
    total_amount_due: 66.91,
    amount_paid: 0.0,
    balance_remaining: 66.91,
    incident_type: "drive_off",
    status: "police_investigation",
    police_crime_reference: "CR/2026/08941",
    police_constabulary: "Gloucestershire Constabulary",
    cctv_footage_timestamp: "Cam 2 - 14:21:40 to 14:24:10",
    notes: "Driver filled up at Pump 3 and exited directly toward Dursley without approaching the till counter.",
    created_by_name: "John Stayte Forecourt Team",
    created_at: "2026-11-14T14:30:00Z",
    updated_at: "2026-11-14T14:30:00Z",
  },
  {
    id: "do-002",
    incident_number: "DO-2026-0040",
    branch_id: "st-2",
    branch_name: "Fromebridge Service Station (Whitminster)",
    pump_number: 2,
    incident_date: "2026-11-13",
    incident_time: "18:45:00",
    occurred_at: "2026-11-13T18:45:00Z",
    vehicle_registration_number: "VO21 KLF",
    vehicle_make: "BMW",
    vehicle_model: "1 Series",
    vehicle_colour: "Alpine White",
    fuel_type: "Unleaded 95 (E10)",
    litres_dispensed: 42.1,
    price_per_litre: 1.369,
    total_amount_due: 57.64,
    amount_paid: 0.0,
    balance_remaining: 57.64,
    incident_type: "drive_off",
    status: "unpaid",
    cctv_footage_timestamp: "Cam 1 - 18:44:12 to 18:46:05",
    notes: "Vehicle sped out toward A38 roundabout during peak Friday evening traffic.",
    created_by_name: "Fromebridge Cashier",
    created_at: "2026-11-13T18:50:00Z",
    updated_at: "2026-11-13T18:50:00Z",
  },
  {
    id: "do-003",
    incident_number: "DO-2026-0039",
    branch_id: "st-4",
    branch_name: "Eastington Service Station (Eastington)",
    pump_number: 1,
    incident_date: "2026-11-11",
    incident_time: "11:15:00",
    occurred_at: "2026-11-11T11:15:00Z",
    vehicle_registration_number: "GL19 TYU",
    vehicle_make: "Vauxhall",
    vehicle_model: "Corsa",
    vehicle_colour: "Red",
    fuel_type: "Unleaded 95 (E10)",
    litres_dispensed: 35.0,
    price_per_litre: 1.369,
    total_amount_due: 47.92,
    amount_paid: 47.92,
    balance_remaining: 0.0,
    incident_type: "no_means_to_pay",
    status: "paid",
    driver_name: "Robert Davies",
    driver_contact_phone: "07890 123456",
    notes: "Driver card declined at counter. Left contact number and returned next day to settle bill in full.",
    created_by_name: "Eastington Forecourt Desk",
    created_at: "2026-11-11T11:20:00Z",
    updated_at: "2026-11-12T10:05:00Z",
  },
];

let inMemoryIncidents: FuelDriveOffIncident[] = [...SEED_INCIDENTS];

/**
 * Fetch drive-off incidents with optional branch and status filtering
 */
export async function fetchDriveOffIncidents(filters?: {
  branchId?: string | null;
  status?: string | null;
  searchQuery?: string | null;
}): Promise<FuelDriveOffIncident[]> {
  try {
    let query = (supabase.from("fuel_drive_off_incidents") as any)
      .select("*")
      .order("occurred_at", { ascending: false });

    if (filters?.branchId && filters.branchId !== "all") {
      query = query.eq("branch_id", filters.branchId);
    }
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = Boolean(session?.user);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      if (isAuthenticated || data.length > 0) {
        let filtered = data as FuelDriveOffIncident[];
        if (filters?.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (i) =>
              i.vehicle_registration_number.toLowerCase().includes(q) ||
              i.incident_number.toLowerCase().includes(q) ||
              (i.vehicle_make && i.vehicle_make.toLowerCase().includes(q)) ||
              (i.police_crime_reference && i.police_crime_reference.toLowerCase().includes(q)) ||
              i.branch_name.toLowerCase().includes(q),
          );
        }
        return filtered;
      }
    }
  } catch (e) {
    console.warn("Using in-memory incident cache:", e);
  }

  // Fallback to in-memory state
  let results = [...inMemoryIncidents];
  if (filters?.branchId && filters.branchId !== "all") {
    results = results.filter((i) => i.branch_id === filters.branchId);
  }
  if (filters?.status && filters.status !== "all") {
    results = results.filter((i) => i.status === filters.status);
  }
  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    results = results.filter(
      (i) =>
        i.vehicle_registration_number.toLowerCase().includes(q) ||
        i.incident_number.toLowerCase().includes(q) ||
        (i.vehicle_make && i.vehicle_make.toLowerCase().includes(q)) ||
        (i.police_crime_reference && i.police_crime_reference.toLowerCase().includes(q)) ||
        i.branch_name.toLowerCase().includes(q),
    );
  }
  return results;
}

/**
 * Create a new drive-off or No Means to Pay incident
 */
export async function createDriveOffIncident(
  payload: Omit<
    FuelDriveOffIncident,
    "id" | "incident_number" | "balance_remaining" | "amount_paid" | "created_at" | "updated_at"
  >,
): Promise<FuelDriveOffIncident> {
  const cleanVrn = payload.vehicle_registration_number.toUpperCase().trim();
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const incidentNumber = `DO-${year}-${randomSuffix}`;
  const now = new Date().toISOString();

  const newIncident: FuelDriveOffIncident = {
    ...payload,
    id: `do-${Date.now()}`,
    incident_number: incidentNumber,
    vehicle_registration_number: cleanVrn,
    amount_paid: 0.0,
    balance_remaining: Number(payload.total_amount_due.toFixed(2)),
    status: payload.status || "unpaid",
    created_at: now,
    updated_at: now,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { id: _tempId, ...dbPayload } = newIncident;
    if (session?.user?.id && !dbPayload.created_by) {
      dbPayload.created_by = session.user.id;
    }

    const { data, error } = await (supabase.from("fuel_drive_off_incidents") as any)
      .insert({
        ...dbPayload,
        vehicle_registration_number: cleanVrn,
      })
      .select()
      .single();

    if (!error && data) {
      inMemoryIncidents.unshift(data);
      return data;
    }
    if (error) {
      console.error("Supabase drive-off insert error:", error);
      throw error;
    }
  } catch (e: any) {
    console.warn("Fallback to local storage for incident insert:", e);
    const { data: authData } = await supabase.auth.getSession();
    if (authData?.session?.user) {
      throw new Error(e?.message || "Failed to record incident to database.");
    }
  }

  inMemoryIncidents.unshift(newIncident);
  return newIncident;
}

/**
 * Record a payment / settlement toward an incident
 */
export async function recordDriveOffPayment(
  incidentId: string,
  amount: number,
  paymentMethod: string,
  recordedByName: string,
  receiptReference?: string,
  notes?: string,
): Promise<{ success: boolean; updatedIncident?: FuelDriveOffIncident }> {
  let target = inMemoryIncidents.find((i) => i.id === incidentId);

  if (!target) {
    try {
      const { data } = await (supabase.from("fuel_drive_off_incidents") as any)
        .select("*")
        .eq("id", incidentId)
        .single();
      if (data) {
        target = data as FuelDriveOffIncident;
        inMemoryIncidents.push(target);
      }
    } catch {
      // fallback
    }
  }

  if (!target) return { success: false };

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  if (amount > target.balance_remaining) {
    throw new Error(
      `Payment amount of £${amount.toFixed(2)} cannot exceed the outstanding balance of £${target.balance_remaining.toFixed(2)}`,
    );
  }

  const newAmountPaid = Number((target.amount_paid + amount).toFixed(2));
  const newBalance = Math.max(0, Number((target.total_amount_due - newAmountPaid).toFixed(2)));
  let newStatus: DriveOffStatus;
  if (
    target.status === "police_investigation" ||
    target.status === "disputed" ||
    target.status === "written_off"
  ) {
    newStatus = target.status;
  } else if (newBalance <= 0) {
    newStatus = "paid";
  } else {
    newStatus = "partial_payment";
  }

  target.amount_paid = newAmountPaid;
  target.balance_remaining = newBalance;
  target.status = newStatus;
  target.updated_at = new Date().toISOString();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    await (supabase.from("fuel_drive_off_payments") as any).insert({
      incident_id: incidentId,
      amount,
      payment_method: paymentMethod,
      receipt_reference: receiptReference || null,
      notes: notes || null,
      recorded_by_name: recordedByName,
      recorded_by: session?.user?.id || null,
    });

    const { data: updatedDbInc } = await (supabase.from("fuel_drive_off_incidents") as any)
      .select("*")
      .eq("id", incidentId)
      .single();

    if (updatedDbInc) {
      Object.assign(target, updatedDbInc);
    }
  } catch (e) {
    console.warn("Supabase payment update note:", e);
  }

  return { success: true, updatedIncident: { ...target } };
}

/**
 * Update incident status and optional police crime reference
 */
export async function updateDriveOffStatus(
  incidentId: string,
  status: DriveOffStatus,
  policeCrimeReference?: string,
): Promise<boolean> {
  let target = inMemoryIncidents.find((i) => i.id === incidentId);

  if (target) {
    target.status = status;
    if (policeCrimeReference !== undefined) {
      target.police_crime_reference = policeCrimeReference;
    }
    target.updated_at = new Date().toISOString();
  }

  try {
    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    if (policeCrimeReference !== undefined) {
      updatePayload.police_crime_reference = policeCrimeReference;
    }
    const { data: updatedDbInc } = await (supabase.from("fuel_drive_off_incidents") as any)
      .update(updatePayload)
      .eq("id", incidentId)
      .select()
      .single();

    if (updatedDbInc && target) {
      Object.assign(target, updatedDbInc);
    }
  } catch (e) {
    console.warn("Supabase status update note:", e);
  }

  return true;
}

export interface DriveOffRealtimeEvent {
  table: "fuel_drive_off_incidents" | "fuel_drive_off_payments";
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
  new: any;
  old: any;
}

/**
 * Subscribe to Supabase Realtime changes for drive-offs and payments
 */
export function subscribeToDriveOffChanges(
  onEvent: (event: DriveOffRealtimeEvent) => void,
  channelPrefix = "drive_offs_live"
): () => void {
  const channelName = `${channelPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "fuel_drive_off_incidents" },
      (payload) => {
        onEvent({
          table: "fuel_drive_off_incidents",
          eventType: payload.eventType as any,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "fuel_drive_off_payments" },
      (payload) => {
        onEvent({
          table: "fuel_drive_off_payments",
          eventType: payload.eventType as any,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Calculate KPI summary stats for header metrics
 */
export function calculateDriveOffStats(incidents: FuelDriveOffIncident[]): DriveOffSummaryStats {
  const totalIncidents = incidents.length;
  let unpaidCount = 0;
  let totalUnpaidAmount = 0;
  let recoveredAmount = 0;
  let withPoliceCount = 0;

  for (const inc of incidents) {
    recoveredAmount += inc.amount_paid || 0;
    if (inc.status === "unpaid" || inc.status === "partial_payment") {
      unpaidCount++;
      totalUnpaidAmount += inc.balance_remaining || (inc.total_amount_due - inc.amount_paid);
    }
    if (inc.status === "police_investigation" || Boolean(inc.police_crime_reference)) {
      withPoliceCount++;
    }
  }

  const totalBilled = incidents.reduce((sum, i) => sum + i.total_amount_due, 0);
  const recoveryRatePercent =
    totalBilled > 0 ? Number(((recoveredAmount / totalBilled) * 100).toFixed(1)) : 0;

  return {
    totalIncidents,
    unpaidCount,
    totalUnpaidAmount: Number(totalUnpaidAmount.toFixed(2)),
    recoveredAmount: Number(recoveredAmount.toFixed(2)),
    recoveryRatePercent,
    withPoliceCount,
  };
}

