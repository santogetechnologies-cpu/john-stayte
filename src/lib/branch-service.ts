import { supabase } from "@/lib/supabase";
import { triggerOrderStatusPush } from "@/lib/push-notifications";

export interface BranchDetails {
  id: string;
  name: string;
  town: string;
  address: string;
  postcode: string;
  telephone: string;
  opening_hours: string;
  isDepot?: boolean;
}

export const KNOWN_BRANCHES: BranchDetails[] = [
  {
    id: "a1111111-1111-4111-a111-111111111101",
    name: "John Stayte Services – Cirencester",
    town: "Cirencester",
    address: "82 Chesterton Lane",
    postcode: "GL7 1YD",
    telephone: "01285 654614",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
  },
  {
    id: "a1111111-1111-4111-a111-111111111102",
    name: "John Stayte Services – Gloucester",
    town: "Gloucester",
    address: "1A Kingsholm Road",
    postcode: "GL1 3AX",
    telephone: "01452 525692",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
  },
  {
    id: "a1111111-1111-4111-a111-111111111103",
    name: "John Stayte Services – Stroud",
    town: "Stroud",
    address: "Dr Newton’s Way, Fromeside",
    postcode: "GL5 3JX",
    telephone: "01453 762541",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
  },
  {
    id: "a1111111-1111-4111-a111-111111111104",
    name: "John Stayte Services – Weston Super Mare",
    town: "Weston-Super-Mare",
    address: "Searle Crescent",
    postcode: "BS23 3YX",
    telephone: "01934 621375",
    opening_hours: "Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30",
  },
  {
    id: "depot-whitminster-01",
    name: "Whitminster Depot (Main Logistics)",
    town: "Whitminster",
    address: "Bristol Road, Whitminster",
    postcode: "GL2 7PB",
    telephone: "01452 740375",
    opening_hours: "Monday–Friday: 07:30–17:30 · Saturday: 08:00–13:00",
    isDepot: true,
  },
];

/**
 * Authoritative list of active forecourt branches available for customer collection.
 * Strictly excludes Whitminster Depot (which is a central logistics depot, not a forecourt).
 */
export const ACTIVE_FORECOURT_BRANCHES: BranchDetails[] = KNOWN_BRANCHES.filter(
  (b) => !b.isDepot,
);

/**
 * Validates whether a given branch ID corresponds to one of the 4 active collection forecourts.
 */
export function isValidForecourtBranchId(id?: string | null): boolean {
  if (!id) return false;
  const cleanId = id.trim().toLowerCase();
  return ACTIVE_FORECOURT_BRANCHES.some((b) => b.id.toLowerCase() === cleanId);
}


/**
 * Checks whether the staff account's branch assignment is unassigned or pending confirmation
 */
export function isPendingBranchAssignment(assignedBranch?: string | null): boolean {
  if (!assignedBranch) return true;
  const lower = assignedBranch.trim().toLowerCase();
  return (
    lower === "" ||
    lower.includes("pending") ||
    lower.includes("unassigned") ||
    lower.includes("none")
  );
}

/**
 * Returns a standardized search keyword for database matching (e.g. 'Cirencester')
 */
export function getBranchFilterKey(branchName?: string | null): string | null {
  if (isPendingBranchAssignment(branchName)) return null;
  const raw = (branchName || "").trim();
  const match = KNOWN_BRANCHES.find(
    (b) =>
      b.name.toLowerCase() === raw.toLowerCase() ||
      b.town.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().includes(b.town.toLowerCase()),
  );
  if (match) return match.town;
  return raw.split("–").pop()?.trim() || raw;
}

/**
 * Resolves the primary branch boundary criteria for database queries.
 * Prioritizes station ID matching, then exact branch name / depot name.
 */
export function getBranchQueryTarget(
  assignedBranch?: string | null,
  assignedBranchId?: string | null,
): { branchId: string | null; branchName: string | null; town: string | null } | null {
  if (isPendingBranchAssignment(assignedBranch) && !assignedBranchId) return null;

  const branchInfo = resolveBranchInfo(assignedBranch, assignedBranchId);
  const branchId = assignedBranchId || (branchInfo?.id && !branchInfo.isDepot ? branchInfo.id : null);
  const branchName = branchInfo?.name || (assignedBranch && !isPendingBranchAssignment(assignedBranch) ? assignedBranch.trim() : null);
  const town = branchInfo?.town || null;

  if (!branchId && !branchName) return null;
  return { branchId, branchName, town };
}

