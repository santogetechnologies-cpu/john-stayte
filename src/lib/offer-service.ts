import { supabase } from "@/lib/supabase";
import { type Product } from "@/data/catalog";
import { type CartLine } from "@/lib/store";

export type OfferCategory = "product_based" | "customer_target_based";
export type DiscountType = "percentage" | "fixed";
export type OfferStatus = "draft" | "scheduled" | "active" | "expired" | "disabled";
export type TargetScope = "all_products" | "category" | "specific_products";
export type CustomerTargetRule =
  | "all_customers"
  | "new_customer"
  | "first_order"
  | "min_cart_spend"
  | "lifetime_spend"
  | "period_spend"
  | "order_count_milestone"
  | "consecutive_loyalty"
  | "referral"
  | "custom_rule_builder";

export type CustomConditionLeafType =
  | "min_cart_subtotal"
  | "new_customer"
  | "first_order"
  | "lifetime_spend"
  | "period_spend"
  | "order_count"
  | "order_count_milestone"
  | "consecutive_loyalty"
  | "referral"
  | "contains_category"
  | "contains_product";

export interface CustomConditionLeaf {
  type: CustomConditionLeafType;
  value?: number | string;
  days?: number;
  category?: string;
  product_id?: string;
  code?: string;
}

export interface CustomConditionGroup {
  operator: "AND" | "OR";
  conditions: (CustomConditionLeaf | CustomConditionGroup)[];
}

export type CustomConditionNode = CustomConditionLeaf | CustomConditionGroup;

export interface OfferConditionRule {
  field: "cart_subtotal" | "customer_order_count" | "customer_lifetime_spend" | "customer_days_since_last_order";
  operator: ">=" | "<=" | "==" | "!=" | ">" | "<";
  value: number | string;
}

export interface OfferEligibilityConditions {
  operator: "AND" | "OR";
  conditions?: (CustomConditionLeaf | CustomConditionGroup)[];
  rules?: OfferConditionRule[];
}

export interface Offer {
  id: string;
  title: string;
  slug?: string | null;
  badge?: string | null;
  description: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  cta_link?: string | null;
  cta_text?: string | null;
  display_order?: number;
  code: string | null;
  offer_category: OfferCategory;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_cap?: number | null;
  min_order_subtotal: number;
  status: OfferStatus;
  total_usage_limit?: number | null;
  total_times_used: number;
  per_customer_limit?: number | null;
  target_scope: TargetScope;
  target_category_slugs: string[];
  target_product_ids: string[];
  target_customer_rule: CustomerTargetRule;
  spend_threshold_amount: number;
  spend_period_days: number;
  order_count_target: number;
  consecutive_days_window: number;
  eligibility_conditions: OfferEligibilityConditions | any;
  is_publicly_listed: boolean;
  show_promotional_banner: boolean;
  banner_placement: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface OfferRedemption {
  id: string;
  offer_id: string;
  order_id: string;
  customer_id?: string | null;
  customer_email: string;
  discount_amount: number;
  order_subtotal_before_discount: number;
  applied_code?: string | null;
  redeemed_at: string;
  offer_title?: string;
  order_number?: string;
}

export interface CustomerReferral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_email?: string | null;
  referred_order_id?: string | null;
  status: "pending" | "completed" | "rewarded";
  reward_offer_id?: string | null;
  created_at: string;
}

/**
 * Fetch all active, publicly listed offers for customer-facing /offers and banners.
 */
export async function fetchPublicOffers(): Promise<Offer[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active")
      .eq("is_publicly_listed", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Public offers fetch notice:", error);
      return [];
    }

    return (data || []) as unknown as Offer[];
  } catch (err) {
    console.error("fetchPublicOffers error:", err);
    return [];
  }
}

/**
 * Fetch promotional banner offers for header/site announcement.
 */
export async function fetchPromotionalBannerOffers(): Promise<Offer[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active")
      .eq("show_promotional_banner", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) return [];
    return (data || []) as unknown as Offer[];
  } catch {
    return [];
  }
}

/**
 * Fetch all offers for Admin management.
 */
export async function fetchAllAdminOffers(): Promise<Offer[]> {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Offer[];
  } catch (err: any) {
    console.error("fetchAllAdminOffers error:", err);
    return [];
  }
}

/**
 * Create a new offer in Supabase.
 */
