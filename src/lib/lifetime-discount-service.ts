import { supabase } from "@/lib/supabase";

export interface LifetimeDiscountTier {
  id: string;
  tier_name: string;
  min_spend: number;
  max_spend: number | null;
  discount_percentage: number;
  is_active: boolean;
  display_order: number;
}

export interface LifetimeDiscountProgramme {
  isEnabled: boolean;
  tiers: LifetimeDiscountTier[];
  source: "database" | "default";
}

export interface CustomerLifetimeDiscountSummary {
  customerId: string;
  programmeEnabled: boolean;
  eligibleSpend: number;
  eligibleOrderCount: number;
  currentTierId: string | null;
  currentTierName: string;
  discountPercentage: number;
  nextTierId: string | null;
  nextTierName: string | null;
  nextTierMinSpend: number | null;
  nextTierDiscountPercentage: number | null;
  remainingToNextTier: number;
}

export interface CustomerEligibilityRow extends CustomerLifetimeDiscountSummary {
  fullName: string;
  email: string;
  accountNumber: string | null;
  assignedPricingBand: string | null;
  hasExplicitDiscountArrangement: boolean;
}

export interface EligibleOrderRecord {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  total: number;
  isEligible: boolean;
  exclusionReason?: string;
}

export const DEFAULT_LIFETIME_TIERS: LifetimeDiscountTier[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    tier_name: "Standard Starter",
    min_spend: 0,
    max_spend: 499.99,
    discount_percentage: 0,
    is_active: true,
    display_order: 1,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    tier_name: "Bronze Loyalty (10%)",
    min_spend: 500,
    max_spend: 999.99,
    discount_percentage: 10,
    is_active: true,
    display_order: 2,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    tier_name: "Silver Loyalty (17.5%)",
    min_spend: 1000,
    max_spend: 2499.99,
    discount_percentage: 17.5,
    is_active: true,
    display_order: 3,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    tier_name: "Gold Loyalty (20%)",
    min_spend: 2500,
    max_spend: 4999.99,
    discount_percentage: 20,
    is_active: true,
    display_order: 4,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    tier_name: "Platinum Loyalty (25%)",
    min_spend: 5000,
    max_spend: null,
    discount_percentage: 25,
    is_active: true,
    display_order: 5,
  },
];

const EXCLUDED_ORDER_STATUSES = new Set(["cancelled", "canceled", "failed", "refunded"]);
const EXCLUDED_PAYMENT_STATUSES = new Set(["failed", "cancelled", "canceled", "refunded"]);

/**
 * Determines whether a single order qualifies toward lifetime purchase spend.
 */
export function evaluateOrderEligibility(order: {
  id?: string;
  status?: string | null;
  payment_status?: string | null;
  total?: number | string | null;
}): { isEligible: boolean; reason?: string } {
  const status = String(order?.status || "").trim().toLowerCase();
  const payStatus = String(order?.payment_status || "").trim().toLowerCase();
  const total = Number(order?.total ?? 0);

  if (EXCLUDED_ORDER_STATUSES.has(status)) {
    return { isEligible: false, reason: `Excluded (${order?.status})` };
  }
  if (EXCLUDED_PAYMENT_STATUSES.has(payStatus)) {
    return { isEligible: false, reason: `Excluded (Payment ${order?.payment_status})` };
  }
  if (isNaN(total) || total <= 0) {
    return { isEligible: false, reason: "Zero or invalid total" };
  }
  if (status === "delivered" || payStatus === "paid") {
    return { isEligible: true };
  }
  return { isEligible: false, reason: `Pending completion (${order?.status || "Pending"})` };
}

/**
 * Computes deduplicated eligible cumulative spend and order count from an order list.
 */
export function calculateEligibleOrdersSpend(
  orders: Array<{
    id: string;
    status?: string | null;
    payment_status?: string | null;
    total?: number | string | null;
  }>,
): { eligibleSpend: number; eligibleOrderCount: number } {
  const seenIds = new Set<string>();
  let totalSpend = 0;
  let count = 0;

  for (const ord of orders) {
    if (!ord?.id || seenIds.has(ord.id)) continue;
    seenIds.add(ord.id);

    const check = evaluateOrderEligibility(ord);
    if (check.isEligible) {
      totalSpend += Number(ord.total || 0);
      count += 1;
    }
  }

  return {
    eligibleSpend: Number(totalSpend.toFixed(2)),
    eligibleOrderCount: count,
  };
}

/**
 * Pure tier resolver: matches cumulative spend against active tiers and computes next tier progress.
 */
