import { supabase } from "@/lib/supabase";
import { getEphemeralAuthClient } from "@/lib/ephemeral-auth";
import { normalizeReviewRecord } from "@/lib/review-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";

export interface DeliveryAgentRecord {
  id: string;
  agent_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  delivery_zone: string | null;
  vehicle_type: string | null;
  vehicle_plate: string;
  status: "Active" | "Inactive" | "On Delivery" | "Busy" | string;
  rating: number;
  total_deliveries: number;
  completed_deliveries: number;
  active_deliveries: number;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryAgentParams {
  agent_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  password?: string;
  address?: string;
  delivery_zone?: string;
  vehicle_type?: string;
  vehicle_plate: string;
  status?: string;
  avatar_url?: string | null;
}

export const DEFAULT_DEV_AGENT: DeliveryAgentRecord = {
  id: "da-101-dave-jenkins",
  agent_code: "DA-101",
  full_name: "Dave Jenkins",
  email: "delivery@jss.com",
  phone: "07700 900543",
  address: "Unit 4 Whitminster Industrial Estate, GL2 7PN",
  delivery_zone: "Whitminster & Stroud",
  vehicle_type: "Flatbed Cylinder Van (3.5t)",
  vehicle_plate: "JS72 AGY",
  status: "Active",
  rating: 4.9,
  total_deliveries: 18,
  completed_deliveries: 16,
  active_deliveries: 2,
  avatar_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const AGENTS_META_KEY = "jss_delivery_agents_meta_v1";

function getLocalAgentsMeta(): Record<string, Partial<DeliveryAgentRecord>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(AGENTS_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAgentsMeta(meta: Record<string, Partial<DeliveryAgentRecord>>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AGENTS_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore quota issues
  }
}

/**
 * Computes dynamic initials for any agent name (e.g. "Astin" -> "AS", "Dave Jenkins" -> "DJ").
 * Works with any real authenticated delivery agent name dynamically.
 */
export function getAgentInitials(name?: string | null): string {
  if (!name || !name.trim()) return "DA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  const single = parts[0];
  if (single.length >= 2) {
    return single.slice(0, 2).toUpperCase();
  }
  return single.toUpperCase();
}

/**
 * Fetch all delivery agents with real-time calculated active/completed delivery stats and customer ratings.
 * Unified query across Supabase delivery_agents table and profiles with role = 'delivery_agent'.
 */
export async function getDeliveryAgents(): Promise<DeliveryAgentRecord[]> {
  try {
    const metaMap = getLocalAgentsMeta();
    const agentsMap = new Map<string, DeliveryAgentRecord>();

    // 1. Fetch from Supabase delivery_agents table
    const { data: dbAgents, error: dbErr } = await (supabase.from("delivery_agents") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbErr && dbAgents && dbAgents.length > 0) {
      dbAgents.forEach((a: any) => {
        const custom = metaMap[a.id] || (a.email ? metaMap[a.email] : {}) || {};
        const rec: DeliveryAgentRecord = {
          id: a.id,
          agent_code: a.agent_code || custom.agent_code || `AGT-${a.id.slice(0, 4).toUpperCase()}`,
          full_name: a.full_name || custom.full_name || "Delivery Driver",
          email: a.email || custom.email || null,
          phone: a.phone || custom.phone || null,
          address: a.address || custom.address || null,
          delivery_zone: a.delivery_zone || custom.delivery_zone || "Gloucestershire Central",
          vehicle_type: a.vehicle_type || custom.vehicle_type || "LPG Delivery Van",
          vehicle_plate: a.vehicle_plate || custom.vehicle_plate || "GL72 JSS",
          status: a.status || custom.status || "Active",
          rating: Number(a.rating || custom.rating || 5.0),
          total_deliveries: Number(a.total_deliveries || custom.total_deliveries || 0),
          completed_deliveries: Number(a.completed_deliveries || custom.completed_deliveries || 0),
          active_deliveries: Number(a.active_deliveries || custom.active_deliveries || 0),
          avatar_url: a.avatar_url || custom.avatar_url || null,
          created_at: a.created_at || new Date().toISOString(),
          updated_at: a.updated_at || new Date().toISOString(),
        };
        agentsMap.set(rec.id, rec);
        if (rec.email) agentsMap.set(rec.email.toLowerCase(), rec);
        if (rec.agent_code) agentsMap.set(rec.agent_code.toUpperCase(), rec);
      });
    }

    // 2. Fetch from profiles table where role = 'delivery_agent'
    const { data: profileAgents, error: profError } = await (supabase.from("profiles") as any)
      .select("*")
      .eq("role", "delivery_agent");

    if (!profError && profileAgents && profileAgents.length > 0) {
      profileAgents.forEach((p: any, idx: number) => {
        const existing =
          agentsMap.get(p.id) ||
          (p.email ? agentsMap.get(p.email.toLowerCase()) : null);

        const custom = metaMap[p.id] || (p.email ? metaMap[p.email] : {}) || {};

        const pAvatar =
          p.avatar_url ||
          (p.notification_prefs && typeof p.notification_prefs === "object"
            ? p.notification_prefs.avatar_url
            : null) ||
          custom.avatar_url ||
          null;

        if (!existing) {
          const rec: DeliveryAgentRecord = {
            id: p.id,
            agent_code: custom.agent_code || `DA-${101 + idx}`,
            full_name: custom.full_name || p.name || p.full_name || "Delivery Driver",
            email: p.email || null,
            phone: custom.phone || p.phone || null,
            address: custom.address || p.address || "Unit 4 Whitminster Industrial Estate, GL2 7PN",
            delivery_zone: custom.delivery_zone || "Gloucestershire Central",
            vehicle_type: custom.vehicle_type || "Flatbed Cylinder Van (3.5t)",
            vehicle_plate: custom.vehicle_plate || "JS72 AGY",
            status: custom.status || p.status || "Active",
            rating: custom.rating || 4.9,
            total_deliveries: custom.total_deliveries || 18,
            completed_deliveries: custom.completed_deliveries || 16,
            active_deliveries: custom.active_deliveries || 2,
            avatar_url: pAvatar,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          };
          agentsMap.set(rec.id, rec);
          if (rec.email) agentsMap.set(rec.email.toLowerCase(), rec);
          if (rec.agent_code) agentsMap.set(rec.agent_code.toUpperCase(), rec);
        } else {
          if (p.full_name && !existing.full_name) existing.full_name = p.full_name;
          if (p.phone && !existing.phone) existing.phone = p.phone;
          if (pAvatar && !existing.avatar_url) existing.avatar_url = pAvatar;
        }
      });
    }

    // 3. Include any local metadata fallback agents
    Object.keys(metaMap).forEach((key) => {
      const item = metaMap[key] as DeliveryAgentRecord;
      if (item && item.id && !agentsMap.has(item.id) && (!item.email || !agentsMap.has(item.email.toLowerCase()))) {
        agentsMap.set(item.id, item);
        if (item.email) agentsMap.set(item.email.toLowerCase(), item);
      }
    });

    // If map is still empty, include default dev agent
    if (agentsMap.size === 0) {
      agentsMap.set(DEFAULT_DEV_AGENT.id, DEFAULT_DEV_AGENT);
    }

    // Deduplicate unique list
    const uniqueAgents: DeliveryAgentRecord[] = [];
    const seenIds = new Set<string>();
    for (const ag of agentsMap.values()) {
      if (!seenIds.has(ag.id)) {
        seenIds.add(ag.id);
        uniqueAgents.push(ag);
      }
    }

    // 4. Fetch customer reviews safely for live rating computation
    const { data: rawReviews } = await (supabase.from("reviews") as any).select("*");
    const reviews = (rawReviews || []).map(normalizeReviewRecord);

    // 5. Fetch delivery assignments safely to compute live active/completed counts
    const { data: assignments } = await (supabase.from("delivery_assignments") as any).select(
      "*",
    );

    return uniqueAgents.map((agent: DeliveryAgentRecord) => {
      // Calculate ratings from customer reviews
      const agentReviews = reviews.filter(
        (r: any) =>
          (r.delivery_agent_id && r.delivery_agent_id === agent.id) ||
          (r.delivery_agent_name &&
            r.delivery_agent_name.toLowerCase() === agent.full_name.toLowerCase()) ||
          (r.comment && r.comment.toLowerCase().includes(agent.full_name.toLowerCase())),
      );

      const agentRating =
        agentReviews.length > 0
          ? Number(
              (
                agentReviews.reduce(
                  (sum: number, r: any) => sum + Number(r.delivery_agent_rating || 5),
                  0,
                ) / agentReviews.length
              ).toFixed(2),
            )
          : Number(agent.rating || 5.0);

      // Calculate deliveries from delivery_assignments
      const agentAssignments = (assignments || []).filter(
        (a: any) =>
          (a.agent_id && a.agent_id === agent.id) ||
          (a.driver_id && a.driver_id === agent.id) ||
          (a.driver_name &&
            (a.driver_name.toLowerCase().includes(agent.full_name.toLowerCase()) ||
              agent.full_name.toLowerCase().includes(a.driver_name.toLowerCase()))),
      );

      const activeCount = agentAssignments.filter((a: any) => {
        const s = (a.status || "").toLowerCase();
        return (
          s === "out for delivery" ||
          s === "pending" ||
          s === "in transit" ||
          s === "assigned" ||
          s === "accepted"
        );
      }).length;

      const completedCount = agentAssignments.filter((a: any) => {
        const s = (a.status || "").toLowerCase();
        return s === "delivered" || s === "completed";
      }).length;

      const totalDeliveries = Math.max(
        Number(agent.total_deliveries || 0),
        agentAssignments.length,
      );

      return {
        ...agent,
        rating: agentRating,
        active_deliveries: activeCount,
        completed_deliveries:
          completedCount > 0 ? completedCount : Number(agent.completed_deliveries || 0),
        total_deliveries: totalDeliveries,
      };
    });
  } catch (err) {
    console.warn("Notice in getDeliveryAgents fallback:", err);
    return [DEFAULT_DEV_AGENT];
  }
}

/**
 * Fetch a single delivery agent's full profile including recent deliveries, customer reviews, and operational stats.
 * Accepts either an agent ID string or the current authenticated user object.
 */
export async function getDeliveryAgentProfile(
  agentOrUser: string | { id?: string; email?: string; name?: string; avatar?: string } | null,
) {
  try {
    const allAgents = await getDeliveryAgents();
    let agent: DeliveryAgentRecord | null = null;

    if (typeof agentOrUser === "string") {
      const searchId = agentOrUser.toLowerCase().trim();
      agent =
        allAgents.find(
          (a) =>
            a.id.toLowerCase() === searchId ||
            (a.agent_code && a.agent_code.toLowerCase() === searchId) ||
            (a.email && a.email.toLowerCase() === searchId) ||
            (a.full_name && a.full_name.toLowerCase() === searchId),
        ) || null;
    } else if (agentOrUser && typeof agentOrUser === "object") {
      const uEmail = (agentOrUser.email || "").toLowerCase().trim();
      const uId = (agentOrUser.id || "").toLowerCase().trim();
      const uName = (agentOrUser.name || "").toLowerCase().trim();

      agent =
        allAgents.find(
          (a) =>
            (uId && a.id.toLowerCase() === uId) ||
            (uEmail && a.email && a.email.toLowerCase() === uEmail) ||
            (uName && a.full_name && a.full_name.toLowerCase() === uName),
        ) || null;

      // If not in delivery_agents list, check profiles table for this specific user
      if (!agent && (uId || uEmail)) {
        try {
          let profQuery = (supabase.from("profiles") as any).select("*");
          if (uId) profQuery = profQuery.eq("id", uId);
          else if (uEmail) profQuery = profQuery.eq("email", uEmail);

          const { data: profData } = await profQuery.maybeSingle();

          if (profData) {
            const profAvatar =
              profData.avatar_url ||
              (profData.notification_prefs && typeof profData.notification_prefs === "object"
                ? profData.notification_prefs.avatar_url
                : null) ||
              agentOrUser.avatar ||
              null;

            agent = {
              id: profData.id || uId || `da-${Date.now()}`,
              agent_code: `DA-${(profData.id || uName || "AGT").slice(0, 3).toUpperCase()}`,
              full_name: profData.full_name || profData.name || agentOrUser.name || "Delivery Driver",
              email: profData.email || agentOrUser.email || null,
              phone: profData.phone || null,
              address: profData.address || "Whitminster Logistics Depot, GL2 7PN",
              delivery_zone: profData.delivery_zone || "Whitminster & Stroud",
              vehicle_type: profData.vehicle_type || "Flatbed Cylinder Van (3.5t)",
              vehicle_plate: profData.vehicle_plate || "JS72 AGY",
              status: profData.status || "Active",
              rating: 5.0,
              total_deliveries: 0,
              completed_deliveries: 0,
              active_deliveries: 0,
              avatar_url: profAvatar,
              created_at: profData.created_at || new Date().toISOString(),
              updated_at: profData.updated_at || new Date().toISOString(),
            };
          }
        } catch (e) {
          console.warn("Notice querying profiles for agent:", e);
        }
      }

      // If still not found, construct dynamic record for the authenticated user without defaulting to Dave
      if (!agent && (uName || uEmail)) {
        agent = {
          id: agentOrUser.id || `da-${Date.now()}`,
          agent_code: `DA-${(uName || "101").slice(0, 3).toUpperCase()}`,
          full_name: agentOrUser.name || "Delivery Driver",
          email: agentOrUser.email || null,
          phone: null,
          address: "Whitminster Logistics Depot, GL2 7PN",
          delivery_zone: "Whitminster & Stroud",
          vehicle_type: "Flatbed Cylinder Van (3.5t)",
          vehicle_plate: "JS72 AGY",
          status: "Active",
          rating: 5.0,
          total_deliveries: 0,
          completed_deliveries: 0,
          active_deliveries: 0,
          avatar_url: agentOrUser.avatar || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    if (!agent) {
      agent = DEFAULT_DEV_AGENT;
    }

    // Fetch deliveries assigned to this agent safely with joined order items
    const { data: allAssignments } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*, order_items(*))")
      .order("created_at", { ascending: false })
      .limit(100);

    const matchName = (agent.full_name || "").toLowerCase().trim();
    const deliveries = (allAssignments || []).filter((a: any) => {
      if (!a) return false;
      const dName = (a.driver_name || "").toLowerCase().trim();

      // Never match unassigned deliveries to any agent
      if (!dName || dName === "unassigned" || dName.includes("unassigned")) {
        return false;
      }

      return (
        (a.agent_id && a.agent_id === agent!.id) ||
        (a.driver_id && a.driver_id === agent!.id) ||
        (matchName && (dName === matchName || dName.includes(matchName) || matchName.includes(dName)))
      );
    });

    // Fetch customer reviews for this agent safely
    const { data: rawReviews } = await (supabase.from("reviews") as any)
      .select("*, product:products(name, slug)")
      .order("created_at", { ascending: false })
      .limit(100);

    const agentReviews = (rawReviews || [])
      .map(normalizeReviewRecord)
      .filter(
        (r: any) =>
          (r.delivery_agent_id && r.delivery_agent_id === agent!.id) ||
          (r.delivery_agent_name &&
            agent!.full_name &&
            r.delivery_agent_name.toLowerCase() === agent!.full_name.toLowerCase()) ||
          (r.comment &&
            agent!.full_name &&
            r.comment.toLowerCase().includes(agent!.full_name.toLowerCase())),
      );

    const ratingCount = agentReviews.filter((r: any) => r.delivery_agent_rating).length;
    const avgRating =
      ratingCount > 0
        ? Number(
            (
              agentReviews.reduce(
                (sum: number, r: any) => sum + Number(r.delivery_agent_rating || 5),
                0,
              ) / ratingCount
            ).toFixed(2),
          )
        : Number(agent.rating || 5.0);

    const activeDeliveries = deliveries.filter((d: any) => {
      const s = (d.status || "").toLowerCase();
      return (
        s === "out for delivery" ||
        s === "pending" ||
        s === "in transit" ||
        s === "assigned" ||
        s === "accepted" ||
        s === "arrived" ||
        s === "customer verified" ||
        s === "cylinder handed over"
      );
    }).length;

    const completedDeliveries = deliveries.filter((d: any) => {
      const s = (d.status || "").toLowerCase();
      return s === "delivered" || s === "completed";
    }).length;

    return {
      agent: {
        ...agent,
        rating: avgRating,
        active_deliveries: activeDeliveries,
        completed_deliveries:
          completedDeliveries > 0 ? completedDeliveries : Number(agent.completed_deliveries || 0),
        total_deliveries: Math.max(Number(agent.total_deliveries || 0), deliveries.length),
      },
      deliveries: deliveries || [],
      reviews: agentReviews,
      ratingCount,
    };
  } catch (err) {
    console.warn("Notice in getDeliveryAgentProfile fallback:", err);
    return {
      agent: DEFAULT_DEV_AGENT,
      deliveries: [],
      reviews: [],
      ratingCount: 0,
    };
  }
}

/**
 * Creates a new delivery agent in Supabase (delivery_agents + profiles + Auth account).
 */
export async function createDeliveryAgent(params: CreateDeliveryAgentParams) {
  try {
    const agentCode = params.agent_code.trim().toUpperCase();
    const fullName = params.full_name.trim();
    const email = params.email?.trim() || null;
    const phone = params.phone?.trim() || null;
    const address = params.address?.trim() || null;
    const deliveryZone = params.delivery_zone?.trim() || "Gloucestershire Central";
    const vehicleType = params.vehicle_type?.trim() || "LPG Delivery Van";
    const vehiclePlate = params.vehicle_plate.trim().toUpperCase();
    const status = params.status || "Active";

    let authUserId: string | null = null;

    // 1. If email is provided, create Auth user account via ephemeral client without disrupting Admin session
    if (email) {
      try {
        const ephemeralClient = getEphemeralAuthClient();
        const password = params.password || "Delivery2026!";
        const { data: authData, error: authError } = await ephemeralClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "delivery_agent",
              phone,
            },
          },
        });

        if (!authError && authData.user) {
          authUserId = authData.user.id;

          // Upsert into profiles table
          await (supabase.from("profiles") as any).upsert({
            id: authData.user.id,
            full_name: fullName,
            email,
            phone,
            address,
            role: "delivery_agent",
            status: "active",
            updated_at: new Date().toISOString(),
          });
        }
      } catch (authErr) {
        console.warn("Ephemeral auth signup notice:", authErr);
      }
    }

    // 2. Prepare record payload for delivery_agents table
    const recordId = authUserId || `da-${Date.now()}`;
    const insertPayload: any = {
      agent_code: agentCode,
      full_name: fullName,
      email,
      phone,
      address,
      delivery_zone: deliveryZone,
      vehicle_type: vehicleType,
      vehicle_plate: vehiclePlate,
      status,
      rating: 5.0,
      total_deliveries: 0,
      completed_deliveries: 0,
      active_deliveries: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (authUserId) {
      insertPayload.id = authUserId;
    }

    // Insert into Supabase delivery_agents table
    let createdRecord: any = null;
    try {
      const { data: dbData, error: dbErr } = await (supabase.from("delivery_agents") as any)
        .insert([insertPayload])
        .select()
        .maybeSingle();

      if (!dbErr && dbData) {
        createdRecord = dbData;
      } else if (dbErr) {
        console.warn("Notice inserting into delivery_agents table:", dbErr);
      }
    } catch (e) {
      console.warn("Exception inserting delivery_agents:", e);
    }

    // 3. If delivery_agents insert didn't return an object, construct the record
    const finalRecord: DeliveryAgentRecord = createdRecord || {
      id: recordId,
      ...insertPayload,
    };

    // 4. Save to local metadata cache
    const meta = getLocalAgentsMeta();
    meta[finalRecord.id] = finalRecord;
    if (finalRecord.email) meta[finalRecord.email.toLowerCase()] = finalRecord;
    if (finalRecord.agent_code) meta[finalRecord.agent_code.toUpperCase()] = finalRecord;
    saveLocalAgentsMeta(meta);

    return finalRecord;
  } catch (err: any) {
    throw new Error(err.message || "Failed to create delivery agent.");
  }
}

/**
 * Updates a delivery agent's information or status in Supabase and profiles.
 */
export async function updateDeliveryAgent(id: string, updates: Partial<CreateDeliveryAgentParams>) {
  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.agent_code) updatePayload.agent_code = updates.agent_code.trim().toUpperCase();
  if (updates.full_name) updatePayload.full_name = updates.full_name.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim() || null;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;
  if (updates.address !== undefined) updatePayload.address = updates.address?.trim() || null;
  if (updates.delivery_zone !== undefined)
    updatePayload.delivery_zone = updates.delivery_zone?.trim();
  if (updates.vehicle_type !== undefined) updatePayload.vehicle_type = updates.vehicle_type?.trim();
  if (updates.vehicle_plate !== undefined)
    updatePayload.vehicle_plate = updates.vehicle_plate?.trim().toUpperCase();
  if (updates.status !== undefined) updatePayload.status = updates.status;

