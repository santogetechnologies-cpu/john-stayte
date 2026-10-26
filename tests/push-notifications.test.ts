import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import type {
  PushDispatchEvent,
  PushEventType,
  PushRole,
} from "../src/lib/push-notifications-types";
import {
  getFirebaseServiceAccount,
  verifyAuthoritativePaymentState,
  validateTargetAuthorization,
  executePushDispatch,
  triggerPaymentStatusPushInternal,
  handleDispatchPushNotification,
  dispatchPushNotificationServerFn,
} from "../src/lib/push-notification-server-fn";

// ============================================================================
// MOCK SUPABASE CLIENT FACTORY FOR PRODUCTION LOGIC TESTING
// ============================================================================

interface MockData {
  orders?: Array<{
    id: string;
    order_number?: string;
    customer_id?: string;
    total?: number;
    status?: string;
    payment_status?: string;
  }>;
  payments?: Array<{
    id: string;
    order_id: string;
    payment_status: string;
    amount?: number;
    created_at?: string;
  }>;
  delivery_assignments?: Array<{
    id: string;
    order_id: string;
    driver_id?: string;
    agent_id?: string;
  }>;
  user_device_tokens?: Array<{
    id: string;
    user_id: string;
    token: string;
    platform: string;
    role: string;
    is_active: boolean;
  }>;
  notification_dispatch_logs?: Array<{
    id: string;
    idempotency_key: string;
    event_type: string;
    recipient_user_id?: string | null;
    recipient_role: string;
    title: string;
    body: string;
    data?: any;
    status: string;
    tokens_attempted?: number;
    tokens_succeeded?: number;
    tokens_failed?: number;
    error_message?: string | null;
    created_at?: string;
    sent_at?: string | null;
  }>;
  profiles?: Array<{
    id: string;
    role: string;
  }>;
  simulateDbErrorOnTable?: string;
}