export function resolveLifetimeTierForSpend(params: {
  customerId: string;
  eligibleSpend: number;
  eligibleOrderCount: number;
  tiers: LifetimeDiscountTier[];
  programmeEnabled: boolean;
}): CustomerLifetimeDiscountSummary {
  const { customerId, eligibleSpend, eligibleOrderCount, tiers, programmeEnabled } = params;
  const activeTiers = [...tiers]
    .filter((t) => t.is_active)
    .sort((a, b) => a.min_spend - b.min_spend);

  let matched: LifetimeDiscountTier | null = null;
  for (const t of activeTiers) {
    if (eligibleSpend >= t.min_spend && (t.max_spend === null || eligibleSpend <= t.max_spend)) {
      matched = t;
    }
  }
  if (!matched) {
    const eligibleBelow = activeTiers.filter((t) => eligibleSpend >= t.min_spend);
    matched = eligibleBelow.length > 0 ? eligibleBelow[eligibleBelow.length - 1] : null;
  }

  const nextTier = activeTiers.find((t) => t.min_spend > eligibleSpend) || null;
  const remaining = nextTier ? Number(Math.max(0, nextTier.min_spend - eligibleSpend).toFixed(2)) : 0;

  return {
    customerId,
    programmeEnabled,
    eligibleSpend: Number(eligibleSpend.toFixed(2)),
    eligibleOrderCount,
    currentTierId: matched?.id || null,
    currentTierName: matched?.tier_name || "Standard Starter",
    discountPercentage: programmeEnabled ? Number(matched?.discount_percentage || 0) : 0,
    nextTierId: nextTier?.id || null,
    nextTierName: nextTier?.tier_name || null,
    nextTierMinSpend: nextTier ? Number(nextTier.min_spend) : null,
    nextTierDiscountPercentage: nextTier ? Number(nextTier.discount_percentage) : null,
    remainingToNextTier: remaining,
  };
}

/**
 * Fetches programme configuration and tiers from Supabase (falling back to default tiers if table is not yet migrated).
 */
export async function getLifetimeDiscountProgramme(): Promise<LifetimeDiscountProgramme> {
  try {
    const [cfgRes, tiersRes] = await Promise.all([
      (supabase.from("lifetime_discount_config") as any)
        .select("is_enabled")
        .eq("id", true)
        .maybeSingle(),
      (supabase.from("lifetime_discount_tiers") as any)
        .select("*")
        .order("min_spend", { ascending: true }),
    ]);

    if (tiersRes.error || !Array.isArray(tiersRes.data) || tiersRes.data.length === 0) {
      return {
        isEnabled: cfgRes.data ? Boolean(cfgRes.data.is_enabled) : true,
        tiers: [...DEFAULT_LIFETIME_TIERS],
        source: "default",
      };
    }

    return {
      isEnabled: cfgRes.data ? Boolean(cfgRes.data.is_enabled) : true,
      tiers: tiersRes.data.map((t: any) => ({
        id: t.id,
        tier_name: t.tier_name,
        min_spend: Number(t.min_spend),
        max_spend: t.max_spend !== null && t.max_spend !== undefined ? Number(t.max_spend) : null,
        discount_percentage: Number(t.discount_percentage),
        is_active: Boolean(t.is_active),
        display_order: Number(t.display_order || 1),
      })),
      source: "database",
    };
  } catch {
    return {
      isEnabled: true,
      tiers: [...DEFAULT_LIFETIME_TIERS],
      source: "default",
    };
  }
}

