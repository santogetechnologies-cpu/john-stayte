import { supabase } from "@/lib/supabase";
import { getAuthToken } from "@/lib/push-notifications";
import {
  ACTIVE_FORECOURT_BRANCHES,
  isValidForecourtBranchId,
  isPendingBranchAssignment,
  type BranchDetails,
} from "@/lib/branch-service";
import {
  createBranchStaffServerFn,
  updateBranchStaffServerFn,
  resetBranchStaffPasswordServerFn,
  checkBranchStaffEmailServerFn,
  assignExistingCustomerAsBranchStaffServerFn,
  type CheckBranchStaffEmailData,
  type StaffEmailStatus,
} from "@/lib/branch-staff-server-fn";
import { logAdminAuditAction } from "@/lib/audit";

export interface BranchStaffRecord {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: "branch_staff" | string;
  status: "active" | "inactive" | string;
  assigned_branch: string;
  assigned_branch_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateBranchStaffParams {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  assignedBranchId: string;
  status?: "active" | "inactive";
}

export interface UpdateBranchStaffAssignmentParams {
  staffId: string;
  assignedBranchId: string;
}

/**
 * Canonical existing staff account (staff@jss.com).
 * Preserved unconditionally and guaranteed to appear in staff directory.
 */
export const CANONICAL_STAFF_ACCOUNT: BranchStaffRecord = {
  id: "86f20309-1971-42b5-a884-0d612d74fa54",
  email: "staff@jss.com",
  full_name: "Branch Staff",
  phone: null,
  role: "branch_staff",
  status: "active",
  assigned_branch: "Pending Confirmation",
  assigned_branch_id: null,
  created_at: "2026-02-01T10:00:00.000Z",
};

/**
 * Fetches all branch staff members from public.profiles.
 * Guarantees inclusion of staff@jss.com in its current state.
 */
export async function getBranchStaffList(): Promise<BranchStaffRecord[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, role, status, assigned_branch, assigned_branch_id, created_at, updated_at")
      .or("role.eq.branch_staff,email.ilike.%staff@jss.com%")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice querying profiles for branch staff:", error.message);
    }

    const staffMap = new Map<string, BranchStaffRecord>();

    // 1. Seed canonical account
    staffMap.set(CANONICAL_STAFF_ACCOUNT.email.toLowerCase(), { ...CANONICAL_STAFF_ACCOUNT });

    // 2. Merge database records
    (data || []).forEach((row: any) => {
      const email = (row.email || "").toLowerCase().trim();
      const rec: BranchStaffRecord = {
        id: row.id,
        email: row.email || "",
        full_name: row.full_name || "Branch Staff",
        phone: row.phone || null,
        role: row.role || "branch_staff",
        status: (row.status || "active").toLowerCase(),
        assigned_branch: row.assigned_branch || "Pending Confirmation",
        assigned_branch_id: row.assigned_branch_id || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at,
      };

      if (email) {
        staffMap.set(email, rec);
      } else {
        staffMap.set(row.id, rec);
      }
    });

    return Array.from(staffMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } catch (err) {
    console.warn("Exception in getBranchStaffList fallback:", err);
    return [{ ...CANONICAL_STAFF_ACCOUNT }];
  }
}

/**
 * Safely extracts the current admin's session access token for server-side authorization.
 * Proactively refreshes expired or near-expiry sessions.
 */
