import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateShortReturnAssessment } from "../src/lib/customer-order-pricing-service";
import {
  handleAssessBranchOrderShortReturn,
  handleVerifyAndCompleteBranchHandover,
} from "../src/lib/branch-staff-server-fn";

test("calculateShortReturnAssessment uses products.specs.deposit_price with 39.99 fallback and adds no VAT", () => {
  const res = calculateShortReturnAssessment({
    isExchangeOrder: true,
    orderItems: [
      {
        productId: "prod-19kg",
        productName: "Calor Gas Propane - 19kg Refill",
        quantity: 1,
        unitPrice: 62.0,
        product: {
          id: "prod-19kg",
          name: "Calor Gas Propane - 19kg Refill",
          specs: { gas_type: "Propane", cylinder_size: "19kg", deposit_price: 49.99 },
        },
      },
      {
        productId: "prod-fallback",
        productName: "Calor Gas Propane - 13kg Refill",
        quantity: 1,
        unitPrice: 50.0,
        product: {
          id: "prod-fallback",
          name: "Calor Gas Propane - 13kg Refill",
          specs: { gas_type: "Propane", cylinder_size: "13kg" },
        },
      },
    ],
    cylinderReturns: [
      {
        productId: "prod-19kg",
        cylinderName: "Calor Gas Propane - 19kg Refill",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        productId: "prod-fallback",
        cylinderName: "Calor Gas Propane - 13kg Refill",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
    ],
  });

  assert.equal(res.hasShortReturn, true);
  assert.equal(res.unmatchedQuantity, 2);
  assert.equal(res.assessedFee, 89.98);
  assert.equal(res.status, "payment_required");
});

test("calculateShortReturnAssessment offsets shortfalls with compatible alternative returns", () => {
  const res = calculateShortReturnAssessment({
    isExchangeOrder: true,
    orderItems: [
      {
        productId: "prod-13kg",
        productName: "Calor Gas Propane - 13kg Refill",
        quantity: 1,
        unitPrice: 50.0,
        product: {
          id: "prod-13kg",
          name: "Calor Gas Propane - 13kg Refill",
          specs: { gas_type: "Propane", cylinder_size: "13kg", deposit_price: 39.99 },
        },
      },
    ],
    cylinderReturns: [
      {
        productId: "prod-13kg",
        cylinderName: "Calor Gas Propane - 13kg Refill",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        productId: "prod-6kg",
        cylinderName: "Calor Gas Propane - 6kg Refill",
        expectedQuantity: 0,
        returnedQuantity: 1,
      },
    ],
  });

  assert.equal(res.hasShortReturn, false);
  assert.equal(res.unmatchedQuantity, 0);
  assert.equal(res.assessedFee, 0);
  assert.equal(res.status, "none");
  assert.equal(res.lineAssessments[0].compatibleAlternativeMatched, 1);
});

test("calculateShortReturnAssessment rejects incompatible alternative returns like Patio vs Disposable", () => {
  const res = calculateShortReturnAssessment({
    isExchangeOrder: true,
    orderItems: [
      {
        productId: "prod-patio-13",
        productName: "Calor Patio Gas - 13kg Refill",
        quantity: 1,
        unitPrice: 52.5,
        product: {
          id: "prod-patio-13",
          name: "Calor Patio Gas - 13kg Refill",
          specs: { gas_type: "Patio Gas", cylinder_size: "13kg", deposit_price: 44.99 },
        },
      },
    ],
    cylinderReturns: [
      {
        productId: "prod-patio-13",
        cylinderName: "Calor Patio Gas - 13kg Refill",
        expectedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        productId: "prod-cp250",
        cylinderName: "Disposable Cartridge CP250",
        expectedQuantity: 0,
        returnedQuantity: 1,
      },
    ],
  });

  assert.equal(res.hasShortReturn, true);
  assert.equal(res.unmatchedQuantity, 1);
  assert.equal(res.assessedFee, 44.99);
});

function createAssessmentMockDb(opts?: {
  orderedQty?: number;
  orderStatus?: string;
  initialAssessments?: any[];
}) {
  const orderedQty = opts?.orderedQty ?? 2;
  const assessments: any[] = [...(opts?.initialAssessments || [])];
  let orderStatus = opts?.orderStatus ?? "Ready";

  const orderRow = {
    id: "order-1",
    order_number: "JSS-3001",
    customer_id: "cust-1",
    assigned_branch_id: "branch-1",
    assigned_depot: "Whitminster",
    payment_status: "Paid",
    total: orderedQty * 50.0,
    subtotal: orderedQty * 50.0,
    delivery_address: {
      collection_branch: "Whitminster",
      payment_method: "Card / Online Payment (Elavon)",
      empty_cylinder_required: true,
    },
    notes: "Empty Cylinder Required: Yes",
    status: orderStatus,
  };

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
              ? {
                  data: [
                    {
                      product_id: "prod-13kg",
                      product_name: "Calor Gas Propane - 13kg Refill",
                      quantity: orderedQty,
                      unit_price: 50.0,
                      total_price: orderedQty * 50.0,
                    },
                  ],
                  error: null,
                }
              : { data: [], error: null }
          );
          return Object.assign(basePromise, {
            maybeSingle: async () => {
              if (table === "profiles" && val === "staff-1") {
                return {
                  data: {
                    id: "staff-1",
                    role: "branch_staff",
                    status: "active",
                    assigned_branch: "Whitminster",
                    assigned_branch_id: "branch-1",
                  },
                  error: null,
                };
              }
              if (table === "orders") return { data: { ...orderRow, status: orderStatus }, error: null };
              if (table === "delivery_assignments") {
                return { data: { id: "asgn-1", otp_verified: true }, error: null };
              }
              if (table === "profiles" && val === "cust-1") {
                return { data: { credit_account_approved: false, notification_prefs: {} }, error: null };
              }
              if (table === "products" && val === "prod-13kg") {
                return {
                  data: {
                    id: "prod-13kg",
                    name: "Calor Gas Propane - 13kg Refill",
                    specs: { gas_type: "Propane", cylinder_size: "13kg", deposit_price: 39.99 },
                  },
                  error: null,
                };
              }
              if (table === "order_short_return_assessments") {
                return {
                  data: assessments.find((a) => a.order_id === val) || null,
                  error: null,
                };
              }
              return { data: null, error: null };
            },
          });
        },
      }),
      insert: async (row: any) => {
        if (table === "order_short_return_assessments") {
          assessments.push({ id: `assess-${assessments.length + 1}`, ...row });
        }
        return { error: null };
      },
      update: (payload: any) => ({
        eq: (_col: string, idVal: string) => ({
          in: async (_statusCol: string, allowedStatuses: string[]) => {
            if (table === "order_short_return_assessments") {
              const idx = assessments.findIndex((a) => a.id === idVal);
              if (idx >= 0 && allowedStatuses.includes(String(assessments[idx].status).toLowerCase())) {
                assessments[idx] = { ...assessments[idx], ...payload };
              }
            }
            return { error: null };
          },
        }),
      }),
    }),
    rpc: async (fnName: string) => {
      if (fnName === "complete_branch_handover_with_returns") {
        orderStatus = "Delivered";
        return {
          data: { ok: true, already_completed: false, order_id: "order-1", cylinder_returns_recorded: 1 },
          error: null,
        };
      }
      return { data: null, error: { message: "Unknown RPC" } };
    },
    getAssessments: () => assessments,
    getOrderRow: () => ({ ...orderRow, status: orderStatus }),
  };
}

