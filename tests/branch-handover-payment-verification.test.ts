import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateBranchOrderPaymentEligibility } from "../src/lib/branch-service";
import { handleVerifyAndCompleteBranchHandover } from "../src/lib/branch-staff-server-fn";

test("evaluateBranchOrderPaymentEligibility allows Paid orders", () => {
  const res = evaluateBranchOrderPaymentEligibility({
    paymentStatus: "Paid",
    paymentMethod: "Card / Online Payment (Elavon)",
    creditAccountApproved: false,
  });
  assert.equal(res.paymentSatisfied, true);
  assert.equal(res.isPaid, true);
  assert.equal(res.isApprovedCreditOrder, false);
});

test("evaluateBranchOrderPaymentEligibility allows approved Credit Account orders when not Failed/Cancelled", () => {
  const res = evaluateBranchOrderPaymentEligibility({
    paymentStatus: "Pending",
    paymentMethod: "Credit Account (30-Day Invoice)",
    creditAccountApproved: true,
  });
  assert.equal(res.paymentSatisfied, true);
  assert.equal(res.isApprovedCreditOrder, true);
});

test("evaluateBranchOrderPaymentEligibility blocks Pending, Failed, Cancelled non-credit orders", () => {
  for (const status of ["Pending", "Failed", "Cancelled", "Unpaid"]) {
    const res = evaluateBranchOrderPaymentEligibility({
      paymentStatus: status,
      paymentMethod: "Card / Online Payment (Elavon)",
      creditAccountApproved: true, // customer has credit, but this order wasn't placed on Credit Account
    });
    assert.equal(res.paymentSatisfied, false, `Expected ${status} non-credit order to be blocked`);
  }
});

test("evaluateBranchOrderPaymentEligibility blocks unapproved Credit Account orders and Failed Credit Account orders", () => {
  const unapproved = evaluateBranchOrderPaymentEligibility({
    paymentStatus: "Pending",
    paymentMethod: "Credit Account (30-Day Invoice)",
    creditAccountApproved: false,
  });
  assert.equal(unapproved.paymentSatisfied, false);

  const failedCredit = evaluateBranchOrderPaymentEligibility({
    paymentStatus: "Failed",
    paymentMethod: "Credit Account (30-Day Invoice)",
    creditAccountApproved: true,
  });
  assert.equal(failedCredit.paymentSatisfied, false);
});

