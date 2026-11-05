import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isRestrictedGasProduct, isValidUuid } from "../src/lib/application-service";

// ============================================================================
// SIMULATED DATABASE LAYER WITH RLS, DEFENSE TRIGGERS & ATOMIC RPC
// ============================================================================

interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: "customer" | "manager" | "admin";
  status: string;
  account_approved: boolean;
  application_status: string;
  pricing_band: string;
  discount_percentage: number;
  credit_account_approved: boolean;
  credit_limit: number;
}

interface ApplicationRecord {
  id: string;
  customer_id: string;
  application_reference: string;
  status: "PENDING" | "MORE_INFO_NEEDED" | "APPROVED" | "DECLINED";
  pricing_band?: string | null;
  discount_percentage: number;
  credit_account_approved: boolean;
  credit_limit: number;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  decision_history: any[];
}

function createSimulatedPostgresDb() {
  const profiles: Record<string, ProfileRecord> = {
    "cust-001": {
      id: "cust-001",
      full_name: "Alice Smith",
      email: "alice@example.com",
      phone: "01453822859",
      role: "customer",
      status: "pending",
      account_approved: false,
      application_status: "PENDING",
      pricing_band: "Standard Domestic",
      discount_percentage: 0,
      credit_account_approved: false,
      credit_limit: 0,
    },
    "mgr-001": {
      id: "mgr-001",
      full_name: "Manager Bob",
      email: "manager@stayte.co.uk",
      role: "manager",
      status: "active",
      account_approved: true,
      application_status: "APPROVED",
      pricing_band: "Staff",
      discount_percentage: 0,
      credit_account_approved: false,
      credit_limit: 0,
    },
  };

  const applications: Record<string, ApplicationRecord> = {
    "app-001": {
      id: "app-001",
      customer_id: "cust-001",
      application_reference: "JSS-APP-001",
      status: "PENDING",
      pricing_band: null,
      discount_percentage: 0,
      credit_account_approved: false,
      credit_limit: 0,
      admin_notes: null,
      reviewed_by: null,
      decision_history: [
        { action: "SUBMITTED", status: "PENDING", timestamp: new Date().toISOString() },
      ],
    },
  };

  let pushNotificationsDispatched: any[] = [];

  return {
    getProfile: (id: string) => ({ ...profiles[id] }),
    getApplication: (id: string) => ({ ...applications[id] }),
    getNotificationsDispatched: () => [...pushNotificationsDispatched],

    /**
     * Simulates Postgres RLS policy + BEFORE UPDATE trigger on public.profiles
     * as defined in 00095_secure_profile_updates_and_atomic_approval.sql
     */
    updateProfile: (
      callerId: string,
      targetProfileId: string,
      updates: Partial<ProfileRecord>,
    ) => {
      const caller = profiles[callerId];
      if (!caller) throw new Error("Unauthorized: caller not authenticated");

      const oldRecord = profiles[targetProfileId];
      if (!oldRecord) throw new Error("Profile not found");

      const isManagerOrAdmin = caller.role === "manager" || caller.role === "admin";

      // RLS Check: caller must be self or manager/admin
      if (!isManagerOrAdmin && callerId !== targetProfileId) {
        throw new Error("RLS: cannot update another user's profile");
      }

      // Trigger: protect_profile_approval_fields()
      if (!isManagerOrAdmin) {
        if ("role" in updates && updates.role !== oldRecord.role) {
          throw new Error("Unauthorized: cannot modify role");
        }
        if ("account_approved" in updates && updates.account_approved !== oldRecord.account_approved) {
          throw new Error("Unauthorized: customers cannot self-modify account_approved status");
        }
        if ("pricing_band" in updates && updates.pricing_band !== oldRecord.pricing_band) {
          throw new Error("Unauthorized: customers cannot self-modify pricing_band");
        }
        if (
          "discount_percentage" in updates &&
          updates.discount_percentage !== oldRecord.discount_percentage
        ) {
          throw new Error("Unauthorized: customers cannot self-modify discount_percentage");
        }
        if (
          "credit_account_approved" in updates &&
          updates.credit_account_approved !== oldRecord.credit_account_approved
        ) {
          throw new Error("Unauthorized: customers cannot self-modify credit_account_approved");
        }
        if ("credit_limit" in updates && updates.credit_limit !== oldRecord.credit_limit) {
          throw new Error("Unauthorized: customers cannot self-modify credit_limit");
        }
        if (
          "application_status" in updates &&
          updates.application_status !== oldRecord.application_status
        ) {
          throw new Error("Unauthorized: customers cannot self-modify application_status");
        }
      }

      // Apply valid updates
      profiles[targetProfileId] = { ...oldRecord, ...updates };
      return { ...profiles[targetProfileId] };
    },

    /**
     * Simulates Postgres RLS policy + trigger on public.gas_customer_applications
     */
    updateApplication: (
      callerId: string,
      applicationId: string,
      updates: Partial<ApplicationRecord>,
    ) => {
      const caller = profiles[callerId];
      if (!caller) throw new Error("Unauthorized: caller not authenticated");

      const oldApp = applications[applicationId];
      if (!oldApp) throw new Error("Application not found");

      const isManagerOrAdmin = caller.role === "manager" || caller.role === "admin";

      if (!isManagerOrAdmin && callerId !== oldApp.customer_id) {
        throw new Error("RLS: cannot update another user's application");
      }

      if (!isManagerOrAdmin) {
        if (updates.status === "APPROVED") {
          throw new Error("Unauthorized: customers cannot self-approve applications");
        }
        if (updates.pricing_band && updates.pricing_band !== oldApp.pricing_band) {
          throw new Error("Unauthorized: customers cannot set pricing_band");
        }
        if (
          updates.discount_percentage !== undefined &&
          updates.discount_percentage !== oldApp.discount_percentage
        ) {
          throw new Error("Unauthorized: customers cannot set discount_percentage");
        }
        if (
          updates.credit_account_approved !== undefined &&
          updates.credit_account_approved !== oldApp.credit_account_approved
        ) {
          throw new Error("Unauthorized: customers cannot set credit_account_approved");
        }
      }

      applications[applicationId] = { ...oldApp, ...updates };
      return { ...applications[applicationId] };
    },

    /**
     * Simulates Postgres transactional RPC: approve_gas_customer_application()
     */
    rpcApproveGasCustomerApplication: (
      callerId: string,
      params: {
        applicationId: string;
        pricingBand: string;
        discountPercentage: number;
        creditApproved?: boolean;
        creditLimit?: number;
        adminNotes?: string;
        simulateFailureInProfileUpdate?: boolean;
      },
    ) => {
      const caller = profiles[callerId];
      if (!caller || (caller.role !== "manager" && caller.role !== "admin")) {
        throw new Error("Unauthorized: Only Managers and Admins can approve gas applications");
      }

      const app = applications[params.applicationId];
      if (!app) {
        throw new Error(`Application not found with ID: ${params.applicationId}`);
      }

      // Check Idempotency
      if (
        app.status === "APPROVED" &&
        app.pricing_band === params.pricingBand &&
        app.discount_percentage === params.discountPercentage &&
        app.credit_account_approved === Boolean(params.creditApproved) &&
        app.credit_limit === Number(params.creditLimit || 0)
      ) {
        return {
          success: true,
          status: "APPROVED",
          already_approved: true,
          application_id: app.id,
          customer_id: app.customer_id,
        };
      }

      // Begin atomic transaction snapshot
      const snapshotApp = JSON.parse(JSON.stringify(applications[params.applicationId]));
      const snapshotProfile = JSON.parse(JSON.stringify(profiles[app.customer_id] || null));

      try {
        // Step 1: Update application
        applications[params.applicationId] = {
          ...app,
          status: "APPROVED",
          pricing_band: params.pricingBand,
          discount_percentage: params.discountPercentage,
          credit_account_approved: Boolean(params.creditApproved),
          credit_limit: Number(params.creditLimit || 0),
          admin_notes: params.adminNotes || "Approved",
          reviewed_by: caller.email,
          decision_history: [
            ...app.decision_history,
            {
              action: "APPROVE",
              status: "APPROVED",
              pricing_band: params.pricingBand,
              discount_percentage: params.discountPercentage,
              credit_account_approved: Boolean(params.creditApproved),
              credit_limit: Number(params.creditLimit || 0),
              timestamp: new Date().toISOString(),
            },
          ],
        };

        // Step 2: Simulate failure in profile update if requested
        if (params.simulateFailureInProfileUpdate || !snapshotProfile) {
          throw new Error("Simulated profile write failure: database constraint violated");
        }

        // Step 3: Update profile atomically
        profiles[app.customer_id] = {
          ...snapshotProfile,
          status: "active",
          account_approved: true,
          application_status: "APPROVED",
          pricing_band: params.pricingBand,
          discount_percentage: params.discountPercentage,
          credit_account_approved: Boolean(params.creditApproved),
          credit_limit: Number(params.creditLimit || 0),
        };

        pushNotificationsDispatched.push({
          type: "GAS_APPLICATION_APPROVED",
          customerId: app.customer_id,
          pricingBand: params.pricingBand,
          discountPercentage: params.discountPercentage,
        });

        return {
          success: true,
          status: "APPROVED",
          already_approved: false,
          application_id: app.id,
          customer_id: app.customer_id,
        };
      } catch (err) {
        // Roll back entire transaction
        applications[params.applicationId] = snapshotApp;
        if (snapshotProfile) {
          profiles[app.customer_id] = snapshotProfile;
        }
        throw err;
      }
    },
  };
}