test("unpaid assessment recalculates from £79.98 to £39.99 and then to £0 (none) without duplicates", async () => {
  const db = createAssessmentMockDb({ orderedQty: 2 });

  // 1. 0 returned -> £79.98 (payment_required)
  const r1 = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 0 },
    ],
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.data?.assessment?.assessed_fee, 79.98);
  assert.equal(r1.data?.assessment?.status, "payment_required");
  assert.equal(db.getAssessments().length, 1);

  // 2. 1 returned -> £39.99 (payment_required), updates same row
  const r2 = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 1 },
    ],
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.data?.updated, true);
  assert.equal(r2.data?.assessment?.assessed_fee, 39.99);
  assert.equal(r2.data?.assessment?.status, "payment_required");
  assert.equal(db.getAssessments().length, 1);

  // 3. 2 returned -> £0 (none), updates same row
  const r3 = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 2 },
    ],
  });
  assert.equal(r3.ok, true);
  assert.equal(r3.data?.updated, true);
  assert.equal(r3.data?.assessment?.assessed_fee, 0);
  assert.equal(r3.data?.assessment?.status, "none");
  assert.equal(db.getAssessments().length, 1);
  assert.equal(db.getOrderRow().total, 100.0);
});

test("existing zero-fee assessment (none) recalculates to positive fee (payment_required)", async () => {
  const db = createAssessmentMockDb({ orderedQty: 1 });

  const r1 = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 1, returnedQuantity: 1 },
    ],
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.data?.assessment?.assessed_fee, 0);
  assert.equal(r1.data?.assessment?.status, "none");

  const r2 = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 1, returnedQuantity: 0 },
    ],
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.data?.assessment?.assessed_fee, 39.99);
  assert.equal(r2.data?.assessment?.status, "payment_required");
  assert.equal(db.getAssessments().length, 1);
});