export async function createOffer(
  offer: Omit<Offer, "id" | "created_at" | "total_times_used">
): Promise<{ ok: boolean; data?: Offer; error?: string }> {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const insertPayload: any = {
      ...offer,
      code: offer.code ? offer.code.trim().toUpperCase() : null,
      created_by: authUser?.user?.id || null,
      total_times_used: 0,
      is_active: offer.status === "active",
    };

    const { data, error } = await (supabase.from("offers") as any)
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as Offer };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create offer" };
  }
}

/**
 * Update an existing offer.
 */
export async function updateOffer(
  id: string,
  updates: Partial<Offer>
): Promise<{ ok: boolean; data?: Offer; error?: string }> {
  try {
    const updatePayload: any = {
      ...updates,
      code: updates.code !== undefined ? (updates.code ? updates.code.trim().toUpperCase() : null) : undefined,
      is_active: updates.status ? updates.status === "active" : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase.from("offers") as any)
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as Offer };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update offer" };
  }
}

/**
 * Delete an offer.
 */
export async function deleteOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete offer" };
  }
}

/**
 * Fetch all redemptions for admin audit.
 */
export async function fetchOfferRedemptions(): Promise<OfferRedemption[]> {
  try {
    const { data, error } = await supabase
      .from("offer_redemptions")
      .select("*, offers(title), orders(order_number)")
      .order("redeemed_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      offer_title: r.offers?.title || "Offer",
      order_number: r.orders?.order_number || "Order",
    }));
  } catch (err: any) {
    console.error("fetchOfferRedemptions error:", err);
    return [];
  }
}

/**
 * Client-Side Instant Evaluation for Cart Preview.
 * Pure non-mutating preview calculation for smooth responsive UX.
 */
export function evaluateOfferForCart(
  offer: Offer,
  cartLines: (CartLine & { product: Product })[],
  currentSubtotal: number
): { isEligible: boolean; discountAmount: number; reason?: string } {
  if (!offer || offer.status !== "active" || !offer.is_active) {
    return { isEligible: false, discountAmount: 0, reason: "Offer is inactive or expired." };
  }

  const now = new Date();
  if (offer.starts_at && new Date(offer.starts_at) > now) {
    return { isEligible: false, discountAmount: 0, reason: "Offer has not started yet." };
  }
  if (offer.ends_at && new Date(offer.ends_at) < now) {
    return { isEligible: false, discountAmount: 0, reason: "Offer has expired." };
  }

  // Minimum Cart Value Check
  if (offer.min_order_subtotal > 0 && currentSubtotal < offer.min_order_subtotal) {
    return {
      isEligible: false,
      discountAmount: 0,
      reason: `Add £${(offer.min_order_subtotal - currentSubtotal).toFixed(2)} more to qualify.`,
    };
  }

  // Calculate Qualifying Subtotal based on target scope
  let qualifyingSubtotal = 0;

  if (offer.target_scope === "all_products") {
    qualifyingSubtotal = currentSubtotal;
  } else if (offer.target_scope === "category") {
    const targetCats = offer.target_category_slugs || [];
    qualifyingSubtotal = cartLines.reduce((sum, line) => {
      if (targetCats.includes(line.product.category)) {
        return sum + line.product.price * line.qty;
      }
      return sum;
    }, 0);
  } else if (offer.target_scope === "specific_products") {
    const targetIds = offer.target_product_ids || [];
    qualifyingSubtotal = cartLines.reduce((sum, line) => {
      if (line.product.id && targetIds.includes(line.product.id)) {
        return sum + line.product.price * line.qty;
      }
      return sum;
    }, 0);
  }

  if (qualifyingSubtotal <= 0) {
    return { isEligible: false, discountAmount: 0, reason: "No qualifying items in basket for this offer." };
  }

  // Custom Condition Tree Evaluation if configured
  if (
    offer.target_customer_rule === "custom_rule_builder" ||
    (offer.eligibility_conditions &&
      (offer.eligibility_conditions.conditions || offer.eligibility_conditions.rules) &&
      (offer.eligibility_conditions.conditions?.length || offer.eligibility_conditions.rules?.length))
  ) {
    const passedCustom = evaluateCustomConditionNode(offer.eligibility_conditions, {
      subtotal: currentSubtotal,
      cartLines,
    });
    if (!passedCustom) {
      return {
        isEligible: false,
        discountAmount: 0,
        reason: "Basket does not meet the custom eligibility criteria for this offer.",
      };
    }
  }

  // Calculate Discount Amount
  let discount = 0;
  if (offer.discount_type === "percentage") {
    discount = qualifyingSubtotal * (Number(offer.discount_value) / 100);
    if (offer.max_discount_cap && offer.max_discount_cap > 0) {
      discount = Math.min(discount, Number(offer.max_discount_cap));
    }
  } else if (offer.discount_type === "fixed") {
    discount = Math.min(Number(offer.discount_value), qualifyingSubtotal);
  }

  return { isEligible: true, discountAmount: Math.round(discount * 100) / 100 };
}

