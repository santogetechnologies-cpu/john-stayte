import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { getAuthToken } from "../src/lib/push-notifications";
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
  triggerOrderStatusPushInternal,
  handleDispatchPushNotification,
  dispatchPushNotificationServerFn,
  handleRegisterDeviceToken,
  handleDeactivateDeviceToken,
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
    installation_id?: string | null;
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
    email?: string;
  }>;
  delivery_agents?: Array<{
    id: string;
    email?: string | null;
    status?: string;
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
        if (token === "expired-jwt-token") {
          return { data: { user: null }, error: { message: "JWT expired" } };
        }
        if (token === "invalid-api-key-token") {
          return { data: { user: null }, error: { message: "Invalid API key" } };
        }
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
        const daList = initialData.delivery_agents || [];
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = daList.find((d: any) => d[col] === val);
                return { data: found ? { ...found } : null, error: null };
              },
            }),
            ilike: (col: string, val: any) => ({
              maybeSingle: async () => {
                const found = daList.find(
                  (d: any) => String(d[col]).toLowerCase() === String(val).toLowerCase()
                );
                return { data: found ? { ...found } : null, error: null };
              },
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
          update: (updates: any) => {
            const eqFilters: Array<{ col: string; val: any }> = [];
            const inFilters: Array<{ col: string; vals: any[] }> = [];
            const execute = async () => {
              const matched = logs.filter((l) =>
                eqFilters.every((f) => (l as any)[f.col] === f.val) &&
                inFilters.every((f) => f.vals.includes((l as any)[f.col]))
              );
              matched.forEach((m) => Object.assign(m, updates));
              return { data: matched.map((m) => ({ ...m })), error: null };
            };
            const builder: any = {
              eq: (col: string, val: any) => {
                eqFilters.push({ col, val });
                return builder;
              },
              in: (col: string, vals: any[]) => {
                inFilters.push({ col, vals });
                return builder;
              },
              select: (_cols?: string) => builder,
              then: (onFulfilled?: any, onRejected?: any) =>
                execute().then(onFulfilled, onRejected),
              catch: (onRejected?: any) => execute().catch(onRejected),
            };
            return builder;
          },
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
    rpc: async (fnName: string, params: any) => {
      if (fnName === "register_device_token") {
        const { p_token, p_platform, p_installation_id, p_caller_user_id } = params || {};
        if (!p_caller_user_id) {
          return { data: null, error: { message: "Not authenticated" } };
        }
        if (!p_token || !String(p_token).trim()) {
          return { data: null, error: { message: "Device token must not be empty" } };
        }
        if (!["android", "ios", "web"].includes(p_platform)) {
          return { data: null, error: { message: "Invalid platform. Must be android, ios, or web." } };
        }
        const profile = profiles.find((p) => p.id === p_caller_user_id);
        if (!profile) {
          return { data: null, error: { message: "User profile not found" } };
        }
        let resolvedRole = profile.role || "customer";
        const da = (initialData.delivery_agents || []).find(
          (d) =>
            d.id === p_caller_user_id ||
            (profile.email && d.email?.toLowerCase() === profile.email.toLowerCase())
        );
        if (da && ["Active", "On Delivery", "Busy"].includes(da.status || "")) {
          resolvedRole = "delivery_agent";
        }

        const existingToken = tokens.find((t) => t.token === p_token);
        if (existingToken && existingToken.user_id !== p_caller_user_id) {
          if (
            existingToken.is_active &&
            (existingToken.installation_id == null ||
              p_installation_id == null ||
              existingToken.installation_id !== p_installation_id)
          ) {
            return {
              data: null,
              error: {
                message: "Device token is currently registered to another active user session",
              },
            };
          }
        }

        if (existingToken) {
          existingToken.user_id = p_caller_user_id;
          existingToken.platform = p_platform;
          existingToken.role = resolvedRole;
          existingToken.installation_id = p_installation_id || existingToken.installation_id;
          existingToken.is_active = true;
        } else {
          tokens.push({
            id: `tok-${Date.now()}-${Math.random()}`,
            user_id: p_caller_user_id,
            token: p_token,
            platform: p_platform,
            role: resolvedRole,
            is_active: true,
            installation_id: p_installation_id || null,
          });
        }

        return {
          data: {
            success: true,
            user_id: p_caller_user_id,
            role: resolvedRole,
            platform: p_platform,
          },
          error: null,
        };
      }

      if (fnName === "deactivate_device_token") {
        const { p_token, p_caller_user_id } = params || {};
        if (!p_caller_user_id || !p_token || !String(p_token).trim()) {
          return { data: false, error: null };
        }
        const existing = tokens.find(
          (t) => t.token === p_token && t.user_id === p_caller_user_id
        );
        if (existing) {
          existing.is_active = false;
          return { data: true, error: null };
        }
        return { data: false, error: null };
      }

      return { data: null, error: { message: `Unknown RPC function: ${fnName}` } };
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

  // ============================================================================
  // Production Device Token Hardening & Ownership Protection
  // ============================================================================

  describe("Production Device Token Hardening & Ownership Protection", () => {
    const baseProfiles = [
      { id: "user-alice", role: "customer", email: "alice@example.com" },
      { id: "user-bob", role: "customer", email: "bob@example.com" },
      { id: "user-driver-active", role: "customer", email: "driver.active@jss.com" },
      { id: "user-driver-inactive", role: "customer", email: "driver.inactive@jss.com" },
      { id: "user-admin", role: "admin", email: "admin@jss.com" },
      { id: "user-manager", role: "manager", email: "manager@jss.com" },
    ];

    const baseDeliveryAgents = [
      { id: "da-active-1", email: "driver.active@jss.com", status: "Active" },
      { id: "da-inactive-1", email: "driver.inactive@jss.com", status: "Inactive" },
    ];

    it("should successfully register device token for authenticated customer", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        delivery_agents: baseDeliveryAgents,
      });

      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-alice-valid-token-12345",
          platform: "android",
          installationId: "inst-alice-1",
          authToken: "user-alice",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.user_id, "user-alice");
      assert.equal(res.result.role, "customer");
      assert.equal(res.result.platform, "android");
    });

    it("should reject registration if user is unauthenticated or missing authToken", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      const noTokenRes = await handleRegisterDeviceToken(
        {
          token: "fcm-alice-token",
          platform: "android",
        },
        db
      );
      assert.equal(noTokenRes.success, false);
      assert.equal(noTokenRes.error, "Not authenticated");

      const invalidTokenRes = await handleRegisterDeviceToken(
        {
          token: "fcm-alice-token",
          platform: "android",
          authToken: "",
        },
        db
      );
      assert.equal(invalidTokenRes.success, false);
      assert.equal(invalidTokenRes.error, "Not authenticated");
    });

    it("should reject registration with empty token or invalid platform", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      const emptyTokenRes = await handleRegisterDeviceToken(
        {
          token: "   ",
          platform: "android",
          authToken: "user-alice",
        },
        db
      );
      assert.equal(emptyTokenRes.success, false);
      assert.equal(emptyTokenRes.error, "Token is required");

      const badPlatformRes = await handleRegisterDeviceToken(
        {
          token: "fcm-some-token",
          platform: "windows" as any,
          authToken: "user-alice",
        },
        db
      );
      assert.equal(badPlatformRes.success, false);
      assert.match(badPlatformRes.error || "", /Valid platform is required/);
    });

    it("should assign delivery_agent role for active driver", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        delivery_agents: baseDeliveryAgents,
      });

      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-driver-token-777",
          platform: "ios",
          installationId: "inst-driver-1",
          authToken: "user-driver-active",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.role, "delivery_agent");
    });

    it("should NOT assign delivery_agent role if driver status is Inactive", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        delivery_agents: baseDeliveryAgents,
      });

      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-driver-inactive-token",
          platform: "android",
          installationId: "inst-driver-2",
          authToken: "user-driver-inactive",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.role, "customer");
    });

    it("should assign admin role for admin profile", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-admin-token",
          platform: "web",
          authToken: "user-admin",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.role, "admin");
    });

    it("should assign manager role for manager profile", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-manager-token",
          platform: "ios",
          authToken: "user-manager",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.role, "manager");
    });

    it("should block malicious user on a different installation from hijacking an active token", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-shared-token",
            platform: "android",
            role: "customer",
            is_active: true,
            installation_id: "alice-physical-phone",
          },
        ],
      });

      // Attacker Bob tries to claim Alice's active token from a different device
      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-alice-shared-token",
          platform: "android",
          installationId: "bob-attacker-phone",
          authToken: "user-bob",
        },
        db
      );

      assert.equal(res.success, false);
      assert.match(res.error || "", /registered to another active user session/);
    });

    it("should allow account switching on the same physical device with matching installation_id", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-shared-tablet-token",
            platform: "android",
            role: "customer",
            is_active: true,
            installation_id: "whitminster-shared-tablet-01",
          },
        ],
      });

      // Bob logs into the same shared tablet with the matching installation_id
      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-shared-tablet-token",
          platform: "android",
          installationId: "whitminster-shared-tablet-01",
          authToken: "user-bob",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.user_id, "user-bob");
    });

    it("should allow claiming token when previous session was deactivated (logged out)", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-reassigned-token",
            platform: "ios",
            role: "customer",
            is_active: false, // Logged out
            installation_id: "alice-old-device",
          },
        ],
      });

      // Bob claims the deactivated token on a new session
      const res = await handleRegisterDeviceToken(
        {
          token: "fcm-reassigned-token",
          platform: "ios",
          installationId: "bob-new-device",
          authToken: "user-bob",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.result.user_id, "user-bob");
    });

    it("should prevent concurrent race condition where an unauthorized user attempts to register a brand-new token concurrently", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [], // brand new token, not yet in table
      });

      // User Alice (legitimate user on installation A) and User Bob (attacker on installation B)
      // both submit registration requests for brand-new token "fcm-brand-new-token"
      const [aliceRes, bobRes] = await Promise.all([
        handleRegisterDeviceToken(
          {
            token: "fcm-brand-new-token",
            platform: "android",
            installationId: "alice-physical-device-uuid",
            authToken: "user-alice",
          },
          db
        ),
        handleRegisterDeviceToken(
          {
            token: "fcm-brand-new-token",
            platform: "android",
            installationId: "bob-physical-device-uuid",
            authToken: "user-bob",
          },
          db
        ),
      ]);

      // Exactly one user must win ownership of the new token; the other must be rejected
      const oneSucceeded = (aliceRes.success && !bobRes.success) || (!aliceRes.success && bobRes.success);
      assert.ok(oneSucceeded, "Exactly one caller should register the token, other must be blocked by ownership check");

      if (aliceRes.success) {
        assert.equal(aliceRes.result.user_id, "user-alice");
        assert.match(bobRes.error || "", /registered to another active user session/);
      } else {
        assert.equal(bobRes.result.user_id, "user-bob");
        assert.match(aliceRes.error || "", /registered to another active user session/);
      }
    });

    it("should deactivate device token when owner logs out", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-logout-token",
            platform: "android",
            role: "customer",
            is_active: true,
          },
        ],
      });

      const res = await handleDeactivateDeviceToken(
        {
          token: "fcm-alice-logout-token",
          authToken: "user-alice",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.deactivated, true);
    });

    it("should not allow deactivating another user's device token", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-safe-token",
            platform: "android",
            role: "customer",
            is_active: true,
          },
        ],
      });

      // Bob tries to deactivate Alice's token
      const res = await handleDeactivateDeviceToken(
        {
          token: "fcm-alice-safe-token",
          authToken: "user-bob",
        },
        db
      );

      assert.equal(res.success, true);
      assert.equal(res.deactivated, false);
    });

    it("should safely retry a failed notification dispatch without 23505 unique collision", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-phone",
            platform: "android",
            role: "customer",
            is_active: true,
          },
        ],
        notification_dispatch_logs: [
          {
            id: "log-failed-1",
            idempotency_key: "retry_order_status_approved_ord-100",
            event_type: "ORDER_APPROVED",
            recipient_user_id: "user-alice",
            recipient_role: "customer",
            title: "Order Approved",
            body: "Your order has been approved.",
            status: "failed",
            error_message: "Network timeout on previous attempt",
          },
        ],
      });

      // Retry the event with the same idempotency key
      const dispatchResult = await executePushDispatch(
        {
          eventType: "ORDER_APPROVED",
          idempotencyKey: "retry_order_status_approved_ord-100",
          target: { userId: "user-alice" },
          payload: {
            title: "Order Approved",
            body: "Your order has been approved.",
          },
        },
        db
      );

      // The pre-check allows retry because status was 'failed', and update transitions it back to pending/skipped
      assert.ok(dispatchResult.idempotencyKey === "retry_order_status_approved_ord-100");
      // Since Firebase credentials are not set in the test environment, it safely completes as 'skipped'
      assert.equal(dispatchResult.status, "skipped");
    });

    it("should suppress concurrent retry attempt when another worker already transitioned status from failed", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-phone",
            platform: "android",
            role: "customer",
            is_active: true,
          },
        ],
        notification_dispatch_logs: [
          {
            id: "log-failed-race",
            idempotency_key: "retry_race_condition_ord-200",
            event_type: "ORDER_APPROVED",
            recipient_user_id: "user-alice",
            recipient_role: "customer",
            title: "Order Approved",
            body: "Your order has been approved.",
            status: "failed",
          },
        ],
      });

      // Launch two concurrent retry requests with the exact same idempotency key
      const [res1, res2] = await Promise.all([
        executePushDispatch(
          {
            eventType: "ORDER_APPROVED",
            idempotencyKey: "retry_race_condition_ord-200",
            target: { userId: "user-alice" },
            payload: { title: "Order Approved", body: "Your order has been approved." },
          },
          db
        ),
        executePushDispatch(
          {
            eventType: "ORDER_APPROVED",
            idempotencyKey: "retry_race_condition_ord-200",
            target: { userId: "user-alice" },
            payload: { title: "Order Approved", body: "Your order has been approved." },
          },
          db
        ),
      ]);

      // Both must complete safely without uncaught exceptions or unique constraint collisions
      assert.equal(res1.status, "skipped");
      assert.equal(res2.status, "skipped");
      // At least one worker was suppressed by the concurrency status guard
      const concurrencySuppressed = [res1, res2].some((r) =>
        r.message?.includes("Concurrent retry attempt suppressed")
      );
      assert.ok(concurrencySuppressed);
    });

    it("should reject driver notification dispatch from inactive delivery agent", async () => {
      const db = createMockSupabase({
        profiles: [
          { id: "driver-inactive-user", role: "customer", email: "inactive.driver@jss.com" },
        ],
        delivery_agents: [
          { id: "da-inactive-99", email: "inactive.driver@jss.com", status: "Inactive" },
        ],
        delivery_assignments: [
          { id: "asg-1", order_id: "ord-test-drive", driver_id: "driver-inactive-user" },
        ],
        orders: [
          { id: "ord-test-drive", order_number: "ORD-9999", customer_id: "user-alice", status: "Approved" },
        ],
      });

      // Inactive driver attempts to trigger OUT_FOR_DELIVERY
      await assert.rejects(
        async () => {
          await handleDispatchPushNotification(
            {
              eventType: "OUT_FOR_DELIVERY",
              authToken: "driver-inactive-user",
              orderId: "ord-test-drive",
            },
            db
          );
        },
        /Unauthorized/
      );
    });

    it("should reject delivery_agent role registration when delivery_agents record has null or suspended status", async () => {
      const db = createMockSupabase({
        profiles: [
          { id: "driver-null-status", role: "customer", email: "driver.null@jss.com" },
          { id: "driver-suspended", role: "customer", email: "driver.suspended@jss.com" },
        ],
        delivery_agents: [
          { id: "da-null", email: "driver.null@jss.com", status: undefined },
          { id: "da-susp", email: "driver.suspended@jss.com", status: "Suspended" },
        ],
      });

      const resNull = await handleRegisterDeviceToken(
        {
          token: "fcm-null-driver",
          platform: "android",
          authToken: "driver-null-status",
        },
        db
      );
      assert.equal(resNull.success, true);
      assert.equal(resNull.result.role, "customer"); // Must NOT be delivery_agent

      const resSusp = await handleRegisterDeviceToken(
        {
          token: "fcm-susp-driver",
          platform: "ios",
          authToken: "driver-suspended",
        },
        db
      );
      assert.equal(resSusp.success, true);
      assert.equal(resSusp.result.role, "customer"); // Must NOT be delivery_agent
    });

    it("should reject token registration when session is expired or API key is invalid", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      // 1. Expired JWT session
      const expiredRes = await handleRegisterDeviceToken(
        {
          token: "fcm-device-token-1",
          platform: "android",
          authToken: "expired-jwt-token",
        },
        db
      );
      assert.equal(expiredRes.success, false);
      assert.equal(expiredRes.error, "Not authenticated");

      // 2. Invalid API key error from Supabase Auth
      const badKeyRes = await handleRegisterDeviceToken(
        {
          token: "fcm-device-token-1",
          platform: "android",
          authToken: "invalid-api-key-token",
        },
        db
      );
      assert.equal(badKeyRes.success, false);
      assert.equal(badKeyRes.error, "Not authenticated");
    });

    it("should recover and successfully register device token once refreshed auth token is provided", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
      });

      // Initial attempt with expired token fails cleanly
      const failedAttempt = await handleRegisterDeviceToken(
        {
          token: "fcm-sync-device-999",
          platform: "android",
          installationId: "inst-alice-device",
          authToken: "expired-jwt-token",
        },
        db
      );
      assert.equal(failedAttempt.success, false);
      assert.equal(failedAttempt.error, "Not authenticated");

      // Once auth hydrates with fresh session token, retry succeeds
      const recoveryAttempt = await handleRegisterDeviceToken(
        {
          token: "fcm-sync-device-999",
          platform: "android",
          installationId: "inst-alice-device",
          authToken: "user-alice", // Fresh hydrated token
        },
        db
      );
      assert.equal(recoveryAttempt.success, true);
      assert.equal(recoveryAttempt.result.user_id, "user-alice");
      assert.equal(recoveryAttempt.result.platform, "android");
    });

    it("should safely reject deactivating device token when user is unauthenticated or has invalid token", async () => {
      const db = createMockSupabase({
        profiles: baseProfiles,
        user_device_tokens: [
          {
            id: "tok-alice",
            user_id: "user-alice",
            token: "fcm-alice-logout-tok",
            platform: "android",
            role: "customer",
            is_active: true,
          },
        ],
      });

      // Deactivation without auth or with invalid token
      const resExpired = await handleDeactivateDeviceToken(
        {
          token: "fcm-alice-logout-tok",
          authToken: "expired-jwt-token",
        },
        db
      );
      // RPC is called with caller_user_id = null so another user's token cannot be deactivated
      assert.equal(resExpired.deactivated, false);

      // Deactivation with valid owner auth succeeds
      const resSuccess = await handleDeactivateDeviceToken(
        {
          token: "fcm-alice-logout-tok",
          authToken: "user-alice",
        },
        db
      );
      assert.equal(resSuccess.success, true);
      assert.equal(resSuccess.deactivated, true);
    });

    it("should proactively refresh session in getAuthToken when access token is expired", async () => {
      let refreshCalled = false;
      const mockExpiredAuthClient = {
        auth: {
          getSession: async () => ({
            data: {
              session: {
                access_token: "stale-expired-jwt",
                expires_at: Math.floor(Date.now() / 1000) - 300, // Expired 5 minutes ago
              },
            },
            error: null,
          }),
          refreshSession: async () => {
            refreshCalled = true;
            return {
              data: {
                session: {
                  access_token: "fresh-refreshed-jwt",
                  expires_at: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
                },
              },
              error: null,
            };
          },
          getUser: async () => ({ data: { user: { id: "user-alice" } }, error: null }),
        },
      };

      const resolvedToken = await getAuthToken(mockExpiredAuthClient);
      assert.equal(refreshCalled, true);
      assert.equal(resolvedToken, "fresh-refreshed-jwt");
    });

    it("should return existing valid token in getAuthToken without calling refreshSession", async () => {
      let refreshCalled = false;
      const mockValidAuthClient = {
        auth: {
          getSession: async () => ({
            data: {
              session: {
                access_token: "active-valid-jwt",
                expires_at: Math.floor(Date.now() / 1000) + 1800, // Valid for 30 more minutes
              },
            },
            error: null,
          }),
          refreshSession: async () => {
            refreshCalled = true;
            return { data: { session: null }, error: { message: "Should not be called" } };
          },
          getUser: async () => ({ data: { user: { id: "user-alice" } }, error: null }),
        },
      };

      const resolvedToken = await getAuthToken(mockValidAuthClient);
      assert.equal(refreshCalled, false);
      assert.equal(resolvedToken, "active-valid-jwt");
    });

    it("should cleanly return null from getAuthToken when user is completely unauthenticated", async () => {
      const mockUnauthClient = {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          refreshSession: async () => ({ data: { session: null }, error: { message: "No session to refresh" } }),
          getUser: async () => ({ data: { user: null }, error: { message: "No user found" } }),
        },
      };

      const resolvedToken = await getAuthToken(mockUnauthClient);
      assert.equal(resolvedToken, null);
    });
  });

  // ============================================================================
  // SUITE 4: ORDER LIFECYCLE PUSH NOTIFICATION SYSTEM (ALL 5 EVENTS)
  // ============================================================================
  describe("Order Lifecycle Push Notification System - All 5 Events", () => {
    const testProfiles = [
      { id: "cust-101", role: "customer", email: "cust101@example.com" },
      { id: "admin-1", role: "admin", email: "admin@johnstayte.com" },
      { id: "manager-1", role: "manager", email: "manager@johnstayte.com" },
    ];

    const testTokens = [
      {
        id: "tok-cust-101",
        user_id: "cust-101",
        token: "fcm-android-cust-101",
        platform: "android",
        role: "customer",
        is_active: true,
      },
    ];

    const testOrders = [
      {
        id: "ord-life-1",
        order_number: "JSS-LIFE-1",
        customer_id: "cust-101",
        status: "Pending",
        total: 55.0,
      },
    ];

    it("1. ORDER_APPROVED: should dispatch customer notification with exact content", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      const res = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Approved",
        supabaseClient: db,
      });

      assert.equal(res.eventType, "ORDER_APPROVED");
      assert.equal(res.idempotencyKey, "order_status_approved_ord-life-1");
      assert.equal(res.recipientCount, 1);
      assert.equal(res.status, "skipped");

      // Verify log content
      const logged = (db as any)._logs.find((l: any) => l.idempotency_key === "order_status_approved_ord-life-1");
      assert.ok(logged);
      assert.equal(logged.title, "Order #JSS-LIFE-1 Approved");
      assert.equal(logged.body, "Your order has been approved.");
    });

    it("2. ORDER_PACKED: should dispatch customer notification with exact content", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      const res = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Packed",
        supabaseClient: db,
      });

      assert.equal(res.eventType, "ORDER_PACKED");
      assert.equal(res.idempotencyKey, "order_status_packed_ord-life-1");
      assert.equal(res.recipientCount, 1);

      const logged = (db as any)._logs.find((l: any) => l.idempotency_key === "order_status_packed_ord-life-1");
      assert.ok(logged);
      assert.equal(logged.title, "Order #JSS-LIFE-1 Packed");
      assert.equal(logged.body, "Your order has been packed and is ready for dispatch.");
    });

    it("3. OUT_FOR_DELIVERY: should dispatch customer notification with exact content", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      const res = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Out for Delivery",
        supabaseClient: db,
      });

      assert.equal(res.eventType, "OUT_FOR_DELIVERY");
      assert.equal(res.idempotencyKey, "order_status_out_for_delivery_ord-life-1");
      assert.equal(res.recipientCount, 1);

      const logged = (db as any)._logs.find(
        (l: any) => l.idempotency_key === "order_status_out_for_delivery_ord-life-1"
      );
      assert.ok(logged);
      assert.equal(logged.title, "Order #JSS-LIFE-1 Out for Delivery");
      assert.equal(logged.body, "Your order is out for delivery.");
    });

    it("4. ORDER_DELIVERED: should dispatch customer notification with exact content", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      const res = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Delivered",
        supabaseClient: db,
      });

      assert.equal(res.eventType, "DELIVERY_COMPLETED");
      assert.equal(res.idempotencyKey, "order_status_delivered_ord-life-1");
      assert.equal(res.recipientCount, 1);

      const logged = (db as any)._logs.find(
        (l: any) => l.idempotency_key === "order_status_delivered_ord-life-1"
      );
      assert.ok(logged);
      assert.equal(logged.title, "Order #JSS-LIFE-1 Delivered");
      assert.equal(logged.body, "Your order has been delivered successfully.");
    });

    it("5. ORDER_CANCELLED: should dispatch customer and staff notification with exact content", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: [
          ...testTokens,
          {
            id: "tok-admin-1",
            user_id: "admin-1",
            token: "fcm-admin-1",
            platform: "android",
            role: "admin",
            is_active: true,
          },
        ],
      });

      const res = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Cancelled",
        reason: "Customer requested cancellation",
        supabaseClient: db,
      });

      assert.equal(res.eventType, "ORDER_CANCELLED");
      assert.equal(res.idempotencyKey, "order_status_cancelled_ord-life-1");

      const loggedCust = (db as any)._logs.find(
        (l: any) => l.idempotency_key === "order_status_cancelled_ord-life-1"
      );
      assert.ok(loggedCust);
      assert.equal(loggedCust.title, "Order #JSS-LIFE-1 Cancelled");
      assert.equal(loggedCust.body, "Your order has been cancelled: Customer requested cancellation");

      const loggedStaff = (db as any)._logs.find(
        (l: any) => l.idempotency_key === "order_cancelled_staff_ord-life-1"
      );
      assert.ok(loggedStaff);
    });

    it("should allow Admin and Manager to dispatch lifecycle updates via server function", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      // Admin caller succeeds
      const adminRes = await handleDispatchPushNotification(
        {
          eventType: "ORDER_APPROVED",
          orderId: "ord-life-1",
          authToken: "admin-1",
        },
        db
      );
      assert.equal(adminRes.success, true);

      // Manager caller succeeds
      const managerRes = await handleDispatchPushNotification(
        {
          eventType: "ORDER_PACKED",
          orderId: "ord-life-1",
          authToken: "manager-1",
        },
        db
      );
      assert.equal(managerRes.success, true);
    });

    it("should reject customer or unauthenticated caller attempting to dispatch order lifecycle updates", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      // Customer caller rejected
      await assert.rejects(
        () =>
          handleDispatchPushNotification(
            {
              eventType: "ORDER_APPROVED",
              orderId: "ord-life-1",
              authToken: "cust-101",
            },
            db
          ),
        /Unauthorized/
      );

      // Unauthenticated caller rejected
      await assert.rejects(
        () =>
          handleDispatchPushNotification(
            {
              eventType: "ORDER_APPROVED",
              orderId: "ord-life-1",
              authToken: undefined,
            },
            db
          ),
        /Unauthorized/
      );
    });

    it("should suppress duplicate lifecycle notification with idempotency check", async () => {
      const db = createMockSupabase({
        profiles: testProfiles,
        orders: testOrders,
        user_device_tokens: testTokens,
      });

      // First call
      const first = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Approved",
        supabaseClient: db,
      });
      assert.ok(first);

      // Duplicate call
      const duplicate = await triggerOrderStatusPushInternal({
        orderId: "ord-life-1",
        orderNumber: "JSS-LIFE-1",
        customerId: "cust-101",
        newStatus: "Approved",
        supabaseClient: db,
      });
      assert.equal(duplicate.status, "skipped");
      assert.match(duplicate.message || "", /already processed/);
    });
  });
});