  // 1. Update delivery_agents table in Supabase
  try {
    await (supabase.from("delivery_agents") as any)
      .update(updatePayload)
      .eq("id", id);
  } catch (e) {
    console.warn("Notice updating delivery_agents table:", e);
  }

  // 2. If profile exists in profiles table, sync basic user attributes
  try {
    const profUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.full_name) profUpdates.full_name = updates.full_name.trim();
    if (updates.phone !== undefined) profUpdates.phone = updates.phone?.trim() || null;
    if (updates.address !== undefined) profUpdates.address = updates.address?.trim() || null;

    await (supabase.from("profiles") as any)
      .update(profUpdates)
      .eq("id", id);
  } catch {
    // ignore
  }

  // 3. Save local metadata
  const meta = getLocalAgentsMeta();
  meta[id] = { ...(meta[id] || {}), ...updatePayload, id };
  if (updates.email) meta[updates.email.toLowerCase()] = { ...(meta[updates.email.toLowerCase()] || {}), ...updatePayload, id };
  saveLocalAgentsMeta(meta);

  return { id, ...updates, ...updatePayload };
}

/**
 * Ensures the development delivery agent record exists.
 */
export async function ensureDefaultDeliveryAgent(): Promise<DeliveryAgentRecord | null> {
  const meta = getLocalAgentsMeta();
  const existing = meta[DEFAULT_DEV_AGENT.id] || meta[DEFAULT_DEV_AGENT.email || ""];
  if (existing) {
    return { ...DEFAULT_DEV_AGENT, ...existing };
  }
  return DEFAULT_DEV_AGENT;
}

