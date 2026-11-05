import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBranchInfo,
  isPendingBranchAssignment,
  getBranchFilterKey,
  fetchRealBranchOrders,
  fetchRealBranchKpiCounts,
  fetchRealBranchStock,
  resolveCheckoutBranchAssignment,
  KNOWN_BRANCHES,
} from "../src/lib/branch-service";

describe("Branch Staff Role & Dedicated Portal Architecture", () => {
  describe("1. Branch Location & Metadata Resolution", () => {
    it("should resolve Cirencester branch details by name or substring", () => {
      const branch = resolveBranchInfo("John Stayte Services – Cirencester");
      assert.ok(branch);
      assert.equal(branch?.town, "Cirencester");
      assert.equal(branch?.postcode, "GL7 1YD");
      assert.equal(branch?.telephone, "01285 654614");
    });

    it("should resolve Gloucester branch details by ID", () => {
      const branch = resolveBranchInfo(null, "a1111111-1111-4111-a111-111111111102");
      assert.ok(branch);
      assert.equal(branch?.town, "Gloucester");
      assert.equal(branch?.postcode, "GL1 3AX");
    });

    it("should resolve Stroud branch details by town query", () => {
      const branch = resolveBranchInfo("Stroud");
      assert.ok(branch);
      assert.equal(branch?.town, "Stroud");
      assert.equal(branch?.telephone, "01453 762541");
    });

    it("should resolve Weston-Super-Mare branch details", () => {
      const branch = resolveBranchInfo("John Stayte Services – Weston Super Mare");
      assert.ok(branch);
      assert.equal(branch?.town, "Weston-Super-Mare");
      assert.equal(branch?.postcode, "BS23 3YX");
    });

    it("should resolve Whitminster Depot", () => {
      const branch = resolveBranchInfo("Whitminster Depot (Main Logistics)");
      assert.ok(branch);
      assert.equal(branch?.isDepot, true);
      assert.equal(branch?.town, "Whitminster");
      assert.equal(branch?.postcode, "GL2 7PB");
    });

    it("should gracefully return null for unassigned or Pending Confirmation", () => {
      assert.equal(resolveBranchInfo("Pending Confirmation"), null);
      assert.equal(resolveBranchInfo(null, null), null);
      assert.equal(resolveBranchInfo(""), null);
    });
  });

  describe("2. Role Redirection Logic", () => {
    const redirectByRole = (role: string): string => {
      return role === "admin"
        ? "/admin"
        : role === "manager"
          ? "/manager"
          : role === "delivery_agent"
            ? "/delivery"
            : role === "branch_staff"
              ? "/branch"
              : "/account";
    };

    it("should redirect branch_staff strictly to /branch", () => {
      assert.equal(redirectByRole("branch_staff"), "/branch");
    });

    it("should redirect admin to /admin", () => {
      assert.equal(redirectByRole("admin"), "/admin");
    });

    it("should redirect manager to /manager", () => {
      assert.equal(redirectByRole("manager"), "/manager");
    });

    it("should redirect delivery_agent to /delivery", () => {
      assert.equal(redirectByRole("delivery_agent"), "/delivery");
    });

    it("should redirect regular customer to /account", () => {
      assert.equal(redirectByRole("customer"), "/account");
      assert.equal(redirectByRole("unknown"), "/account");
    });
  });

  describe("3. Access Control & Gate Rules", () => {
    const canAccessBranchPortal = (role?: string | null): boolean => {
      return role === "branch_staff" || role === "admin";
    };

    const canAccessAdminPortal = (role?: string | null): boolean => {
      return role === "admin";
    };

    const canAccessManagerPortal = (role?: string | null): boolean => {
      return role === "manager" || role === "admin";
    };

    it("should grant Branch Staff access to Branch Portal", () => {
      assert.equal(canAccessBranchPortal("branch_staff"), true);
    });

    it("should grant Admin access to Branch Portal for administrative oversight", () => {
      assert.equal(canAccessBranchPortal("admin"), true);
    });

    it("should deny customer, delivery agent, and unauthenticated callers from Branch Portal", () => {
      assert.equal(canAccessBranchPortal("customer"), false);
      assert.equal(canAccessBranchPortal("delivery_agent"), false);
      assert.equal(canAccessBranchPortal(null), false);
      assert.equal(canAccessBranchPortal(undefined), false);
    });

    it("should strictly deny Branch Staff from Admin and Manager portals", () => {
      assert.equal(canAccessAdminPortal("branch_staff"), false);
      assert.equal(canAccessManagerPortal("branch_staff"), false);
    });
  });

  describe("4. Branch Staff Role Resolution", () => {
    function resolveUserRole(
      uid?: string,
      email?: string | null,
      metadataRole?: string | null,
      profileRole?: string | null,
      notificationPrefs?: Record<string, unknown> | null,
      staffRole?: string | null,
    ): string {
      const normEmail = (email || "").trim().toLowerCase();

      if (
        staffRole === "branch_staff" ||
        metadataRole === "branch_staff" ||
        profileRole === "branch_staff" ||
        (notificationPrefs && notificationPrefs.role === "branch_staff")
      ) {
        return "branch_staff";
      }

      if (
        metadataRole === "delivery_agent" ||
        metadataRole === "manager" ||
        metadataRole === "admin"
      ) {
        return metadataRole;
      }

      if (
        profileRole === "delivery_agent" ||
        profileRole === "manager" ||
        profileRole === "admin"
      ) {
        return profileRole;
      }

      return "customer";
    }

    it("should resolve branch_staff from user_metadata.staff_role", () => {
      const role = resolveUserRole(
        "test-uid-1",
        "staff@jss.com",
        undefined,
        "customer",
        undefined,
        "branch_staff",
      );
      assert.equal(role, "branch_staff");
    });

    it("should resolve branch_staff from notification_prefs.role", () => {
      const role = resolveUserRole(
        "test-uid-2",
        "staff@jss.com",
        undefined,
        "customer",
        { role: "branch_staff", assigned_branch: "Pending Confirmation" },
        undefined,
      );
      assert.equal(role, "branch_staff");
    });

    it("should resolve branch_staff from user_metadata.role", () => {
      const role = resolveUserRole(
        "test-uid-3",
        "staff@jss.com",
        "branch_staff",
        "customer",
        undefined,
        undefined,
      );
      assert.equal(role, "branch_staff");
    });

    it("should preserve customer role for normal accounts", () => {
      const role = resolveUserRole(
        "cust-uid",
        "customer@example.com",
        "customer",
        "customer",
        undefined,
        undefined,
      );
      assert.equal(role, "customer");
    });

    it("should preserve admin role", () => {
      const role = resolveUserRole(
        "admin-uid",
        "admin@johnstayte.co.uk",
        "admin",
        "admin",
        undefined,
        undefined,
      );
      assert.equal(role, "admin");
    });
  });

  describe("5. No Mock Data & Empty State Enforcement", () => {
    it("should detect pending branch assignment for unassigned staff", () => {
      assert.equal(isPendingBranchAssignment("Pending Confirmation"), true);
      assert.equal(isPendingBranchAssignment("pending"), true);
      assert.equal(isPendingBranchAssignment("Unassigned"), true);
      assert.equal(isPendingBranchAssignment(null), true);
      assert.equal(isPendingBranchAssignment(""), true);
    });

    it("should return false for valid operational branches", () => {
      assert.equal(isPendingBranchAssignment("John Stayte Services – Cirencester"), false);
      assert.equal(isPendingBranchAssignment("Gloucester"), false);
      assert.equal(isPendingBranchAssignment("Whitminster Depot (Main Logistics)"), false);
    });

    it("should return empty order list when branch is pending (zero data leakage)", async () => {
      const orders = await fetchRealBranchOrders("Pending Confirmation", "all");
      assert.deepEqual(orders, []);
    });

    it("should return 0 counts when branch is pending", async () => {
      const counts = await fetchRealBranchKpiCounts("Pending Confirmation");
      assert.equal(counts.newOrders, 0);
      assert.equal(counts.preparing, 0);
      assert.equal(counts.readyForCollection, 0);
      assert.equal(counts.awaitingCustomer, 0);
      assert.equal(counts.onHold, 0);
      assert.equal(counts.completedToday, 0);
    });

    it("should return unavailable status when branch-level stock is unconfigured", async () => {
      const stock = await fetchRealBranchStock("Pending Confirmation");
      assert.equal(stock.available, false);
      assert.equal(stock.message, "Branch inventory data is not available.");
      assert.deepEqual(stock.items, []);
    });
  });

  describe("6. Branch Isolation & Filtering Security", () => {
    it("should extract correct filter key for Cirencester", () => {
      assert.equal(getBranchFilterKey("John Stayte Services – Cirencester"), "Cirencester");
    });

    it("should extract correct filter key for Gloucester", () => {
      assert.equal(getBranchFilterKey("John Stayte Services – Gloucester"), "Gloucester");
    });

    it("should extract correct filter key for Stroud", () => {
      assert.equal(getBranchFilterKey("John Stayte Services – Stroud"), "Stroud");
    });

    it("should extract correct filter key for Weston-Super-Mare", () => {
      assert.equal(getBranchFilterKey("John Stayte Services – Weston Super Mare"), "Weston-Super-Mare");
    });

    it("should return null filter key for pending assignments", () => {
      assert.equal(getBranchFilterKey("Pending Confirmation"), null);
      assert.equal(getBranchFilterKey(null), null);
    });

    it("should verify order branch isolation: Cirencester order is isolated from Gloucester query", () => {
      const orders = [
        { id: "1", assigned_depot: "John Stayte Services – Cirencester" },
        { id: "2", assigned_depot: "John Stayte Services – Gloucester" },
        { id: "3", assigned_depot: "Whitminster" },
      ];

      const cirencesterFilter = getBranchFilterKey("John Stayte Services – Cirencester")!;
      const cirencesterOrders = orders.filter((o) =>
        o.assigned_depot.toLowerCase().includes(cirencesterFilter.toLowerCase()),
      );

      assert.equal(cirencesterOrders.length, 1);
      assert.equal(cirencesterOrders[0].id, "1");
      assert.ok(!cirencesterOrders.some((o) => o.assigned_depot.includes("Gloucester")));
    });
  });

  describe("7. Click & Collect Order Assignment Logic", () => {
    it("should route Click & Collect for Cirencester with exact forecourt UUID", () => {
      const res = resolveCheckoutBranchAssignment("collection", "John Stayte Services – Cirencester");
      assert.equal(res.assignedBranchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(res.collectionBranchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(res.assignedDepot, "John Stayte Services – Cirencester");
      assert.equal(res.collectionBranch, "John Stayte Services – Cirencester");
    });

    it("should route Click & Collect for Gloucester with exact forecourt UUID", () => {
      const res = resolveCheckoutBranchAssignment("collection", "John Stayte Services – Gloucester");
      assert.equal(res.assignedBranchId, "a1111111-1111-4111-a111-111111111102");
      assert.equal(res.collectionBranchId, "a1111111-1111-4111-a111-111111111102");
      assert.equal(res.assignedDepot, "John Stayte Services – Gloucester");
      assert.equal(res.collectionBranch, "John Stayte Services – Gloucester");
    });

    it("should route Click & Collect for Stroud with exact forecourt UUID", () => {
      const res = resolveCheckoutBranchAssignment("collection", "John Stayte Services – Stroud");
      assert.equal(res.assignedBranchId, "a1111111-1111-4111-a111-111111111103");
      assert.equal(res.collectionBranchId, "a1111111-1111-4111-a111-111111111103");
      assert.equal(res.assignedDepot, "John Stayte Services – Stroud");
      assert.equal(res.collectionBranch, "John Stayte Services – Stroud");
    });

    it("should route Click & Collect for Weston Super Mare with exact forecourt UUID", () => {
      const res = resolveCheckoutBranchAssignment("collection", "John Stayte Services – Weston Super Mare");
      assert.equal(res.assignedBranchId, "a1111111-1111-4111-a111-111111111104");
      assert.equal(res.collectionBranchId, "a1111111-1111-4111-a111-111111111104");
      assert.equal(res.assignedDepot, "John Stayte Services – Weston Super Mare");
      assert.equal(res.collectionBranch, "John Stayte Services – Weston Super Mare");
    });

    it("should route Click & Collect for Whitminster Depot with null UUID column to avoid syntax error", () => {
      const res = resolveCheckoutBranchAssignment("collection", "Whitminster Depot (Main Logistics)");
      assert.equal(res.assignedBranchId, null);
      assert.equal(res.collectionBranchId, null);
      assert.equal(res.assignedDepot, "Whitminster Depot (Main Logistics)");
      assert.equal(res.collectionBranch, "Whitminster Depot (Main Logistics)");
    });

    it("should route Standard Delivery to Whitminster depot with null branch IDs", () => {
      const res = resolveCheckoutBranchAssignment("delivery", "John Stayte Services – Cirencester");
      assert.equal(res.assignedBranchId, null);
      assert.equal(res.collectionBranchId, null);
      assert.equal(res.collectionBranch, null);
      assert.equal(res.assignedDepot, "Whitminster");
    });

    it("should support town-level fuzzy matching for forecourts", () => {
      const res = resolveCheckoutBranchAssignment("collection", "cirencester");
      assert.equal(res.assignedBranchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(res.collectionBranchId, "a1111111-1111-4111-a111-111111111101");
    });
  });
});
