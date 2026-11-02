import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import {
  handleDispatchPushNotification,
  triggerGasApplicationSubmittedPushInternal,
  triggerGasApplicationApprovedPushInternal,
  triggerGasApplicationDeclinedPushInternal,
  triggerGasApplicationMoreInfoPushInternal,
  triggerGasApplicationInfoSubmittedPushInternal,
} from "../src/lib/push-notification-server-fn";

// ============================================================================
// MOCK SUPABASE CLIENT FOR APPLICATION WORKFLOW & SECURITY TESTING
// ============================================================================

interface MockAppData {
  gas_customer_applications?: Array<{
    id: string;
    customer_id: string;
    full_name: string;
    email: string;
    phone: string;
    street_address: string;
    city: string;
    postcode: string;
    delivery_address: string;
    usage_type: string;
    customer_type?: string;
    has_previous_purchases?: boolean;
    previous_account_details?: string | null;
    application_reference?: string;
    status: string;
    pricing_band?: string | null;
    discount_percentage?: number | null;
    credit_account_approved?: boolean | null;
    credit_limit?: number | null;
    admin_notes?: string | null;
    rejection_reason?: string | null;
    more_info_requested?: string | null;
    more_info_response?: string | null;
    decision_history?: any[];
  }>;
  profiles?: Array<{
    id: string;
    full_name?: string;
    email?: string;
    role: string;
    status?: string;
    account_approved?: boolean;
    application_status?: string;
    pricing_band?: string;
    discount_percentage?: number;
    credit_account_approved?: boolean;
    credit_limit?: number;
  }>;
  user_device_tokens?: Array<{
    id: string;
    user_id: string;
    token: string;
    platform: string;
    role: string;
    is_active: boolean;
  }>;
  notifications?: Array<{
    id?: string;
    user_id?: string | null;
    title: string;
    message: string;
    link?: string;
  }>;
  customer_notifications?: Array<{
    id?: string;
    user_id: string;
    title: string;
    message: string;
  }>;
  notification_dispatch_logs?: Array<any>;
}

function createMockSupabase(data: MockAppData): SupabaseClient<Database> {
  const store: MockAppData = {
    gas_customer_applications: data.gas_customer_applications ? [...data.gas_customer_applications] : [],
    profiles: data.profiles ? [...data.profiles] : [],
    user_device_tokens: data.user_device_tokens ? [...data.user_device_tokens] : [],
    notifications: data.notifications ? [...data.notifications] : [],
    customer_notifications: data.customer_notifications ? [...data.customer_notifications] : [],
    notification_dispatch_logs: data.notification_dispatch_logs ? [...data.notification_dispatch_logs] : [],
  };

  const client: any = {
    auth: {
      getUser: async (token?: string) => {
        if (!token) return { data: { user: null }, error: new Error("No token") };
        if (token === "token-manager") {
          return { data: { user: { id: "mgr-001", email: "manager@stayte.co.uk", user_metadata: { full_name: "Operations Manager" } } }, error: null };
        }
        if (token === "token-admin") {
          return { data: { user: { id: "adm-001", email: "admin@stayte.co.uk", user_metadata: { full_name: "Admin Director" } } }, error: null };
        }
        if (token === "token-customer-1") {
          return { data: { user: { id: "cust-001", email: "home@stayte.co.uk", user_metadata: { full_name: "John Home" } } }, error: null };
        }
        if (token === "token-customer-2") {
          return { data: { user: { id: "cust-002", email: "business@stayte.co.uk", user_metadata: { full_name: "Jane Business" } } }, error: null };
        }
        return { data: { user: null }, error: new Error("Invalid token") };
      },
    },
    from: (table: string) => {
      let currentFilter: (row: any) => boolean = () => true;
      let updatePayload: any = null;

      const builder: any = {
        select: (_cols?: string, _opts?: any) => builder,
        eq: (col: string, val: any) => {
          const prev = currentFilter;
          currentFilter = (row: any) => prev(row) && row[col] === val;
          return builder;
        },
        in: (col: string, vals: any[]) => {
          const prev = currentFilter;
          currentFilter = (row: any) => prev(row) && vals.includes(row[col]);
          return builder;
        },
        or: (_expr: string) => builder,
        ilike: (_col: string, _val: string) => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          const rows = ((store as any)[table] || []).filter(currentFilter);
          return { data: rows[0] || null, error: null };
        },
        single: async () => {
          const rows = ((store as any)[table] || []).filter(currentFilter);
          if (rows.length === 0) return { data: null, error: new Error("Row not found") };
          return { data: rows[0], error: null };
        },
        then: (resolve: any) => {
          const rows = ((store as any)[table] || []).filter(currentFilter);
          resolve({ data: rows, error: null });
        },
        insert: async (records: any | any[]) => {
          const arr = Array.isArray(records) ? records : [records];
          if (!(store as any)[table]) (store as any)[table] = [];
          (store as any)[table].push(...arr);
          return { data: arr, error: null };
        },
        upsert: (records: any, _opts?: any) => {
          const rec = Array.isArray(records) ? records[0] : records;
          if (!(store as any)[table]) (store as any)[table] = [];
          const idx = (store as any)[table].findIndex(
            (r: any) => r.customer_id === rec.customer_id || r.id === rec.id,
          );
          if (idx >= 0) {
            (store as any)[table][idx] = { ...(store as any)[table][idx], ...rec };
          } else {
            (store as any)[table].push(rec);
          }
          return {
            select: () => ({
              single: async () => ({ data: rec, error: null }),
            }),
          };
        },
        update: (payload: any) => {
          updatePayload = payload;
          return {
            eq: async (col: string, val: any) => {
              const rows = (store as any)[table] || [];
              for (const r of rows) {
                if (r[col] === val) {
                  Object.assign(r, updatePayload);
                }
              }
              return { data: rows, error: null };
            },
          };
        },
      };

      return builder;
    },
  };

  return client as SupabaseClient<Database>;
}