/**
 * Resolves branch details by name, town, or ID
 */
export function resolveBranchInfo(
  assignedBranch?: string | null,
  assignedBranchId?: string | null,
): BranchDetails | null {
  if (isPendingBranchAssignment(assignedBranch) && !assignedBranchId) return null;

  const raw = (assignedBranch || "").trim().toLowerCase();
  const rawId = (assignedBranchId || "").trim().toLowerCase();

  // 1. Direct match by ID
  if (rawId) {
    const match = KNOWN_BRANCHES.find((b) => b.id.toLowerCase() === rawId);
    if (match) return match;
  }

  // 2. Direct match by Name or Town substring
  if (raw && !isPendingBranchAssignment(raw)) {
    const match = KNOWN_BRANCHES.find(
      (b) =>
        b.name.toLowerCase().includes(raw) ||
        raw.includes(b.town.toLowerCase()) ||
        b.town.toLowerCase() === raw,
    );
    if (match) return match;
  }

  return null;
}

export interface CheckoutBranchAssignment {
  assignedDepot: string;
  assignedBranchId: string | null;
  collectionBranch: string | null;
  collectionBranchId: string | null;
}

/**
 * Resolves authoritative order fields for Click & Collect vs Standard Delivery.
 * For forecourts, synchronizes assigned_branch_id and collection_branch_id with the forecourt UUID.
 * For Whitminster Depot and delivery orders, assigned_branch_id and collection_branch_id remain null.
 */
export function resolveCheckoutBranchAssignment(
  fulfilmentMethod?: string | null,
  selectedBranchName?: string | null,
): CheckoutBranchAssignment {
  const isCollection = fulfilmentMethod === "collection";
  if (!isCollection || !selectedBranchName) {
    return {
      assignedDepot: "Whitminster",
      assignedBranchId: null,
      collectionBranch: null,
      collectionBranchId: null,
    };
  }

  const raw = selectedBranchName.trim();
  const branchObj = KNOWN_BRANCHES.find(
    (b) =>
      b.name.toLowerCase() === raw.toLowerCase() ||
      b.town.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().includes(b.town.toLowerCase()),
  );

  // Forecourts have valid UUIDs in auto_gas_stations; Whitminster Depot is a logistics depot (isDepot: true)
  const isForecourt = branchObj && !branchObj.isDepot;
  const forecourtUuid = isForecourt ? branchObj.id : null;

  return {
    assignedDepot: selectedBranchName,
    assignedBranchId: forecourtUuid,
    collectionBranch: selectedBranchName,
    collectionBranchId: forecourtUuid,
  };
}

export interface BranchKpiCounts {
  newOrders: number;
  preparing: number;
  readyForCollection: number;
  awaitingCustomer: number;
  onHold: number;
  completedToday: number;
}

export interface BranchOrderRecord {
  id: string;
  orderNumber: string;
  assignedBranchId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  itemsSummary: string;
  total: number;
  status: string;
  assignedDepot: string;
  notes?: string;
  createdAt: string;
  collectionSlot?: string;
  deliveryAddress?: Record<string, any> | null;
  orderItems?: any[];
}

export interface CylinderExchangeDetails {
  isExchange: boolean;
  orderedGasQuantity: number;
  expectedEmptyQuantity: number;
  cylinderTypesSummary: string;
}

