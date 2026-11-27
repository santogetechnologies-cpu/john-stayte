import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadServerJssLogoDataUrl,
  generateCollectionReceiptPdf,
  buildCollectionReceiptEmailHtml,
  buildCollectionReceiptEmailText,
  dispatchCollectionReceiptEmail,
  handleRetryCollectionReceiptEmail,
  type CollectionReceiptPdfInput,
} from "../src/lib/collection-receipt-server-fn";
import { handleVerifyAndCompleteBranchHandover } from "../src/lib/branch-staff-server-fn";

function makeBasePdfInput(overrides?: Partial<CollectionReceiptPdfInput>): CollectionReceiptPdfInput {
  return {
    orderNumber: "JSS-4001",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    collectionBranch: "John Stayte Services – Cirencester",
    collectedAtIso: "2026-11-27T11:15:00.000Z",
    staffName: "Alex Staff",
    items: [
      { productName: "Calor Gas Propane - 13kg Refill", quantity: 2, unitPrice: 50.0, totalPrice: 100.0 },
    ],
    cylinderReturns: [
      { cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 2 },
    ],
    shortReturnAssessment: null,
    originalOrderTotal: 100.0,
    paymentStatus: "Paid",
    paymentMethod: "Card / Online Payment (Elavon)",
    logoDataUrl: null,
    ...overrides,
  };
}

test("1 & 2. loadServerJssLogoDataUrl loads public/image-5.png and falls back gracefully when missing", () => {
  const realLogo = loadServerJssLogoDataUrl();
  assert.ok(realLogo && realLogo.startsWith("data:image/png;base64,"), "Expected valid PNG data URL for public/image-5.png");

  const missingLogo = loadServerJssLogoDataUrl("/nonexistent/path/missing-logo.png");
  assert.equal(missingLogo, null);

  const pdfWithLogo = generateCollectionReceiptPdf(makeBasePdfInput({ logoDataUrl: realLogo }));
  const pdfFallback = generateCollectionReceiptPdf(makeBasePdfInput({ logoDataUrl: null }));
  assert.equal(pdfWithLogo.filename, "JSS_Collection_Receipt_JSS-4001.pdf");
  assert.equal(pdfFallback.filename, "JSS_Collection_Receipt_JSS-4001.pdf");
  assert.ok(Buffer.from(pdfWithLogo.base64, "base64").toString("latin1").startsWith("%PDF-"));
  assert.ok(Buffer.from(pdfFallback.base64, "base64").toString("latin1").startsWith("%PDF-"));
});

test("3, 4, 5 & 6. receipt PDF and email represent zero returns, short-return assessment, and paid vs unpaid accurately", () => {
  const unpaidInput = makeBasePdfInput({
    cylinderReturns: [
      { cylinderName: "Calor Gas Propane - 13kg Refill", expectedQuantity: 2, returnedQuantity: 0 },
    ],
    shortReturnAssessment: {
      unmatchedQuantity: 2,
      assessedFee: 79.98,
      status: "payment_required",
    },
  });

  const pdfUnpaid = generateCollectionReceiptPdf(unpaidInput);
  const pdfUnpaidLatin = Buffer.from(pdfUnpaid.base64, "base64").toString("latin1");
  assert.match(pdfUnpaidLatin, /JSS-4001/);
  assert.match(pdfUnpaidLatin, /Jane Doe/);
  assert.match(pdfUnpaidLatin, /Short-Return Assessment/);
  assert.match(pdfUnpaidLatin, /Payment Required \\?\(Unpaid\\?\)/);

  const html = buildCollectionReceiptEmailHtml(unpaidInput);
  const text = buildCollectionReceiptEmailText(unpaidInput);
  assert.match(html, /Jane Doe/);
  assert.match(html, /JSS-4001/);
  assert.match(html, /Cirencester/);
  assert.match(text, /returned 0 of 2 expected/);

  const paidInput = makeBasePdfInput({
    shortReturnAssessment: {
      unmatchedQuantity: 1,
      assessedFee: 39.99,
      status: "paid",
    },
  });
  const pdfPaidLatin = Buffer.from(generateCollectionReceiptPdf(paidInput).base64, "base64").toString("latin1");
  assert.match(pdfPaidLatin, /Assessment Status: Paid/);
});

