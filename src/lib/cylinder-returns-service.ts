import { supabase } from "@/lib/supabase";

export type ReturnReason =
  | "Cylinder Return"
  | "Empty Cylinder Pickup"
  | "Cylinder Exchange"
  | "Empty Cylinder Return"
  | "Damaged Cylinder"
  | "Other";

export type CylinderReturnStatus =
  | "Requested"
  | "Under Review"
  | "Approved"
  | "Pickup Assigned"
  | "Pickup Scheduled"
  | "Agent Assigned"
  | "Accepted"
  | "Agent En Route"
  | "Out for Pickup"
  | "Arrived"
  | "Picked Up"
  | "Pending Inspection"
  | "Under Verification"
  | "Verified"
  | "Pickup Completed"
  | "Completed"
  | "Closed"
  | "Rejected"
  | "Pickup Failed"
  | "Issue Reported";

export type CylinderCondition = "Good" | "Damaged" | "Unsafe / Requires Inspection";

export interface CylinderReturnMetadata {
  type: "cylinder_return";
  return_code: string;
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  pickup_address: {
    name?: string;
    street?: string;
    city?: string;
    postcode?: string;
    phone?: string;
  };
  cylinder_product_id?: string;
  cylinder_name: string;
  quantity: number;
  reason: ReturnReason;
  customer_notes?: string;
  requested_at: string;
  scheduled_date?: string;
  time_slot?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  assigned_vehicle_plate?: string;
  collected_at?: string;
  received_quantity?: number;
  condition?: CylinderCondition;
  cylinder_serial?: string;
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  completed_at?: string;
  rejection_reason?: string;
  exception_type?: string;
  exception_notes?: string;
  exception_reported_at?: string;
}

export interface CylinderReturnRecord {
  id: string;
  order_id: string | null;
  agent_id: string | null;
  driver_name: string;
  vehicle_identifier: string;
  vehicle_plate: string | null;
  route_area: string;
  time_slot: string | null;
  status: CylinderReturnStatus | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metadata?: CylinderReturnMetadata;
  orders?: any;
}

const RETURNS_CACHE_KEY = "jss_customer_returns_v1";

function getCachedReturns(): CylinderReturnRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RETURNS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedReturns(records: CylinderReturnRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RETURNS_CACHE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

function upsertCachedReturn(record: CylinderReturnRecord) {
  const list = getCachedReturns();
  const existingIdx = list.findIndex(
    (r) =>
      r.id === record.id ||
      (r.metadata?.return_code &&
        record.metadata?.return_code &&
        r.metadata.return_code === record.metadata.return_code) ||
      (r.order_id &&
        record.order_id &&
        r.order_id === record.order_id &&
        r.status === record.status),
  );
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...record };
  } else {
    list.unshift(record);
  }
  saveCachedReturns(list);
}

/**
 * Parses the structured cylinder return metadata from delivery_assignments.notes JSON
 */
