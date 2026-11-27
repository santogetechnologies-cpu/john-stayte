import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { resolveCheckoutBranchAssignment } from "./branch-service";
import { loadLivePricingFromDatabase } from "./branch-pricing-service";
import {
  calculateCheckoutOrderTotals,
  getOrderCylinderReminder,
  validateDeliveryPostcode,
  type AuthoritativeCheckoutTotalsResult,
  type CustomerPricingContext,
} from "./customer-order-pricing-service";
import { isRefillableLpgCylinderProduct } from "./cylinder-exchange-service";
import {
  calculateEligibleOrdersSpend,
  DEFAULT_LIFETIME_TIERS,
  resolveLifetimeTierForSpend,
} from "./lifetime-discount-service";

export interface CheckoutOrderItemInput {
  productId?: string | null;
  slug: string;
  quantity: number;
}

export interface CreateCheckoutOrderInput {
  authToken?: string | null;
  items: CheckoutOrderItemInput[];
  cylinderExchangeType: "refill" | "new";
  returnedCylinderType: string;
  returnedEmptyCount: number;
  fulfilmentMethod: "collection" | "delivery";
  selectedBranch: string;
  fullName: string;
  phone: string;
  address: string;
  postcode: string;
  paymentMethod: "card" | "credit_account";
  offerId?: string | null;
  offerCode?: string | null;
}

export interface CreateCheckoutOrderResponse {
  ok: boolean;
  error?: string;
  order?: any;
  orderNumber?: string;
  verifiedItems?: Array<{
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  authoritativeTotals?: AuthoritativeCheckoutTotalsResult;
  finalPaymentMethod?: string;
  finalPaymentStatus?: "Pending" | "Paid" | "Failed" | "Cancelled";
  cylinderReminder?: string | null;
}

function getServerSupabase() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co";

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "[Checkout Order ServerFn] SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    );
  }

  return createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function gbp(amount: number): string {
  return `£${Number(amount || 0).toFixed(2)}`;
}

const DEFAULT_SYSTEM_SETTINGS = {
  deliveryChargesEnabled: false,
  defaultShippingFee: 0.0,
  freeDeliveryEnabled: false,
  freeDeliveryThreshold: 0.0,
  taxEnabled: false,
  vatRate: 0,
  taxPricingMode: "inclusive" as "inclusive" | "exclusive",
};

export interface CheckoutOrderDeps {
  supabaseClient?: any;
  loadPricingFn?: () => Promise<any>;
}

/**
 * Authoritative server-side checkout order creation.
 * Never trusts browser-supplied prices, discounts, VAT, delivery fees, or totals.
 */