function createReceiptMockDb(opts?: {
  orderStatus?: string;
  customerEmail?: string | null;
  receiptEmailSentAt?: string | null;
  receiptEmailId?: string | null;
  receiptEmailError?: string | null;
  receiptEmailAttempts?: number;
  failFinalSentUpdate?: boolean;
}) {
  const orderState: any = {
    id: "order-1",
    order_number: "JSS-4001",
    customer_id: "cust-1",
    customer_name: "Jane Doe",
    customer_email: opts?.customerEmail === undefined ? "jane@example.com" : opts.customerEmail,
    total: 100.0,
    payment_status: "Paid",
    status: opts?.orderStatus ?? "Delivered",
    assigned_branch_id: "branch-1",
    assigned_depot: "Whitminster",
    delivery_address: {
      collection_branch: "Whitminster",
      payment_method: "Card / Online Payment (Elavon)",
    },
    notes: "",
    updated_at: "2026-11-27T11:15:00.000Z",
    receipt_email_sent_at: opts?.receiptEmailSentAt ?? null,
    receipt_email_id: opts?.receiptEmailId ?? null,
    receipt_email_error: opts?.receiptEmailError ?? null,
    receipt_email_attempts: opts?.receiptEmailAttempts ?? 0,
  };

  const buildUpdateQuery = (payload: any) => {
    const filters: Array<(row: any) => boolean> = [];
    const chain: any = {
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return chain;
      },
      is: (col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] === null : r[col] === val));
        return chain;
      },
      or: (_expr: string) => {
        // Supports "receipt_email_error.is.null,receipt_email_error.neq.__SENDING__"
        filters.push((r) => r.receipt_email_error === null || r.receipt_email_error !== "__SENDING__");
        return chain;
      },
      select: () => ({
        maybeSingle: async () => {
          const matches = filters.every((fn) => fn(orderState));
          if (!matches) return { data: null, error: null };
          Object.assign(orderState, payload);
          return { data: { id: orderState.id }, error: null };
        },
      }),
      then: (resolve: any) => {
        if (opts?.failFinalSentUpdate && payload.receipt_email_sent_at) {
          return Promise.resolve({ error: { message: "Simulated DB write failure" } }).then(resolve);
        }
        const matches = filters.every((fn) => fn(orderState));
        if (matches) {
          Object.assign(orderState, payload);
        }
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    return chain;
  };

  return {
    auth: {
      getUser: async (token: string) =>
        token === "valid-token"
          ? { data: { user: { id: "staff-1" } }, error: null }
          : { data: { user: null }, error: { message: "Invalid" } },
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          const listData =
            table === "order_items"
              ? [{ product_name: "Calor Gas Propane - 13kg Refill", quantity: 2, unit_price: 50, total_price: 100 }]
              : table === "order_cylinder_returns"
                ? [{ cylinder_name: "Calor Gas Propane - 13kg Refill", expected_quantity: 2, returned_quantity: 2, recorded_by: "staff-1", recorded_at: "2026-11-27T11:15:00.000Z" }]
                : [];
          return Object.assign(Promise.resolve({ data: listData, error: null }), {
            maybeSingle: async () => {
              if (table === "orders") return { data: { ...orderState }, error: null };
              if (table === "profiles" && val === "staff-1") {
                return {
                  data: {
                    id: "staff-1",
                    full_name: "Alex Staff",
                    role: "branch_staff",
                    status: "active",
                    assigned_branch: "Whitminster",
                    assigned_branch_id: "branch-1",
                  },
                  error: null,
                };
              }
              if (table === "delivery_assignments") {
                return { data: { id: "asgn-1", otp_verified: true }, error: null };
              }
              if (table === "order_short_return_assessments") return { data: null, error: null };
              return { data: null, error: null };
            },
          });
        },
      }),
      update: (payload: any) => (table === "orders" ? buildUpdateQuery(payload) : { eq: async () => ({ error: null }) }),
    }),
    rpc: async (fnName: string) => {
      if (fnName === "complete_branch_handover_with_returns") {
        orderState.status = "Delivered";
        return { data: { ok: true, already_completed: false, order_id: "order-1", cylinder_returns_recorded: 0 }, error: null };
      }
      return { data: null, error: { message: "Unknown RPC" } };
    },
    getOrderState: () => ({ ...orderState }),
  };
}