export function getCylinderExchangeDetails(ord: BranchOrderRecord): CylinderExchangeDetails {
  const isExchange =
    Boolean(ord.deliveryAddress?.empty_cylinder_required) ||
    Boolean(ord.notes && ord.notes.includes("Empty Cylinder Required: Yes")) ||
    Boolean(ord.notes && ord.notes.includes("REFILL_EXCHANGE"));

  const items = ord.orderItems || [];
  let orderedGasQuantity = 0;
  const cylinderTypes: string[] = [];

  if (items.length > 0) {
    items.forEach((item: any) => {
      const name = item.product_name || "Gas Cylinder";
      const qty = Number(item.quantity) || 1;
      orderedGasQuantity += qty;
      cylinderTypes.push(`${qty}x ${name}`);
    });
  } else {
    orderedGasQuantity = 1;
    cylinderTypes.push(ord.itemsSummary || "Gas Cylinder");
  }

  const expectedEmptyQuantity = isExchange ? orderedGasQuantity : 0;

  return {
    isExchange,
    orderedGasQuantity,
    expectedEmptyQuantity,
    cylinderTypesSummary: cylinderTypes.join(", "),
  };
}

export interface RealBranchStockItem {
  id: string;
  name: string;
  category: string;
  availableFull: number;
  emptyDeposits: number;
  minThreshold: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  depotLocation: string;
}

export interface BranchStockResult {
  available: boolean;
  message?: string;
  items: RealBranchStockItem[];
}

/**
 * Computes live operational KPI counts scoped strictly to the assigned branch.
 * SECURITY: If branch assignment is pending, returns 0 counts with zero database leakage.
 */