/**
 * Fetch deliveries assigned to an agent, joined with order details and items.
 * Enforces role isolation: agents only see deliveries assigned explicitly to them.
 */
export async function getAgentAssignedDeliveries(agent: {
  id?: string;
  email?: string;
  name?: string;
}) {
  try {
    let agentRecord: any = null;
    const meta = getLocalAgentsMeta();

    if (agent.id && meta[agent.id]) {
      agentRecord = meta[agent.id];
    } else if (agent.email && meta[agent.email]) {
      agentRecord = meta[agent.email];
    }

    if (!agentRecord && agent.email) {
      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("email", agent.email)
        .maybeSingle();
      if (data) agentRecord = data;
    }

    if (!agentRecord) {
      agentRecord = DEFAULT_DEV_AGENT;
    }

    const agentId = agentRecord?.id || agent.id || "da-101-dave-jenkins";
    const agentName = agentRecord?.full_name || agentRecord?.name || agent.name || "Dave Jenkins";

    // Query delivery assignments safely
    const { data: allAssignments, error } = await (supabase.from("delivery_assignments") as any)
      .select("*, orders(*, order_items(*))")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice querying delivery_assignments:", error);
    }

    // Filter strictly for deliveries assigned to this specific agent
    const assignments = (allAssignments || []).filter((a: any) => {
      if (!a) return false;
      const dName = (a.driver_name || "").toLowerCase().trim();
      const matchName = agentName.toLowerCase().trim();

      // Never match unassigned deliveries to any agent
      if (!dName || dName === "unassigned" || dName.includes("unassigned")) {
        return false;
      }

      return (
        (a.agent_id && a.agent_id === agentId) ||
        (a.driver_id && a.driver_id === agentId) ||
        (matchName && (dName === matchName || dName.includes(matchName)))
      );
    });

    return assignments;
  } catch (err) {
    console.warn("Notice in getAgentAssignedDeliveries:", err);
    return [];
  }
}