test("7 & 8. dispatchCollectionReceiptEmail sends Resend payload with PDF attachment, Idempotency-Key, and tracks success", async () => {
  const db = createReceiptMockDb();
  let capturedBody: any = null;
  let capturedHeaders: any = null;
  const mockFetch: typeof fetch = (async (_url: any, init: any) => {
    capturedBody = JSON.parse(init.body);
    capturedHeaders = init.headers;
    return new Response(JSON.stringify({ id: "resend_msg_123" }), { status: 200 });
  }) as any;

  const res = await dispatchCollectionReceiptEmail(db, {
    orderId: "order-1",
    staffId: "staff-1",
    fetchFn: mockFetch,
    resendApiKey: "re_test_key",
    logoDataUrl: null,
  });

  assert.equal(res.ok, true);
  assert.equal(res.emailId, "resend_msg_123");
  assert.equal(capturedHeaders["Idempotency-Key"], "jss-collection-receipt-order-1");
  assert.equal(capturedBody.to[0], "jane@example.com");
  assert.equal(capturedBody.subject, "Collection Confirmed — Order JSS-4001 | John Stayte Services");
  assert.equal(capturedBody.attachments.length, 1);
  assert.equal(capturedBody.attachments[0].filename, "JSS_Collection_Receipt_JSS-4001.pdf");
  assert.ok(Buffer.from(capturedBody.attachments[0].content, "base64").toString("latin1").startsWith("%PDF-"));

  const state = db.getOrderState();
  assert.ok(state.receipt_email_sent_at);
  assert.equal(state.receipt_email_id, "resend_msg_123");
  assert.equal(state.receipt_email_error, null);
  assert.equal(state.receipt_email_attempts, 1);
});

test("active dispatch lease cannot be taken over; stale lease can be recovered by only one concurrent claimant", async () => {
  const nowMs = 1_700_000_000_000;
  // Active lease (30s old, < 120s)
  const dbActive = createReceiptMockDb({
    receiptEmailError: `__SENDING__:${nowMs - 30_000}`,
    receiptEmailAttempts: 1,
  });
  let activeSendCount = 0;
  const activeFetch: typeof fetch = (async () => {
    activeSendCount += 1;
    return new Response(JSON.stringify({ id: "should_not_send" }), { status: 200 });
  }) as any;

  const activeRes = await dispatchCollectionReceiptEmail(dbActive, {
    orderId: "order-1",
    fetchFn: activeFetch,
    resendApiKey: "re_test_key",
    logoDataUrl: null,
    nowMs,
  });
  assert.equal(activeRes.skipped, true);
  assert.equal(activeSendCount, 0);

  // Stale lease (180s old, > 120s) with two concurrent claimants -> only one wins CAS
  const dbStale = createReceiptMockDb({
    receiptEmailError: `__SENDING__:${nowMs - 180_000}`,
    receiptEmailAttempts: 1,
  });
  let staleSendCount = 0;
  const staleFetch: typeof fetch = (async () => {
    staleSendCount += 1;
    await new Promise((r) => setTimeout(r, 15));
    return new Response(JSON.stringify({ id: "resend_recovered_1" }), { status: 200 });
  }) as any;

  const [c1, c2] = await Promise.all([
    dispatchCollectionReceiptEmail(dbStale, { orderId: "order-1", fetchFn: staleFetch, resendApiKey: "re_test_key", logoDataUrl: null, nowMs }),
    dispatchCollectionReceiptEmail(dbStale, { orderId: "order-1", fetchFn: staleFetch, resendApiKey: "re_test_key", logoDataUrl: null, nowMs }),
  ]);

  assert.equal(c1.ok, true);
  assert.equal(c2.ok, true);
  assert.equal(staleSendCount, 1, "Only one concurrent claimant may recover a stale lease");
  assert.equal(dbStale.getOrderState().receipt_email_id, "resend_recovered_1");
});

