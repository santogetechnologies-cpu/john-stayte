import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleCreateElavonPaymentSession } from "../src/lib/elavon-payment-server-fn";
import { handleVerifyFirebaseCredentials } from "../src/lib/push-notification-server-fn";

function createMockSupabase(options: {
  userId?: string | null;
  authError?: boolean;
  role?: string;
  order?: {
    id: string;
    order_number: string;
    total: number;
    subtotal: number;
    payment_status: string;
    customer_id: string | null;
    customer_email?: string;
    customer_name?: string;
  } | null;
  onTableQueried?: (table: string) => void;
}) {
  return {
    auth: {
      getUser: async (token: string) => {
        if (options.authError || !options.userId || token === "invalid-token") {
          return { data: { user: null }, error: { message: "Invalid JWT" } };
        }
        return { data: { user: { id: options.userId } }, error: null };
      },
    },
    from: (table: string) => {
      options.onTableQueried?.(table);
      const chain: any = {
        _filters: {} as Record<string, any>,
        select: () => chain,
        eq: (col: string, val: any) => {
          chain._filters[col] = val;
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          if (table === "profiles") {
            return { data: { role: options.role ?? "customer" }, error: null };
          }
          if (table === "orders") {
            return { data: options.order ?? null, error: null };
          }
          return { data: null, error: null };
        },
        then: (resolve: any) => {
          if (table === "user_device_tokens") {
            return Promise.resolve(resolve({ data: [{ platform: "android" }], error: null }));
          }
          if (table === "notification_dispatch_logs") {
            return Promise.resolve(resolve({ data: [], error: null }));
          }
          return Promise.resolve(resolve({ data: [], error: null }));
        },
      };
      return chain;
    },
  };
}

const baseElavonInput = {
  orderId: "ord-123",
  returnUrl: "https://john-stayte.vercel.app/checkout",
  cancelUrl: "https://john-stayte.vercel.app/checkout",
};