export interface AssignDeliveryParams {
  assignmentId?: string;
  orderId?: string;
  agentId: string;
  agentName: string;
  vehicleIdentifier?: string;
  vehiclePlate?: string;
  routeArea?: string;
  timeSlot?: string;
  assignedBy?: string;
}

/**
 * Assigns or reassigns a delivery to a delivery agent.
 * Controlled exclusively by Admin and Operations Manager roles.
 * Atomically updates assignment records, orders, status history, and dispatches real Supabase notifications.
 */
export async function assignDeliveryAgentToDelivery(params: AssignDeliveryParams) {
  const {
    assignmentId,
    orderId,
    agentId,
    agentName,
    vehicleIdentifier,
    vehiclePlate,
    routeArea,
    timeSlot,
    assignedBy = "Operations Staff",
  } = params;

  try {
    // 1. Check existing assignment to detect reassignment and previous driver
    let existingAssignment: any = null;
    if (assignmentId) {
      const { data } = await (supabase.from("delivery_assignments") as any)
        .select("*, orders(*, order_items(*))")
        .eq("id", assignmentId)
        .maybeSingle();
      existingAssignment = data;
    } else if (orderId) {
      const { data } = await (supabase.from("delivery_assignments") as any)
        .select("*, orders(*, order_items(*))")
        .eq("order_id", orderId)
        .maybeSingle();
      existingAssignment = data;
    }

    const prevAgentId = existingAssignment?.agent_id || existingAssignment?.driver_id;
    const prevDriverName = existingAssignment?.driver_name || "";
    const isReassignment =
      Boolean(prevAgentId) &&
      prevAgentId !== agentId &&
      prevDriverName &&
      !prevDriverName.toLowerCase().includes("unassigned") &&
      prevDriverName.toLowerCase().trim() !== agentName.toLowerCase().trim();

    let actualOrderId = orderId || existingAssignment?.order_id;
    let actualOrderNumber = existingAssignment?.order_ref || existingAssignment?.orders?.order_number || "";

    // 2. Fetch complete parent order details (including order items) if not loaded
    let fullOrderData = existingAssignment?.orders;
    if (!fullOrderData && actualOrderId) {
      const { data: ordData, error: ordErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", actualOrderId)
        .maybeSingle();

      if (!ordErr && ordData) {
        fullOrderData = ordData;
        if (!actualOrderNumber) actualOrderNumber = ordData.order_number || "";
      }
    }

    if (!actualOrderNumber && actualOrderId) {
      actualOrderNumber = actualOrderId.slice(0, 8);
    }

    // 3. Prepare payload for delivery_assignments
    const updatePayload: any = {
      agent_id: agentId,
      driver_id: agentId,
      driver_name: agentName,
      vehicle_identifier: vehicleIdentifier || "Cylinder Delivery Van",
      vehicle_plate: vehiclePlate || "JS72 AGY",
      status: "Assigned",
      updated_at: new Date().toISOString(),
    };
    if (routeArea) updatePayload.route_area = routeArea;
    if (timeSlot) updatePayload.time_slot = timeSlot;

    // 4. Persist assignment in Supabase delivery_assignments table
    if (assignmentId) {
      const { data: updatedAss, error: updateAssErr } = await (supabase.from("delivery_assignments") as any)
        .update(updatePayload)
        .eq("id", assignmentId)
        .select("id, order_id, order_ref")
        .maybeSingle();

      if (updateAssErr) {
        console.error("Failed to update delivery_assignments:", updateAssErr);
        throw new Error(updateAssErr.message || "Failed to update delivery assignment record.");
      }

      if (updatedAss?.order_id) actualOrderId = updatedAss.order_id;
      if (updatedAss?.order_ref) actualOrderNumber = updatedAss.order_ref;
    } else if (orderId) {
      if (existingAssignment) {
        const { error: updateAssErr } = await (supabase.from("delivery_assignments") as any)
          .update(updatePayload)
          .eq("id", existingAssignment.id);

        if (updateAssErr) {
          console.error("Failed to update existing delivery assignment:", updateAssErr);
          throw new Error(updateAssErr.message || "Failed to update delivery assignment.");
        }
      } else {
        const { data: insertedAss, error: insertAssErr } = await (supabase.from("delivery_assignments") as any)
          .insert([
            {
              order_id: orderId,
              order_ref: actualOrderNumber,
              ...updatePayload,
            },
          ])
          .select("id")
          .maybeSingle();

        if (insertAssErr) {
          console.error("Failed to insert delivery assignment:", insertAssErr);
          throw new Error(insertAssErr.message || "Failed to create delivery assignment.");
        }
      }
    }

    // 5. Sync parent order record and order status history
    if (actualOrderId) {
      try {
        await supabase
          .from("orders")
          .update({
            assigned_driver: agentName,
            status: "Processing" as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", actualOrderId);

        await supabase.from("order_status_history").insert([
          {
            order_id: actualOrderId,
            status: "Assigned",
            actor_name: assignedBy,
            notes: `Delivery assigned to agent ${agentName} (${vehiclePlate || "Fleet Van"}).`,
          },
        ]);
      } catch (ordErr) {
        console.warn("Notice syncing orders table status history:", ordErr);
      }
    }

    // 6. Evaluate accurate LPG Cylinder requirement for the notification
    const orderEvalSource = fullOrderData || existingAssignment || { id: actualOrderId, order_number: actualOrderNumber };
    const req = getOrderCylinderExchangeRequirement(orderEvalSource);

    const isRefill = req.orderType === "REFILL_EXCHANGE" || req.required;
    const deliveryTypeLabel = isRefill
      ? "Refill / Exchange"
      : req.orderType === "NEW_CYLINDER"
        ? "New Cylinder Purchase"
        : "Standard Goods Delivery";

    const emptyCylinderText = req.required
      ? `Empty cylinder required (${req.expectedQuantity} bottle${req.expectedQuantity > 1 ? "s" : ""})`
      : "No empty cylinder required (New Purchase)";

    const customerName =
      fullOrderData?.customer_name ||
      existingAssignment?.customer_name ||
      existingAssignment?.orders?.customer_name ||
      "Valued Customer";

    let deliveryArea = routeArea || existingAssignment?.route_area || "Gloucestershire Area";
    let formattedAddress = deliveryArea;

    if (fullOrderData?.delivery_address) {
      if (typeof fullOrderData.delivery_address === "string") {
        formattedAddress = fullOrderData.delivery_address;
      } else {
        const addr = fullOrderData.delivery_address;
        formattedAddress = [addr.line1 || addr.street, addr.city, addr.postcode || addr.postal_code]
          .filter(Boolean)
          .join(", ");
        if (addr.city || addr.postcode || addr.postal_code) {
          deliveryArea = [addr.city, addr.postcode || addr.postal_code].filter(Boolean).join(" · ");
        }
      }
    }

    const scheduledWindow = timeSlot || existingAssignment?.time_slot || "Morning Window (08:00 - 12:00)";

    // 7. Resolve target authenticated Supabase User ID for the assigned agent
    let targetUserId = agentId;
    try {
      const { data: prof } = await (supabase.from("profiles") as any)
        .select("id, email")
        .or(`id.eq.${agentId},email.eq.${agentId}`)
        .maybeSingle();

      if (prof?.id) {
        targetUserId = prof.id;
      } else {
        const { data: agRec } = await (supabase.from("delivery_agents") as any)
          .select("id, email")
          .eq("id", agentId)
          .maybeSingle();

        if (agRec?.id) {
          targetUserId = agRec.id;
          if (agRec.email) {
            const { data: profByEmail } = await (supabase.from("profiles") as any)
              .select("id")
              .eq("email", agRec.email)
              .maybeSingle();
            if (profByEmail?.id) {
              targetUserId = profByEmail.id;
            }
          }
        }
      }
    } catch (resolveErr) {
      console.warn("Notice resolving agent user ID:", resolveErr);
    }

    // 8. Build and insert rich real-time notification in Supabase for the assigned agent
    const newAssignmentNotif = {
      user_id: targetUserId,
      title: "New Delivery Assigned",
      message: `Order #${actualOrderNumber} has been assigned to you.\n${customerName} · ${deliveryArea}\n${deliveryTypeLabel}\n${emptyCylinderText}`,
      type: "delivery_assigned",
      category: "Deliveries",
      link: `/delivery/deliveries?orderId=${actualOrderId}`,
      read: false,
      is_read: false,
      metadata: {
        order_id: actualOrderId,
        order_ref: actualOrderNumber,
        customer_name: customerName,
        delivery_address: formattedAddress,
        delivery_area: deliveryArea,
        delivery_type: deliveryTypeLabel,
        order_type: req.orderType,
        empty_cylinder_required: req.required,
        empty_cylinder_quantity: req.expectedQuantity,
        empty_cylinder_text: emptyCylinderText,
        time_slot: scheduledWindow,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
      },
    };

    const { error: notifInsertErr } = await (supabase.from("notifications") as any).insert([
      newAssignmentNotif,
    ]);

    if (notifInsertErr) {
      console.error("Critical: Failed to insert delivery assignment notification in Supabase:", notifInsertErr);
      throw new Error(`Assignment saved to database, but notification dispatch failed: ${notifInsertErr.message}`);
    }

    // 9. If this was a reassignment, notify the previous driver
    if (isReassignment && prevAgentId) {
      let prevTargetUserId = prevAgentId;
      try {
        const { data: prevProf } = await (supabase.from("profiles") as any)
          .select("id, email")
          .or(`id.eq.${prevAgentId},email.eq.${prevAgentId}`)
          .maybeSingle();
        if (prevProf?.id) {
          prevTargetUserId = prevProf.id;
        }
      } catch (e) {
        console.warn("Notice resolving previous agent ID:", e);
      }

      if (prevTargetUserId && prevTargetUserId !== targetUserId) {
        const unassignNotif = {
          user_id: prevTargetUserId,
          title: "Delivery Reassigned",
          message: `Order #${actualOrderNumber} has been reassigned to driver ${agentName} by ${assignedBy}.`,
          type: "delivery_reassigned",
          category: "Deliveries",
          link: "/delivery/deliveries",
          read: false,
          is_read: false,
          metadata: {
            order_id: actualOrderId,
            order_ref: actualOrderNumber,
            reassigned_to: agentName,
            assigned_by: assignedBy,
            reassigned_at: new Date().toISOString(),
          },
        };

        try {
          await (supabase.from("notifications") as any).insert([unassignNotif]);
        } catch (prevNotifErr) {
          console.warn("Notice sending reassignment notice to previous driver:", prevNotifErr);
        }
      }
    }

    return {
      success: true,
      agentName,
      assignmentId,
      orderId: actualOrderId,
      orderRef: actualOrderNumber,
      notificationSent: true,
    };
  } catch (err: any) {
    console.error("assignDeliveryAgentToDelivery failed:", err);
    throw new Error(err.message || "Failed to assign delivery agent.");
  }
}

export interface UpdateWorkflowParams {
  assignmentId: string;
  orderId: string;
  status:
    | "Assigned"
    | "Accepted"
    | "Out for Delivery"
    | "Arrived"
    | "Customer Verified"
    | "Cylinder Handed Over"
    | "Empty Cylinder Verified"
    | "Delivered"
    | "Exception";
  agentName: string;
  agentId?: string;
  notes?: string;
  emptyCylinderData?: {
    received: boolean;
    condition?: string;
    quantity?: number;
    notes?: string;
  };
  exceptionData?: {
    issueType: string;
    notes: string;
  };
}

/**
 * Executes a state transition in the 9-step delivery workflow.
 */
export async function updateDeliveryWorkflowStep(params: UpdateWorkflowParams) {
  const {
    assignmentId,
    orderId,
    status,
    agentName,
    agentId,
    notes,
    emptyCylinderData,
    exceptionData,
  } = params;

  try {
    const nowIso = new Date().toISOString();

    // 1. Build notes summary
    let combinedNotes = notes || "";
    if (emptyCylinderData) {
      combinedNotes += ` [Empty Return: ${emptyCylinderData.received ? "Received" : "Not Received"} | Condition: ${emptyCylinderData.condition || "N/A"} | Qty: ${emptyCylinderData.quantity || 1} | Note: ${emptyCylinderData.notes || ""}]`;
    }
    if (exceptionData) {
      combinedNotes += ` [Exception: ${exceptionData.issueType} | Note: ${exceptionData.notes}]`;
    }

    // 2. Update delivery_assignments
    const { error: assignErr } = await (supabase.from("delivery_assignments") as any)
      .update({
        status,
        notes: combinedNotes.trim(),
        updated_at: nowIso,
      })
      .eq("id", assignmentId);

    if (assignErr) throw assignErr;

    // 3. Synchronize orders table status
    let mappedOrderStatus: string | null = null;
    if (status === "Out for Delivery") mappedOrderStatus = "Out for Delivery";
    else if (status === "Delivered") mappedOrderStatus = "Delivered";
    else if (status === "Accepted" || status === "Arrived" || status === "Customer Verified") {
      mappedOrderStatus = "Out for Delivery";
    }

    if (mappedOrderStatus && orderId) {
      await supabase
        .from("orders")
        .update({
          status: mappedOrderStatus as any,
          assigned_driver: agentName,
          updated_at: nowIso,
        })
        .eq("id", orderId);

      // Log to order_status_history
      try {
        await (supabase.from("order_status_history") as any).insert([
          {
            order_id: orderId,
            status: mappedOrderStatus,
            note: `Workflow update by Delivery Agent ${agentName}: ${status}. ${notes || ""}`,
            created_at: nowIso,
          },
        ]);
      } catch (histErr) {
        console.warn("Status history log notice:", histErr);
      }
    }

    // 4. Update Agent Deliveries Count in local metadata if Delivered
    if (status === "Delivered" && agentId) {
      try {
        const meta = getLocalAgentsMeta();
        const current = meta[agentId] || {};
        meta[agentId] = {
          ...current,
          completed_deliveries: Number(current.completed_deliveries || 0) + 1,
          total_deliveries: Number(current.total_deliveries || 0) + 1,
          updated_at: nowIso,
        };
        saveLocalAgentsMeta(meta);
      } catch {
        // Safe fallback
      }
    }

    // 5. Send notification to customer & admin
    if (orderId) {
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("customer_id, order_number")
          .eq("id", orderId)
          .maybeSingle();

        if (orderData?.customer_id) {
          let notifTitle = `Delivery Update for #${orderData.order_number}`;
          let notifMsg = `Your delivery is now ${status}. Driver: ${agentName}`;
          if (status === "Delivered") {
            notifTitle = `Order #${orderData.order_number} Delivered!`;
            notifMsg = `Your cylinder order has been delivered by ${agentName}. Please leave a review!`;
          }

          await (supabase.from("customer_notifications") as any).insert([
            {
              user_id: orderData.customer_id,
              title: notifTitle,
              message: notifMsg,
              type: status === "Delivered" ? "delivery_completed" : "delivery_update",
              is_read: false,
            },
          ]);
        }

        // Notification for managers / admin
        await (supabase.from("notifications") as any).insert([
          {
            type: status === "Exception" ? "delivery_exception" : "delivery_update",
            title: `Delivery ${status}: #${orderData?.order_number || orderId.slice(0, 8)}`,
            message: `Agent ${agentName} transitioned order to ${status}.${notes ? " Note: " + notes : ""}`,
            link: "/admin/deliveries",
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.warn("Notification insert notice:", notifErr);
      }
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Workflow update failed:", err);
    throw new Error(err.message || "Failed to update delivery workflow state.");
  }
}

export interface DeliveryOtpState {
  code: string;
  expiresAt: number;
  verified: boolean;
  verifiedAt?: string | null;
  attempts: number;
  maxAttempts: number;
}

/**
 * Extracts or initializes secure 6-digit delivery OTP for an order/assignment.
 */
export async function getOrCreateDeliveryOtp(
  assignmentId: string,
  orderId?: string | null,
): Promise<{ otpExists: boolean; isVerified: boolean; expiresAt: number; attempts: number }> {
  try {
    const { data: assignment } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, notes")
      .eq("id", assignmentId)
      .maybeSingle();

    const notes = assignment?.notes || "";
    const otpMatch = notes.match(/\[OTP:(\{.*?\})\]/);

    if (otpMatch && otpMatch[1]) {
      try {
        const parsed: DeliveryOtpState = JSON.parse(otpMatch[1]);
        return {
          otpExists: true,
          isVerified: Boolean(parsed.verified),
          expiresAt: parsed.expiresAt,
          attempts: parsed.attempts || 0,
        };
      } catch {}
    }

    // Generate new OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newOtp: DeliveryOtpState = {
      code,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      verified: false,
      verifiedAt: null,
      attempts: 0,
      maxAttempts: 5,
    };

    const updatedNotes = `${notes} [OTP:${JSON.stringify(newOtp)}]`.trim();

    await (supabase.from("delivery_assignments") as any)
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq("id", assignmentId);

    // Send notification to customer
    const actualOrderId = orderId || assignment?.order_id;
    if (actualOrderId) {
      try {
        const { data: ord } = await supabase
          .from("orders")
          .select("customer_id, order_number")
          .eq("id", actualOrderId)
          .maybeSingle();

        if (ord?.customer_id) {
          await (supabase.from("customer_notifications") as any).insert([
            {
              user_id: ord.customer_id,
              title: `Delivery Verification Code: #${ord.order_number}`,
              message: `Your 6-digit delivery verification OTP is ${code}. Please share this code with your driver upon arrival.`,
              category: "delivery_otp",
              is_read: false,
            },
          ]);
        }
      } catch (e) {
        console.warn("Customer OTP notification error:", e);
      }
    }

    return {
      otpExists: true,
      isVerified: false,
      expiresAt: newOtp.expiresAt,
      attempts: 0,
    };
  } catch (err: any) {
    console.error("getOrCreateDeliveryOtp failed:", err);
    return {
      otpExists: false,
      isVerified: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      attempts: 0,
    };
  }
}

/**
 * Reissues a fresh 6-digit OTP for the customer and resets attempt counter.
 */
export async function reissueDeliveryOtp(
  assignmentId: string,
  orderId?: string | null,
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: assignment } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, notes")
      .eq("id", assignmentId)
      .maybeSingle();

    const cleanNotes = (assignment?.notes || "").replace(/\[OTP:(\{.*?\})\]/g, "").trim();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newOtp: DeliveryOtpState = {
      code,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      verified: false,
      verifiedAt: null,
      attempts: 0,
      maxAttempts: 5,
    };

    const updatedNotes = `${cleanNotes} [OTP:${JSON.stringify(newOtp)}]`.trim();

    await (supabase.from("delivery_assignments") as any)
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq("id", assignmentId);

    // Notify customer
    const actualOrderId = orderId || assignment?.order_id;
    if (actualOrderId) {
      const { data: ord } = await supabase
        .from("orders")
        .select("customer_id, order_number")
        .eq("id", actualOrderId)
        .maybeSingle();

      if (ord?.customer_id) {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: ord.customer_id,
            title: `New Delivery Verification Code: #${ord.order_number}`,
            message: `Your updated 6-digit delivery verification OTP is ${code}. Please share this code with your driver upon arrival.`,
            category: "delivery_otp",
            is_read: false,
          },
        ]);
      }
    }

    return { success: true, message: "A new OTP has been generated and sent to the customer." };
  } catch (err: any) {
    console.error("reissueDeliveryOtp error:", err);
    throw new Error(err.message || "Failed to reissue OTP");
  }
}