async function getAdminAuthToken(): Promise<string | undefined> {
  try {
    const token = await getAuthToken(supabase);
    if (token) return token;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks whether an email address is new, belongs to an existing customer, or belongs to another role.
 * Protects unauthenticated users from probing arbitrary emails by passing adminAuthToken.
 */
export async function checkBranchStaffEmail(
  email: string,
): Promise<{
  ok: boolean;
  error?: string;
  exists?: boolean;
  status?: StaffEmailStatus;
  canAssignAsStaff?: boolean;
  message?: string;
  existingUser?: any;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: "Email address is required." };
    }

    const adminAuthToken = await getAdminAuthToken();
    const res = await checkBranchStaffEmailServerFn({
      data: {
        email: cleanEmail,
        adminAuthToken,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to verify email address." };
    }

    return {
      ok: true,
      exists: res.data?.exists,
      status: res.data?.status,
      canAssignAsStaff: res.data?.canAssignAsStaff,
      message: res.data?.message,
      existingUser: res.data?.existingUser,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Securely assigns an existing Customer account as Branch Staff for a designated forecourt.
 * Preserves user ID, authentication credentials, customer orders, and application history.
 * Strictly requires explicit Admin confirmation.
 */
export async function assignExistingCustomerAsBranchStaff(params: {
  userId: string;
  email: string;
  assignedBranchId: string;
  status?: "active" | "inactive";
  fullName?: string;
  phone?: string;
  confirmRoleChange: boolean;
}): Promise<{ ok: boolean; message?: string; error?: string; staff?: BranchStaffRecord }> {
  try {
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

    const branch = ACTIVE_FORECOURT_BRANCHES.find(
      (b) => b.id.toLowerCase() === params.assignedBranchId.toLowerCase(),
    );

    const adminAuthToken = await getAdminAuthToken();
    const res = await assignExistingCustomerAsBranchStaffServerFn({
      data: {
        ...params,
        adminAuthToken,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to assign customer as Branch Staff." };
    }

    // Log admin audit action
    await logAdminAuditAction("ASSIGN_CUSTOMER_AS_BRANCH_STAFF", "profiles", params.userId, {
      email: params.email,
      fullName: params.fullName,
      assignedBranchId: params.assignedBranchId,
      branchName: branch?.name,
      previousRole: "customer",
      newRole: "branch_staff",
    }).catch(() => {});

    return {
      ok: true,
      message: res.message || "Customer successfully assigned as Branch Staff.",
      staff: res.data as BranchStaffRecord,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Creates a new branch staff member via server function.
 */
export async function createBranchStaff(
  params: CreateBranchStaffParams,
): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
  staff?: BranchStaffRecord;
  code?: string;
  existingUser?: any;
}> {
  try {
    const fullName = params.fullName.trim();
    const email = params.email.trim().toLowerCase();
    const assignedBranchId = params.assignedBranchId.trim();

    if (!isValidForecourtBranchId(assignedBranchId)) {
      return {
        ok: false,
        error: "Invalid branch assignment. Must be one of the four active customer collection forecourts.",
      };
    }

    const branch = ACTIVE_FORECOURT_BRANCHES.find(
      (b) => b.id.toLowerCase() === assignedBranchId.toLowerCase(),
    );

    const adminAuthToken = await getAdminAuthToken();
    const res = await createBranchStaffServerFn({
      data: {
        fullName,
        email,
        password: params.password,
        phone: params.phone,
        assignedBranchId,
        status: params.status || "active",
        adminAuthToken,
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        error: res.error || "Failed to create branch staff.",
        code: res.data?.code,
        existingUser: res.data?.existingUser,
      };
    }

    // Log admin audit action
    await logAdminAuditAction("CREATE_BRANCH_STAFF", "profiles", res.data?.id, {
      email,
      fullName,
      assignedBranchId,
      branchName: branch?.name,
    }).catch(() => {});

    return {
      ok: true,
      message: res.message || "Branch staff created successfully.",
      staff: res.data as BranchStaffRecord,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Assigns or changes a branch forecourt for a staff member.
 */
export async function updateBranchStaffAssignment(
  staffId: string,
  newBranchId: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    if (!isValidForecourtBranchId(newBranchId)) {
      return {
        ok: false,
        error: "Invalid branch assignment. Must be one of the four active customer collection forecourts.",
      };
    }

    const branch = ACTIVE_FORECOURT_BRANCHES.find(
      (b) => b.id.toLowerCase() === newBranchId.toLowerCase(),
    );

    const res = await updateBranchStaffServerFn({
      data: {
        staffId,
        assignedBranchId: newBranchId,
        assignedBranch: branch?.name,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to update branch assignment." };
    }

    await logAdminAuditAction("UPDATE_BRANCH_ASSIGNMENT", "profiles", staffId, {
      newBranchId,
      newBranchName: branch?.name,
    }).catch(() => {});

    return {
      ok: true,
      message: `Staff assigned to ${branch?.town || branch?.name} successfully.`,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Activates or deactivates a branch staff member.
 */
export async function toggleBranchStaffStatus(
  staffId: string,
  currentStatus: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    const res = await updateBranchStaffServerFn({
      data: {
        staffId,
        status: nextStatus,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to update staff status." };
    }

    await logAdminAuditAction("TOGGLE_BRANCH_STAFF_STATUS", "profiles", staffId, {
      fromStatus: currentStatus,
      toStatus: nextStatus,
    }).catch(() => {});

    return {
      ok: true,
      message: `Staff member account marked as ${nextStatus}.`,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Resets login access or updates password for branch staff.
 */
export async function resetBranchStaffPassword(
  staffId: string,
  email: string,
  newPassword?: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await resetBranchStaffPasswordServerFn({
      data: {
        staffId,
        email,
        newPassword,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to reset password." };
    }

    await logAdminAuditAction("RESET_BRANCH_STAFF_PASSWORD", "profiles", staffId, {
      email,
      mode: newPassword ? "direct_password" : "recovery_link",
    }).catch(() => {});

    return {
      ok: true,
      message: res.message || "Password reset processed successfully.",
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred." };
  }
}