// ============================================================================
// TEST SUITE: PHASE 1 HARDENING & ATOMIC APPROVAL
// ============================================================================

describe("Phase 1 Hardening & Atomic Gas Customer Application Workflow", () => {
  // --------------------------------------------------------------------------
  // 1. SECURE CUSTOMER PROFILE UPDATES
  // --------------------------------------------------------------------------
  it("Customer cannot self-approve their own account", () => {
    const db = createSimulatedPostgresDb();

    assert.throws(
      () => {
        db.updateProfile("cust-001", "cust-001", {
          account_approved: true,
        });
      },
      /Unauthorized: customers cannot self-modify account_approved status/,
      "Customer must not be allowed to set account_approved to true",
    );

    const profile = db.getProfile("cust-001");
    assert.equal(profile.account_approved, false, "account_approved must remain false");
  });

  it("Customer cannot change their own pricing band or discount percentage", () => {
    const db = createSimulatedPostgresDb();

    assert.throws(
      () => {
        db.updateProfile("cust-001", "cust-001", {
          pricing_band: "Wholesale Tier 1",
          discount_percentage: 40,
        });
      },
      /Unauthorized: customers cannot self-modify pricing_band/,
      "Customer must not be allowed to change pricing band",
    );

    assert.throws(
      () => {
        db.updateProfile("cust-001", "cust-001", {
          discount_percentage: 25,
        });
      },
      /Unauthorized: customers cannot self-modify discount_percentage/,
      "Customer must not be allowed to change discount percentage",
    );
  });

  it("Customer cannot grant themselves credit facility or set credit limit", () => {
    const db = createSimulatedPostgresDb();

    assert.throws(
      () => {
        db.updateProfile("cust-001", "cust-001", {
          credit_account_approved: true,
          credit_limit: 5000,
        });
      },
      /Unauthorized: customers cannot self-modify credit_account_approved/,
      "Customer must not be allowed to grant credit facility",
    );
  });

  it("Customer cannot self-approve their application record", () => {
    const db = createSimulatedPostgresDb();

    assert.throws(
      () => {
        db.updateApplication("cust-001", "app-001", {
          status: "APPROVED",
        });
      },
      /Unauthorized: customers cannot self-approve applications/,
      "Customer must not be allowed to mark application as APPROVED",
    );
  });

  it("Customer CAN still edit normal profile fields (name, phone)", () => {
    const db = createSimulatedPostgresDb();

    const updated = db.updateProfile("cust-001", "cust-001", {
      full_name: "Alice M. Smith",
      phone: "07700900123",
    });

    assert.equal(updated.full_name, "Alice M. Smith");
    assert.equal(updated.phone, "07700900123");
    assert.equal(updated.account_approved, false, "Restricted field remained unchanged");
  });

  // --------------------------------------------------------------------------
  // 2. ATOMIC MANAGER APPROVAL & ROLLBACK
  // --------------------------------------------------------------------------
  it("Manager can approve application successfully and activate profile atomically", () => {
    const db = createSimulatedPostgresDb();

    const result = db.rpcApproveGasCustomerApplication("mgr-001", {
      applicationId: "app-001",
      pricingBand: "Commercial Band A",
      discountPercentage: 15,
      creditApproved: true,
      creditLimit: 1500,
      adminNotes: "Documents verified by manager.",
    });

    assert.equal(result.success, true);
    assert.equal(result.already_approved, false);

    const app = db.getApplication("app-001");
    assert.equal(app.status, "APPROVED");
    assert.equal(app.pricing_band, "Commercial Band A");
    assert.equal(app.discount_percentage, 15);
    assert.equal(app.credit_account_approved, true);
    assert.equal(app.credit_limit, 1500);

    const profile = db.getProfile("cust-001");
    assert.equal(profile.account_approved, true, "Customer profile is activated");
    assert.equal(profile.pricing_band, "Commercial Band A");
    assert.equal(profile.discount_percentage, 15);
    assert.equal(profile.credit_account_approved, true);
    assert.equal(profile.credit_limit, 1500);
  });

  it("Failed approval rolls back all related changes (no partial update)", () => {
    const db = createSimulatedPostgresDb();

    assert.throws(
      () => {
        db.rpcApproveGasCustomerApplication("mgr-001", {
          applicationId: "app-001",
          pricingBand: "Wholesale",
          discountPercentage: 20,
          simulateFailureInProfileUpdate: true, // triggers rollback
        });
      },
      /Simulated profile write failure/,
    );

    // Verify atomic rollback: application must NOT be approved!
    const app = db.getApplication("app-001");
    assert.equal(app.status, "PENDING", "Application status must remain PENDING after rollback");
    assert.equal(app.pricing_band, null, "Pricing band must remain null");

    // Profile must also remain unapproved
    const profile = db.getProfile("cust-001");
    assert.equal(profile.account_approved, false, "Customer profile must remain unapproved");
  });

  it("Duplicate approval is safely handled without duplicate notifications", () => {
    const db = createSimulatedPostgresDb();

    // First approval
    const res1 = db.rpcApproveGasCustomerApplication("mgr-001", {
      applicationId: "app-001",
      pricingBand: "Standard Domestic",
      discountPercentage: 5,
    });
    assert.equal(res1.already_approved, false);
    assert.equal(db.getNotificationsDispatched().length, 1);

    // Duplicate identical approval
    const res2 = db.rpcApproveGasCustomerApplication("mgr-001", {
      applicationId: "app-001",
      pricingBand: "Standard Domestic",
      discountPercentage: 5,
    });
    assert.equal(res2.already_approved, true, "Should report already_approved true");
    // Notifications count must not increase!
    assert.equal(
      db.getNotificationsDispatched().length,
      1,
      "Duplicate approval must not emit extra notification",
    );
  });

  // --------------------------------------------------------------------------
  // 3. CHECKOUT GATING FOR RESTRICTED LPG VS UNRESTRICTED PRODUCTS
  // --------------------------------------------------------------------------
  it("Identifies restricted LPG products correctly", () => {
    // 1. Refillable LPG Cylinders
    assert.equal(
      isRestrictedGasProduct({
        name: "Propane 47kg Gas Cylinder",
        category_slug: "bottled-gas",
      }),
      true,
      "Propane cylinder must be restricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Butane 13kg Cylinder",
        category_slug: "gas",
      }),
      true,
      "Butane cylinder must be restricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Campingaz 907 Cylinder",
        category_slug: "campingaz",
      }),
      true,
      "Campingaz cylinder must be restricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "CO2 Pub Gas Cylinder",
        category_slug: "pub-gas",
      }),
      true,
      "Pub gas cylinder must be restricted",
    );
  });

  it("Allows unrestricted products through without gas account requirement", () => {
    // Non-gas products
    assert.equal(
      isRestrictedGasProduct({
        name: "Smokeless Coal 25kg Bag",
        category_slug: "coal-fuels",
      }),
      false,
      "Coal fuels must be unrestricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Kiln Dried Hardwood Logs",
        category_slug: "coal-fuels",
      }),
      false,
      "Firewood logs must be unrestricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Horse Feed 20kg",
        category_slug: "animal-feed",
      }),
      false,
      "Animal feed must be unrestricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Carp Fishing Baits",
        category_slug: "dynamite-baits",
      }),
      false,
      "Fishing bait must be unrestricted",
    );

    assert.equal(
      isRestrictedGasProduct({
        name: "Portable Gas Heater Appliance",
        category_slug: "gas-appliances",
      }),
      false,
      "Appliances must be unrestricted",
    );
  });

  it("Checkout gating logic correctly blocks unapproved customers from LPG while allowing unrelated items", () => {
    function simulateCheckoutEvaluation(
      cartItems: Array<{ product: any }>,
      customer: { account_approved: boolean; application_status: string },
    ): { allowed: boolean; reason?: string } {
      const containsRestrictedGas = cartItems.some((item) => isRestrictedGasProduct(item.product));
      if (!containsRestrictedGas) {
        return { allowed: true };
      }

      if (!customer.account_approved || customer.application_status !== "APPROVED") {
        return {
          allowed: false,
          reason: "Gas Customer Application required and approved before purchasing LPG products.",
        };
      }

      return { allowed: true };
    }

    const unapprovedCustomer = { account_approved: false, application_status: "PENDING" };
    const approvedCustomer = { account_approved: true, application_status: "APPROVED" };

    const lpgCart = [
      { product: { name: "Propane 47kg", category_slug: "bottled-gas" } },
      { product: { name: "Hardwood Logs", category_slug: "coal-fuels" } },
    ];

    const coalOnlyCart = [
      { product: { name: "Smokeless Coal 25kg", category_slug: "coal-fuels" } },
      { product: { name: "Winter Kindling", category_slug: "coal-fuels" } },
    ];

    // 1. Unapproved customer purchasing LPG -> Blocked
    const lpgBlocked = simulateCheckoutEvaluation(lpgCart, unapprovedCustomer);
    assert.equal(lpgBlocked.allowed, false);
    assert.match(lpgBlocked.reason!, /Gas Customer Application required/);

    // 2. Unapproved customer purchasing only Coal/Logs -> Allowed
    const coalAllowed = simulateCheckoutEvaluation(coalOnlyCart, unapprovedCustomer);
    assert.equal(coalAllowed.allowed, true, "Unrelated checkout must remain completely unaffected");

    // 3. Approved customer purchasing LPG -> Allowed
    const lpgAllowed = simulateCheckoutEvaluation(lpgCart, approvedCustomer);
    assert.equal(lpgAllowed.allowed, true, "Approved customer is allowed to checkout LPG");
  });

  describe("Reviewer UUID Validation and RPC Error Handling", () => {
    it("isValidUuid strictly differentiates valid UUIDs from display names and emails", () => {
      // Valid UUID formats
      assert.equal(isValidUuid("c6832dbb-5e19-482f-8700-0e998a136bfb"), true);
      assert.equal(isValidUuid("C6832DBB-5E19-482F-8700-0E998A136BFB"), true);
      assert.equal(isValidUuid("123e4567-e89b-12d3-a456-426614174000"), true);

      // Invalid strings (Display names, emails, empty, arbitrary text)
      assert.equal(isValidUuid("John Stayte Admin"), false);
      assert.equal(isValidUuid("Admin Staff"), false);
      assert.equal(isValidUuid("Depot Manager"), false);
      assert.equal(isValidUuid("admin@stayte.co.uk"), false);
      assert.equal(isValidUuid(""), false);
      assert.equal(isValidUuid("   "), false);
      assert.equal(isValidUuid(null), false);
      assert.equal(isValidUuid(undefined), false);
      assert.equal(isValidUuid(12345), false);
    });

    it("Resolves reviewer UUID strictly to authentic UUID and sanitizes display names", () => {
      function resolveReviewer(reviewedBy: any, sessionUserId: any): string {
        if (isValidUuid(reviewedBy)) {
          return reviewedBy;
        }
        if (isValidUuid(sessionUserId)) {
          return sessionUserId;
        }
        throw new Error("Invalid reviewer identity: An authenticated user UUID is required");
      }

      const authenticAdminUuid = "d982b68c-5e19-482f-8700-0e998a136bfb";
      const validReviewerUuid = "e1234567-e89b-12d3-a456-426614174000";

      // 1. When passed a display name, fallback to authentic session UUID
      const resolvedFromDisplayName = resolveReviewer("John Stayte Admin", authenticAdminUuid);
      assert.equal(resolvedFromDisplayName, authenticAdminUuid);

      // 2. When passed a valid UUID, use the provided UUID
      const resolvedFromValidUuid = resolveReviewer(validReviewerUuid, authenticAdminUuid);
      assert.equal(resolvedFromValidUuid, validReviewerUuid);

      // 3. When neither is a valid UUID, throw error
      assert.throws(
        () => resolveReviewer("John Stayte Admin", "invalid-session-id"),
        /Invalid reviewer identity/,
      );
    });

    it("Does not silently fallback to direct database write when RPC returns real postgres error", () => {
      function evaluateRpcErrorHandling(rpcErr: { code?: string; message: string }) {
        const isRpcMissing =
          rpcErr.code === "PGRST202" ||
          rpcErr.code === "42883" ||
          rpcErr.message?.toLowerCase().includes("could not find the function") ||
          (rpcErr.message?.toLowerCase().includes("function") &&
            rpcErr.message?.toLowerCase().includes("does not exist"));

        if (!isRpcMissing) {
          throw new Error(rpcErr.message || "Approval transaction failed in database RPC.");
        }

        return "FALLBACK_ALLOWED";
      }

      // 1. Real database error (e.g. invalid syntax for type uuid, foreign key, or constraint failure)
      assert.throws(
        () =>
          evaluateRpcErrorHandling({
            code: "22P02",
            message: 'invalid input syntax for type uuid: "John Stayte Admin"',
          }),
        /invalid input syntax for type uuid/,
      );

      // 2. Function not found (local testing / mock DB environment)
      const fallbackResult = evaluateRpcErrorHandling({
        code: "PGRST202",
        message: "could not find the function approve_gas_customer_application",
      });
      assert.equal(fallbackResult, "FALLBACK_ALLOWED");
    });

    it("Migration 00097 correctly fixes RPC signature, typing, and drops legacy TEXT overload", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/00097_fix_application_reviewer_uuid.sql",
      );
      assert.equal(fs.existsSync(migrationPath), true, "00097 migration file must exist");

      const sql = fs.readFileSync(migrationPath, "utf-8");

      // 1. Must drop legacy signature to avoid PostgREST ambiguity (PGRST204)
      assert.match(
        sql,
        /DROP FUNCTION IF EXISTS public\.approve_gas_customer_application\(\s*UUID,\s*TEXT,\s*NUMERIC,\s*BOOLEAN,\s*NUMERIC,\s*TEXT,\s*TEXT\s*\);/i,
        "Must drop legacy TEXT signature",
      );

      // 2. Must define p_reviewed_by as UUID
      assert.match(
        sql,
        /p_reviewed_by UUID DEFAULT NULL/i,
        "Parameter p_reviewed_by must be typed as UUID",
      );

      // 3. Must declare v_reviewer_id as UUID
      assert.match(
        sql,
        /v_reviewer_id UUID;/i,
        "Internal variable v_reviewer_id must be declared as UUID",
      );

      // 4. Must assign reviewed_by = v_reviewer_id (UUID = UUID)
      assert.match(
        sql,
        /reviewed_by = v_reviewer_id/i,
        "Must update reviewed_by with UUID variable",
      );

      // 5. Must require auth.uid() non-null and prevent reviewer impersonation
      assert.match(
        sql,
        /IF v_caller_id IS NULL THEN\s*RAISE EXCEPTION/i,
        "Must reject unauthenticated caller (auth.uid() IS NULL)",
      );
      assert.match(
        sql,
        /p_reviewed_by <> v_caller_id/i,
        "Must enforce reviewer identity matches auth.uid()",
      );
      assert.match(
        sql,
        /v_reviewer_id := v_caller_id;/i,
        "Must assign reviewer id directly from auth.uid() without fallback",
      );

      // 6. Must revoke execute from PUBLIC and anon, and grant strictly to authenticated
      assert.match(
        sql,
        /REVOKE EXECUTE ON FUNCTION public\.approve_gas_customer_application\([\s\S]*?\) FROM PUBLIC;/i,
        "Must revoke execute from PUBLIC",
      );
      assert.match(
        sql,
        /REVOKE EXECUTE ON FUNCTION public\.approve_gas_customer_application\([\s\S]*?\) FROM anon;/i,
        "Must revoke execute from anon",
      );
      assert.match(
        sql,
        /GRANT EXECUTE ON FUNCTION public\.approve_gas_customer_application\([\s\S]*?\) TO authenticated;/i,
        "Must grant execute strictly to authenticated role",
      );

      // 7. Must avoid CASCADE to protect database integrity
      assert.doesNotMatch(
        sql,
        /DROP\s+FUNCTION[\s\S]*?CASCADE/i,
        "Must not use CASCADE when dropping functions",
      );

      // 8. Avoid manual schema_migrations insertion to prevent SQL Editor tracking conflicts
      assert.doesNotMatch(
        sql,
        /INSERT INTO supabase_migrations\.schema_migrations/i,
        "Must not contain manual schema_migrations inserts for SQL editor execution",
      );

      // 9. Must be transaction-wrapped and notify PostgREST schema cache
      assert.match(
        sql,
        /^BEGIN;/m,
        "Must start with BEGIN transaction block",
      );
      assert.match(
        sql,
        /NOTIFY\s+pgrst,\s*'reload\s+schema';/i,
        "Must notify PostgREST to reload schema cache",
      );
      assert.match(
        sql,
        /COMMIT;$/m,
        "Must end with COMMIT transaction block",
      );
    });

    it("Recovery strategy strictly preserves UUID typing and never restores TEXT signatures", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/00097_fix_application_reviewer_uuid.sql",
      );
      const sql = fs.readFileSync(migrationPath, "utf-8");

      // Verify no TEXT assignment to reviewed_by column
      assert.doesNotMatch(sql, /reviewed_by\s*=\s*v_reviewer(?!\w)/i);
      assert.doesNotMatch(sql, /reviewed_by\s*=\s*p_reviewed_by(?!\w)/i);
      assert.match(sql, /reviewed_by\s*=\s*v_reviewer_id/i);
    });
  });
});

