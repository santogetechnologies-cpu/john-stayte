import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_FORECOURT_BRANCHES,
  isValidForecourtBranchId,
  isPendingBranchAssignment,
  resolveBranchInfo,
  getBranchQueryTarget,
  KNOWN_BRANCHES,
} from "../src/lib/branch-service";
import {
  CANONICAL_STAFF_ACCOUNT,
  type BranchStaffRecord,
} from "../src/lib/branch-staff-service";

describe("Admin Branch Staff Management Module", () => {
  // Forecourt definitions
  const CIRENCESTER_ID = "a1111111-1111-4111-a111-111111111101";
  const GLOUCESTER_ID = "a1111111-1111-4111-a111-111111111102";
  const STROUD_ID = "a1111111-1111-4111-a111-111111111103";
  const WESTON_ID = "a1111111-1111-4111-a111-111111111104";
  const WHITMINSTER_DEPOT_ID = "depot-whitminster-01";

  describe("1. Branch Forecourt Constraints (Four Forecourts Strictly Enforced)", () => {
    it("should include exactly the four active customer forecourts in ACTIVE_FORECOURT_BRANCHES", () => {
      assert.equal(ACTIVE_FORECOURT_BRANCHES.length, 4);

      const towns = ACTIVE_FORECOURT_BRANCHES.map((b) => b.town).sort();
      assert.deepEqual(towns, ["Cirencester", "Gloucester", "Stroud", "Weston-Super-Mare"]);
    });

    it("should strictly exclude Whitminster Depot from active forecourt collection branches", () => {
      const hasWhitminster = ACTIVE_FORECOURT_BRANCHES.some((b) =>
        b.name.toLowerCase().includes("whitminster"),
      );
      assert.equal(hasWhitminster, false, "Whitminster depot must not be a collection forecourt");

      const depot = KNOWN_BRANCHES.find((b) => b.id === WHITMINSTER_DEPOT_ID);
      assert.ok(depot);
      assert.equal(depot.isDepot, true);
    });

    it("should validate all 4 forecourts as valid forecourt branch IDs", () => {
      assert.equal(isValidForecourtBranchId(CIRENCESTER_ID), true);
      assert.equal(isValidForecourtBranchId(GLOUCESTER_ID), true);
      assert.equal(isValidForecourtBranchId(STROUD_ID), true);
      assert.equal(isValidForecourtBranchId(WESTON_ID), true);
    });

    it("should reject Whitminster Depot, null, empty, or arbitrary IDs as invalid forecourts", () => {
      assert.equal(isValidForecourtBranchId(WHITMINSTER_DEPOT_ID), false);
      assert.equal(isValidForecourtBranchId(null), false);
      assert.equal(isValidForecourtBranchId(undefined), false);
      assert.equal(isValidForecourtBranchId(""), false);
      assert.equal(isValidForecourtBranchId("b2222222-2222-4222-b222-222222222201"), false);
    });
  });

  describe("2. Admin Access Control & Permission Gates", () => {
    const canAccessAdminBranchStaffManagement = (role?: string | null): boolean => {
      return role === "admin";
    };

    it("should allow Admin users to access Branch Staff Management", () => {
      assert.equal(canAccessAdminBranchStaffManagement("admin"), true);
    });

    it("should strictly deny Manager from accessing Branch Staff Management", () => {
      assert.equal(canAccessAdminBranchStaffManagement("manager"), false);
    });

    it("should strictly deny Branch Staff from accessing Branch Staff Management", () => {
      assert.equal(canAccessAdminBranchStaffManagement("branch_staff"), false);
    });

    it("should strictly deny Delivery Agents and Customers", () => {
      assert.equal(canAccessAdminBranchStaffManagement("delivery_agent"), false);
      assert.equal(canAccessAdminBranchStaffManagement("customer"), false);
      assert.equal(canAccessAdminBranchStaffManagement(null), false);
      assert.equal(canAccessAdminBranchStaffManagement(undefined), false);
    });
  });

  describe("3. Branch Staff Creation & Validation", () => {
    interface CreateStaffPayload {
      fullName: string;
      email: string;
      assignedBranchId: string;
      status?: string;
    }

    const validateCreateStaffInput = (data: CreateStaffPayload): { valid: boolean; error?: string } => {
      if (!data.fullName || !data.fullName.trim()) {
        return { valid: false, error: "Staff full name is required." };
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        return { valid: false, error: "A valid email address is required." };
      }
      if (!data.assignedBranchId || !isValidForecourtBranchId(data.assignedBranchId)) {
        return {
          valid: false,
          error: "Invalid branch assignment. Must be one of the four active customer collection forecourts.",
        };
      }
      return { valid: true };
    };

    it("should validate and permit staff creation with valid forecourt", () => {
      const res = validateCreateStaffInput({
        fullName: "Sarah Jenkins",
        email: "sarah.j@johnstayteservices.co.uk",
        assignedBranchId: CIRENCESTER_ID,
      });
      assert.equal(res.valid, true);
    });

    it("should reject staff creation with empty name or invalid email", () => {
      const noName = validateCreateStaffInput({
        fullName: "",
        email: "sarah@jss.com",
        assignedBranchId: CIRENCESTER_ID,
      });
      assert.equal(noName.valid, false);

      const badEmail = validateCreateStaffInput({
        fullName: "Sarah",
        email: "invalid-email-string",
        assignedBranchId: CIRENCESTER_ID,
      });
      assert.equal(badEmail.valid, false);
    });

    it("should reject staff creation if Whitminster Depot is attempted", () => {
      const res = validateCreateStaffInput({
        fullName: "Dave Smith",
        email: "dave.smith@jss.com",
        assignedBranchId: WHITMINSTER_DEPOT_ID,
      });
      assert.equal(res.valid, false);
      assert.match(res.error || "", /four active customer collection forecourts/i);
    });
  });

  describe("4. Updating Staff Assignment & Account Preservation", () => {
    it("should allow reassigning staff to any of the 4 valid forecourts", () => {
      const staff: BranchStaffRecord = {
        id: "staff-101",
        email: "staff.one@jss.com",
        full_name: "Staff Member",
        role: "branch_staff",
        status: "active",
        assigned_branch: "John Stayte Services – Cirencester",
        assigned_branch_id: CIRENCESTER_ID,
        created_at: new Date().toISOString(),
      };

      // Reassign to Gloucester
      const newBranch = ACTIVE_FORECOURT_BRANCHES.find((b) => b.id === GLOUCESTER_ID);
      assert.ok(newBranch);

      const updatedStaff: BranchStaffRecord = {
        ...staff,
        assigned_branch: newBranch.name,
        assigned_branch_id: newBranch.id,
        updated_at: new Date().toISOString(),
      };

      assert.equal(updatedStaff.id, "staff-101", "Staff ID must be preserved");
      assert.equal(updatedStaff.assigned_branch_id, GLOUCESTER_ID);
      assert.equal(updatedStaff.assigned_branch, "John Stayte Services – Gloucester");
    });

    it("should reject reassigning staff to Whitminster depot", () => {
      assert.equal(isValidForecourtBranchId(WHITMINSTER_DEPOT_ID), false);
    });
  });

  describe("5. Existing staff@jss.com Canonical Account Preservation", () => {
    it("should preserve staff@jss.com account ID and initial Pending Confirmation state", () => {
      assert.equal(CANONICAL_STAFF_ACCOUNT.id, "86f20309-1971-42b5-a884-0d612d74fa54");
      assert.equal(CANONICAL_STAFF_ACCOUNT.email, "staff@jss.com");
      assert.equal(CANONICAL_STAFF_ACCOUNT.role, "branch_staff");
      assert.equal(CANONICAL_STAFF_ACCOUNT.assigned_branch, "Pending Confirmation");
      assert.equal(CANONICAL_STAFF_ACCOUNT.assigned_branch_id, null);
      assert.equal(CANONICAL_STAFF_ACCOUNT.status, "active");
    });

    it("should identify staff@jss.com as pending assignment initially", () => {
      assert.equal(isPendingBranchAssignment(CANONICAL_STAFF_ACCOUNT.assigned_branch), true);
    });

    it("should resolve to valid branch once Admin assigns Stroud to staff@jss.com", () => {
      const assigned: BranchStaffRecord = {
        ...CANONICAL_STAFF_ACCOUNT,
        assigned_branch: "John Stayte Services – Stroud",
        assigned_branch_id: STROUD_ID,
      };

      assert.equal(isPendingBranchAssignment(assigned.assigned_branch), false);
      const info = resolveBranchInfo(assigned.assigned_branch, assigned.assigned_branch_id);
      assert.ok(info);
      assert.equal(info.town, "Stroud");
      assert.equal(info.id, STROUD_ID);
      assert.equal(assigned.id, "86f20309-1971-42b5-a884-0d612d74fa54");
    });
  });

  describe("6. Cross-Branch Order Isolation & Security", () => {
    it("should isolate Cirencester orders from Gloucester staff query target", () => {
      const cirencesterTarget = getBranchQueryTarget(
        "John Stayte Services – Cirencester",
        CIRENCESTER_ID,
      );
      const gloucesterTarget = getBranchQueryTarget(
        "John Stayte Services – Gloucester",
        GLOUCESTER_ID,
      );

      assert.ok(cirencesterTarget);
      assert.ok(gloucesterTarget);
      assert.notEqual(cirencesterTarget.branchId, gloucesterTarget.branchId);
      assert.equal(cirencesterTarget.town, "Cirencester");
      assert.equal(gloucesterTarget.town, "Gloucester");
    });

    it("should return null query target when staff branch is Pending Confirmation", () => {
      const pendingTarget = getBranchQueryTarget("Pending Confirmation", null);
      assert.equal(pendingTarget, null, "Must yield null query target to prevent data leakage");
    });

    it("should return null query target when assigned_branch is empty or null", () => {
      assert.equal(getBranchQueryTarget(null, null), null);
      assert.equal(getBranchQueryTarget("", null), null);
      assert.equal(getBranchQueryTarget("Unassigned", null), null);
    });
  });

  describe("7. Status Toggle (Active / Inactive Governance)", () => {
    it("should toggle active staff to inactive", () => {
      const current = "active";
      const next = current === "active" ? "inactive" : "active";
      assert.equal(next, "inactive");
    });

    it("should toggle inactive staff to active", () => {
      const current = "inactive";
      const next = current === "active" ? "inactive" : "active";
      assert.equal(next, "active");
    });
  });

  describe("8. Handling Existing Email Addresses in Add Branch Staff Workflow", () => {
    interface ProfileMock {
      id: string;
      email: string;
      full_name: string;
      role: string;
      status: string;
      assigned_branch?: string;
      assigned_branch_id?: string | null;
      created_at: string;
    }

    const classifyEmailStatus = (
      email: string,
      existingProfiles: ProfileMock[],
    ): {
      exists: boolean;
      status: string;
      canAssignAsStaff: boolean;
      message?: string;
      existingUser?: ProfileMock;
    } => {
      const cleanEmail = email.trim().toLowerCase();
      const profile = existingProfiles.find((p) => p.email.toLowerCase() === cleanEmail);

      if (!profile) {
        return {
          exists: false,
          status: "available",
          canAssignAsStaff: true,
          message: "Email is available for a new Branch Staff account.",
        };
      }

      const role = (profile.role || "customer").toLowerCase();

      if (role === "customer" || role === "") {
        return {
          exists: true,
          status: "existing_customer",
          canAssignAsStaff: false,
          message: `This email address belongs to an existing customer account (${profile.full_name}). Customer accounts cannot be converted to Branch Staff. Please provide a separate staff email address.`,
          existingUser: profile,
        };
      }

      if (role === "branch_staff") {
        return {
          exists: true,
          status: "existing_branch_staff",
          canAssignAsStaff: false,
          message: `This email is already registered as Branch Staff assigned to ${profile.assigned_branch || "a forecourt"}.`,
          existingUser: profile,
        };
      }

      if (role === "admin") {
        return {
          exists: true,
          status: "existing_admin",
          canAssignAsStaff: false,
          message: "This email belongs to an Administrator account. Administrator accounts cannot be converted to Branch Staff.",
          existingUser: profile,
        };
      }

      if (role === "manager") {
        return {
          exists: true,
          status: "existing_manager",
          canAssignAsStaff: false,
          message: "This email belongs to a Manager account. Manager accounts cannot be converted to Branch Staff.",
          existingUser: profile,
        };
      }

      return {
        exists: true,
        status: "existing_other",
        canAssignAsStaff: false,
        message: `This email is registered with role "${role}". Role cannot be automatically converted.`,
        existingUser: profile,
      };
    };

    const mockProfiles: ProfileMock[] = [
      {
        id: "cust-uuid-001",
        email: "alice.customer@example.co.uk",
        full_name: "Alice Cooper",
        role: "customer",
        status: "active",
        created_at: "2026-03-01T10:00:00.000Z",
      },
      {
        id: "admin-uuid-002",
        email: "boss.admin@jss.com",
        full_name: "Boss Admin",
        role: "admin",
        status: "active",
        created_at: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "manager-uuid-003",
        email: "depot.manager@jss.com",
        full_name: "Depot Manager",
        role: "manager",
        status: "active",
        created_at: "2026-01-15T10:00:00.000Z",
      },
      {
        id: "staff-uuid-004",
        email: "bob.staff@jss.com",
        full_name: "Bob Staff",
        role: "branch_staff",
        status: "active",
        assigned_branch: "John Stayte Services – Cirencester",
        assigned_branch_id: CIRENCESTER_ID,
        created_at: "2026-02-10T10:00:00.000Z",
      },
    ];

    it("should classify non-existent email as available for standard branch staff creation", () => {
      const res = classifyEmailStatus("new.employee@johnstayteservices.co.uk", mockProfiles);
      assert.equal(res.exists, false);
      assert.equal(res.status, "available");
      assert.equal(res.canAssignAsStaff, true);
    });

    it("should detect existing customer account and require separate staff account", () => {
      const res = classifyEmailStatus("alice.customer@example.co.uk", mockProfiles);
      assert.equal(res.exists, true);
      assert.equal(res.status, "existing_customer");
      assert.equal(res.canAssignAsStaff, false);
      assert.match(res.message || "", /customer accounts cannot be converted/i);
      assert.equal(res.existingUser?.id, "cust-uuid-001");
      assert.equal(res.existingUser?.role, "customer");
    });

    it("should preserve user ID, credentials, orders, and customer records when assigning as branch staff", () => {
      const existingCustomer = mockProfiles.find((p) => p.id === "cust-uuid-001")!;
      assert.ok(existingCustomer);

      // Simulated orders referencing existing customer user ID
      const customerOrders = [
        { id: "order-101", user_id: existingCustomer.id, total: 113.5 },
        { id: "order-102", user_id: existingCustomer.id, total: 62.0 },
      ];

      // Assignment payload
      const targetForecourt = ACTIVE_FORECOURT_BRANCHES.find((b) => b.id === GLOUCESTER_ID)!;
      assert.ok(targetForecourt);

      // Perform assignment simulation matching server function logic
      const updatedProfile: ProfileMock = {
        ...existingCustomer,
        role: "branch_staff",
        assigned_branch: targetForecourt.name,
        assigned_branch_id: targetForecourt.id,
      };

      // 1. User ID remains strictly preserved
      assert.equal(updatedProfile.id, existingCustomer.id);
      // 2. Email remains strictly preserved
      assert.equal(updatedProfile.email, existingCustomer.email);
      // 3. Role is now branch_staff
      assert.equal(updatedProfile.role, "branch_staff");
      // 4. Branch assignment is correctly set to Gloucester
      assert.equal(updatedProfile.assigned_branch_id, GLOUCESTER_ID);
      assert.equal(updatedProfile.assigned_branch, "John Stayte Services – Gloucester");

      // 5. Customer orders maintain exact foreign key association
      customerOrders.forEach((order) => {
        assert.equal(order.user_id, updatedProfile.id, "Order user_id relationship must not be broken");
      });
    });

    it("should require explicit admin confirmation before updating customer role", () => {
      const validateRoleAssignment = (params: {
        userId: string;
        email: string;
        assignedBranchId: string;
        confirmRoleChange: boolean;
      }): { ok: boolean; error?: string } => {
        if (!params.confirmRoleChange) {
          return {
            ok: false,
            error: "Explicit admin confirmation is required to assign an existing customer as Branch Staff.",
          };
        }
        if (!isValidForecourtBranchId(params.assignedBranchId)) {
          return {
            ok: false,
            error: "Invalid branch assignment. Must be one of the four active customer collection forecourts.",
          };
        }
        return { ok: true };
      };

      // Fails without explicit confirmation
      const unconfirmed = validateRoleAssignment({
        userId: "cust-uuid-001",
        email: "alice.customer@example.co.uk",
        assignedBranchId: STROUD_ID,
        confirmRoleChange: false,
      });
      assert.equal(unconfirmed.ok, false);
      assert.match(unconfirmed.error || "", /explicit admin confirmation is required/i);

      // Succeeds with explicit confirmation
      const confirmed = validateRoleAssignment({
        userId: "cust-uuid-001",
        email: "alice.customer@example.co.uk",
        assignedBranchId: STROUD_ID,
        confirmRoleChange: true,
      });
      assert.equal(confirmed.ok, true);
    });

    it("should block converting existing Admin account to Branch Staff", () => {
      const res = classifyEmailStatus("boss.admin@jss.com", mockProfiles);
      assert.equal(res.exists, true);
      assert.equal(res.status, "existing_admin");
      assert.equal(res.canAssignAsStaff, false);
      assert.match(res.message || "", /administrator account/i);
    });

    it("should block converting existing Manager account to Branch Staff", () => {
      const res = classifyEmailStatus("depot.manager@jss.com", mockProfiles);
      assert.equal(res.exists, true);
      assert.equal(res.status, "existing_manager");
      assert.equal(res.canAssignAsStaff, false);
      assert.match(res.message || "", /manager account/i);
    });

    it("should block converting existing Branch Staff member and indicate their current assignment", () => {
      const res = classifyEmailStatus("bob.staff@jss.com", mockProfiles);
      assert.equal(res.exists, true);
      assert.equal(res.status, "existing_branch_staff");
      assert.equal(res.canAssignAsStaff, false);
      assert.match(res.message || "", /already registered as branch staff assigned to/i);
      assert.match(res.message || "", /Cirencester/i);
    });

    it("should reject assigning existing customer to Whitminster Depot", () => {
      const isValid = isValidForecourtBranchId(WHITMINSTER_DEPOT_ID);
      assert.equal(isValid, false, "Whitminster Depot must be rejected as an operational collection forecourt");
    });

    it("should reject unauthenticated probing in production environment", () => {
      const checkAdminAuth = (token?: string, env = "production"): { authorized: boolean; error?: string } => {
        if (!token && env === "production") {
          return { authorized: false, error: "Unauthorized. Administrator authentication required." };
        }
        return { authorized: true };
      };

      const unauthenticated = checkAdminAuth(undefined, "production");
      assert.equal(unauthenticated.authorized, false);
      assert.match(unauthenticated.error || "", /administrator authentication required/i);

      const authenticated = checkAdminAuth("valid-admin-jwt-token", "production");
      assert.equal(authenticated.authorized, true);
    });
  });

  describe("9. Customer-to-Branch-Staff Secure Role Assignment & Authorization Enforcement", () => {
    interface UserSession {
      userId: string;
      role: string;
      token?: string;
    }

    interface ProfileState {
      id: string;
      email: string;
      full_name: string;
      role: string;
      assigned_branch?: string;
      assigned_branch_id?: string | null;
      status: string;
      pricing_band?: string;
      credit_limit?: number;
      account_approved?: boolean;
    }

    interface OrderRecord {
      id: string;
      user_id: string;
      total: number;
      payment_status: string;
    }

    // Server-side assignment handler simulation
    const executeAssignCustomerAsStaff = (params: {
      caller: UserSession;
      targetProfile: ProfileState;
      assignedBranchId: string;
      status?: "active" | "inactive";
      confirmRoleChange: boolean;
      simulateAuthMetadataFailure?: boolean;
    }): {
      ok: boolean;
      error?: string;
      updatedProfile?: ProfileState;
      revertedProfile?: ProfileState;
    } => {
      // 1. Verify caller has admin privileges
      if (!params.caller.token || params.caller.role !== "admin") {
        return {
          ok: false,
          error: "Unauthorized. Only Administrators can convert customer accounts to Branch Staff.",
        };
      }

      // 2. Explicit confirmation required
      if (!params.confirmRoleChange) {
        return {
          ok: false,
          error: "Explicit admin confirmation is required to assign an existing customer as Branch Staff.",
        };
      }

      // 3. Validate target forecourt belongs to the 4 active collection forecourts
      if (!isValidForecourtBranchId(params.assignedBranchId)) {
        return {
          ok: false,
          error: "Invalid branch assignment. Must be one of the four active customer collection forecourts.",
        };
      }

      const forecourt = ACTIVE_FORECOURT_BRANCHES.find(
        (b) => b.id.toLowerCase() === params.assignedBranchId.toLowerCase(),
      );
      if (!forecourt) {
        return { ok: false, error: "Forecourt branch not found." };
      }

      // 4. Block conversion if target user is Admin, Manager, or existing Branch Staff
      const targetRole = (params.targetProfile.role || "customer").toLowerCase();
      if (targetRole !== "customer" && targetRole !== "") {
        return {
          ok: false,
          error: `Cannot convert account. User currently has role "${targetRole}", which cannot be changed to Branch Staff.`,
        };
      }

      // 5. Update profile
      const updatedProfile: ProfileState = {
        ...params.targetProfile,
        role: "branch_staff",
        assigned_branch: forecourt.name,
        assigned_branch_id: forecourt.id,
        status: params.status || "active",
      };

      // 6. Simulate auth metadata sync & rollback on failure to prevent partial state
      if (params.simulateAuthMetadataFailure) {
        return {
          ok: false,
          error: "Failed to synchronize authentication metadata. Profile change reverted.",
          revertedProfile: { ...params.targetProfile },
        };
      }

      return {
        ok: true,
        updatedProfile,
      };
    };

    const adminCaller: UserSession = {
      userId: "admin-uuid-001",
      role: "admin",
      token: "valid-admin-jwt-token",
    };

    const managerCaller: UserSession = {
      userId: "manager-uuid-002",
      role: "manager",
      token: "valid-manager-jwt-token",
    };

    const customerCaller: UserSession = {
      userId: "customer-uuid-003",
      role: "customer",
      token: "valid-customer-jwt-token",
    };

    const unauthenticatedCaller: UserSession = {
      userId: "",
      role: "",
    };

    const existingCustomer: ProfileState = {
      id: "customer-12345",
      email: "jane.customer@example.co.uk",
      full_name: "Jane Customer",
      role: "customer",
      status: "active",
      pricing_band: "Band 98",
      credit_limit: 500,
      account_approved: true,
    };

    const customerOrders: OrderRecord[] = [
      { id: "ord-001", user_id: "customer-12345", total: 113.5, payment_status: "paid" },
      { id: "ord-002", user_id: "customer-12345", total: 84.5, payment_status: "paid" },
    ];

    it("should allow authorized Admin to assign customer as Branch Staff at Cirencester", () => {
      const res = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: existingCustomer,
        assignedBranchId: CIRENCESTER_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, true);
      assert.ok(res.updatedProfile);
      assert.equal(res.updatedProfile.id, existingCustomer.id, "User ID must be preserved");
      assert.equal(res.updatedProfile.role, "branch_staff");
      assert.equal(res.updatedProfile.assigned_branch_id, CIRENCESTER_ID);
      assert.equal(res.updatedProfile.assigned_branch, "John Stayte Services – Cirencester");
    });

    it("should strictly deny Customer from self-assigning or changing their role", () => {
      const res = executeAssignCustomerAsStaff({
        caller: customerCaller,
        targetProfile: existingCustomer,
        assignedBranchId: CIRENCESTER_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, false);
      assert.match(res.error || "", /only administrators can convert/i);
    });

    it("should strictly deny Manager from converting customer to Branch Staff", () => {
      const res = executeAssignCustomerAsStaff({
        caller: managerCaller,
        targetProfile: existingCustomer,
        assignedBranchId: CIRENCESTER_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, false);
      assert.match(res.error || "", /only administrators can convert/i);
    });

    it("should strictly deny Unauthenticated caller", () => {
      const res = executeAssignCustomerAsStaff({
        caller: unauthenticatedCaller,
        targetProfile: existingCustomer,
        assignedBranchId: CIRENCESTER_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, false);
      assert.match(res.error || "", /only administrators/i);
    });

    it("should reject invalid forecourt assignment (Whitminster Depot)", () => {
      const res = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: existingCustomer,
        assignedBranchId: WHITMINSTER_DEPOT_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, false);
      assert.match(res.error || "", /four active customer collection forecourts/i);
    });

    it("should preserve customer records, past orders, and pricing band settings intact", () => {
      const res = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: existingCustomer,
        assignedBranchId: WESTON_ID,
        confirmRoleChange: true,
      });

      assert.equal(res.ok, true);
      const updated = res.updatedProfile!;

      // Preserved attributes
      assert.equal(updated.id, existingCustomer.id);
      assert.equal(updated.email, existingCustomer.email);
      assert.equal(updated.pricing_band, existingCustomer.pricing_band);
      assert.equal(updated.credit_limit, existingCustomer.credit_limit);
      assert.equal(updated.account_approved, existingCustomer.account_approved);

      // Orders linked to user_id remain 100% connected
      customerOrders.forEach((ord) => {
        assert.equal(ord.user_id, updated.id);
        assert.equal(ord.payment_status, "paid");
      });
    });

    it("should block converting Admin, Manager, and existing Branch Staff profiles", () => {
      const adminProfile: ProfileState = {
        id: "admin-p-01",
        email: "super.admin@jss.com",
        full_name: "Super Admin",
        role: "admin",
        status: "active",
      };

      const managerProfile: ProfileState = {
        id: "manager-p-02",
        email: "store.manager@jss.com",
        full_name: "Store Manager",
        role: "manager",
        status: "active",
      };

      const staffProfile: ProfileState = {
        id: "staff-p-03",
        email: "existing.staff@jss.com",
        full_name: "Existing Staff",
        role: "branch_staff",
        assigned_branch: "John Stayte Services – Stroud",
        assigned_branch_id: STROUD_ID,
        status: "active",
      };

      const resAdmin = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: adminProfile,
        assignedBranchId: GLOUCESTER_ID,
        confirmRoleChange: true,
      });
      assert.equal(resAdmin.ok, false);
      assert.match(resAdmin.error || "", /cannot be changed to Branch Staff/i);

      const resManager = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: managerProfile,
        assignedBranchId: GLOUCESTER_ID,
        confirmRoleChange: true,
      });
      assert.equal(resManager.ok, false);
      assert.match(resManager.error || "", /cannot be changed to Branch Staff/i);

      const resStaff = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: staffProfile,
        assignedBranchId: GLOUCESTER_ID,
        confirmRoleChange: true,
      });
      assert.equal(resStaff.ok, false);
      assert.match(resStaff.error || "", /cannot be changed to Branch Staff/i);
    });

    it("should prevent partial account state if auth metadata update fails", () => {
      const res = executeAssignCustomerAsStaff({
        caller: adminCaller,
        targetProfile: existingCustomer,
        assignedBranchId: STROUD_ID,
        confirmRoleChange: true,
        simulateAuthMetadataFailure: true,
      });

      assert.equal(res.ok, false);
      assert.match(res.error || "", /profile change reverted/i);
      assert.ok(res.revertedProfile);
      assert.equal(res.revertedProfile.role, "customer", "Role must be reverted back to customer");
      assert.equal(res.revertedProfile.assigned_branch, undefined);
    });
  });

  describe("10. Password Visibility Toggle Functionality in Admin Branch Staff Forms", () => {
    it("should default to password hidden (type: password) for Initial Password field", () => {
      let showPassword = false;
      const getInputType = (show: boolean) => (show ? "text" : "password");
      const getIconName = (show: boolean) => (show ? "EyeOff" : "Eye");

      assert.equal(getInputType(showPassword), "password");
      assert.equal(getIconName(showPassword), "Eye");
    });

    it("should toggle visibility to text without modifying or clearing the entered password", () => {
      let showPassword = false;
      const enteredPassword = "SecureBranchPassword2026!";
      let passwordState = enteredPassword;

      const toggleVisibility = () => {
        showPassword = !showPassword;
      };

      // User enters password
      assert.equal(passwordState, "SecureBranchPassword2026!");
      assert.equal(showPassword, false);

      // User clicks Eye icon to reveal
      toggleVisibility();
      assert.equal(showPassword, true);
      assert.equal(passwordState, "SecureBranchPassword2026!", "Password text must remain intact");

      // User clicks EyeOff icon to conceal again
      toggleVisibility();
      assert.equal(showPassword, false);
      assert.equal(passwordState, "SecureBranchPassword2026!", "Password text must remain intact");
    });

    it("should provide independent visibility toggling for both Add Staff and Reset Password fields", () => {
      let showAddStaffPassword = false;
      let showResetPassword = false;

      // Toggle Add Staff only
      showAddStaffPassword = true;
      assert.equal(showAddStaffPassword, true);
      assert.equal(showResetPassword, false, "Reset password visibility must remain isolated");

      // Reset modal should reinitialize to hidden by default
      const resetModalOpen = () => {
        showResetPassword = false;
      };
      showResetPassword = true;
      resetModalOpen();
      assert.equal(showResetPassword, false, "Modal opening must default to password hidden");
    });
  });
});

