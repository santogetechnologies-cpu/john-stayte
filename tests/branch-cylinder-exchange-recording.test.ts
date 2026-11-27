import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { handleVerifyAndCompleteBranchHandover } from "../src/lib/branch-staff-server-fn";

interface MockOpts {
  callerRole?: string;
  callerBranchId?: string;
  callerBranchName?: string;
  orderStatus?: string;
  orderBranchId?: string;
  orderDepot?: string;
  orderPaymentStatus?: string;
  otpVerified?: boolean;
  isExchange?: boolean;
  orderItems?: Array<{ product_id: string | null; product_name: string; quantity: number }>;
  products?: Record<string, string>;
  existingReturns?: any[];
  failOrderUpdateInRpc?: boolean;
}

function createExchangeMockDb(opts: MockOpts = {}) {
  const insertedReturns: any[] = [...(opts.existingReturns || [])];
  let orderStatus = opts.orderStatus ?? "Ready";
  let updatedOrderPayload: any = null;
  let rpcLock = Promise.resolve();
  const productsMap: Record<string, string> = opts.products ?? {
    "prod-13kg": "13kg Propane",
    "prod-15kg": "15kg Butane",
    "prod-6kg": "6kg Propane",
  };
  const orderItems = opts.orderItems ?? [
    { product_id: "prod-13kg", product_name: "13kg Propane", quantity: 1 },
    { product_id: "prod-15kg", product_name: "15kg Butane", quantity: 1 },
  ];

  return {
    auth: {
      getUser: async (token: string) =>
        token === "valid-token"
          ? { data: { user: { id: "staff-1" } }, error: null }
          : { data: { user: null }, error: { message: "Invalid token" } },
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          const basePromise = Promise.resolve(
            table === "order_items"
              ? { data: orderItems, error: null }
              : { data: [], error: null }
          );
          return Object.assign(basePromise, {
            limit: async () => ({ data: insertedReturns.slice(0, 1), error: null }),
            maybeSingle: async () => {
              if (table === "profiles" && val === "staff-1") {
                return {
                  data: {
                    id: "staff-1",
                    role: opts.callerRole ?? "branch_staff",
                    status: "active",
                    assigned_branch: opts.callerBranchName ?? "Whitminster",
                    assigned_branch_id: opts.callerBranchId ?? "branch-1",
                  },
                  error: null,
                };
              }
              if (table === "orders") {
                return {
                  data: {
                    id: "order-1",
                    order_number: "JSS-2001",
                    customer_id: "cust-1",
                    assigned_branch_id: opts.orderBranchId ?? "branch-1",
                    assigned_depot: opts.orderDepot ?? "Whitminster",
                    payment_status: opts.orderPaymentStatus ?? "Paid",
                    delivery_address: {
                      collection_branch: opts.orderDepot ?? "Whitminster",
                      payment_method: "Card / Online Payment (Elavon)",
                      empty_cylinder_required: opts.isExchange ?? true,
                    },
                    notes: opts.isExchange === false ? "" : "Empty Cylinder Required: Yes",
                    status: orderStatus,
                  },
                  error: null,
                };
              }
              if (table === "delivery_assignments") {
                return {
                  data: { id: "asgn-1", otp_verified: opts.otpVerified ?? true },
                  error: null,
                };
              }
              if (table === "profiles" && val === "cust-1") {
                return {
                  data: { credit_account_approved: false, notification_prefs: {} },
                  error: null,
                };
              }
              if (table === "products") {
                return productsMap[val]
                  ? { data: { id: val, name: productsMap[val] }, error: null }
                  : { data: null, error: null };
              }
              return { data: null, error: null };
            },
          });
        },
      }),
    }),
    rpc: async (fnName: string, params: any) => {
      if (fnName !== "complete_branch_handover_with_returns") {
        return { data: null, error: { message: `Unknown RPC ${fnName}` } };
      }

      // Serialize concurrent RPC calls to mirror PostgreSQL SELECT ... FOR UPDATE transaction lock
      let releaseLock!: () => void;
      const prevLock = rpcLock;
      rpcLock = new Promise<void>((res) => {
        releaseLock = res;
      });
      await prevLock;

      try {
        const returns = Array.isArray(params.p_cylinder_returns) ? params.p_cylinder_returns : [];
        const hasExisting = insertedReturns.length > 0;

        if (orderStatus === "Delivered" && (hasExisting || returns.length === 0)) {
          return {
            data: {
              ok: true,
              already_completed: true,
              order_id: params.p_order_id,
              cylinder_returns_recorded: 0,
            },
            error: null,
          };
        }

        // Simulate transactional insert + order update with rollback on failure
        const stagedRows = !hasExisting
          ? returns.map((r: any) => ({
              order_id: params.p_order_id,
              branch_id: opts.orderBranchId ?? "branch-1",
              branch_name: opts.orderDepot ?? "Whitminster",
              product_id: r.product_id,
              cylinder_name: r.cylinder_name,
              expected_quantity: r.expected_quantity,
              returned_quantity: r.returned_quantity,
              recorded_by: params.p_staff_id,
            }))
          : [];

        if (opts.failOrderUpdateInRpc) {
          // Transaction rolls back: stagedRows are NOT committed and orderStatus remains unchanged
          return {
            data: null,
            error: { message: "Simulated trigger/DB failure during orders update; transaction rolled back." },
          };
        }

        insertedReturns.push(...stagedRows);
        orderStatus = "Delivered";
        updatedOrderPayload = {
          status: "Delivered",
          fulfillment_status: params.p_fulfillment_status,
          notes: params.p_notes,
        };

        return {
          data: {
            ok: true,
            already_completed: false,
            order_id: params.p_order_id,
            cylinder_returns_recorded: stagedRows.length,
          },
          error: null,
        };
      } finally {
        releaseLock();
      }
    },
    getInsertedReturns: () => insertedReturns,
    getUpdatedOrderPayload: () => updatedOrderPayload,
    getOrderStatus: () => orderStatus,
  };
}