export async function handleCreateCheckoutOrder(
  data: CreateCheckoutOrderInput,
  deps?: CheckoutOrderDeps,
): Promise<CreateCheckoutOrderResponse> {
  try {
    const payload = ((data as any)?.data || data) as CreateCheckoutOrderInput | undefined;
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: "Invalid checkout request payload." };
    }

    const cleanToken = typeof payload.authToken === "string" ? payload.authToken.trim() : "";
    if (!cleanToken) {
      return { ok: false, error: "Authentication required to place an order." };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { ok: false, error: "Your basket is empty." };
    }

    if (payload.paymentMethod !== "card" && payload.paymentMethod !== "credit_account") {
      return {
        ok: false,
        error: "Pay on Delivery is not available. Please pay by Credit / Debit Card or approved Credit Account.",
      };
    }

    const supabase = deps?.supabaseClient || getServerSupabase();

    // 1. Authenticate caller via Supabase Auth (never trust client-supplied user ID)
    const { data: authData, error: authErr } = await supabase.auth.getUser(cleanToken);
    const callerUser = authData?.user;
    if (authErr || !callerUser?.id) {
      return { ok: false, error: "Invalid or expired session. Please log in again." };
    }
    const currentUserId = callerUser.id;
    const currentEmail = String(callerUser.email || "").trim();

    // 2. Validate quantities & product identifiers strictly
    for (const item of payload.items) {
      const slug = typeof item?.slug === "string" ? item.slug.trim() : "";
      const qty = Number(item?.quantity);
      if (!slug) {
        return { ok: false, error: "Invalid product identifier in basket." };
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 500) {
        return {
          ok: false,
          error: "Invalid item quantity. Quantity must be a whole number between 1 and 500.",
        };
      }
    }

    // 3. Load live DB pricing bands, system settings, customer profile & application in parallel
    const loadPricing = deps?.loadPricingFn || loadLivePricingFromDatabase;
    await loadPricing().catch(() => {});

    const [settingsRes, profRes, appRes, lifetimeRpcRes] = await Promise.all([
      supabase
        .from("cms_content_blocks")
        .select("content")
        .eq("section_key", "admin_system_settings")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(
          "id, role, pricing_band, pricing_band_id, discount_percentage, customer_code, account_approved, credit_account_approved, credit_limit, notification_prefs",
        )
        .eq("id", currentUserId)
        .maybeSingle(),
      supabase
        .from("gas_customer_applications")
        .select("pricing_band, pricing_band_id, customer_code, status, credit_account_approved, credit_limit")
        .eq("customer_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("get_customer_lifetime_discount", { p_customer_id: currentUserId }),
    ]);

    let systemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
    if (settingsRes?.data?.content) {
      try {
        const parsed =
          typeof settingsRes.data.content === "string"
            ? JSON.parse(settingsRes.data.content)
            : settingsRes.data.content;
        systemSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
      } catch {
        /* keep defaults */
      }
    }

    // Resolve lifetime discount from authoritative RPC or fallback DB query
    let lifetimeDiscountPercentage = 0;
    let lifetimeTierName: string | null = null;
    let lifetimeEligibleSpend = 0;

    if (!lifetimeRpcRes?.error && lifetimeRpcRes?.data?.ok) {
      lifetimeDiscountPercentage = Number(lifetimeRpcRes.data.discount_percentage || 0);
      lifetimeTierName = lifetimeRpcRes.data.tier_name || null;
      lifetimeEligibleSpend = Number(lifetimeRpcRes.data.eligible_spend || 0);
    } else {
      const [cfgRes, tiersRes, custOrdersRes] = await Promise.all([
        supabase.from("lifetime_discount_config").select("is_enabled").eq("id", true).maybeSingle(),
        supabase.from("lifetime_discount_tiers").select("*").order("min_spend", { ascending: true }),
        supabase
          .from("orders")
          .select("id, status, payment_status, total")
          .eq("customer_id", currentUserId),
      ]);
      const enabled = cfgRes?.data?.is_enabled ?? true;
      const tiers =
        Array.isArray(tiersRes?.data) && tiersRes.data.length > 0
          ? tiersRes.data
          : DEFAULT_LIFETIME_TIERS;
      const calc = calculateEligibleOrdersSpend(custOrdersRes?.data || []);
      const resolved = resolveLifetimeTierForSpend({
        customerId: currentUserId,
        eligibleSpend: calc.eligibleSpend,
        eligibleOrderCount: calc.eligibleOrderCount,
        tiers,
        programmeEnabled: enabled,
      });
      lifetimeDiscountPercentage = resolved.discountPercentage;
      lifetimeTierName = resolved.currentTierName;
      lifetimeEligibleSpend = resolved.eligibleSpend;
    }

    const prof = profRes?.data;
    const appRow = appRes?.data;
    const gasApp = prof?.notification_prefs?.gas_application;

    const customerPricing: CustomerPricingContext = {
      userId: currentUserId,
      userRole: prof?.role || "customer",
      pricingBand: prof?.pricing_band || appRow?.pricing_band || gasApp?.pricing_band || null,
      pricingBandId: prof?.pricing_band_id || appRow?.pricing_band_id || gasApp?.pricing_band_id || null,
      customerCode: prof?.customer_code || appRow?.customer_code || gasApp?.customer_code || null,
      accountApproved: Boolean(
        prof?.account_approved || appRow?.status === "APPROVED" || gasApp?.status === "APPROVED",
      ),
      creditAccountApproved: Boolean(
        prof?.credit_account_approved ||
          appRow?.credit_account_approved ||
          gasApp?.credit_account_approved,
      ),
      creditLimit: Number(prof?.credit_limit ?? appRow?.credit_limit ?? gasApp?.credit_limit ?? 0),
      lifetimeDiscountPercentage,
      lifetimeTierName,
      lifetimeEligibleSpend,
    };

    // 4. Verify every product directly from Supabase products table (ignore any browser prices)
    const dbVerifiedCartLines: Array<{ product: any; qty: number }> = [];
    for (const item of payload.items) {
      const slug = item.slug.trim();
      const qty = Number(item.quantity);
      const { data: dbProduct, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price, deposit_price, stock, slug, category_slug, subcategory, specs")
        .eq("slug", slug)
        .maybeSingle();

      if (prodErr || !dbProduct) {
        return {
          ok: false,
          error: `Product '${slug}' is invalid or no longer available in the catalog.`,
        };
      }

      const currentStock = Number(dbProduct.stock || 0);
      if (currentStock < qty) {
        return {
          ok: false,
          error:
            currentStock === 0
              ? `'${dbProduct.name}' is currently out of stock.`
              : `Requested quantity for '${dbProduct.name}' exceeds available stock (${currentStock}).`,
        };
      }

      dbVerifiedCartLines.push({
        product: {
          id: dbProduct.id,
          name: dbProduct.name,
          slug: dbProduct.slug,
          price: Number(dbProduct.price),
          deposit_price:
            dbProduct.deposit_price !== null && dbProduct.deposit_price !== undefined
              ? Number(dbProduct.deposit_price)
              : undefined,
          category: dbProduct.category_slug || "",
          sub: dbProduct.subcategory || "",
          specs:
            dbProduct.specs && typeof dbProduct.specs === "object" && !Array.isArray(dbProduct.specs)
              ? dbProduct.specs
              : {},
        },
        qty,
      });
    }

    const hasCylinderInCart = dbVerifiedCartLines.some((l) =>
      isRefillableLpgCylinderProduct(l.product),
    );
    if (hasCylinderInCart && !customerPricing.accountApproved) {
      return {
        ok: false,
        error: "An approved Gas Customer Application is required before ordering LPG cylinders.",
      };
    }

    const isCollection = payload.fulfilmentMethod === "collection";
    if (!isCollection) {
      const coverage = validateDeliveryPostcode(payload.postcode);
      if (!coverage.valid) {
        return {
          ok: false,
          error: coverage.message || "Entered postcode is outside our standard delivery fleet coverage.",
        };
      }
    }

    // 5. Compute pre-offer authoritative totals on server
    const preOfferTotals = calculateCheckoutOrderTotals({
      lines: dbVerifiedCartLines,
      customer: customerPricing,
      cylinderExchangeType: payload.cylinderExchangeType,
      returnedCylinderType: payload.returnedCylinderType,
      returnedEmptyCount: payload.returnedEmptyCount,
      fulfilmentMethod: payload.fulfilmentMethod,
      systemSettings,
      offerDiscount: 0,
    });

    if (preOfferTotals.pricingErrors.length > 0) {
      return { ok: false, error: preOfferTotals.pricingErrors[0] };
    }
    if (preOfferTotals.subtotal <= 0) {
      return { ok: false, error: "Order total must be greater than £0.00 to place an order." };
    }

    const verifiedItems = preOfferTotals.lineBreakdowns.map((b) => ({
      product_id: b.productId,
      product_name: b.productName,
      quantity: b.quantity,
      unit_price: b.unitPrice,
      total_price: b.totalPrice,
    }));

    // 6. Validate promo offer server-side (without prematurely redeeming for card orders)
    let verifiedDiscount = 0;
    let verifiedOfferId: string | null = null;
    let verifiedOfferCode: string | null = null;

    if (payload.offerId || payload.offerCode) {
      try {
        const { data: offerRpcData, error: offerRpcErr } = await supabase.rpc(
          "validate_and_redeem_offer",
          {
            p_offer_id: payload.offerId || null,
            p_code: payload.offerCode || null,
            p_user_id: currentUserId,
            p_email: currentEmail,
            p_cart_items: verifiedItems,
            p_subtotal: preOfferTotals.subtotal,
            p_order_id: null,
          },
        );
        const row = Array.isArray(offerRpcData) ? offerRpcData[0] : offerRpcData;
        if (!offerRpcErr && row?.is_valid && Number(row.discount_amount) > 0) {
          verifiedDiscount = Number(row.discount_amount);
          verifiedOfferId = row.offer_id || payload.offerId || null;
          verifiedOfferCode = row.offer_code || payload.offerCode || null;
        }
      } catch {
        /* fallback to 0 discount */
      }
    }

    // 7. Recompute authoritative final totals with verified offer + lifetime discount rules
    const finalTotals = calculateCheckoutOrderTotals({
      lines: dbVerifiedCartLines,
      customer: customerPricing,
      cylinderExchangeType: payload.cylinderExchangeType,
      returnedCylinderType: payload.returnedCylinderType,
      returnedEmptyCount: payload.returnedEmptyCount,
      fulfilmentMethod: payload.fulfilmentMethod,
      systemSettings,
      offerDiscount: verifiedDiscount,
    });

    if (finalTotals.pricingErrors.length > 0) {
      return { ok: false, error: finalTotals.pricingErrors[0] };
    }

    // 8. Validate credit account limit on server against authoritative total
    if (payload.paymentMethod === "credit_account") {
      if (!customerPricing.creditAccountApproved) {
        return {
          ok: false,
          error: "Credit Account facility is not approved for your customer profile.",
        };
      }
      const { data: unpaidOrders } = await supabase
        .from("orders")
        .select("total, payment_status, status")
        .eq("customer_id", currentUserId)
        .neq("status", "Cancelled")
        .neq("payment_status", "Paid")
        .neq("payment_status", "Cancelled");

      const outstandingBalance = (unpaidOrders || []).reduce(
        (sum: number, o: any) => sum + Number(o.total || 0),
        0,
      );
      const limit = Number(customerPricing.creditLimit || 0);
      if (limit > 0 && outstandingBalance + finalTotals.total > limit) {
        return {
          ok: false,
          error: `Order total (${gbp(finalTotals.total)}) exceeds available credit limit (${gbp(Math.max(0, limit - outstandingBalance))}).`,
        };
      }
    }

    // 9. Prevent accidental duplicate pending order submissions within 10 seconds
    const tenSecondsAgoIso = new Date(Date.now() - 10_000).toISOString();
    const { data: recentDup } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("customer_id", currentUserId)
      .eq("payment_status", "Pending")
      .eq("status", "Pending")
      .eq("total", finalTotals.total)
      .gte("created_at", tenSecondsAgoIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (Array.isArray(recentDup) && recentDup.length > 0) {
      return {
        ok: false,
        error: `A matching pending order (${recentDup[0].order_number}) was just submitted. Please wait a moment before retrying.`,
      };
    }

    // 10. Create authoritative order + related records
    const orderNumber = `JSS-${Date.now().toString().slice(-6)}`;
    const branchAssignment = resolveCheckoutBranchAssignment(
      payload.fulfilmentMethod,
      payload.selectedBranch,
    );
    const finalPaymentStatus: "Pending" | "Paid" | "Failed" | "Cancelled" = "Pending";
    const finalPaymentMethod =
      payload.paymentMethod === "credit_account"
        ? "Credit Account (30-Day Invoice)"
        : "Credit / Debit Card (Elavon)";

    const isEmptyRequired = hasCylinderInCart ? payload.cylinderExchangeType === "refill" : false;
    const orderTypeTag = hasCylinderInCart
      ? payload.cylinderExchangeType === "refill"
        ? "REFILL_EXCHANGE"
        : "NEW_CYLINDER"
      : "STANDARD";
    const cylinderReminder = getOrderCylinderReminder(
      payload.fulfilmentMethod,
      hasCylinderInCart && isEmptyRequired,
    );

    const effectiveOfferId = finalTotals.offerDiscount > 0 ? verifiedOfferId : null;
    const effectiveOfferCode = finalTotals.offerDiscount > 0 ? verifiedOfferCode : null;

    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          customer_id: currentUserId,
          customer_name: payload.fullName.trim(),
          customer_email: currentEmail,
          customer_phone: payload.phone.trim(),
          delivery_address: {
            name: payload.fullName.trim(),
            street: isCollection
              ? `[Click & Collect: ${payload.selectedBranch}]`
              : payload.address.trim(),
            postcode: isCollection ? "" : payload.postcode.trim(),
            phone: payload.phone.trim(),
            payment_method: finalPaymentMethod,
            empty_cylinder_required: isEmptyRequired,
            order_type: orderTypeTag,
            fulfilment_method: payload.fulfilmentMethod,
            collection_branch: branchAssignment.collectionBranch,
            collection_branch_id: branchAssignment.collectionBranchId,
          },
          assigned_branch_id: branchAssignment.assignedBranchId,
          customer_account_number: customerPricing.customerCode || undefined,
          subtotal: finalTotals.subtotal,
          shipping_fee: finalTotals.shipping,
          total: finalTotals.total,
          offer_id: effectiveOfferId,
          offer_code: effectiveOfferCode,
          status: "Pending",
          fulfillment_status: "Pending",
          assigned_depot: branchAssignment.assignedDepot,
          payment_status: finalPaymentStatus,
          notes: [
            `[Payment: ${finalPaymentMethod}]`,
            isCollection ? `[Click & Collect: ${payload.selectedBranch}]` : "[Standard Delivery]",
            customerPricing.customerCode ? `[Account: ${customerPricing.customerCode}]` : "",
            finalTotals.offerDiscount > 0
              ? `[Offer Applied: -${gbp(finalTotals.offerDiscount)}]`
              : "",
            finalTotals.lifetimeDiscountAmount > 0
              ? `[Lifetime Loyalty Discount (${finalTotals.lifetimeTierName || `${finalTotals.lifetimeDiscountPercentageApplied}%`}): -${gbp(finalTotals.lifetimeDiscountAmount)}]`
              : "",
            hasCylinderInCart ? `[Empty Cylinder Required: ${isEmptyRequired ? "Yes" : "No"}]` : "",
            hasCylinderInCart && isEmptyRequired
              ? `[Returned: ${payload.returnedCylinderType} x ${payload.returnedEmptyCount}]`
              : "",
            hasCylinderInCart ? `[${orderTypeTag}]` : "",
            cylinderReminder ? `[Reminder: ${cylinderReminder}]` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        },
      ])
      .select()
      .single();

    if (orderErr || !newOrder) {
      return {
        ok: false,
        error: orderErr?.message || "Failed to create order. Please try again.",
      };
    }

    // Insert order_items with rollback if insertion fails
    const itemInserts = verifiedItems.map((item) => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", newOrder.id);
      return {
        ok: false,
        error: `Failed to save order items: ${itemsErr.message}`,
      };
    }

    // Redeem offer atomically for non-card orders (card orders redeem upon Elavon capture)
    if (payload.paymentMethod !== "card" && effectiveOfferId) {
      try {
        await supabase.rpc("validate_and_redeem_offer", {
          p_offer_id: effectiveOfferId,
          p_code: effectiveOfferCode,
          p_user_id: currentUserId,
          p_email: currentEmail,
          p_cart_items: verifiedItems,
          p_subtotal: finalTotals.subtotal,
          p_order_id: newOrder.id,
        });
      } catch {
        /* non-blocking */
      }
    }

    // Create delivery assignment, order status history, invoice, and non-card stock updates
    await Promise.allSettled([
      supabase.from("delivery_assignments").insert([
        {
          order_id: newOrder.id,
          order_ref: orderNumber,
          customer_name: payload.fullName.trim(),
          address: `${payload.address.trim()}, ${payload.postcode.trim()}`,
          area: "Gloucestershire",
          driver_name: "Unassigned",
          agent_id: null,
          driver_id: null,
          vehicle_plate: null,
          time_slot: "Morning (08:00 - 12:00)",
          status: "Pending",
          notes: `[Standard Checkout] | Empty Cylinder Required: ${isEmptyRequired ? "Yes" : "No"}${isEmptyRequired ? " | Expected: 1" : ""}`,
        },
      ]),
      supabase.from("order_status_history").insert([
        {
          order_id: newOrder.id,
          status: "Pending",
          actor_id: currentUserId,
          actor_name: payload.fullName.trim(),
          notes: `Order placed via online checkout (${finalPaymentMethod} • ${finalPaymentStatus}).`,
        },
      ]),
      supabase.from("invoices").insert([
        {
          invoice_number: `INV-${orderNumber.replace("JSS-", "")}`,
          order_id: newOrder.id,
          customer_id: currentUserId,
          customer_name: payload.fullName.trim(),
          customer_email: currentEmail,
          subtotal: finalTotals.subtotal,
          total_amount: finalTotals.total,
          status: "Issued",
        },
      ]),
    ]);

    if (payload.paymentMethod !== "card") {
      for (const item of verifiedItems) {
        if (!item.product_id) continue;
        try {
          const { data: currentInv } = await supabase
            .from("inventory")
            .select("current_stock")
            .eq("product_id", item.product_id)
            .maybeSingle();
          if (currentInv) {
            await supabase
              .from("inventory")
              .update({
                current_stock: Math.max(0, Number(currentInv.current_stock || 0) - item.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", item.product_id);
          }

          const { data: currentProd } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .maybeSingle();
          if (currentProd) {
            await supabase
              .from("products")
              .update({
                stock: Math.max(0, Number(currentProd.stock || 0) - item.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.product_id);
          }
        } catch {
          /* non-blocking */
        }
      }
    }

    return {
      ok: true,
      order: newOrder,
      orderNumber,
      verifiedItems,
      authoritativeTotals: finalTotals,
      finalPaymentMethod,
      finalPaymentStatus,
      cylinderReminder,
    };
  } catch (err: any) {
    console.error("[Checkout Order ServerFn] Error:", err);
    return {
      ok: false,
      error: err?.message || "Failed to place order. Please try again.",
    };
  }
}

export const createCheckoutOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: CreateCheckoutOrderInput) => data)
  .handler(async ({ data }): Promise<CreateCheckoutOrderResponse> => {
    return handleCreateCheckoutOrder(data);
  });

export interface CreateLegacyGasOrderInput {
  authToken?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  deliveryAddress: string;
  usageType: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
  orderType: "REFILL_EXCHANGE" | "NEW_CYLINDER";
  productId: string;
  quantity: number;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  returnMethod?: string;
  pickupDate?: string;
  pickupTimeSlot?: string;
  cylinderTag?: string;
  notes?: string;
  paymentMethod?: string;
}

export interface CreateLegacyGasOrderResponse {
  ok: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  calculated?: {
    product: any;
    quantity: number;
    gasPriceUnit: number;
    gasPriceTotal: number;
    depositUnit: number;
    depositTotal: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
}

/**
 * Authoritative server-side handler for /order-gas quick cylinder ordering.
 * Compatible with migration 00107 (uses service_role after strict auth & pricing validation).
 */
export async function handleCreateLegacyGasOrder(
  data: CreateLegacyGasOrderInput,
  deps?: CheckoutOrderDeps,
): Promise<CreateLegacyGasOrderResponse> {
  try {
    const payload = ((data as any)?.data || data) as CreateLegacyGasOrderInput | undefined;
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: "Invalid gas order payload." };
    }

    const cleanToken = typeof payload.authToken === "string" ? payload.authToken.trim() : "";
    if (!cleanToken) {
      return { ok: false, error: "Authentication required to place a gas order." };
    }

    const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
    const quantity = Number(payload.quantity);
    if (!productId) {
      return { ok: false, error: "Invalid product ID." };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return { ok: false, error: "Invalid quantity. Must be a whole number between 1 and 500." };
    }

    const supabase = deps?.supabaseClient || getServerSupabase();
    const { data: authData, error: authErr } = await supabase.auth.getUser(cleanToken);
    const callerUser = authData?.user;
    if (authErr || !callerUser?.id) {
      return { ok: false, error: "Invalid or expired session. Please log in again." };
    }
    const currentUserId = callerUser.id;
    const currentEmail = String(callerUser.email || payload.customerEmail || "").trim();

    const loadPricing = deps?.loadPricingFn || loadLivePricingFromDatabase;
    await loadPricing().catch(() => {});

    const [settingsRes, profRes, appRes, prodRes, lifetimeRpcRes] = await Promise.all([
      supabase
        .from("cms_content_blocks")
        .select("content")
        .eq("section_key", "admin_system_settings")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(
          "id, role, pricing_band, pricing_band_id, customer_code, account_approved, credit_account_approved, credit_limit, notification_prefs",
        )
        .eq("id", currentUserId)
        .maybeSingle(),
      supabase
        .from("gas_customer_applications")
        .select("pricing_band, pricing_band_id, customer_code, status, credit_account_approved, credit_limit")
        .eq("customer_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id, name, price, deposit_price, stock, slug, category_slug, subcategory, specs")
        .eq("id", productId)
        .maybeSingle(),
      supabase.rpc("get_customer_lifetime_discount", { p_customer_id: currentUserId }),
    ]);

    const appRow = appRes?.data;
    const prof = profRes?.data;
    const isApprovedOrSubmitted = Boolean(
      prof?.account_approved ||
        appRow?.status === "SUBMITTED" ||
        appRow?.status === "APPROVED",
    );
    if (!isApprovedOrSubmitted) {
      return {
        ok: false,
        error:
          "Gas Customer Application Required: You must complete and submit your Gas Customer Application Form before placing your first gas order.",
      };
    }

    const dbProduct = prodRes?.data;
    if (prodRes?.error || !dbProduct) {
      return { ok: false, error: "Selected gas product could not be found." };
    }
    if (Number(dbProduct.stock || 0) < quantity) {
      return {
        ok: false,
        error: `Requested quantity exceeds available stock for '${dbProduct.name}'.`,
      };
    }

    let systemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
    if (settingsRes?.data?.content) {
      try {
        const parsed =
          typeof settingsRes.data.content === "string"
            ? JSON.parse(settingsRes.data.content)
            : settingsRes.data.content;
        systemSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
      } catch {
        /* keep defaults */
      }
    }

    const gasApp = prof?.notification_prefs?.gas_application;
    const customerPricing: CustomerPricingContext = {
      userId: currentUserId,
      userRole: prof?.role || "customer",
      pricingBand: prof?.pricing_band || appRow?.pricing_band || gasApp?.pricing_band || null,
      pricingBandId: prof?.pricing_band_id || appRow?.pricing_band_id || gasApp?.pricing_band_id || null,
      customerCode: prof?.customer_code || appRow?.customer_code || gasApp?.customer_code || null,
      accountApproved: Boolean(prof?.account_approved || appRow?.status === "APPROVED"),
      creditAccountApproved: Boolean(prof?.credit_account_approved || appRow?.credit_account_approved),
      creditLimit: Number(prof?.credit_limit ?? appRow?.credit_limit ?? 0),
      lifetimeDiscountPercentage:
        !lifetimeRpcRes?.error && lifetimeRpcRes?.data?.ok
          ? Number(lifetimeRpcRes.data.discount_percentage || 0)
          : 0,
      lifetimeTierName:
        !lifetimeRpcRes?.error && lifetimeRpcRes?.data?.ok
          ? lifetimeRpcRes.data.tier_name || null
          : null,
    };

    const isNew = payload.orderType === "NEW_CYLINDER";
    const productForCalc = {
      id: dbProduct.id,
      name: dbProduct.name,
      slug: dbProduct.slug,
      price: Number(dbProduct.price),
      deposit_price:
        dbProduct.deposit_price !== null && dbProduct.deposit_price !== undefined
          ? Number(dbProduct.deposit_price)
          : undefined,
      category: dbProduct.category_slug || "bottled-gas",
      sub: dbProduct.subcategory || "",
      specs:
        dbProduct.specs && typeof dbProduct.specs === "object" && !Array.isArray(dbProduct.specs)
          ? dbProduct.specs
          : {},
    };

    const totals = calculateCheckoutOrderTotals({
      lines: [{ product: productForCalc, qty: quantity }],
      customer: customerPricing,
      cylinderExchangeType: isNew ? "new" : "refill",
      returnedCylinderType: dbProduct.name,
      returnedEmptyCount: isNew ? 0 : quantity,
      fulfilmentMethod: "delivery",
      systemSettings,
      offerDiscount: 0,
    });

    if (totals.pricingErrors.length > 0) {
      return { ok: false, error: totals.pricingErrors[0] };
    }

    const line0 = totals.lineBreakdowns[0];
    const gasPriceUnit = line0?.resolvedGasPrice?.unitRefillPrice ?? Number(dbProduct.price);
    const gasPriceTotal = Number((gasPriceUnit * quantity).toFixed(2));
    const depositUnit = isNew ? (line0?.resolvedGasPrice?.depositPerUnit ?? 0) : 0;
    const depositTotal = Number((depositUnit * quantity).toFixed(2));

    const prefixMap: Record<string, string> = {
      DOMESTIC: "CYL-DOM",
      COMMERCIAL: "CYL-COM",
      BULK: "CYL-BLK",
      AUTOGAS: "AUT-LPG",
    };
    const orderNumber = `${prefixMap[payload.usageType] || "CYL-DOM"}-${Date.now().toString().slice(-6)}`;
    const normalizedMethod = "Pay on Delivery / Collection";
    const returnMethod = payload.returnMethod || "RETURN_ON_DELIVERY";

    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          customer_id: currentUserId,
          customer_name: payload.customerName.trim(),
          customer_email: currentEmail,
          customer_phone: payload.customerPhone.trim() || null,
          delivery_address: {
            name: payload.customerName.trim(),
            address: payload.deliveryAddress.trim(),
            street: payload.deliveryAddress.trim(),
            phone: payload.customerPhone.trim() || "",
            delivery_date: payload.deliveryDate || null,
            delivery_slot: payload.deliveryTimeSlot || null,
            payment_method: normalizedMethod,
            empty_cylinder_required: !isNew,
            order_type: payload.orderType,
          },
          subtotal: totals.subtotal,
          shipping_fee: totals.shipping,
          total: totals.total,
          status: "Pending",
          fulfillment_status: "Pending",
          assigned_depot: "Whitminster",
          payment_status: "Pending",
          notes: [
            `[${payload.usageType} LPG]`,
            `[${payload.orderType.replace(/_/g, " ")}]`,
            `[Empty Cylinder Required: ${isNew ? "No" : "Yes"}]`,
            `[Expected: ${isNew ? 0 : quantity}]`,
            `[Payment: ${normalizedMethod}]`,
            payload.deliveryDate
              ? `Delivery: ${payload.deliveryDate} (${payload.deliveryTimeSlot || "Standard"})`
              : "",
            isNew
              ? `Deposit: £${depositTotal.toFixed(2)}`
              : `Return Method: ${returnMethod.replace(/_/g, " ")}`,
            payload.pickupDate
              ? `Pickup: ${payload.pickupDate} (${payload.pickupTimeSlot || "Anytime"})`
              : "",
            payload.cylinderTag ? `Tag: ${payload.cylinderTag}` : "",
            payload.notes || "",
          ]
            .filter(Boolean)
            .join(" | "),
        },
      ])
      .select()
      .single();

    if (orderErr || !orderData) {
      return { ok: false, error: `Order placement error: ${orderErr?.message || "Unknown error"}` };
    }

    const orderId = orderData.id;
    const itemInserts: any[] = [
      {
        order_id: orderId,
        product_id: productId,
        product_name: `${dbProduct.name} (${isNew ? "New Cylinder + Gas" : "Refill Exchange"})`,
        unit_price: gasPriceUnit,
        quantity,
        total_price: gasPriceTotal,
      },
    ];

    if (isNew && depositTotal > 0) {
      itemInserts.push({
        order_id: orderId,
        product_id: productId,
        product_name: `Cylinder Security Deposit (${dbProduct.name})`,
        unit_price: depositUnit,
        quantity,
        total_price: depositTotal,
      });
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", orderId);
      return { ok: false, error: `Failed to save order items: ${itemsErr.message}` };
    }

    await Promise.allSettled([
      supabase.from("order_status_history").insert([
        {
          order_id: orderId,
          status: "Pending",
          actor_id: currentUserId,
          actor_name: payload.customerName.trim(),
          notes: isNew
            ? "New cylinder purchase — no empty cylinder collection required."
            : `Refill exchange placed — empty cylinder collection required (${quantity} bottle(s)).`,
        },
      ]),
      supabase.from("delivery_assignments").insert([
        {
          order_id: orderId,
          order_ref: orderNumber,
          customer_name: payload.customerName.trim(),
          address: payload.deliveryAddress.trim(),
          area: "Gloucestershire",
          driver_name: "Unassigned",
          agent_id: null,
          driver_id: null,
          vehicle_plate: null,
          time_slot: payload.deliveryTimeSlot || payload.pickupTimeSlot || "Morning (08:00 - 12:00)",
          status: "Pending",
          notes: `[${payload.usageType}] ${payload.orderType} | Empty Cylinder Required: ${isNew ? "No" : "Yes"} | Expected: ${isNew ? 0 : quantity}`,
        },
      ]),
      supabase.from("notifications").insert([
        {
          user_id: currentUserId,
          title: `Order #${orderNumber} Confirmed`,
          message: `Your ${payload.usageType.toLowerCase()} LPG order for ${quantity}x ${dbProduct.name} has been placed.`,
          category: "Orders",
          link: "/account/orders",
          read: false,
          is_read: false,
        },
        {
          user_id: null,
          title: `New ${payload.usageType} LPG Order: ${orderNumber}`,
          message: `${payload.customerName.trim()} ordered ${quantity}x ${dbProduct.name} (${payload.orderType.replace(/_/g, " ")}).`,
          category: "Orders",
          link: "/admin/orders",
          read: false,
          is_read: false,
        },
      ]),
      supabase.from("invoices").insert([
        {
          invoice_number: `INV-${orderNumber}`,
          order_id: orderId,
          customer_id: currentUserId,
          customer_name: payload.customerName.trim(),
          customer_email: currentEmail,
          subtotal: totals.subtotal,
          total_amount: totals.total,
          status: "Issued",
        },
      ]),
    ]);

    return {
      ok: true,
      orderId,
      orderNumber,
      calculated: {
        product: productForCalc,
        quantity,
        gasPriceUnit,
        gasPriceTotal,
        depositUnit,
        depositTotal,
        subtotal: totals.subtotal,
        deliveryFee: totals.shipping,
        total: totals.total,
      },
    };
  } catch (err: any) {
    console.error("[Legacy Gas Order ServerFn] Error:", err);
    return {
      ok: false,
      error: err?.message || "Failed to place gas order.",
    };
  }
}

export const createLegacyGasOrderServerFn = createServerFn({ method: "POST" })
  .validator((data: CreateLegacyGasOrderInput) => data)
  .handler(async ({ data }): Promise<CreateLegacyGasOrderResponse> => {
    return handleCreateLegacyGasOrder(data);
  });