function createMockSupabaseAdmin(opts: {
  callerRole?: string;
  callerBranchId?: string;
  orderPaymentStatus?: string;
  orderPaymentMethod?: string;
  otpVerified?: boolean;
  creditApproved?: boolean;
}) {
  let updatedPayload: any = null;
  const mockClient = {
    auth: {
      getUser: async (token: string) =>
        token === "valid-token"
          ? { data: { user: { id: "staff-1" } }, error: null }
          : { data: { user: null }, error: { message: "Invalid token" } },
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          const resultPromise = Promise.resolve(
            table === "order_items" ? { data: [], error: null } : { data: [], error: null }
          );
          return Object.assign(resultPromise, {
            limit: async () => ({ data: [], error: null }),
            maybeSingle: async () => {
              if (table === "profiles" && val === "staff-1") {
                return {
                  data: {
                    id: "staff-1",
                    role: opts.callerRole ?? "branch_staff",
                    status: "active",
                    assigned_branch: "Whitminster",
                    assigned_branch_id: opts.callerBranchId ?? "branch-1",
                  },
                  error: null,
                };
              }
              if (table === "orders") {
                return {
                  data: {
                    id: "order-1",
                    order_number: "JSS-1001",
                    customer_id: "cust-1",
                    assigned_branch_id: "branch-1",
                    assigned_depot: "Whitminster",
                    payment_status: opts.orderPaymentStatus ?? "Pending",
                    delivery_address: {
                      payment_method: opts.orderPaymentMethod ?? "Card / Online Payment",
                    },
                    notes: "",
                    status: "Ready",
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
                  data: {
                    credit_account_approved: opts.creditApproved ?? false,
                    notification_prefs: {},
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            },
          });
        },
      }),
      update: (payload: any) => ({
        eq: async () => {
          updatedPayload = payload;
          return { error: null };
        },
      }),
    }),
    rpc: async (fnName: string, params: any) => {
      if (fnName === "complete_branch_handover_with_returns") {
        updatedPayload = {
          status: "Delivered",
          fulfillment_status: params.p_fulfillment_status,
          notes: params.p_notes,
        };
        return {
          data: {
            ok: true,
            already_completed: false,
            order_id: params.p_order_id,
            cylinder_returns_recorded: Array.isArray(params.p_cylinder_returns)
              ? params.p_cylinder_returns.length
              : 0,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `Unknown RPC ${fnName}` } };
    },
    getUpdatedPayload: () => updatedPayload,
  };
  return mockClient;
}

test("handleVerifyAndCompleteBranchHandover blocks unpaid orders even when OTP is verified", async () => {
  for (const status of ["Pending", "Failed", "Cancelled"]) {
    const mockDb = createMockSupabaseAdmin({
      orderPaymentStatus: status,
      otpVerified: true,
    });
    const res = await handleVerifyAndCompleteBranchHandover(mockDb, {
      orderId: "order-1",
      authToken: "valid-token",
    });
    assert.equal(res.ok, false, `Expected ${status} order to be blocked even with OTP verified`);
    assert.equal(mockDb.getUpdatedPayload(), null, "Order must not be updated when payment fails");
  }
});

test("handleVerifyAndCompleteBranchHandover blocks Paid orders when OTP is not verified", async () => {
  const mockDb = createMockSupabaseAdmin({
    orderPaymentStatus: "Paid",
    otpVerified: false,
  });
  const res = await handleVerifyAndCompleteBranchHandover(mockDb, {
    orderId: "order-1",
    authToken: "valid-token",
  });
  assert.equal(res.ok, false);
  assert.match(res.error || "", /OTP verification is mandatory/i);
  assert.equal(mockDb.getUpdatedPayload(), null);
});

test("handleVerifyAndCompleteBranchHandover allows Paid orders and Approved Credit orders when OTP is verified", async () => {
  const paidDb = createMockSupabaseAdmin({
    orderPaymentStatus: "Paid",
    otpVerified: true,
  });
  const paidRes = await handleVerifyAndCompleteBranchHandover(paidDb, {
    orderId: "order-1",
    authToken: "valid-token",
  });
  assert.equal(paidRes.ok, true);
  assert.equal(paidDb.getUpdatedPayload()?.status, "Delivered");

  const creditDb = createMockSupabaseAdmin({
    orderPaymentStatus: "Pending",
    orderPaymentMethod: "Credit Account (30-Day Invoice)",
    creditApproved: true,
    otpVerified: true,
  });
  const creditRes = await handleVerifyAndCompleteBranchHandover(creditDb, {
    orderId: "order-1",
    authToken: "valid-token",
  });
  assert.equal(creditRes.ok, true);
  assert.equal(creditDb.getUpdatedPayload()?.status, "Delivered");
});

test("migration 00108 and BranchOrdersView Hold Handover safeguards exist", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/00108_enforce_payment_before_branch_handover.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /enforce_payment_or_credit_before_delivered/);
  assert.match(sql, /trg_enforce_payment_or_credit_before_delivered/);
  assert.match(sql, /credit_account_approved/);
  assert.match(sql, /ERRCODE = 'P0001'/);

  const viewPath = path.resolve(
    process.cwd(),
    "src/components/branch/BranchOrdersView.tsx"
  );
  const viewSrc = fs.readFileSync(viewPath, "utf8");
  assert.match(viewSrc, /Payment & Credit Verification/);
  assert.match(viewSrc, /Hold Handover/);
  assert.match(viewSrc, /verifyAndCompleteBranchHandoverServerFn/);
});