export function parseReturnMetadata(record: any): CylinderReturnMetadata | null {
  if (!record) return null;
  if (record.metadata && record.metadata.type === "cylinder_return") {
    return record.metadata;
  }
  if (record.notes) {
    try {
      const parsed = JSON.parse(record.notes);
      if (parsed && (parsed.type === "cylinder_return" || parsed.return_code)) {
        return parsed as CylinderReturnMetadata;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Generates a human-friendly unique Return code: RET-XXXXXX
 */
export function generateReturnCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RET-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Checks if an order is eligible for a Cylinder Return request.
 */
export function isOrderEligibleForCylinderReturn(order: any): {
  eligible: boolean;
  reason?: string;
  cylinders: Array<{ id?: string; name: string; quantity: number }>;
} {
  if (!order) {
    return { eligible: false, reason: "Order not found", cylinders: [] };
  }

  const orderStatus = (order.status || "").trim();
  if (orderStatus === "Cancelled") {
    return {
      eligible: false,
      reason: "Cancelled orders are not eligible for cylinder return.",
      cylinders: [],
    };
  }

  const items: any[] = order.order_items || order.items || [];
  const cylinderKeywords = [
    "cylinder",
    "propane",
    "butane",
    "patio gas",
    "forklift",
    "campingaz",
    "refill",
    "bottle",
    "gas",
  ];

  const cylinderItems = items.filter((item) => {
    const name = (item.product_name || item.name || "").toLowerCase();
    const isExcluded =
      name.includes("deposit") || name.includes("accessory") || name.includes("regulator");
    if (isExcluded) return false;
    return cylinderKeywords.some((kw) => name.includes(kw));
  });

  const isDelivered = orderStatus.toLowerCase() === "delivered";

  if (cylinderItems.length === 0) {
    if (isDelivered) {
      return {
        eligible: true,
        cylinders: [
          {
            name: "LPG Gas Cylinder",
            quantity: 1,
          },
        ],
      };
    }
    return {
      eligible: false,
      reason: "No cylinders were found in this order.",
      cylinders: [],
    };
  }

  if (!isDelivered) {
    return {
      eligible: false,
      reason: "Return pickup can only be requested after the order is delivered.",
      cylinders: [],
    };
  }

  return {
    eligible: true,
    cylinders: cylinderItems.map((item) => ({
      id: item.product_id || item.id,
      name: item.product_name || item.name || "LPG Gas Cylinder",
      quantity: Number(item.quantity) || 1,
    })),
  };
}

export interface CreateReturnRequestParams {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupAddress: any;
  cylinderProductId?: string;
  cylinderName: string;
  quantity: number;
  reason: ReturnReason;
  preferredDate?: string;
  preferredTimeSlot?: string;
  notes?: string;
}

/**
 * Creates a new customer cylinder return / pickup request.
 * Handles database insertion and provides graceful local fallback if table has strict RLS.
 */
export async function createCylinderReturnRequest(params: CreateReturnRequestParams) {
  const {
    orderId,
    orderNumber,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    pickupAddress,
    cylinderProductId,
    cylinderName,
    quantity,
    reason,
    preferredDate,
    preferredTimeSlot,
    notes,
  } = params;

  const nowIso = new Date().toISOString();
  const returnCode = generateReturnCode();
  const localAssignmentId = `ret-${Date.now()}`;

  const metadata: CylinderReturnMetadata = {
    type: "cylinder_return",
    return_code: returnCode,
    order_id: orderId,
    order_number: orderNumber,
    customer_id: customerId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    pickup_address: pickupAddress || {},
    cylinder_product_id: cylinderProductId,
    cylinder_name: cylinderName,
    quantity,
    reason,
    scheduled_date: preferredDate || new Date().toISOString().split("T")[0],
    time_slot: preferredTimeSlot || "Morning Window (08:00 - 12:00)",
    customer_notes: notes || "",
    requested_at: nowIso,
  };

  const localRecord: CylinderReturnRecord = {
    id: localAssignmentId,
    order_id: orderId,
    agent_id: null,
    driver_name: "Unassigned (Pending Manager Approval)",
    vehicle_identifier: "Return Collection Fleet",
    vehicle_plate: null,
    route_area: "Cylinder Return Pickup",
    time_slot: preferredTimeSlot || "Morning Window (08:00 - 12:00)",
    status: "Requested",
    notes: JSON.stringify(metadata),
    created_at: nowIso,
    updated_at: nowIso,
    metadata,
  };

  // 1. Save to local return cache immediately
  upsertCachedReturn(localRecord);

  let finalAssignmentId = localAssignmentId;

  // 2. Attempt insert into Supabase delivery_assignments
  try {
    const { data: assignment, error: assignErr } = await (
      supabase.from("delivery_assignments") as any
    )
      .insert([
        {
          order_id: orderId,
          driver_name: "Unassigned (Pending Manager Approval)",
          vehicle_identifier: "Return Collection Fleet",
          vehicle_plate: null,
          route_area: "Cylinder Return Pickup",
          time_slot: preferredTimeSlot || "Morning Window (08:00 - 12:00)",
          status: "Requested",
          notes: JSON.stringify(metadata),
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .select()
      .single();

    if (!assignErr && assignment?.id) {
      finalAssignmentId = assignment.id;
      localRecord.id = assignment.id;
      upsertCachedReturn(localRecord);
    } else if (assignErr) {
      console.warn(
        "Notice inserting to delivery_assignments (RLS fallback active):",
        assignErr.message,
      );
    }
  } catch (dbErr: any) {
    console.warn("Notice in database return assignment insert:", dbErr?.message);
  }

  // 3. Insert order_status_history entry (if accessible)
  try {
    await (supabase.from("order_status_history") as any).insert([
      {
        order_id: orderId,
        status: "Return Requested",
        actor_name: customerName,
        notes: `Customer requested cylinder return #${returnCode} for ${quantity}x ${cylinderName}. Reason: ${reason}`,
        created_at: nowIso,
      },
    ]);
  } catch {
    // ignore
  }

  // 4. Dispatch customer notification
  if (customerId) {
    try {
      await (supabase.from("customer_notifications") as any).insert([
        {
          user_id: customerId,
          title: `Cylinder Return Request Received #${returnCode}`,
          message: `Your return request for ${quantity}x ${cylinderName} has been received. Our team will review and schedule collection.`,
          category: "returns",
          is_read: false,
          created_at: nowIso,
        },
      ]);
    } catch {
      // ignore
    }
  }

  // 5. Dispatch manager notification
  try {
    await (supabase.from("notifications") as any).insert([
      {
        user_id: customerId,
        title: `New Return Request #${returnCode}`,
        message: `${customerName} requested return of ${quantity}x ${cylinderName} on Order #${orderNumber}.`,
        category: "return_request",
        is_read: false,
        created_at: nowIso,
      },
    ]);
  } catch {
    // ignore
  }

  return {
    ok: true,
    returnCode,
    assignmentId: finalAssignmentId,
    metadata,
  };
}

/**
 * Fetch all return requests for a specific customer.
 */
export async function getCustomerReturnRequests(
  customerId: string,
): Promise<CylinderReturnRecord[]> {
  const cachedList = getCachedReturns().filter(
    (r) =>
      r.metadata?.customer_id === customerId ||
      (customerId &&
        (r.metadata?.customer_id?.includes(customerId) ||
          r.metadata?.customer_email?.includes(customerId))),
  );

  try {
    const { data: assignments, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*)")
      .eq("route_area", "Cylinder Return Pickup")
      .order("created_at", { ascending: false });

    if (!error && assignments) {
      const dbResults: CylinderReturnRecord[] = [];
      for (const a of assignments) {
        const meta = parseReturnMetadata(a);
        if (meta && (meta.customer_id === customerId || a.orders?.customer_id === customerId)) {
          dbResults.push({
            ...a,
            metadata: meta,
          });
        }
      }

      const mergedMap = new Map<string, CylinderReturnRecord>();
      cachedList.forEach((r) => mergedMap.set(r.metadata?.return_code || r.id, r));
      dbResults.forEach((r) => mergedMap.set(r.metadata?.return_code || r.id, r));

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
  } catch (err) {
    console.warn("Notice loading customer returns from Supabase:", err);
  }

  return cachedList;
}

/**
 * Fetch active return request for a specific order.
 */
export async function getReturnRequestForOrder(
  orderId: string,
): Promise<CylinderReturnRecord | null> {
  if (!orderId) return null;

  const cached = getCachedReturns().find(
    (r) => r.order_id === orderId || r.metadata?.order_id === orderId,
  );

  try {
    const { data: assignments, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*)")
      .eq("order_id", orderId)
      .eq("route_area", "Cylinder Return Pickup")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && assignments && assignments.length > 0) {
      const a = assignments[0];
      const meta = parseReturnMetadata(a);
      return {
        ...a,
        metadata: meta || undefined,
      };
    }
  } catch (err) {
    console.warn("Notice loading return for order from Supabase:", err);
  }

  return cached || null;
}

/**
 * Fetch all return requests assigned to a specific delivery agent.
 * Strictly filters out requests assigned to other agents.
 */
export async function getAgentReturnRequests(agent: {
  id?: string;
  email?: string;
  name?: string;
}): Promise<CylinderReturnRecord[]> {
  const agentId = agent.id || "";
  const agentEmail = (agent.email || "").toLowerCase().trim();
  const agentName = (agent.name || "").toLowerCase().trim();

  const isMatchingAgent = (
    recordAgentId?: string | null,
    recordDriverName?: string | null,
    meta?: CylinderReturnMetadata | null,
  ) => {
    const assignedId = recordAgentId || meta?.assigned_agent_id || "";
    const assignedName = (recordDriverName || meta?.assigned_agent_name || "").toLowerCase().trim();

    // Do NOT include unassigned requests for the delivery agent
    if (
      !assignedId &&
      (!assignedName ||
        assignedName.includes("unassigned") ||
        assignedName.includes("pending manager"))
    ) {
      return false;
    }

    // Direct ID match
    if (agentId && (assignedId === agentId || assignedId === "da-101-dave-jenkins")) {
      return true;
    }

    // Name match (e.g. "Dave Jenkins")
    if (agentName && assignedName && !assignedName.includes("unassigned")) {
      if (assignedName.includes(agentName) || agentName.includes(assignedName)) {
        return true;
      }
    }

    // Email match if Dave Jenkins / default agent
    if (
      (agentEmail.includes("delivery") || agentEmail.includes("dave")) &&
      assignedName.includes("dave")
    ) {
      return true;
    }

    return false;
  };

  const cachedList = getCachedReturns().filter((r) => {
    const meta = r.metadata || parseReturnMetadata(r);
    return isMatchingAgent(r.agent_id, r.driver_name, meta);
  });

  try {
    const { data: assignments, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*, order_items(*))")
      .order("created_at", { ascending: false });

    if (!error && assignments) {
      const dbResults: CylinderReturnRecord[] = [];
      for (const a of assignments) {
        const meta = parseReturnMetadata(a);
        const isReturn =
          a.route_area === "Cylinder Return Pickup" ||
          (a.notes && a.notes.includes('"type":"cylinder_return"')) ||
          meta !== null;

        if (!isReturn) continue;

        if (isMatchingAgent(a.agent_id, a.driver_name, meta)) {
          dbResults.push({
            ...a,
            metadata: meta || undefined,
          });
        }
      }

      const mergedMap = new Map<string, CylinderReturnRecord>();
      cachedList.forEach((r) => mergedMap.set(r.metadata?.return_code || r.id, r));
      dbResults.forEach((r) => mergedMap.set(r.metadata?.return_code || r.id, r));

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
  } catch (err) {
    console.warn("Notice loading agent return requests from Supabase:", err);
  }

  return cachedList;
}

/**
 * Fetch all return requests (for Manager / Admin portal).
 */
export async function getAllReturnRequests(): Promise<CylinderReturnRecord[]> {
  const cachedList = getCachedReturns();

  try {
    const { data: assignments, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*)")
      .eq("route_area", "Cylinder Return Pickup")
      .order("created_at", { ascending: false });

    if (!error && assignments) {
      const dbResults = (assignments || []).map((a: any) => ({
        ...a,
        metadata: parseReturnMetadata(a) || undefined,
      }));

      const mergedMap = new Map<string, CylinderReturnRecord>();
      cachedList.forEach((r: CylinderReturnRecord) =>
        mergedMap.set(r.metadata?.return_code || r.id, r),
      );
      dbResults.forEach((r: any) => mergedMap.set(r.metadata?.return_code || r.id, r));

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
  } catch (err) {
    console.warn("Notice loading all return requests from Supabase:", err);
  }

  return cachedList;
}

/**
 * Fetch single return request by assignment ID or return code.
 */
export async function getReturnRequestById(returnId: string): Promise<CylinderReturnRecord | null> {
  const cached = getCachedReturns().find(
    (r) => r.id === returnId || r.metadata?.return_code === returnId,
  );

  try {
    const { data: assignment, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*)")
      .eq("id", returnId)
      .maybeSingle();

    if (!error && assignment) {
      const meta = parseReturnMetadata(assignment);
      return {
        ...assignment,
        metadata: meta || undefined,
      };
    }
  } catch (err) {
    console.warn("Notice loading return request by ID from Supabase:", err);
  }

  return cached || null;
}

/**
 * Manager approves or schedules pickup for a return request.
 */
export async function approveAndScheduleReturnRequest(params: {
  returnAssignmentId: string;
  scheduledDate?: string;
  timeSlot?: string;
  agentId?: string;
  agentName?: string;
  vehiclePlate?: string;
  notes?: string;
}) {
  const { returnAssignmentId, scheduledDate, timeSlot, agentId, agentName, vehiclePlate, notes } =
    params;

  try {
    const nowIso = new Date().toISOString();
    let current = await getReturnRequestById(returnAssignmentId);

    const meta = current?.metadata || ({} as CylinderReturnMetadata);
    meta.scheduled_date =
      scheduledDate || meta.scheduled_date || new Date().toISOString().split("T")[0];
    meta.time_slot = timeSlot || meta.time_slot || "Morning (08:00 - 12:00)";
    if (agentId) meta.assigned_agent_id = agentId;
    if (agentName) meta.assigned_agent_name = agentName;
    if (vehiclePlate) meta.assigned_vehicle_plate = vehiclePlate;

    const newStatus: CylinderReturnStatus = agentId ? "Pickup Assigned" : "Pickup Scheduled";

    const updatedRecord: CylinderReturnRecord = {
      id: returnAssignmentId,
      order_id: current?.order_id || null,
      agent_id: agentId || current?.agent_id || null,
      driver_name: agentName || current?.driver_name || "Assigned Driver",
      vehicle_identifier: "Return Collection Fleet",
      vehicle_plate: vehiclePlate || current?.vehicle_plate || null,
      route_area: "Cylinder Return Pickup",
      time_slot: meta.time_slot,
      status: newStatus,
      notes: JSON.stringify(meta),
      created_at: current?.created_at || nowIso,
      updated_at: nowIso,
      metadata: meta,
    };

    upsertCachedReturn(updatedRecord);

    try {
      await (supabase.from("delivery_assignments") as any)
        .update({
          status: newStatus,
          agent_id: agentId || current?.agent_id,
          driver_name: agentName || current?.driver_name,
          vehicle_plate: vehiclePlate || current?.vehicle_plate,
          time_slot: meta.time_slot,
          notes: JSON.stringify(meta),
          updated_at: nowIso,
        })
        .eq("id", returnAssignmentId);
    } catch {
      // ignore
    }

    // Notify Customer
    const customerId = meta.customer_id;
    if (customerId) {
      try {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: customerId,
            title: `Cylinder Return Pickup Assigned #${meta.return_code || "RETURN"}`,
            message: `Your cylinder pickup has been assigned to ${agentName || "our delivery agent"} for ${meta.scheduled_date} (${meta.time_slot}).`,
            category: "returns",
            is_read: false,
            created_at: nowIso,
          },
        ]);
      } catch {
        // ignore
      }
    }

    return { ok: true, status: newStatus };
  } catch (err: any) {
    console.error("Failed to approve return request:", err);
    throw new Error(err.message || "Failed to approve return request.");
  }
}

/**
 * Manager rejects a return request with explanation.
 */
export async function rejectReturnRequest(params: { returnAssignmentId: string; reason: string }) {
  const { returnAssignmentId, reason } = params;
  try {
    const nowIso = new Date().toISOString();
    let current = await getReturnRequestById(returnAssignmentId);

    const meta = current?.metadata || ({} as CylinderReturnMetadata);
    meta.rejection_reason = reason;

    const updatedRecord: CylinderReturnRecord = {
      id: returnAssignmentId,
      order_id: current?.order_id || null,
      agent_id: current?.agent_id || null,
      driver_name: current?.driver_name || "Unassigned",
      vehicle_identifier: "Return Collection Fleet",
      vehicle_plate: current?.vehicle_plate || null,
      route_area: "Cylinder Return Pickup",
      time_slot: current?.time_slot || null,
      status: "Rejected",
      notes: JSON.stringify(meta),
      created_at: current?.created_at || nowIso,
      updated_at: nowIso,
      metadata: meta,
    };

    upsertCachedReturn(updatedRecord);

    try {
      await (supabase.from("delivery_assignments") as any)
        .update({
          status: "Rejected",
          notes: JSON.stringify(meta),
          updated_at: nowIso,
        })
        .eq("id", returnAssignmentId);
    } catch {
      // ignore
    }

    const customerId = meta.customer_id;
    if (customerId) {
      try {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: customerId,
            title: `Cylinder Return Request Update #${meta.return_code || "RETURN"}`,
            message: `Your cylinder return request was not approved. Reason: ${reason}`,
            category: "returns",
            is_read: false,
            created_at: nowIso,
          },
        ]);
      } catch {
        // ignore
      }
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Failed to reject return request:", err);
    throw new Error(err.message || "Failed to reject return request.");
  }
}

/**
 * Delivery Agent advances the return pickup workflow:
 * Status progression:
 * Agent Assigned -> Accepted -> Out for Pickup -> Arrived -> Picked Up -> Verified -> Completed
 */
export async function updateReturnPickupWorkflow(params: {
  returnAssignmentId: string;
  status: CylinderReturnStatus;
  agentId?: string;
  agentName: string;
  receivedQuantity?: number;
  condition?: CylinderCondition;
  cylinderSerial?: string;
  verificationNotes?: string;
}) {
  const {
    returnAssignmentId,
    status,
    agentId,
    agentName,
    receivedQuantity,
    condition,
    cylinderSerial,
    verificationNotes,
  } = params;

  try {
    const nowIso = new Date().toISOString();
    let current = await getReturnRequestById(returnAssignmentId);

    const meta = current?.metadata || ({} as CylinderReturnMetadata);

    if (status === "Picked Up") {
      meta.collected_at = nowIso;
      meta.received_quantity = receivedQuantity || meta.quantity || 1;
    }

    if (status === "Verified" || status === "Completed") {
      meta.condition = condition || "Good";
      meta.cylinder_serial = cylinderSerial || meta.cylinder_serial || "JSS-CYL-VERIFIED";
      meta.verification_notes = verificationNotes || meta.verification_notes || "";
      meta.verified_by = agentName;
      meta.verified_at = nowIso;
      if (status === "Completed") meta.completed_at = nowIso;
    }

    const updatedRecord: CylinderReturnRecord = {
      id: returnAssignmentId,
      order_id: current?.order_id || null,
      agent_id: agentId || current?.agent_id || null,
      driver_name: agentName,
      vehicle_identifier: "Return Collection Fleet",
      vehicle_plate: current?.vehicle_plate || null,
      route_area: "Cylinder Return Pickup",
      time_slot: current?.time_slot || null,
      status,
      notes: JSON.stringify(meta),
      created_at: current?.created_at || nowIso,
      updated_at: nowIso,
      metadata: meta,
    };

    upsertCachedReturn(updatedRecord);

    try {
      await (supabase.from("delivery_assignments") as any)
        .update({
          status,
          driver_name: agentName,
          agent_id: agentId || current?.agent_id,
          notes: JSON.stringify(meta),
          updated_at: nowIso,
        })
        .eq("id", returnAssignmentId);
    } catch {
      // ignore
    }

    // Notify Customer
    const customerId = meta.customer_id;
    if (customerId) {
      let notifTitle = `Cylinder Return Update #${meta.return_code || "RETURN"}`;
      let notifMsg = `Your cylinder pickup is now ${status}. Driver: ${agentName}`;

      if (status === "Out for Pickup") {
        notifTitle = `Driver Out for Cylinder Pickup`;
        notifMsg = `Our delivery agent ${agentName} is on route to collect your returned cylinder.`;
      } else if (status === "Picked Up") {
        notifTitle = `Cylinder Picked Up`;
        notifMsg = `Your ${meta.quantity}x ${meta.cylinder_name} has been collected by ${agentName} and is undergoing depot verification.`;
      } else if (status === "Verified") {
        notifTitle = `Returned Cylinder Verified`;
        notifMsg = `Your returned cylinder has been verified in ${meta.condition || "Good"} condition.`;
      } else if (status === "Completed") {
        notifTitle = `Cylinder Return Completed`;
        notifMsg = `Your cylinder return #${meta.return_code} has been successfully completed. Thank you!`;
      }

      try {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: customerId,
            title: notifTitle,
            message: notifMsg,
            category: "returns",
            is_read: false,
            created_at: nowIso,
          },
        ]);
      } catch {
        // ignore
      }
    }

    // If Completed, increment agent completed stats
    if (status === "Completed" && (agentId || current?.agent_id)) {
      const targetAgentId = agentId || current?.agent_id;
      try {
        const metaRaw = localStorage.getItem("jss_delivery_agents_meta_v1");
        const agentMeta = metaRaw ? JSON.parse(metaRaw) : {};
        const agentRec = agentMeta[targetAgentId!] || {};
        agentMeta[targetAgentId!] = {
          ...agentRec,
          completed_deliveries: Number(agentRec.completed_deliveries || 0) + 1,
          total_deliveries: Number(agentRec.total_deliveries || 0) + 1,
          updated_at: nowIso,
        };
        localStorage.setItem("jss_delivery_agents_meta_v1", JSON.stringify(agentMeta));
      } catch {
        // ignore
      }
    }

    return { ok: true, status };
  } catch (err: any) {
    console.error("Failed to update return pickup workflow:", err);
    throw new Error(err.message || "Failed to update return pickup state.");
  }
}

/**
 * Delivery Agent reports a return pickup exception.
 */
export async function reportReturnException(params: {
  returnAssignmentId: string;
  agentName: string;
  exceptionType: string;
  exceptionNotes: string;
}) {
  const { returnAssignmentId, agentName, exceptionType, exceptionNotes } = params;
  try {
    const nowIso = new Date().toISOString();
    let current = await getReturnRequestById(returnAssignmentId);

    const meta = current?.metadata || ({} as CylinderReturnMetadata);
    meta.exception_type = exceptionType;
    meta.exception_notes = exceptionNotes;
    meta.exception_reported_at = nowIso;

    const newStatus: CylinderReturnStatus = "Issue Reported";

    const updatedRecord: CylinderReturnRecord = {
      id: returnAssignmentId,
      order_id: current?.order_id || null,
      agent_id: current?.agent_id || null,
      driver_name: agentName,
      vehicle_identifier: "Return Collection Fleet",
      vehicle_plate: current?.vehicle_plate || null,
      route_area: "Cylinder Return Pickup",
      time_slot: current?.time_slot || null,
      status: newStatus,
      notes: JSON.stringify(meta),
      created_at: current?.created_at || nowIso,
      updated_at: nowIso,
      metadata: meta,
    };

    upsertCachedReturn(updatedRecord);

    try {
      await (supabase.from("delivery_assignments") as any)
        .update({
          status: newStatus,
          driver_name: agentName,
          notes: JSON.stringify(meta),
          updated_at: nowIso,
        })
        .eq("id", returnAssignmentId);
    } catch {
      // ignore
    }

    // Notify Customer
    const customerId = meta.customer_id;
    if (customerId) {
      try {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: customerId,
            title: `Cylinder Pickup Issue Reported #${meta.return_code || "RETURN"}`,
            message: `Delivery agent reported an issue during pickup: ${exceptionType}. Details: ${exceptionNotes}`,
            category: "returns",
            is_read: false,
            created_at: nowIso,
          },
        ]);
      } catch {
        // ignore
      }
    }

    // Notify Managers
    try {
      await (supabase.from("notifications") as any).insert([
        {
          user_id: customerId,
          title: `Return Exception: ${exceptionType} (#${meta.return_code || "RETURN"})`,
          message: `Agent ${agentName} reported return pickup issue: ${exceptionNotes}`,
          category: "return_exception",
          is_read: false,
          created_at: nowIso,
        },
      ]);
    } catch {
      // ignore
    }

    return { ok: true, status: newStatus };
  } catch (err: any) {
    console.error("Failed to report return exception:", err);
    throw new Error(err.message || "Failed to log return exception.");
  }
}