export async function fetchRealBranchKpiCounts(
  assignedBranch?: string | null,
  assignedBranchId?: string | null,
): Promise<BranchKpiCounts> {
  const zeroCounts: BranchKpiCounts = {
    newOrders: 0,
    preparing: 0,
    readyForCollection: 0,
    awaitingCustomer: 0,
    onHold: 0,
    completedToday: 0,
  };

  const target = getBranchQueryTarget(assignedBranch, assignedBranchId);
  if (!target) {
    return zeroCounts;
  }

  try {
    const matchConditions: string[] = [];
    if (target.branchId) {
      matchConditions.push(`assigned_branch_id.eq.${target.branchId}`);
      matchConditions.push(`delivery_address->>collection_branch_id.eq.${target.branchId}`);
    }
    if (target.branchName) {
      matchConditions.push(`assigned_depot.eq.${target.branchName}`);
      matchConditions.push(`delivery_address->>collection_branch.eq.${target.branchName}`);
    }
    if (target.town) {
      matchConditions.push(`assigned_depot.eq.${target.town}`);
      matchConditions.push(`delivery_address->>collection_branch.eq.${target.town}`);
    }

    if (matchConditions.length === 0) {
      return zeroCounts;
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, created_at, updated_at")
      .or(matchConditions.join(","))
      .or("delivery_address->>fulfilment_method.eq.collection,delivery_address->>collection_branch.not.is.null");

    if (error || !orders) {
      return zeroCounts;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const counts: BranchKpiCounts = {
      newOrders: 0,
      preparing: 0,
      readyForCollection: 0,
      awaitingCustomer: 0,
      onHold: 0,
      completedToday: 0,
    };

    orders.forEach((o: any) => {
      const s = (o.status || "").toLowerCase();
      if (s === "pending" || s === "new") {
        counts.newOrders++;
      } else if (s === "approved" || s === "preparing" || s === "packed") {
        counts.preparing++;
      } else if (s === "ready" || s === "ready_for_collection") {
        counts.readyForCollection++;
      } else if (s === "awaiting" || s === "awaiting_customer") {
        counts.awaitingCustomer++;
      } else if (s === "on_hold" || s === "hold") {
        counts.onHold++;
      } else if (s === "delivered" || s === "completed") {
        const orderDate = (o.updated_at || o.created_at || "").slice(0, 10);
        if (orderDate === todayStr) {
          counts.completedToday++;
        }
      }
    });

    return counts;
  } catch (err) {
    console.error("Error fetching branch KPI counts:", err);
    return zeroCounts;
  }
}

/**
 * Loads real Click & Collect orders from Supabase scoped strictly to the assigned branch.
 * SECURITY: If staff branch assignment is pending, returns an empty array immediately.
 * Enforces branch ID and exact depot boundaries at the query level.
 */
export async function fetchRealBranchOrders(
  assignedBranch?: string | null,
  statusFilter?: string | null,
  assignedBranchId?: string | null,
): Promise<BranchOrderRecord[]> {
  if (isPendingBranchAssignment(assignedBranch) && !assignedBranchId) {
    return [];
  }

  const target = getBranchQueryTarget(assignedBranch, assignedBranchId);
  if (!target) {
    return [];
  }

  try {
    const matchConditions: string[] = [];
    if (target.branchId) {
      matchConditions.push(`assigned_branch_id.eq.${target.branchId}`);
      matchConditions.push(`delivery_address->>collection_branch_id.eq.${target.branchId}`);
    }
    if (target.branchName) {
      matchConditions.push(`assigned_depot.eq.${target.branchName}`);
      matchConditions.push(`delivery_address->>collection_branch.eq.${target.branchName}`);
    }
    if (target.town) {
      matchConditions.push(`assigned_depot.eq.${target.town}`);
      matchConditions.push(`delivery_address->>collection_branch.eq.${target.town}`);
    }

    if (matchConditions.length === 0) {
      return [];
    }

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        assigned_branch_id,
        customer_name,
        customer_email,
        customer_phone,
        total,
        status,
        fulfillment_status,
        assigned_depot,
        delivery_address,
        notes,
        created_at,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `,
      )
      .or(matchConditions.join(","))
      .or("delivery_address->>fulfilment_method.eq.collection,delivery_address->>collection_branch.not.is.null")
      .order("created_at", { ascending: false });

    // Apply status filter if specified and not 'all'
    if (statusFilter && statusFilter !== "all") {
      const sf = statusFilter.toLowerCase();
      if (sf === "new") {
        query = query.or("status.eq.Pending,status.eq.new,status.ilike.pending");
      } else if (sf === "preparing") {
        query = query.or("status.eq.Approved,status.eq.Packed,status.eq.preparing");
      } else if (sf === "ready") {
        query = query.or("status.eq.ready,status.eq.ready_for_collection");
      } else if (sf === "awaiting") {
        query = query.or("status.eq.awaiting,status.eq.awaiting_customer");
      } else if (sf === "on_hold") {
        query = query.or("status.eq.on_hold,status.eq.hold");
      } else if (sf === "completed") {
        query = query.or("status.eq.Delivered,status.eq.completed");
      }
    }

    const { data: rows, error } = await query;
    if (error || !rows) {
      console.warn("Could not load real branch orders:", error?.message);
      return [];
    }

    return rows.map((o: any) => {
      const items = Array.isArray(o.order_items) ? o.order_items : [];
      let summary = "";
      if (items.length > 0) {
        summary = items
          .map((i: any) => `${i.quantity || 1}x ${i.product_name || "Gas Cylinder"}`)
          .join(", ");
      } else {
        summary = o.notes ? o.notes.slice(0, 40) : "Gas Cylinder Order";
      }

      const addr = o.delivery_address as Record<string, any> | null;
      const custName = o.customer_name || addr?.name || addr?.fullName || "Retail Customer";
      const custPhone = o.customer_phone || addr?.phone || "N/A";
      const custEmail = o.customer_email || addr?.email || "";

      return {
        id: o.id,
        orderNumber: o.order_number || `JSS-${o.id.slice(0, 8).toUpperCase()}`,
        assignedBranchId: o.assigned_branch_id || null,
        customerName: custName,
        customerPhone: custPhone,
        customerEmail: custEmail,
        itemsSummary: summary,
        total: o.total ? Number(o.total) : 0,
        status: o.status || "Pending",
        assignedDepot: o.assigned_depot || assignedBranch || "",
        notes: o.notes || undefined,
        createdAt: o.created_at,
        collectionSlot: addr?.delivery_slot || addr?.time_slot || "Anytime during opening hours",
        deliveryAddress: addr,
        orderItems: items,
      };
    });
  } catch (err) {
    console.error("Error fetching real branch orders:", err);
    return [];
  }
}

export interface UpdateBranchOrderStatusParams {
  orderId: string;
  status: "Pending" | "Approved" | "Packed" | "Ready" | "Delivered" | "Cancelled";
  fulfillmentStatus?: string;
  notes?: string;
}

/**
 * Updates operational status of an assigned Click & Collect order.
 * SECURITY: Only updates permitted operational fields (status, fulfillment_status, notes, updated_at).
 * Sensitive fields (customer_id, payment_status, total, pricing, assigned_depot, etc.)
 * are blocked by database security triggers and never included in this payload.
 */
export async function updateBranchOrderStatus({
  orderId,
  status,
  fulfillmentStatus,
  notes,
}: UpdateBranchOrderStatusParams): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (fulfillmentStatus) {
      payload.fulfillment_status = fulfillmentStatus;
    }
    if (notes !== undefined) {
      payload.notes = notes;
    }

    const { error } = await (supabase.from("orders") as any)
      .update(payload)
      .eq("id", orderId);

    if (error) {
      console.error("Failed to update branch order status:", error.message);
      return { success: false, error: error.message };
    }

    // Trigger Ready for Collection notification when forecourt staff marks order Ready
    if (status === "Ready") {
      try {
        const { data: ord } = await (supabase.from("orders") as any)
          .select("id, order_number, customer_id")
          .eq("id", orderId)
          .maybeSingle();

        if (ord?.customer_id) {
          triggerOrderStatusPush({
            orderId: ord.id,
            orderNumber: ord.order_number || ord.id.slice(0, 8),
            customerId: ord.customer_id,
            newStatus: "Ready",
          }).catch((pushErr) => console.warn("[Branch Service] Ready for collection push notice:", pushErr));
        }
      } catch (pushErr) {
        console.warn("[Branch Service] Push notification notice:", pushErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error updating branch order:", err);
    return { success: false, error: err?.message || "Failed to update order" };
  }
}

/**
 * Loads real branch cylinder stock from the Supabase inventory & products tables.
 * Returns { available: false, message: "Branch inventory data is not available." }
 * when branch-level inventory records do not exist.
 */
export async function fetchRealBranchStock(
  assignedBranch?: string | null,
  assignedBranchId?: string | null,
): Promise<BranchStockResult> {
  if (isPendingBranchAssignment(assignedBranch) && !assignedBranchId) {
    return {
      available: false,
      message: "Branch inventory data is not available.",
      items: [],
    };
  }

  const branchInfo = resolveBranchInfo(assignedBranch, assignedBranchId);
  const branchKey = branchInfo?.town || getBranchFilterKey(assignedBranch);
  if (!branchKey) {
    return {
      available: false,
      message: "Branch inventory data is not available.",
      items: [],
    };
  }

  try {
    // Query inventory table filtered by this branch/depot
    const { data: invRows, error: invErr } = await supabase
      .from("inventory")
      .select("id, product_id, current_stock, reorder_threshold, target_stock, depot_location, updated_at")
      .ilike("depot_location", `%${branchKey}%`);

    if (invErr || !invRows || invRows.length === 0) {
      // Branch-level inventory records do not exist in the database for this forecourt/branch
      return {
        available: false,
        message: "Branch inventory data is not available.",
        items: [],
      };
    }

    // If inventory records exist, fetch products to display cylinder names
    const productIds = invRows.map((r: any) => r.product_id).filter(Boolean);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, category_slug")
      .in("id", productIds);

    const prodMap = new Map((products || []).map((p: any) => [p.id, p]));

    const mappedItems: RealBranchStockItem[] = invRows.map((r: any) => {
      const prod = prodMap.get(r.product_id);
      const stock = Number(r.current_stock || 0);
      const threshold = Number(r.reorder_threshold || 10);
      let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
      if (stock === 0) status = "out_of_stock";
      else if (stock <= threshold) status = "low_stock";

      return {
        id: r.id,
        name: prod?.name || `Cylinder Item (${r.id.slice(0, 6)})`,
        category: prod?.category_slug || "Gas",
        availableFull: stock,
        emptyDeposits: 0, // Empty cylinder deposit tracking column not yet present in inventory table
        minThreshold: threshold,
        status,
        depotLocation: r.depot_location || assignedBranch || "",
      };
    });

    return {
      available: true,
      items: mappedItems,
    };
  } catch (err) {
    console.error("Error fetching real branch stock:", err);
    return {
      available: false,
      message: "Branch inventory data is not available.",
      items: [],
    };
  }
}