test("paid and waived assessments remain immutable and reject changed quantities", async () => {
  for (const status of ["paid", "waived"]) {
    const db = createAssessmentMockDb({
      orderedQty: 1,
      initialAssessments: [
        {
          id: "assess-1",
          order_id: "order-1",
          expected_total_quantity: 1,
          returned_total_quantity: 0,
          unmatched_quantity: 1,
          assessed_fee: 39.99,
          status,
        },
      ],
    });

    // Changed quantity (0 -> 1) must be rejected
    const resChanged = await handleAssessBranchOrderShortReturn(db, {
      orderId: "order-1",
      authToken: "valid-token",
      cylinderReturns: [
        { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 1, returnedQuantity: 1 },
      ],
    });
    assert.equal(resChanged.ok, false);
    assert.match(resChanged.error || "", /cannot be changed after/i);
    assert.equal(db.getAssessments()[0].status, status);
    assert.equal(db.getAssessments()[0].assessed_fee, 39.99);

    // Matching quantity allows handover when paid or waived
    const resHandover = await handleVerifyAndCompleteBranchHandover(db, {
      orderId: "order-1",
      authToken: "valid-token",
      cylinderReturns: [
        { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 1, returnedQuantity: 0 },
      ],
    });
    assert.equal(resHandover.ok, true);
    assert.equal(db.getOrderRow().status, "Delivered");
  }
});

test("delivered order assessment remains immutable", async () => {
  const db = createAssessmentMockDb({
    orderedQty: 1,
    orderStatus: "Delivered",
    initialAssessments: [
      {
        id: "assess-1",
        order_id: "order-1",
        expected_total_quantity: 1,
        returned_total_quantity: 0,
        unmatched_quantity: 1,
        assessed_fee: 39.99,
        status: "paid",
      },
    ],
  });

  const res = await handleAssessBranchOrderShortReturn(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 1, returnedQuantity: 1 },
    ],
  });
  assert.equal(res.ok, true);
  assert.equal(res.data?.immutable, true);
  assert.equal(db.getAssessments()[0].assessed_fee, 39.99);
  assert.equal(db.getAssessments()[0].status, "paid");
});

test("handover uses latest recalculated assessment (£79.98 -> £39.99 -> £0 allows completion)", async () => {
  const db = createAssessmentMockDb({ orderedQty: 2 });

  // 0 returned -> blocks at £79.98
  const h1 = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 0 },
    ],
  });
  assert.equal(h1.ok, false);
  assert.match(h1.error || "", /£79\.98/);

  // 1 returned -> recalculates to £39.99 (not stale £79.98!)
  const h2 = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 1 },
    ],
  });
  assert.equal(h2.ok, false);
  assert.match(h2.error || "", /£39\.99/);
  assert.equal(db.getAssessments()[0].assessed_fee, 39.99);

  // 2 returned -> recalculates to £0 (none) and completes handover
  const h3 = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [
      { productId: "prod-13kg", cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 2 },
    ],
  });
  assert.equal(h3.ok, true);
  assert.equal(db.getAssessments()[0].assessed_fee, 0);
  assert.equal(db.getAssessments()[0].status, "none");
  assert.equal(db.getOrderRow().status, "Delivered");
});

test("migration 00111 order_short_return_assessments schema and RLS exist", () => {
  const sqlPath = path.resolve(
    process.cwd(),
    "supabase/migrations/00111_order_short_return_assessments.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.order_short_return_assessments/);
  assert.match(sql, /order_id uuid NOT NULL UNIQUE/);
  assert.match(sql, /assessed_fee numeric\(10, 2\) NOT NULL DEFAULT 0 CHECK \(assessed_fee >= 0\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
});