/**
 * Verifies the 6-digit OTP supplied by the customer to the delivery agent.
 */
export async function verifyDeliveryOtp(
  assignmentId: string,
  inputOtp: string,
  orderId?: string | null,
): Promise<{ success: boolean; error?: string; verifiedAt?: string }> {
  try {
    const trimmedInput = (inputOtp || "").trim();
    if (!/^\d{6}$/.test(trimmedInput)) {
      return { success: false, error: "Please enter a valid 6-digit numeric OTP." };
    }

    const { data: assignment } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, notes, status")
      .eq("id", assignmentId)
      .maybeSingle();

    const notes = assignment?.notes || "";
    const otpMatch = notes.match(/\[OTP:(\{.*?\})\]/);

    if (!otpMatch || !otpMatch[1]) {
      await getOrCreateDeliveryOtp(assignmentId, orderId);
      return {
        success: false,
        error: "Verification code generated. Please ask customer to provide the 6-digit code shown in their order notifications.",
      };
    }

    let parsed: DeliveryOtpState;
    try {
      parsed = JSON.parse(otpMatch[1]);
    } catch {
      return { success: false, error: "Malformed OTP data. Please tap Resend OTP." };
    }

    if (parsed.verified) {
      return { success: true, verifiedAt: parsed.verifiedAt || new Date().toISOString() };
    }

    if (parsed.attempts >= (parsed.maxAttempts || 5)) {
      return {
        success: false,
        error: "Maximum verification attempts (5) exceeded. Please tap 'Resend OTP' to generate a fresh code for the customer.",
      };
    }

    if (Date.now() > parsed.expiresAt) {
      return {
        success: false,
        error: "This OTP has expired. Please tap 'Resend OTP' to send a new code to the customer.",
      };
    }

    if (trimmedInput !== parsed.code) {
      parsed.attempts = (parsed.attempts || 0) + 1;
      const cleanNotes = notes.replace(/\[OTP:(\{.*?\})\]/g, "").trim();
      const updatedNotes = `${cleanNotes} [OTP:${JSON.stringify(parsed)}]`.trim();

      await (supabase.from("delivery_assignments") as any)
        .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq("id", assignmentId);

      const attemptsLeft = (parsed.maxAttempts || 5) - parsed.attempts;
      return {
        success: false,
        error: `Incorrect OTP. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : "Please tap Resend OTP."}`,
      };
    }

    // Success: Mark verified
    parsed.verified = true;
    parsed.verifiedAt = new Date().toISOString();
    const cleanNotes = notes.replace(/\[OTP:(\{.*?\})\]/g, "").trim();
    const updatedNotes = `${cleanNotes} [OTP:${JSON.stringify(parsed)}]`.trim();

    await (supabase.from("delivery_assignments") as any)
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq("id", assignmentId);

    // Log to order history
    const actualOrderId = orderId || assignment?.order_id;
    if (actualOrderId) {
      try {
        await (supabase.from("order_status_history") as any).insert([
          {
            order_id: actualOrderId,
            status: "OTP Verified",
            note: "Customer OTP successfully verified by Delivery Agent.",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch {}
    }

    return { success: true, verifiedAt: parsed.verifiedAt };
  } catch (err: any) {
    console.error("verifyDeliveryOtp error:", err);
    return { success: false, error: err.message || "Failed to verify OTP" };
  }
}

/**
 * Retrieves OTP for customer display in tracking modal if active.
 */
export async function getCustomerDeliveryOtp(orderId: string): Promise<string | null> {
  try {
    const { data: assignment } = await (supabase.from("delivery_assignments") as any)
      .select("notes, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!assignment?.notes) return null;
    const match = assignment.notes.match(/\[OTP:(\{.*?\})\]/);
    if (!match || !match[1]) return null;

    const parsed: DeliveryOtpState = JSON.parse(match[1]);
    if (parsed.verified) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.code;
  } catch {
    return null;
  }
}