test("records zero returns cleanly when customer returns 0 empties", async () => {
  const db = createExchangeMockDb({
    orderItems: [{ product_id: "prod-13kg", product_name: "13kg Propane", quantity: 2 }],
  });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 2,
        returnedQuantity: 0,
      },
    ],
  });

  assert.equal(res.ok, true);
  assert.equal(db.getInsertedReturns().length, 1);
  assert.equal(db.getInsertedReturns()[0].returned_quantity, 0);
  assert.equal(db.getInsertedReturns()[0].expected_quantity, 2);
  assert.equal(db.getInsertedReturns()[0].recorded_by, "staff-1");
  assert.equal(db.getUpdatedOrderPayload()?.status, "Delivered");
});

test("records multiple cylinder types and partial returns", async () => {
  const db = createExchangeMockDb();
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
      {
        productId: "prod-15kg",
        cylinderName: "15kg Butane",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
    ],
  });

  assert.equal(res.ok, true);
  assert.equal(db.getInsertedReturns().length, 2);
  assert.equal(db.getInsertedReturns()[0].returned_quantity, 1);
  assert.equal(db.getInsertedReturns()[1].returned_quantity, 0);
});

test("allows alternative returned cylinder type with expected quantity 0 and returned quantity > 0", async () => {
  const db = createExchangeMockDb({
    orderItems: [{ product_id: "prod-13kg", product_name: "13kg Propane", quantity: 1 }],
  });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        productId: "prod-6kg",
        cylinderName: "6kg Propane",
        expectedQuantity: 0,
        returnedQuantity: 1,
      },
    ],
  });

  assert.equal(res.ok, true);
  assert.equal(db.getInsertedReturns().length, 2);
  assert.equal(db.getInsertedReturns()[1].cylinder_name, "6kg Propane");
  assert.equal(db.getInsertedReturns()[1].expected_quantity, 0);
  assert.equal(db.getInsertedReturns()[1].returned_quantity, 1);
});

test("rejects manipulated expected quantities, manipulated cylinder names, and duplicate entries", async () => {
  const dbQty = createExchangeMockDb();
  const resQty = await handleVerifyAndCompleteBranchHandover(dbQty, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 0, // order_items has quantity 1
        returnedQuantity: 0,
      },
    ],
  });
  assert.equal(resQty.ok, false);
  assert.match(resQty.error || "", /Invalid expected quantity/i);
  assert.equal(dbQty.getInsertedReturns().length, 0);

  const dbName = createExchangeMockDb();
  const resName = await handleVerifyAndCompleteBranchHandover(dbName, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "Tampered Name",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
    ],
  });
  assert.equal(resName.ok, false);
  assert.match(resName.error || "", /does not match product/i);
  assert.equal(dbName.getInsertedReturns().length, 0);

  const dbDup = createExchangeMockDb();
  const resDup = await handleVerifyAndCompleteBranchHandover(dbDup, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
    ],
  });
  assert.equal(resDup.ok, false);
  assert.match(resDup.error || "", /Duplicate cylinder return entry/i);
  assert.equal(dbDup.getInsertedReturns().length, 0);
});