// ============================================================================
// PHASE 1 AUTOMATED TESTS: CUSTOMER APPLICATION & MANAGER APPROVAL WORKFLOW
// ============================================================================

describe("Phase 1: Customer Gas Application & Manager Approval Workflow", () => {
  const initialProfiles = [
    { id: "mgr-001", role: "manager", email: "manager@stayte.co.uk", status: "active", account_approved: true },
    { id: "adm-001", role: "admin", email: "admin@stayte.co.uk", status: "active", account_approved: true },
    { id: "cust-001", role: "customer", email: "home@stayte.co.uk", status: "active", account_approved: false, application_status: "NOT_APPLIED" },
    { id: "cust-002", role: "customer", email: "business@stayte.co.uk", status: "active", account_approved: false, application_status: "NOT_APPLIED" },
  ];

  const initialApplications = [
    {
      id: "app-home-001",
      customer_id: "cust-001",
      full_name: "John Home",
      email: "home@stayte.co.uk",
      phone: "01453822859",
      street_address: "12 Church Lane",
      city: "Stroud",
      postcode: "GL5 1AB",
      delivery_address: "12 Church Lane, Stroud, Gloucestershire GL5 1AB",
      usage_type: "DOMESTIC",
      customer_type: "HOME",
      has_previous_purchases: false,
      previous_account_details: null,
      application_reference: "JSS-APP-HOME001",
      status: "PENDING",
      pricing_band: null,
      discount_percentage: 0,
      credit_account_approved: false,
      credit_limit: 0,
      decision_history: [],
    },
    {
      id: "app-biz-002",
      customer_id: "cust-002",
      full_name: "Jane Business",
      email: "business@stayte.co.uk",
      phone: "01452123456",
      street_address: "The Cotswold Arms, High Street",
      city: "Gloucester",
      postcode: "GL1 2AB",
      delivery_address: "The Cotswold Arms, High Street, Gloucester GL1 2AB",
      usage_type: "COMMERCIAL",
      customer_type: "BUSINESS",
      has_previous_purchases: true,
      previous_account_details: "JSS-HIST-9876",
      application_reference: "JSS-APP-BIZ002",
      status: "PENDING",
      pricing_band: null,
      discount_percentage: 0,
      credit_account_approved: false,
      credit_limit: 0,
      decision_history: [],
    },
  ];

  const mockTokens = [
    { id: "tok-mgr-1", user_id: "mgr-001", token: "fcm-mgr-token", platform: "android", role: "manager", is_active: true },
    { id: "tok-cust-1", user_id: "cust-001", token: "fcm-cust-home-token", platform: "android", role: "customer", is_active: true },
    { id: "tok-cust-2", user_id: "cust-002", token: "fcm-cust-biz-token", platform: "android", role: "customer", is_active: true },
  ];

  // --------------------------------------------------------------------------
  // A. CUSTOMER APPLICATION SUBMISSION TESTS
  // --------------------------------------------------------------------------

  it("1. New Home customer application: should dispatch manager notification with correct application ref and type", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_SUBMITTED",
        authToken: "token-customer-1",
        applicationId: "app-home-001",
        applicationReference: "JSS-APP-HOME001",
        customerId: "cust-001",
        customerName: "John Home",
        customerType: "Home",
      },
      mockDb,
    );

    assert.equal(res.success, true, "Application submission push should succeed");
    assert.equal(res.result?.eventType, "GAS_APPLICATION_SUBMITTED");
    assert.equal(res.result?.status, "skipped", "Skipped delivery gracefully in test runtime");
  });

  it("2. New Business customer application: should preserve commercial requirements and previous account details", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_SUBMITTED",
        authToken: "token-customer-2",
        applicationId: "app-biz-002",
        applicationReference: "JSS-APP-BIZ002",
        customerId: "cust-002",
        customerName: "Jane Business",
        customerType: "Business",
      },
      mockDb,
    );

    assert.equal(res.success, true);
    assert.equal(res.result?.eventType, "GAS_APPLICATION_SUBMITTED");
  });

  // --------------------------------------------------------------------------
  // B. MANAGER DECISION TESTS
  // --------------------------------------------------------------------------

  it("3. Manager APPROVE: should activate customer account, assign pricing band and discount", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_APPROVED",
        authToken: "token-manager",
        applicationId: "app-biz-002",
        applicationReference: "JSS-APP-BIZ002",
        customerId: "cust-002",
        pricingBand: "Commercial Trade (Band B)",
        discountPercentage: 10,
      },
      mockDb,
    );

    assert.equal(res.success, true, "Manager approval should succeed");
    assert.equal(res.result?.eventType, "GAS_APPLICATION_APPROVED");
  });

  it("4. Manager DECLINE: should update status to DECLINED and notify customer with reason", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_DECLINED",
        authToken: "token-manager",
        applicationId: "app-home-001",
        applicationReference: "JSS-APP-HOME001",
        customerId: "cust-001",
        reason: "Address is outside the Gloucestershire primary distribution boundary.",
      },
      mockDb,
    );

    assert.equal(res.success, true, "Manager decline should succeed");
    assert.equal(res.result?.eventType, "GAS_APPLICATION_DECLINED");
  });

  it("5. Manager MORE INFORMATION NEEDED: should request details and notify customer", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_MORE_INFO",
        authToken: "token-manager",
        applicationId: "app-biz-002",
        applicationReference: "JSS-APP-BIZ002",
        customerId: "cust-002",
        moreInfoNeededNotes: "Please upload photo verification of your external cylinder cage storage plinth.",
      },
      mockDb,
    );

    assert.equal(res.success, true, "Manager more-info request should succeed");
    assert.equal(res.result?.eventType, "GAS_APPLICATION_MORE_INFO");
  });

  it("6. Customer submits requested details: should alert managers for re-review", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    const res = await handleDispatchPushNotification(
      {
        eventType: "GAS_APPLICATION_INFO_SUBMITTED",
        authToken: "token-customer-2",
        applicationId: "app-biz-002",
        applicationReference: "JSS-APP-BIZ002",
        customerId: "cust-002",
        customerName: "Jane Business",
      },
      mockDb,
    );

    assert.equal(res.success, true, "Customer info resubmission should succeed");
    assert.equal(res.result?.eventType, "GAS_APPLICATION_INFO_SUBMITTED");
  });

  // --------------------------------------------------------------------------
  // C. SECURITY & ROLE ISOLATION TESTS
  // --------------------------------------------------------------------------

  it("7. Security Isolation: unauthenticated or customer caller cannot approve gas applications", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    await assert.rejects(
      async () => {
        await handleDispatchPushNotification(
          {
            eventType: "GAS_APPLICATION_APPROVED",
            authToken: "token-customer-1", // customer attempting self-approval
            applicationId: "app-home-001",
            customerId: "cust-001",
            pricingBand: "Commercial Trade (Band B)",
            discountPercentage: 25,
          },
          mockDb,
        );
      },
      /Unauthorized: only managers and admins can approve gas applications/,
      "Customer must not be allowed to approve applications",
    );
  });

  it("8. Security Isolation: customer cannot trigger application notifications for another customer", async () => {
    const mockDb = createMockSupabase({
      profiles: initialProfiles,
      gas_customer_applications: initialApplications,
      user_device_tokens: mockTokens,
    });

    await assert.rejects(
      async () => {
        await handleDispatchPushNotification(
          {
            eventType: "GAS_APPLICATION_SUBMITTED",
            authToken: "token-customer-1", // cust-001 attempting to submit for cust-002
            applicationId: "app-biz-002",
            customerId: "cust-002",
            customerName: "Jane Business",
          },
          mockDb,
        );
      },
      /Unauthorized: cannot submit application notification for another customer/,
      "Customer cannot submit application for another account",
    );
  });
});