describe("Priority Security Fixes: Elavon & Firebase Diagnostic Auth", () => {
  describe("FIX 1: Elavon Payment Session Auth & Ownership", () => {
    it("rejects unauthenticated requests (missing or invalid authToken)", async () => {
      const mockDb = createMockSupabase({ userId: "cust-a", role: "customer" });

      const missingRes = await handleCreateElavonPaymentSession(
        { ...baseElavonInput, authToken: null },
        mockDb,
      );
      assert.equal(missingRes.ok, false);
      assert.match(missingRes.error || "", /authentication required/i);

      const invalidRes = await handleCreateElavonPaymentSession(
        { ...baseElavonInput, authToken: "invalid-token" },
        mockDb,
      );
      assert.equal(invalidRes.ok, false);
      assert.match(invalidRes.error || "", /invalid or expired session/i);
    });

    it("rejects Customer A attempting to pay for Customer B's order", async () => {
      const mockDb = createMockSupabase({
        userId: "cust-a",
        role: "customer",
        order: {
          id: "ord-123",
          order_number: "JSS-100",
          total: 95,
          subtotal: 95,
          payment_status: "Pending",
          customer_id: "cust-b",
        },
      });

      const res = await handleCreateElavonPaymentSession(
        { ...baseElavonInput, authToken: "valid-token" },
        mockDb,
      );
      assert.equal(res.ok, false);
      assert.match(res.error || "", /unauthorized/i);
    });

    it("allows authorised customer to proceed for their own order (passes auth & ownership)", async () => {
      const prevAlias = process.env.ELAVON_MERCHANT_ALIAS;
      delete process.env.ELAVON_MERCHANT_ALIAS;

      const mockDb = createMockSupabase({
        userId: "cust-a",
        role: "customer",
        order: {
          id: "ord-123",
          order_number: "JSS-100",
          total: 95,
          subtotal: 95,
          payment_status: "Pending",
          customer_id: "cust-a",
        },
      });

      const res = await handleCreateElavonPaymentSession(
        { ...baseElavonInput, authToken: "valid-token" },
        mockDb,
      );

      if (prevAlias !== undefined) process.env.ELAVON_MERCHANT_ALIAS = prevAlias;

      // Reaches gateway credential check (meaning auth + ownership succeeded)
      assert.equal(res.ok, false);
      assert.match(res.error || "", /Elavon gateway credentials are not configured/i);
    });

    it("preserves Admin and Manager access to initiate payment sessions", async () => {
      const prevAlias = process.env.ELAVON_MERCHANT_ALIAS;
      delete process.env.ELAVON_MERCHANT_ALIAS;

      for (const role of ["admin", "manager"]) {
        const mockDb = createMockSupabase({
          userId: "staff-1",
          role,
          order: {
            id: "ord-123",
            order_number: "JSS-100",
            total: 95,
            subtotal: 95,
            payment_status: "Pending",
            customer_id: "cust-b",
          },
        });

        const res = await handleCreateElavonPaymentSession(
          { ...baseElavonInput, authToken: "valid-token" },
          mockDb,
        );
        assert.match(res.error || "", /Elavon gateway credentials are not configured/i);
      }

      if (prevAlias !== undefined) process.env.ELAVON_MERCHANT_ALIAS = prevAlias;
    });
  });

  describe("FIX 2: Firebase Diagnostic Endpoint Admin-Only Auth", () => {
    it("rejects unauthenticated requests without querying device tokens or dispatch logs", async () => {
      const queriedTables: string[] = [];
      const mockDb = createMockSupabase({
        userId: null,
        onTableQueried: (t) => queriedTables.push(t),
      });

      const res = await handleVerifyFirebaseCredentials({ authToken: null }, mockDb);
      assert.equal(res.credentialsLoaded, false);
      assert.match(res.error || "", /unauthorized/i);
      assert.equal(queriedTables.length, 0);
    });

    it("rejects non-Admin roles (customer, manager, driver, branch_staff)", async () => {
      for (const role of ["customer", "manager", "driver", "branch_staff"]) {
        const queriedTables: string[] = [];
        const mockDb = createMockSupabase({
          userId: "user-1",
          role,
          onTableQueried: (t) => queriedTables.push(t),
        });

        const res = await handleVerifyFirebaseCredentials({ authToken: "valid-token" }, mockDb);
        assert.equal(res.credentialsLoaded, false);
        assert.match(res.error || "", /administrator privileges required/i);
        assert.equal(queriedTables.includes("user_device_tokens"), false);
        assert.equal(queriedTables.includes("notification_dispatch_logs"), false);
      }
    });

    it("allows Admin access and never exposes key length or key preview metadata", async () => {
      const prevKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "not-valid-base64-or-json";

      const loggedLines: string[] = [];
      const origLog = console.log;
      const origWarn = console.warn;
      const origError = console.error;
      console.log = (...args: any[]) => loggedLines.push(args.map(String).join(" "));
      console.warn = (...args: any[]) => loggedLines.push(args.map(String).join(" "));
      console.error = (...args: any[]) => loggedLines.push(args.map(String).join(" "));

      const mockDb = createMockSupabase({
        userId: "admin-1",
        role: "admin",
      });

      let res: any;
      try {
        res = await handleVerifyFirebaseCredentials({ authToken: "valid-token" }, mockDb);
      } finally {
        console.log = origLog;
        console.warn = origWarn;
        console.error = origError;
        if (prevKey !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = prevKey;
        else delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      }

      const combinedLogs = loggedLines.join("\n");
      assert.ok(!combinedLogs.includes("preview="));
      assert.ok(!combinedLogs.includes("length="));
      assert.ok(!combinedLogs.includes("not-valid-b"));

      assert.equal(res.activeTokens?.total, 1);
      assert.equal("privateKeyLength" in res, false);
      assert.equal(res.details?.FIREBASE_SERVICE_ACCOUNT_KEY, "present");
      assert.ok(!JSON.stringify(res).includes("preview="));
      assert.ok(!JSON.stringify(res).includes("length="));
    });
  });
});
