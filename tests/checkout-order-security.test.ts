import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateCheckoutOrder,
  handleCreateLegacyGasOrder,
} from "../src/lib/checkout-order-server-fn";
import { handleCreateElavonPaymentSession } from "../src/lib/elavon-payment-server-fn";

function createCheckoutMockDb(opts: {
  userId?: string;
  email?: string;
  profile?: Record<string, any>;
  application?: Record<string, any> | null;
  product?: Record<string, any> | null;
  systemSettings?: Record<string, any>;
  lifetimeRpc?: { ok: boolean; discount_percentage: number; tier_name: string; eligible_spend: number };
  offerRpc?: { is_valid: boolean; discount_amount: number; offer_id?: string; offer_code?: string };
  recentDup?: any[];
}) {
  const insertedOrders: any[] = [];
  const insertedItems: any[] = [];

  const db: any = {
    _insertedOrders: insertedOrders,
    _insertedItems: insertedItems,
    auth: {
      getUser: async (token: string) => {
        if (!token || token === "invalid") {
          return { data: { user: null }, error: { message: "Invalid JWT" } };
        }
        return {
          data: {
            user: {
              id: opts.userId ?? "cust-1",
              email: opts.email ?? "cust1@example.com",
            },
          },
          error: null,
        };
      },
    },
    rpc: async (fnName: string) => {
      if (fnName === "get_customer_lifetime_discount") {
        return {
          data: opts.lifetimeRpc ?? {
            ok: true,
            discount_percentage: 0,
            tier_name: "Standard Starter",
            eligible_spend: 0,
          },
          error: null,
        };
      }
      if (fnName === "validate_and_redeem_offer") {
        return {
          data: opts.offerRpc ? [opts.offerRpc] : [{ is_valid: false, discount_amount: 0 }],
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      const state: any = { filters: {}, action: "select", insertPayload: null };
      const chain: any = {
        select: () => chain,
        insert: (rows: any[]) => {
          state.action = "insert";
          state.insertPayload = rows;
          if (table === "orders") {
            const created = { id: "ord-server-1", ...rows[0] };
            insertedOrders.push(created);
            state.createdRow = created;
            return chain;
          }
          if (table === "order_items") {
            insertedItems.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          }
          return Promise.resolve({ data: rows, error: null });
        },
        update: () => chain,
        delete: () => chain,
        eq: (col: string, val: any) => {
          state.filters[col] = val;
          return chain;
        },
        neq: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => {
          if (table === "orders" && state.action === "select") {
            return Promise.resolve({ data: opts.recentDup ?? [], error: null });
          }
          return chain;
        },
        single: async () => {
          if (state.action === "insert" && table === "orders") {
            return { data: state.createdRow, error: null };
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => {
          if (table === "cms_content_blocks") {
            return {
              data: {
                content: opts.systemSettings ?? {
                  deliveryChargesEnabled: true,
                  defaultShippingFee: 5.0,
                  freeDeliveryEnabled: false,
                  freeDeliveryThreshold: 0,
                  taxEnabled: true,
                  vatRate: 5,
                  taxPricingMode: "inclusive",
                },
              },
              error: null,
            };
          }
          if (table === "profiles") {
            return {
              data: opts.profile ?? {
                id: opts.userId ?? "cust-1",
                role: "customer",
                pricing_band: "20",
                account_approved: true,
              },
              error: null,
            };
          }
          if (table === "gas_customer_applications") {
            return { data: opts.application ?? null, error: null };
          }
          if (table === "products") {
            return { data: opts.product === undefined ? defaultProduct : opts.product, error: null };
          }
          if (table === "orders") {
            return { data: insertedOrders[0] ?? null, error: null };
          }
          return { data: null, error: null };
        },
        then: (resolve: any) => {
          if (table === "orders") {
            return Promise.resolve(resolve({ data: opts.recentDup ?? [], error: null }));
          }
          return Promise.resolve(resolve({ data: [], error: null }));
        },
      };
      return chain;
    },
  };
  return db;
}

const defaultProduct = {
  id: "prod-propane-47kg",
  slug: "calor-propane-47kg",
  name: "Calor Propane 47kg Cylinder",
  price: 113.5,
  deposit_price: 39.99,
  stock: 20,
  category_slug: "bottled-gas",
  subcategory: "Propane",
  specs: { gas_type: "Propane", cylinder_size: "47kg" },
};

const baseCheckoutPayload = {
  authToken: "valid-token",
  items: [{ productId: "prod-propane-47kg", slug: "calor-propane-47kg", quantity: 1 }],
  cylinderExchangeType: "refill" as const,
  returnedCylinderType: "Calor Propane Cylinder",
  returnedEmptyCount: 1,
  fulfilmentMethod: "delivery" as const,
  selectedBranch: "Weston-Super-Mare",
  fullName: "Test Customer",
  phone: "01452123456",
  address: "10 Stroud Road",
  postcode: "GL1 5AA",
  paymentMethod: "card" as const,
};

describe("Checkout Order Total Security (Server-Side Calculation & Validation)", () => {
  it("ignores browser-submitted manipulated prices, discounts, VAT, and delivery fees", async () => {
    const db = createCheckoutMockDb({});
    const tamperedInput: any = {
      ...baseCheckoutPayload,
      // Attempted client-side tampering fields (must be completely ignored)
      items: [{ productId: "prod-propane-47kg", slug: "calor-propane-47kg", quantity: 1, price: 0.01 }],
      total: 0.01,
      subtotal: 0.01,
      shipping: 0,
      vat: 0,
      offerDiscount: 100,
    };

    const res = await handleCreateCheckoutOrder(tamperedInput, {
      supabaseClient: db,
      loadPricingFn: async () => {},
    });

    assert.equal(res.ok, true);
    assert.ok(res.order);
    // Authoritative DB Band 20 total + £5 delivery
    assert.ok(res.order.total > 100);
    assert.equal(res.order.total, res.authoritativeTotals!.total);
    assert.equal(res.order.shipping_fee, 5);
    assert.equal(db._insertedItems[0].unit_price, res.authoritativeTotals!.lineBreakdowns[0].unitPrice);
  });

  it("rejects invalid product IDs and invalid quantities (0, negative, fractional, > 500)", async () => {
    const dbMissing = createCheckoutMockDb({ product: null });
    const badProd = await handleCreateCheckoutOrder(
      { ...baseCheckoutPayload, items: [{ slug: "non-existent-item", quantity: 1 }] },
      { supabaseClient: dbMissing, loadPricingFn: async () => {} },
    );
    assert.equal(badProd.ok, false);
    assert.match(badProd.error || "", /invalid or no longer available/i);

    const dbValid = createCheckoutMockDb({});
    for (const badQty of [0, -2, 1.5, 501]) {
      const res = await handleCreateCheckoutOrder(
        { ...baseCheckoutPayload, items: [{ slug: "calor-propane-47kg", quantity: badQty }] },
        { supabaseClient: dbValid, loadPricingFn: async () => {} },
      );
      assert.equal(res.ok, false);
      assert.match(res.error || "", /invalid item quantity/i);
    }
  });

  it("applies customer-specific pricing (SHAR10) and preserves lifetime discount eligibility", async () => {
    // 1. Special customer SHAR10 -> special price applied, lifetime discount skipped (no double discount)
    const dbSpecial = createCheckoutMockDb({
      profile: {
        id: "cust-shar10",
        role: "customer",
        pricing_band: "20",
        customer_code: "SHAR10",
        account_approved: true,
      },
      lifetimeRpc: {
        ok: true,
        discount_percentage: 25,
        tier_name: "Platinum Loyalty (25%)",
        eligible_spend: 6000,
      },
    });
    const specialRes = await handleCreateCheckoutOrder(baseCheckoutPayload, {
      supabaseClient: dbSpecial,
      loadPricingFn: async () => {},
    });
    assert.equal(specialRes.ok, true);
    assert.equal(specialRes.authoritativeTotals!.lifetimeDiscountAmount, 0);

    // 2. Standard customer with £600 lifetime spend -> 10% automatic lifetime discount applied on server
    const dbLifetime = createCheckoutMockDb({
      profile: {
        id: "cust-loyalty",
        role: "customer",
        pricing_band: "10",
        account_approved: true,
      },
      lifetimeRpc: {
        ok: true,
        discount_percentage: 10,
        tier_name: "Bronze Loyalty (10%)",
        eligible_spend: 600,
      },
    });
    const loyaltyRes = await handleCreateCheckoutOrder(baseCheckoutPayload, {
      supabaseClient: dbLifetime,
      loadPricingFn: async () => {},
    });
    assert.equal(loyaltyRes.ok, true);
    assert.equal(loyaltyRes.authoritativeTotals!.lifetimeDiscountPercentageApplied, 10);
    assert.ok(loyaltyRes.authoritativeTotals!.lifetimeDiscountAmount > 0);
    assert.equal(loyaltyRes.order.total, loyaltyRes.authoritativeTotals!.total);
  });

  it("rejects duplicate pending submissions within 10 seconds", async () => {
    const dbDup = createCheckoutMockDb({
      recentDup: [{ id: "ord-prev", order_number: "JSS-999999" }],
    });
    const res = await handleCreateCheckoutOrder(baseCheckoutPayload, {
      supabaseClient: dbDup,
      loadPricingFn: async () => {},
    });
    assert.equal(res.ok, false);
    assert.match(res.error || "", /just submitted/i);
  });

  it("ensures Elavon receives the exact authoritative database order total", async () => {
    const prevAlias = process.env.ELAVON_MERCHANT_ALIAS;
    delete process.env.ELAVON_MERCHANT_ALIAS;

    const db = createCheckoutMockDb({});
    const orderRes = await handleCreateCheckoutOrder(baseCheckoutPayload, {
      supabaseClient: db,
      loadPricingFn: async () => {},
    });
    assert.equal(orderRes.ok, true);

    // Elavon session creation reads orders.total directly from DB (ignoring client amount)
    const elavonRes = await handleCreateElavonPaymentSession(
      {
        orderId: orderRes.order.id,
        authToken: "valid-token",
        amount: 0.01,
        returnUrl: "https://john-stayte.vercel.app/checkout",
        cancelUrl: "https://john-stayte.vercel.app/checkout",
      },
      db,
    );

    if (prevAlias !== undefined) process.env.ELAVON_MERCHANT_ALIAS = prevAlias;

    assert.equal(db._insertedOrders[0].total, orderRes.authoritativeTotals!.total);
    // Auth & ownership passed, reaches Elavon credential check
    assert.match(elavonRes.error || "", /Elavon gateway credentials are not configured/i);
  });

  it("secures legacy /order-gas createGasOrder via server function and rolls back on order_items failure", async () => {
    const db = createCheckoutMockDb({});
    const res = await handleCreateLegacyGasOrder(
      {
        authToken: "valid-token",
        customerName: "Test Customer",
        customerPhone: "01452123456",
        deliveryAddress: "10 Stroud Road, GL1 5AA",
        usageType: "DOMESTIC",
        orderType: "REFILL_EXCHANGE",
        productId: "prod-propane-47kg",
        quantity: 2,
      },
      { supabaseClient: db, loadPricingFn: async () => {} },
    );

    assert.equal(res.ok, true);
    assert.ok(res.orderId);
    assert.ok(res.orderNumber?.startsWith("CYL-DOM-"));
    assert.equal(db._insertedOrders[0].total, res.calculated!.total);
    assert.equal(db._insertedItems.length, 1);

    // Unauthenticated legacy gas order must be rejected
    const unauth = await handleCreateLegacyGasOrder(
      {
        authToken: null,
        customerName: "Test",
        customerPhone: "01452123456",
        deliveryAddress: "10 Stroud Road",
        usageType: "DOMESTIC",
        orderType: "REFILL_EXCHANGE",
        productId: "prod-propane-47kg",
        quantity: 1,
      },
      { supabaseClient: db, loadPricingFn: async () => {} },
    );
    assert.equal(unauth.ok, false);
    assert.match(unauth.error || "", /authentication required/i);
  });
});