test("final DB update failure after Resend 2xx preserves emailId, records error, and does not mark sent", async () => {
  const db = createReceiptMockDb({ failFinalSentUpdate: true });
  const okFetch: typeof fetch = (async () =>
    new Response(JSON.stringify({ id: "resend_db_fail_999" }), { status: 200 })) as any;

  const res = await dispatchCollectionReceiptEmail(db, {
    orderId: "order-1",
    fetchFn: okFetch,
    resendApiKey: "re_test_key",
    logoDataUrl: null,
  });

  assert.equal(res.ok, false);
  assert.equal(res.emailId, "resend_db_fail_999");
  const state = db.getOrderState();
  assert.equal(state.receipt_email_sent_at, null);
  assert.equal(state.receipt_email_id, "resend_db_fail_999");
  assert.match(state.receipt_email_error || "", /DB update failed/i);
});

test("9 & 11. failed email records error without changing Delivered status and can be safely retried", async () => {
  const db = createReceiptMockDb();
  const failFetch: typeof fetch = (async () =>
    new Response(JSON.stringify({ message: "Resend temporary outage" }), { status: 502 })) as any;

  const failRes = await dispatchCollectionReceiptEmail(db, {
    orderId: "order-1",
    staffId: "staff-1",
    fetchFn: failFetch,
    resendApiKey: "re_test_key",
    logoDataUrl: null,
  });
  assert.equal(failRes.ok, false);
  assert.equal(db.getOrderState().status, "Delivered");
  assert.equal(db.getOrderState().receipt_email_sent_at, null);
  assert.match(db.getOrderState().receipt_email_error || "", /Resend API HTTP 502/);
  assert.equal(db.getOrderState().receipt_email_attempts, 1);

  // Retry succeeds
  const okFetch: typeof fetch = (async () =>
    new Response(JSON.stringify({ id: "resend_retry_456" }), { status: 200 })) as any;
  const retryRes = await handleRetryCollectionReceiptEmail(
    db,
    { orderId: "order-1", authToken: "valid-token" },
    { fetchFn: okFetch, resendApiKey: "re_test_key", logoDataUrl: null },
  );
  assert.equal(retryRes.ok, true);
  assert.equal(db.getOrderState().receipt_email_id, "resend_retry_456");
  assert.equal(db.getOrderState().receipt_email_attempts, 2);
  assert.equal(db.getOrderState().receipt_email_error, null);
});

test("10. duplicate prevention blocks concurrent sends and already-sent resends", async () => {
  const db = createReceiptMockDb();
  let sendCount = 0;
  const slowFetch: typeof fetch = (async () => {
    sendCount += 1;
    await new Promise((r) => setTimeout(r, 15));
    return new Response(JSON.stringify({ id: "resend_once" }), { status: 200 });
  }) as any;

  const [r1, r2] = await Promise.all([
    dispatchCollectionReceiptEmail(db, { orderId: "order-1", fetchFn: slowFetch, resendApiKey: "re_test_key", logoDataUrl: null }),
    dispatchCollectionReceiptEmail(db, { orderId: "order-1", fetchFn: slowFetch, resendApiKey: "re_test_key", logoDataUrl: null }),
  ]);

  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(sendCount, 1, "Concurrent calls must only send once");

  const r3 = await dispatchCollectionReceiptEmail(db, { orderId: "order-1", fetchFn: slowFetch, resendApiKey: "re_test_key", logoDataUrl: null });
  assert.equal(r3.alreadySent, true);
  assert.equal(sendCount, 1, "Already-sent receipt must never be resent");
});

test("12. email failure during handover never rolls back successful Delivered completion", async () => {
  const db = createReceiptMockDb({ orderStatus: "Ready", customerEmail: "" }); // missing email causes receipt dispatch failure
  const res = await handleVerifyAndCompleteBranchHandover(db, {
    orderId: "order-1",
    authToken: "valid-token",
    cylinderReturns: [],
  });

  assert.equal(res.ok, true, "Handover must still succeed even if receipt email fails");
  assert.equal(db.getOrderState().status, "Delivered");
  assert.equal(res.data?.receiptEmailSent, false);
});

test("migration 00112 receipt email tracking columns exist", () => {
  const sqlPath = path.resolve(process.cwd(), "supabase/migrations/00112_collection_receipt_email_tracking.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /receipt_email_sent_at timestamptz/);
  assert.match(sql, /receipt_email_id text/);
  assert.match(sql, /receipt_email_error text/);
  assert.match(sql, /receipt_email_attempts integer NOT NULL DEFAULT 0/);
});