test("rejects negative, non-integer quantities and invalid product IDs", async () => {
  const dbNeg = createExchangeMockDb();
  const resNeg = await handleVerifyAndCompleteBranchHandover(dbNeg, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: -1,
      },
    ],
  });
  assert.equal(resNeg.ok, false);
  assert.match(resNeg.error || "", /non-negative integers/i);

  const dbFloat = createExchangeMockDb();
  const resFloat = await handleVerifyAndCompleteBranchHandover(dbFloat, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1.5,
      },
    ],
  });
  assert.equal(resFloat.ok, false);

  const dbBadProd = createExchangeMockDb();
  const resBadProd = await handleVerifyAndCompleteBranchHandover(dbBadProd, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "non-existent-prod",
        cylinderName: "Unknown Gas",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
    ],
  });
  assert.equal(resBadProd.ok, false);
  assert.match(resBadProd.error || "", /Invalid cylinder product ID/i);
});

test("rolls back cylinder return inserts when order completion fails inside RPC", async () => {
  const db = createExchangeMockDb({
    failOrderUpdateInRpc: true,
    orderItems: [{ product_id: "prod-13kg", product_name: "13kg Propane", quantity: 1 }],
  });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
    ],
  });

  assert.equal(res.ok, false);
  assert.match(res.error || "", /rolled back/i);
  assert.equal(db.getInsertedReturns().length, 0, "Cylinder returns must be rolled back");
  assert.equal(db.getOrderStatus(), "Ready", "Order status must remain unchanged");
});

test("concurrent handover requests serialize and never create duplicate cylinder return records", async () => {
  const db = createExchangeMockDb({
    orderItems: [{ product_id: "prod-13kg", product_name: "13kg Propane", quantity: 1 }],
  });
  const payload = {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
    ],
  };

  const [r1, r2] = await Promise.all([
    handleVerifyAndCompleteBranchHandover(db, payload),
    handleVerifyAndCompleteBranchHandover(db, payload),
  ]);

  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(db.getInsertedReturns().length, 1, "Only one set of cylinder returns must be inserted");
});

test("blocks unauthorized branch staff from recording returns for another branch", async () => {
  const db = createExchangeMockDb({
    callerBranchId: "branch-2",
    callerBranchName: "Cheltenham",
    orderBranchId: "branch-1",
    orderDepot: "Whitminster",
  });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
    ],
  });

  assert.equal(res.ok, false);
  assert.match(res.error || "", /not assigned to your branch/i);
  assert.equal(db.getInsertedReturns().length, 0);
});

test("rejects empty cylinderReturns array or missing expected cylinder on exchange orders", async () => {
  const dbEmpty = createExchangeMockDb({ isExchange: true });
  const resEmpty = await handleVerifyAndCompleteBranchHandover(dbEmpty, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [],
  });
  assert.equal(resEmpty.ok, false);
  assert.match(resEmpty.error || "", /required for refill-exchange orders/i);
  assert.equal(dbEmpty.getInsertedReturns().length, 0);
  assert.equal(dbEmpty.getOrderStatus(), "Ready");

  const dbMissing = createExchangeMockDb({ isExchange: true });
  const resMissing = await handleVerifyAndCompleteBranchHandover(dbMissing, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 1,
      },
      // Missing prod-15kg
    ],
  });
  assert.equal(resMissing.ok, false);
  assert.match(resMissing.error || "", /Missing cylinder return record/i);
  assert.equal(dbMissing.getInsertedReturns().length, 0);
});

test("accepts exchange order when all expected cylinder types are recorded with zero returns", async () => {
  const db = createExchangeMockDb({ isExchange: true });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "13kg Propane",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        productId: "prod-15kg",
        cylinderName: "15kg Butane",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
    ],
  });

  assert.equal(res.ok, true);
  assert.equal(db.getInsertedReturns().length, 2);
  assert.equal(db.getInsertedReturns()[0].returned_quantity, 0);
  assert.equal(db.getInsertedReturns()[1].returned_quantity, 0);
  assert.equal(db.getOrderStatus(), "Delivered");
});

test("accepts non-exchange order with empty cylinderReturns array", async () => {
  const db = createExchangeMockDb({ isExchange: false });
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [],
  });

  assert.equal(res.ok, true);
  assert.equal(db.getInsertedReturns().length, 0);
  assert.equal(db.getOrderStatus(), "Delivered");
});

test("migration 00110 RPC security and locking safeguards exist", () => {
  const sqlPath = path.resolve(
    process.cwd(),
    "supabase/migrations/00110_atomic_branch_handover_with_returns.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.complete_branch_handover_with_returns/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public, pg_temp/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.complete_branch_handover_with_returns.*FROM anon, authenticated/s);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.complete_branch_handover_with_returns.*TO service_role/s);
});