/**
 * Pure client-side recursive evaluation helper for Custom Condition Trees.
 */
export function evaluateCustomConditionNode(
  node: CustomConditionNode | any,
  context: {
    subtotal: number;
    cartLines: (CartLine & { product: Product })[];
    userOrderCount?: number;
    userLifetimeSpend?: number;
    userRecentDays?: number;
  },
  depth = 0,
): boolean {
  if (depth > 5 || !node) return true;

  // Group node with Operator
  if (node.operator) {
    const op = String(node.operator).toUpperCase();
    const list = node.conditions || node.rules || [];
    if (!Array.isArray(list) || list.length === 0) return true;
    if (op === "OR") {
      return list.some((child) => evaluateCustomConditionNode(child, context, depth + 1));
    }
    return list.every((child) => evaluateCustomConditionNode(child, context, depth + 1));
  }

  // Leaf Condition
  if (node.type) {
    const t = String(node.type).toLowerCase();
    if (t === "min_cart_subtotal") return context.subtotal >= Number(node.value || 0);
    if (t === "new_customer" || t === "first_order") return (context.userOrderCount ?? 0) === 0;
    if (t === "lifetime_spend") return (context.userLifetimeSpend ?? 0) >= Number(node.value || 0);
    if (t === "order_count" || t === "order_count_milestone")
      return (context.userOrderCount ?? 0) + 1 >= Number(node.value || 1);
    if (t === "consecutive_loyalty") {
      const windowDays = Number(node.days || 30);
      return (context.userOrderCount ?? 0) > 0 && (context.userRecentDays ?? 999) <= windowDays;
    }
    if (t === "contains_category") {
      const targetCat = String(node.category || node.value || "").toLowerCase();
      return context.cartLines.some((l) => l.product.category?.toLowerCase() === targetCat);
    }
    if (t === "contains_product") {
      const targetId = String(node.product_id || node.value || "").toLowerCase();
      return context.cartLines.some((l) => l.product.id?.toLowerCase() === targetId);
    }
  }

  return true;
}

/**
 * Authoritative Server-Side Validation RPC.
 * Call during checkout to execute atomic concurrency lock & reservation.
 */
export async function validateAndRedeemOfferServer(params: {
  offerId?: string | null;
  code?: string | null;
  userId?: string | null;
  email: string;
  cartItems: { product_id: string | null; product_name: string; quantity: number; unit_price: number; total_price: number }[];
  subtotal: number;
  orderId?: string | null;
}): Promise<{ isValid: boolean; discountAmount: number; offerId?: string | null; offerCode?: string | null; message: string }> {
  try {
    const { data, error } = await (supabase.rpc as any)("validate_and_redeem_offer", {
      p_offer_id: params.offerId || null,
      p_code: params.code ? params.code.trim().toUpperCase() : null,
      p_user_id: params.userId || null,
      p_email: params.email.trim().toLowerCase(),
      p_cart_items: params.cartItems,
      p_subtotal: params.subtotal,
      p_order_id: params.orderId || null,
    });

    if (error) {
      console.warn("Server offer validation RPC notice:", error);
      return { isValid: false, discountAmount: 0, message: error.message };
    }

    return {
      isValid: Boolean(data?.is_valid),
      discountAmount: Number(data?.discount_amount || 0),
      offerId: data?.offer_id || null,
      offerCode: data?.offer_code || null,
      message: data?.message || "Offer processed",
    };
  } catch (err: any) {
    return { isValid: false, discountAmount: 0, message: err?.message || "Validation failed" };
  }
}