export async function updateLifetimeProgrammeEnabled(
  isEnabled: boolean,
  updatedBy?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase.from("lifetime_discount_config") as any).upsert(
    {
      id: true,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertLifetimeDiscountTier(tier: {
  id?: string;
  tier_name: string;
  min_spend: number;
  max_spend: number | null;
  discount_percentage: number;
  is_active: boolean;
  display_order?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, any> = {
    tier_name: tier.tier_name.trim(),
    min_spend: Number(tier.min_spend),
    max_spend: tier.max_spend !== null && tier.max_spend !== undefined ? Number(tier.max_spend) : null,
    discount_percentage: Number(tier.discount_percentage),
    is_active: Boolean(tier.is_active),
    display_order: Number(tier.display_order ?? 1),
    updated_at: new Date().toISOString(),
  };
  if (tier.id) {
    payload.id = tier.id;
  }

  const { error } = await (supabase.from("lifetime_discount_tiers") as any)
    .upsert(payload, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleLifetimeTierActive(
  tierId: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase.from("lifetime_discount_tiers") as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", tierId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fetches a single customer's authoritative lifetime discount summary.
 * Uses get_customer_lifetime_discount RPC if deployed, otherwise computes from live orders + tiers.
 */
export async function getCustomerLifetimeDiscountSummary(
  customerId: string,
): Promise<CustomerLifetimeDiscountSummary> {
  try {
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
      "get_customer_lifetime_discount",
      { p_customer_id: customerId },
    );

    if (!rpcErr && rpcData && rpcData.ok) {
      return {
        customerId,
        programmeEnabled: Boolean(rpcData.programme_enabled),
        eligibleSpend: Number(rpcData.eligible_spend || 0),
        eligibleOrderCount: Number(rpcData.eligible_order_count || 0),
        currentTierId: rpcData.tier_id || null,
        currentTierName: rpcData.tier_name || "Standard Starter",
        discountPercentage: Number(rpcData.discount_percentage || 0),
        nextTierId: rpcData.next_tier_id || null,
        nextTierName: rpcData.next_tier_name || null,
        nextTierMinSpend:
          rpcData.next_tier_min_spend !== null && rpcData.next_tier_min_spend !== undefined
            ? Number(rpcData.next_tier_min_spend)
            : null,
        nextTierDiscountPercentage:
          rpcData.next_tier_discount_percentage !== null &&
          rpcData.next_tier_discount_percentage !== undefined
            ? Number(rpcData.next_tier_discount_percentage)
            : null,
        remainingToNextTier: Number(rpcData.remaining_to_next_tier || 0),
      };
    }
  } catch {
    /* Fallback to direct query calculation */
  }

  const [programme, ordersRes] = await Promise.all([
    getLifetimeDiscountProgramme(),
    supabase
      .from("orders")
      .select("id, status, payment_status, total")
      .eq("customer_id", customerId),
  ]);

  const { eligibleSpend, eligibleOrderCount } = calculateEligibleOrdersSpend(
    (ordersRes.data || []) as any[],
  );

  return resolveLifetimeTierForSpend({
    customerId,
    eligibleSpend,
    eligibleOrderCount,
    tiers: programme.tiers,
    programmeEnabled: programme.isEnabled,
  });
}

/**
 * Loads all customers with their lifetime eligible spend, current tier, and next tier progress
 * for Admin and Manager Eligibility Management views.
 */
export async function getCustomerLifetimeEligibilityList(): Promise<{
  programme: LifetimeDiscountProgramme;
  customers: CustomerEligibilityRow[];
}> {
  const [programme, profilesRes, ordersRes] = await Promise.all([
    getLifetimeDiscountProgramme(),
    (supabase.from("profiles") as any)
      .select("id, full_name, email, role, customer_code, account_number, pricing_band, pricing_band_id, discount_percentage")
      .eq("role", "customer")
      .order("full_name", { ascending: true }),
    supabase
      .from("orders")
      .select("id, customer_id, status, payment_status, total"),
  ]);

  const ordersByCustomer = new Map<string, any[]>();
  for (const ord of (ordersRes.data || []) as any[]) {
    if (!ord.customer_id) continue;
    const list = ordersByCustomer.get(ord.customer_id) || [];
    list.push(ord);
    ordersByCustomer.set(ord.customer_id, list);
  }

  const customers: CustomerEligibilityRow[] = ((profilesRes.data || []) as any[]).map((prof) => {
    const custOrders = ordersByCustomer.get(prof.id) || [];
    const { eligibleSpend, eligibleOrderCount } = calculateEligibleOrdersSpend(custOrders);
    const summary = resolveLifetimeTierForSpend({
      customerId: prof.id,
      eligibleSpend,
      eligibleOrderCount,
      tiers: programme.tiers,
      programmeEnabled: programme.isEnabled,
    });

    const bandLower = String(prof.pricing_band || "").toLowerCase();
    const hasExplicitDiscountArrangement = Boolean(
      Number(prof.discount_percentage || 0) > 0 ||
        bandLower.includes("89") ||
        bandLower.includes("90") ||
        bandLower.includes("97") ||
        bandLower.includes("98"),
    );

    return {
      ...summary,
      fullName: prof.full_name || prof.email || "Customer",
      email: prof.email || "",
      accountNumber: prof.customer_code || prof.account_number || null,
      assignedPricingBand: prof.pricing_band || null,
      hasExplicitDiscountArrangement,
    };
  });

  return { programme, customers };
}

export async function getCustomerEligibleOrderHistory(
  customerId: string,
): Promise<EligibleOrderRecord[]> {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, created_at, status, payment_status, total")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return ((data || []) as any[]).map((o) => {
    const check = evaluateOrderEligibility(o);
    return {
      id: o.id,
      order_number: o.order_number || o.id.slice(0, 8),
      created_at: o.created_at,
      status: o.status || "Pending",
      payment_status: o.payment_status || "Pending",
      total: Number(o.total || 0),
      isEligible: check.isEligible,
      exclusionReason: check.reason,
    };
  });
}