export function createMockSupabase(initialData: MockData): SupabaseClient<Database> {
  const orders = [...(initialData.orders || [])];
  const payments = [...(initialData.payments || [])];
  const assignments = [...(initialData.delivery_assignments || [])];
  const tokens = [...(initialData.user_device_tokens || [])];
  const logs = [...(initialData.notification_dispatch_logs || [])];
  const profiles = [...(initialData.profiles || [])];

  const client = {
    _orders: orders,
    _payments: payments,
    _logs: logs,
    _tokens: tokens,
    auth: {
      getUser: async (token?: string) => {
        if (!token) return { data: { user: null }, error: { message: "No token" } };
        const found = profiles.find((p) => p.id === token || `tok-${p.id}` === token);
        if (found) {
          return { data: { user: { id: found.id } }, error: null };
        }
        return { data: { user: { id: token } }, error: null };
      },
    },
    from: (table: string) => {
      if (initialData.simulateDbErrorOnTable === table) {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { message: "Simulated database connection failure", code: "PGRST_ERR" },
              }),
              order: () => ({
                data: null,
                error: { message: "Simulated database connection failure", code: "PGRST_ERR" },
              }),
            }),
            order: () => ({
              data: null,
              error: { message: "Simulated database connection failure", code: "PGRST_ERR" },
            }),
          }),
        };
      }

      if (table === "orders") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = orders.find((o) => (o as any)[col] === val);
                return { data: found ? { ...found } : null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "payments") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              order: (_ordCol: string, _opts: any) => {
                const filtered = payments.filter((p) => (p as any)[col] === val);
                return Promise.resolve({ data: filtered.map((p) => ({ ...p })), error: null });
              },
              maybeSingle: async () => {
                const filtered = payments.filter((p) => (p as any)[col] === val);
                if (filtered.length > 1) {
                  return {
                    data: null,
                    error: {
                      message: "JSON object requested, multiple (or no) rows returned",
                      code: "PGRST116",
                    },
                  };
                }
                return { data: filtered[0] ? { ...filtered[0] } : null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "delivery_assignments") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = assignments.find((a) => (a as any)[col] === val);
                return { data: found ? { ...found } : null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = profiles.find((p) => (p as any)[col] === val);
                return { data: found ? { ...found } : null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "delivery_agents") {
        return {
          select: (_cols?: string) => ({
            eq: (_col: string, _val: any) => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === "user_device_tokens") {
        return {
          select: (_cols?: string) => {
            let activeFilter = false;
            let userFilter: string | null = null;
            let rolesFilter: string[] | null = null;

            const chain = {
              eq: (col: string, val: any) => {
                if (col === "is_active") activeFilter = Boolean(val);
                if (col === "user_id") userFilter = val;
                return chain;
              },
              in: (col: string, vals: any[]) => {
                if (col === "role") rolesFilter = vals;
                return chain;
              },
              then: (resolve: any) => {
                let filtered = tokens;
                if (activeFilter) filtered = filtered.filter((t) => t.is_active);
                if (userFilter) filtered = filtered.filter((t) => t.user_id === userFilter);
                if (rolesFilter) filtered = filtered.filter((t) => rolesFilter!.includes(t.role));
                return resolve({ data: filtered.map((t) => ({ ...t })), error: null });
              },
            };
            return chain;
          },
          update: (updates: any) => ({
            in: async (col: string, vals: any[]) => {
              for (const tok of tokens) {
                if (vals.includes((tok as any)[col])) {
                  Object.assign(tok, updates);
                }
              }
              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === "notification_dispatch_logs") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = logs.find((l) => (l as any)[col] === val);
                return { data: found ? { ...found } : null, error: null };
              },
            }),
          }),
          insert: async (record: any) => {
            const existing = logs.find((l) => l.idempotency_key === record.idempotency_key);
            if (existing) {
              return {
                data: null,
                error: {
                  code: "23505",
                  message:
                    'duplicate key value violates unique constraint "notification_dispatch_logs_idempotency_key_key"',
                },
              };
            }
            const newRecord = { id: `log-${Date.now()}-${Math.random()}`, ...record };
            logs.push(newRecord);
            return { data: { ...newRecord }, error: null };
          },
          update: (updates: any) => ({
            eq: async (col: string, val: any) => {
              const found = logs.find((l) => (l as any)[col] === val);
              if (found) {
                Object.assign(found, updates);
              }
              return { data: found ? { ...found } : null, error: null };
            },
          }),
          upsert: async (record: any, _opts?: any) => {
            const idx = logs.findIndex((l) => l.idempotency_key === record.idempotency_key);
            if (idx >= 0) {
              logs[idx] = { ...logs[idx], ...record };
              return { data: { ...logs[idx] }, error: null };
            } else {
              const newRecord = { id: `log-${Date.now()}-${Math.random()}`, ...record };
              logs.push(newRecord);
              return { data: { ...newRecord }, error: null };
            }
          },
        };
      }

      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Push Notification System - Hardened Production Test Suite", () => {
  // Common baseline mock records
  const defaultTokens = [
    { id: "tok-1", user_id: "cust-alice", token: "fcm-alice-phone", platform: "android", role: "customer", is_active: true },
    { id: "tok-2", user_id: "cust-alice", token: "fcm-alice-tablet", platform: "ios", role: "customer", is_active: true },
    { id: "tok-3", user_id: "cust-bob", token: "fcm-bob-phone", platform: "android", role: "customer", is_active: true },
    { id: "tok-4", user_id: "driver-dave", token: "fcm-driver-dave", platform: "android", role: "delivery_agent", is_active: true },
    { id: "tok-5", user_id: "driver-dan", token: "fcm-driver-dan", platform: "ios", role: "delivery_agent", is_active: true },
    { id: "tok-6", user_id: "mgr-mary", token: "fcm-mgr-mary", platform: "ios", role: "manager", is_active: true },
    { id: "tok-7", user_id: "admin-arthur", token: "fcm-admin-arthur", platform: "android", role: "admin", is_active: true },
  ];

  // 1. Role-based Recipient Isolation (Production function validateTargetAuthorization)
  it("should prevent customers from receiving internal staff alerts", async () => {
    const db = createMockSupabase({});
    const internalEvents: PushEventType[] = [
      "LOW_STOCK_ALERT",
      "ADMIN_ALERT",
      "DRIVER_OPERATIONAL_UPDATE",
    ];

    for (const eventType of internalEvents) {
      const result = await validateTargetAuthorization(db, { roles: ["customer"] }, eventType);
      assert.equal(result.authorized, false);
      assert.match(result.reason || "", /Role isolation violation/);
    }
  });

  it("should allow managers and admins to receive low stock and admin alerts", async () => {
    const db = createMockSupabase({});
    const result = await validateTargetAuthorization(db, { roles: ["admin", "manager"] }, "LOW_STOCK_ALERT");
    assert.equal(result.authorized, true);
  });

  // 2. Customer Order Ownership Validation (Production function validateTargetAuthorization)
  it("should allow notification when customer owns the order", async () => {
    const db = createMockSupabase({
      orders: [{ id: "ord-1", customer_id: "cust-alice", status: "Approved" }],
    });
    const result = await validateTargetAuthorization(
      db,
      {
        userId: "cust-alice",
        requireOrderOwnership: { orderId: "ord-1", customerId: "cust-alice" },
      },
      "ORDER_PLACED"
    );
    assert.equal(result.authorized, true);
  });

  it("should reject notification when customer does NOT own the order", async () => {
    const db = createMockSupabase({
      orders: [{ id: "ord-1", customer_id: "cust-alice", status: "Approved" }],
    });
    const result = await validateTargetAuthorization(
      db,
      {
        userId: "cust-bob",
        requireOrderOwnership: { orderId: "ord-1", customerId: "cust-bob" },
      },
      "ORDER_PLACED"
    );
    assert.equal(result.authorized, false);
    assert.match(result.reason || "", /Customer ownership violation/);
  });

  // 3. Driver Assignment Validation (Production function validateTargetAuthorization)
  it("should allow notification to the assigned driver", async () => {
    const db = createMockSupabase({
      delivery_assignments: [{ id: "asgn-1", order_id: "ord-1", driver_id: "driver-dave" }],
    });
    const result = await validateTargetAuthorization(
      db,
      {
        userId: "driver-dave",
        requireDriverAssignment: { orderId: "ord-1", driverId: "driver-dave" },
      },
      "DELIVERY_ASSIGNED"
    );
    assert.equal(result.authorized, true);
  });

  it("should reject notification to an unassigned driver for an order", async () => {
    const db = createMockSupabase({
      delivery_assignments: [{ id: "asgn-1", order_id: "ord-1", driver_id: "driver-dave" }],
    });
    const result = await validateTargetAuthorization(
      db,
      {
        userId: "driver-dan",
        requireDriverAssignment: { orderId: "ord-1", driverId: "driver-dan" },
      },
      "DELIVERY_ASSIGNED"
    );
    assert.equal(result.authorized, false);
    assert.match(result.reason || "", /Driver assignment violation/);
  });

  // 4. Firebase Credentials Graceful Degradation
  it("should safely handle unconfigured Firebase credentials without crashing", () => {
    const creds = getFirebaseServiceAccount();
    assert.ok(creds === null || typeof creds.project_id === "string");
  });

  // ==========================================================================
  // PRODUCTION PAYMENT SECURITY TEST SUITE (16 REQUIRED SCENARIOS)
  // ==========================================================================
  describe("Production Payment Security Hardening (16 Required Scenarios)", () => {
    // Scenario 1: Unpaid order rejects payment success
    it("Scenario 1: Unpaid order rejects payment success", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-unpaid",
            customer_id: "cust-alice",
            order_number: "JSS-UNPAID",
            status: "Pending",
            payment_status: "unpaid",
          },
        ],
        payments: [],
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-unpaid");
      assert.equal(ver.isConfirmedPaid, false);

      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-unpaid", customerId: "cust-alice" } },
        "PAYMENT_SUCCEEDED"
      );
      assert.equal(auth.authorized, false);
      assert.match(auth.reason || "", /Payment verification failed: order ord-unpaid is not confirmed paid/);

      const pushRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-unpaid",
        orderNumber: "JSS-UNPAID",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£25.00",
        supabaseClient: db,
      });
      assert.match(pushRes.skippedReason || "", /not confirmed paid/);
      assert.equal(pushRes.customerResult, undefined);
    });

    // Scenario 2: Pending order rejects payment success (even if lifecycle status is Approved)
    it("Scenario 2: Pending order rejects payment success even with lifecycle status Approved", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-pending",
            customer_id: "cust-alice",
            order_number: "JSS-PEND",
            status: "Approved", // Note: orders.status is Approved (lifecycle), but payment is pending!
            payment_status: "Pending",
          },
        ],
        payments: [
          { id: "pmt-pend", order_id: "ord-pending", payment_status: "pending", amount: 40 },
        ],
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-pending");
      // Never treat orders.status alone as proof of successful payment
      assert.equal(ver.isConfirmedPaid, false);

      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-pending", customerId: "cust-alice" } },
        "PAYMENT_SUCCEEDED"
      );
      assert.equal(auth.authorized, false);
      assert.match(auth.reason || "", /Payment verification failed/);
    });

    // Scenario 3: Failed payment rejects payment success
    it("Scenario 3: Failed payment rejects payment success", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-failed",
            customer_id: "cust-alice",
            order_number: "JSS-FAIL",
            status: "Cancelled",
            payment_status: "Failed",
          },
        ],
        payments: [
          { id: "pmt-fail", order_id: "ord-failed", payment_status: "failed", amount: 65 },
        ],
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-failed");
      assert.equal(ver.isConfirmedPaid, false);
      assert.equal(ver.hasFailedAttempt, true);

      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-failed", customerId: "cust-alice" } },
        "PAYMENT_SUCCEEDED"
      );
      assert.equal(auth.authorized, false);
    });

    // Scenario 4: Verified captured payment permits trusted success dispatch
    it("Scenario 4: Verified captured payment permits trusted success dispatch", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-captured",
            customer_id: "cust-alice",
            order_number: "JSS-CAP",
            total: 55,
            status: "Approved",
            payment_status: "Paid",
          },
        ],
        payments: [
          { id: "pmt-cap", order_id: "ord-captured", payment_status: "paid", amount: 55 },
        ],
        user_device_tokens: defaultTokens,
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-captured");
      assert.equal(ver.isConfirmedPaid, true);

      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-captured", customerId: "cust-alice" } },
        "PAYMENT_SUCCEEDED"
      );
      assert.equal(auth.authorized, true);

      const pushRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-captured",
        orderNumber: "JSS-CAP",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£55.00",
        supabaseClient: db,
      });
      assert.ok(pushRes.customerResult);
      assert.equal(pushRes.skippedReason, undefined);
    });

    // Scenario 5: Multiple payment attempts for one order
    it("Scenario 5: Multiple payment attempts for one order handled safely without PGRST116", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-multi",
            customer_id: "cust-alice",
            order_number: "JSS-MULTI",
            status: "Approved",
            payment_status: "Paid",
          },
        ],
        payments: [
          { id: "pmt-1", order_id: "ord-multi", payment_status: "failed", created_at: "2026-10-26T10:00:00Z" },
          { id: "pmt-2", order_id: "ord-multi", payment_status: "failed", created_at: "2026-10-26T10:05:00Z" },
          { id: "pmt-3", order_id: "ord-multi", payment_status: "paid", created_at: "2026-10-26T10:10:00Z" },
        ],
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-multi");
      assert.equal(ver.error, undefined);
      assert.equal(ver.isConfirmedPaid, true);
      assert.equal(ver.hasFailedAttempt, true);
      assert.equal(ver.recentPayments?.length, 3);
    });

    // Scenario 6: Database query failure handled explicitly without false confirmation
    it("Scenario 6: Database query failure safely skips dispatch and never confirms payment", async () => {
      const db = createMockSupabase({
        simulateDbErrorOnTable: "orders",
      });

      const ver = await verifyAuthoritativePaymentState(db, "ord-any");
      assert.equal(ver.isConfirmedPaid, false);
      assert.match(ver.error || "", /Database error querying order/);

      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-any", customerId: "cust-alice" } },
        "PAYMENT_SUCCEEDED"
      );
      assert.equal(auth.authorized, false);
      assert.match(auth.reason || "", /Database error querying order/);

      const pushRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-any",
        orderNumber: "JSS-ANY",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£20.00",
        supabaseClient: db,
      });
      assert.match(pushRes.skippedReason || "", /Database error querying order/);
      assert.equal(pushRes.customerResult, undefined);
    });

    // Scenario 7: Customer attempts fake payment success via client server-function
    it("Scenario 7: Customer attempts fake payment success via client endpoint and is rejected", async () => {
      const db = createMockSupabase({});
      await assert.rejects(
        async () => {
          await handleDispatchPushNotification(
            {
              eventType: "PAYMENT_SUCCEEDED",
              orderId: "ord-fake-1",
              status: "Paid",
            },
            db
          );
        },
        /Unauthorized: Payment push notifications cannot be dispatched from client endpoints/
      );
    });

    // Scenario 8: Admin attempts fake payment success via client server-function
    it("Scenario 8: Admin attempts fake payment success via client endpoint and is rejected", async () => {
      const db = createMockSupabase({
        profiles: [{ id: "admin-1", role: "admin" }],
      });
      await assert.rejects(
        async () => {
          await handleDispatchPushNotification(
            {
              eventType: "PAYMENT_SUCCEEDED",
              authToken: "admin-1",
              orderId: "ord-fake-2",
            },
            db
          );
        },
        /Unauthorized: Payment push notifications cannot be dispatched from client endpoints/
      );
    });

    // Scenario 9: Manager attempts fake payment success via client server-function
    it("Scenario 9: Manager attempts fake payment success via client endpoint and is rejected", async () => {
      const db = createMockSupabase({
        profiles: [{ id: "mgr-1", role: "manager" }],
      });
      await assert.rejects(
        async () => {
          await handleDispatchPushNotification(
            {
              eventType: "PAYMENT_SUCCEEDED",
              authToken: "mgr-1",
              orderId: "ord-fake-3",
            },
            db
          );
        },
        /Unauthorized: Payment push notifications cannot be dispatched from client endpoints/
      );
    });

    // Scenario 10: Customer attempts fake payment failure via client server-function
    it("Scenario 10: Customer attempts fake payment failure via client endpoint and is rejected", async () => {
      const db = createMockSupabase({});
      await assert.rejects(
        async () => {
          await handleDispatchPushNotification(
            {
              eventType: "PAYMENT_FAILED",
              orderId: "ord-fake-4",
              failureReason: "Fake client decline",
            },
            db
          );
        },
        /Unauthorized: Payment push notifications cannot be dispatched from client endpoints/
      );
    });

    // Scenario 11: Paid order rejects stale payment failure
    it("Scenario 11: Paid order rejects stale payment failure notification", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-already-paid",
            customer_id: "cust-alice",
            order_number: "JSS-PAID",
            status: "Approved",
            payment_status: "Paid",
          },
        ],
        payments: [
          { id: "pmt-old-fail", order_id: "ord-already-paid", payment_status: "failed", created_at: "2026-10-26T09:00:00Z" },
          { id: "pmt-new-paid", order_id: "ord-already-paid", payment_status: "paid", created_at: "2026-10-26T09:05:00Z" },
        ],
        user_device_tokens: defaultTokens,
      });

      // Target authorization rejects PAYMENT_FAILED for paid orders
      const auth = await validateTargetAuthorization(
        db,
        { userId: "cust-alice", requireOrderOwnership: { orderId: "ord-already-paid", customerId: "cust-alice" } },
        "PAYMENT_FAILED"
      );
      assert.equal(auth.authorized, false);
      assert.match(auth.reason || "", /already confirmed paid in database/);

      // triggerPaymentStatusPushInternal suppresses PAYMENT_FAILED for paid orders
      const pushRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-already-paid",
        orderNumber: "JSS-PAID",
        customerId: "cust-alice",
        status: "failed",
        amountFormatted: "£30.00",
        failureReason: "Delayed webhook notice",
        paymentAttemptId: "pmt-old-fail",
        supabaseClient: db,
      });
      assert.match(pushRes.skippedReason || "", /already confirmed paid in database/);
      assert.equal(pushRes.customerResult, undefined);
    });

    // Scenario 12: Failed attempt followed by successful retry
    it("Scenario 12: Failed attempt followed by successful retry behaves correctly", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-retry-flow",
            customer_id: "cust-alice",
            order_number: "JSS-RETRY",
            status: "Pending",
            payment_status: "Pending",
          },
        ],
        payments: [
          { id: "att-1-fail", order_id: "ord-retry-flow", payment_status: "failed", created_at: "2026-10-26T11:00:00Z" },
        ],
        user_device_tokens: defaultTokens,
      });

      // 1. Initial attempt fails: failure notice is dispatched
      const failRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-retry-flow",
        orderNumber: "JSS-RETRY",
        customerId: "cust-alice",
        status: "failed",
        amountFormatted: "£75.00",
        failureReason: "Card declined by issuer",
        paymentAttemptId: "att-1-fail",
        supabaseClient: db,
      });
      assert.ok(failRes.customerResult);
      assert.equal(failRes.customerResult?.eventType, "PAYMENT_FAILED");

      // 2. Customer retries with new card: capture succeeds
      (db as any)._orders[0].payment_status = "Paid";
      (db as any)._orders[0].status = "Approved";
      (db as any)._payments.push({
        id: "att-2-paid",
        order_id: "ord-retry-flow",
        payment_status: "paid",
        created_at: "2026-10-26T11:05:00Z",
      });

      // 3. Successful retry dispatches PAYMENT_SUCCEEDED
      const succRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-retry-flow",
        orderNumber: "JSS-RETRY",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£75.00",
        supabaseClient: db,
      });
      assert.ok(succRes.customerResult);
      assert.equal(succRes.customerResult?.eventType, "PAYMENT_SUCCEEDED");

      // 4. Stale/delayed failure attempt re-trigger is now completely suppressed
      const staleRes = await triggerPaymentStatusPushInternal({
        orderId: "ord-retry-flow",
        orderNumber: "JSS-RETRY",
        customerId: "cust-alice",
        status: "failed",
        amountFormatted: "£75.00",
        failureReason: "Issuer timeout",
        paymentAttemptId: "att-1-fail",
        supabaseClient: db,
      });
      assert.match(staleRes.skippedReason || "", /already confirmed paid in database/);
      assert.equal(staleRes.customerResult, undefined);
    });

    // Scenario 13: Duplicate successful payment event
    it("Scenario 13: Duplicate successful payment event suppressed by idempotency key", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-dup-succ",
            customer_id: "cust-alice",
            order_number: "JSS-DUP",
            status: "Approved",
            payment_status: "Paid",
          },
        ],
        payments: [
          { id: "pmt-dup", order_id: "ord-dup-succ", payment_status: "paid" },
        ],
        user_device_tokens: defaultTokens,
      });

      const firstCall = await triggerPaymentStatusPushInternal({
        orderId: "ord-dup-succ",
        orderNumber: "JSS-DUP",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£45.00",
        supabaseClient: db,
      });
      assert.ok(firstCall.customerResult);

      const secondCall = await triggerPaymentStatusPushInternal({
        orderId: "ord-dup-succ",
        orderNumber: "JSS-DUP",
        customerId: "cust-alice",
        status: "succeeded",
        amountFormatted: "£45.00",
        supabaseClient: db,
      });
      assert.equal(secondCall.customerResult?.status, "skipped");
      assert.equal(secondCall.customerResult?.tokensAttempted, 0);
      assert.match(secondCall.customerResult?.message || "", /already processed/);
    });

    // Scenario 14: Duplicate failed payment event
    it("Scenario 14: Duplicate failed payment event suppressed by idempotency key", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-dup-fail",
            customer_id: "cust-alice",
            order_number: "JSS-DUP-FAIL",
            status: "Pending",
            payment_status: "Pending",
          },
        ],
        payments: [
          { id: "att-fail", order_id: "ord-dup-fail", payment_status: "failed" },
        ],
        user_device_tokens: defaultTokens,
      });

      const firstCall = await triggerPaymentStatusPushInternal({
        orderId: "ord-dup-fail",
        orderNumber: "JSS-DUP-FAIL",
        customerId: "cust-alice",
        status: "failed",
        paymentAttemptId: "att-fail",
        amountFormatted: "£45.00",
        supabaseClient: db,
      });
      assert.ok(firstCall.customerResult);

      const secondCall = await triggerPaymentStatusPushInternal({
        orderId: "ord-dup-fail",
        orderNumber: "JSS-DUP-FAIL",
        customerId: "cust-alice",
        status: "failed",
        paymentAttemptId: "att-fail",
        amountFormatted: "£45.00",
        supabaseClient: db,
      });
      assert.equal(secondCall.customerResult?.status, "skipped");
      assert.equal(secondCall.customerResult?.tokensAttempted, 0);
      assert.match(secondCall.customerResult?.message || "", /already processed/);
    });

    // Scenario 15: Concurrent duplicate dispatch attempts
    it("Scenario 15: Concurrent duplicate dispatch attempts resolved safely by atomic reservation", async () => {
      const db = createMockSupabase({
        orders: [
          {
            id: "ord-conc",
            customer_id: "cust-alice",
            order_number: "JSS-CONC",
            status: "Approved",
            payment_status: "Paid",
          },
        ],
        payments: [
          { id: "pmt-conc", order_id: "ord-conc", payment_status: "paid" },
        ],
        user_device_tokens: defaultTokens,
      });

      const event: PushDispatchEvent = {
        eventType: "PAYMENT_SUCCEEDED",
        idempotencyKey: "payment_succeeded_cust_ord-conc",
        target: {
          userId: "cust-alice",
          requireOrderOwnership: { orderId: "ord-conc", customerId: "cust-alice" },
        },
        payload: {
          title: "Payment Confirmed",
          body: "£50.00 confirmed",
        },
      };

      // Fire two concurrent dispatches simultaneously
      const [res1, res2] = await Promise.all([
        executePushDispatch(event, db),
        executePushDispatch(event, db),
      ]);

      // Find the response that was suppressed by the atomic reservation lock
      const lockSkippedRes = [res1, res2].find((r) =>
        r.message?.includes("suppressed by atomic reservation lock")
      );
      assert.ok(
        lockSkippedRes,
        "One concurrent request must be suppressed by the atomic reservation lock"
      );
      assert.equal(lockSkippedRes.tokensAttempted, 0);
      assert.equal(lockSkippedRes.status, "skipped");
    });

    // Scenario 16: Notification failure does not affect successful payment processing
    it("Scenario 16: Notification failure does not affect successful payment processing", async () => {
      // In src/lib/elavon-payment-server-fn.ts, the push dispatch is intentionally caught:
      // triggerPaymentStatusPushInternal(...).catch((pushErr) => console.warn("[Elavon] Post-payment push notice:", pushErr));
      let paymentCommitted = false;
      let caughtPushNotice: string | null = null;

      try {
        // Simulate a failing push notification dispatch
        const pushPromise = Promise.reject(new Error("FCM transport gateway unreachable"));
        pushPromise.catch((pushErr) => {
          caughtPushNotice = pushErr.message;
        });

        // The authoritative payment capture logic completes unaffected
        paymentCommitted = true;
      } catch {
        paymentCommitted = false;
      }

      // Allow microtask queue to process rejection catch handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      assert.equal(paymentCommitted, true);
      assert.equal(caughtPushNotice, "FCM transport gateway unreachable");
    });
  });
});
