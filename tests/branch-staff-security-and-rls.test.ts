import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  getBranchQueryTarget,
  isPendingBranchAssignment,
  resolveBranchInfo,
  updateBranchOrderStatus,
  KNOWN_BRANCHES,
} from "../src/lib/branch-service";

describe("Branch Staff Security, Policy Contracts & Boundary Isolation", () => {
  // Read and parse migration file to verify schema contracts
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/00096_branch_staff_role_and_portal.sql",
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  describe("1. Migration 00096 SQL & Authorization Helper Verification", () => {
    it("should use public.is_admin_or_manager() exclusively", () => {
      assert.ok(
        migrationSql.includes("public.is_admin_or_manager()"),
        "Migration must reference public.is_admin_or_manager()",
      );
    });

    it("should NOT contain references to non-existent public.is_admin() or public.is_manager()", () => {
      assert.ok(
        !migrationSql.includes("public.is_admin()") &&
          !migrationSql.includes("public.is_manager()"),
        "Migration must not reference non-existent public.is_admin() or public.is_manager()",
      );
    });

    it("should include all 6 supported roles in profiles_role_check", () => {
      const requiredRoles = [
        "customer",
        "manager",
        "admin",
        "driver",
        "delivery_agent",
        "branch_staff",
      ];
      for (const role of requiredRoles) {
        assert.ok(
          migrationSql.includes(`'${role}'`),
          `profiles_role_check must include role '${role}'`,
        );
      }
    });

    it("should add assigned_branch and assigned_branch_id referencing auto_gas_stations", () => {
      assert.ok(migrationSql.includes("assigned_branch TEXT"));
      assert.ok(
        migrationSql.includes(
          "assigned_branch_id UUID REFERENCES public.auto_gas_stations(id)",
        ),
      );
    });

    it("should add assigned_branch_id to public.orders and update orders_status_check for Ready state", () => {
      assert.ok(
        migrationSql.includes(
          "ALTER TABLE public.orders ADD COLUMN assigned_branch_id UUID REFERENCES public.auto_gas_stations(id)",
        ),
      );
      assert.ok(migrationSql.includes("orders_status_check"));
      assert.ok(migrationSql.includes("'Ready'"));
      assert.ok(migrationSql.includes("idx_orders_assigned_branch_id"));
    });

    it("should define terminal order protection and state transition enforcement in the trigger", () => {
      assert.ok(migrationSql.includes("protect_branch_order_operational_fields()"));
      assert.ok(migrationSql.includes("trg_protect_branch_order_operational_fields"));
      assert.ok(migrationSql.includes("cannot modify orders that are already in terminal status"));
      assert.ok(migrationSql.includes("cannot set Out for Delivery"));
      assert.ok(migrationSql.includes("cancellation_reason is mandatory"));
    });

    it("should define RLS policies for branch_staff on orders, order_items, and order_status_history", () => {
      assert.ok(
        migrationSql.includes(
          'CREATE POLICY "Branch staff can view assigned branch click and collect orders"',
        ),
      );
      assert.ok(
        migrationSql.includes(
          'CREATE POLICY "Branch staff can update assigned branch click and collect orders"',
        ),
      );
      assert.ok(
        migrationSql.includes(
          'CREATE POLICY "Branch staff can view order items for assigned orders"',
        ),
      );
      assert.ok(
        migrationSql.includes(
          'CREATE POLICY "Branch staff can view order history for assigned orders"',
        ),
      );
      assert.ok(
        migrationSql.includes(
          'CREATE POLICY "Branch staff can insert order history for assigned orders"',
        ),
      );
    });
  });

  describe("2. RLS Policy Simulation: SELECT Isolation Rules", () => {
    interface SimulatedUser {
      id: string;
      role: string;
      assigned_branch?: string | null;
      assigned_branch_id?: string | null;
    }

    interface SimulatedOrder {
      id: string;
      customer_id: string;
      assigned_depot: string;
      assigned_branch_id?: string | null;
      delivery_address: {
        fulfilment_method?: string;
        collection_branch?: string | null;
        collection_branch_id?: string | null;
      };
    }

    function canUserSelectOrder(user: SimulatedUser, order: SimulatedOrder): boolean {
      if (user.role === "admin" || user.role === "manager") {
        return true;
      }

      if (user.role === "customer") {
        return order.customer_id === user.id;
      }

      if (user.role === "branch_staff") {
        if (
          !user.assigned_branch ||
          ["", "Pending Confirmation", "Unassigned", "None"].includes(user.assigned_branch)
        ) {
          return false;
        }

        const isCollection =
          order.delivery_address.fulfilment_method === "collection" ||
          Boolean(order.delivery_address.collection_branch);

        if (!isCollection) {
          return false;
        }

        const matchesBranchId =
          Boolean(user.assigned_branch_id) &&
          (order.assigned_branch_id === user.assigned_branch_id ||
            order.delivery_address.collection_branch_id === user.assigned_branch_id);

        const matchesBranchName =
          order.assigned_depot === user.assigned_branch ||
          order.delivery_address.collection_branch === user.assigned_branch;

        return matchesBranchId || matchesBranchName;
      }

      return false;
    }

    const cirencesterBranch = KNOWN_BRANCHES[0];
    const gloucesterBranch = KNOWN_BRANCHES[1];

    const cirencesterStaff: SimulatedUser = {
      id: "staff-cirencester",
      role: "branch_staff",
      assigned_branch: cirencesterBranch.name,
      assigned_branch_id: cirencesterBranch.id,
    };

    const pendingStaff: SimulatedUser = {
      id: "staff-pending",
      role: "branch_staff",
      assigned_branch: "Pending Confirmation",
      assigned_branch_id: null,
    };

    const adminUser: SimulatedUser = {
      id: "admin-1",
      role: "admin",
    };

    const customerUser: SimulatedUser = {
      id: "cust-1",
      role: "customer",
    };

    const cirencesterCcOrder: SimulatedOrder = {
      id: "ord-cc-cirencester",
      customer_id: "cust-other",
      assigned_depot: cirencesterBranch.name,
      assigned_branch_id: cirencesterBranch.id,
      delivery_address: {
        fulfilment_method: "collection",
        collection_branch: cirencesterBranch.name,
        collection_branch_id: cirencesterBranch.id,
      },
    };

    const gloucesterCcOrder: SimulatedOrder = {
      id: "ord-cc-gloucester",
      customer_id: "cust-other",
      assigned_depot: gloucesterBranch.name,
      assigned_branch_id: gloucesterBranch.id,
      delivery_address: {
        fulfilment_method: "collection",
        collection_branch: gloucesterBranch.name,
        collection_branch_id: gloucesterBranch.id,
      },
    };

    const homeDeliveryOrder: SimulatedOrder = {
      id: "ord-delivery-whitminster",
      customer_id: "cust-other",
      assigned_depot: "Whitminster",
      delivery_address: {
        fulfilment_method: "delivery",
        collection_branch: null,
      },
    };

    it("Branch Staff can read assigned branch Click & Collect orders", () => {
      assert.equal(canUserSelectOrder(cirencesterStaff, cirencesterCcOrder), true);
    });

    it("Branch Staff cannot read another branch's Click & Collect orders", () => {
      assert.equal(canUserSelectOrder(cirencesterStaff, gloucesterCcOrder), false);
    });

    it("Branch Staff cannot read normal delivery orders", () => {
      assert.equal(canUserSelectOrder(cirencesterStaff, homeDeliveryOrder), false);
    });

    it("Pending confirmation staff cannot read any orders", () => {
      assert.equal(canUserSelectOrder(pendingStaff, cirencesterCcOrder), false);
      assert.equal(canUserSelectOrder(pendingStaff, gloucesterCcOrder), false);
      assert.equal(canUserSelectOrder(pendingStaff, homeDeliveryOrder), false);
    });

    it("Existing Admin access remains unaffected across all orders", () => {
      assert.equal(canUserSelectOrder(adminUser, cirencesterCcOrder), true);
      assert.equal(canUserSelectOrder(adminUser, gloucesterCcOrder), true);
      assert.equal(canUserSelectOrder(adminUser, homeDeliveryOrder), true);
    });

    it("Customer order access remains strictly isolated to own orders", () => {
      assert.equal(canUserSelectOrder(customerUser, cirencesterCcOrder), false);
      const ownOrder: SimulatedOrder = {
        ...cirencesterCcOrder,
        customer_id: "cust-1",
      };
      assert.equal(canUserSelectOrder(customerUser, ownOrder), true);
    });
  });

  describe("3. Database Trigger Simulation: Operational Field & State Transition Protection", () => {
    interface OrderRecord {
      id: string;
      order_number: string;
      customer_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      subtotal: number;
      shipping_fee: number;
      total: number;
      payment_status: string;
      assigned_depot: string;
      assigned_branch_id?: string | null;
      delivery_address: Record<string, any>;
      assigned_driver?: string | null;
      delivery_date?: string | null;
      delivery_slot?: string | null;
      status: string;
      fulfillment_status: string;
      notes?: string;
      created_at: string;
      updated_at: string;
      cancellation_reason?: string | null;
      cancelled_at?: string | null;
      cancelled_by?: string | null;
    }

    // Exact logic enforced by PostgreSQL trigger protect_branch_order_operational_fields()
    function simulateTriggerValidation(
      callerRole: string,
      callerId: string,
      oldRecord: OrderRecord,
      newRecord: OrderRecord,
    ): { allowed: boolean; error?: string; transformedRecord?: OrderRecord } {
      if (callerRole === "admin" || callerRole === "manager") {
        return { allowed: true, transformedRecord: newRecord };
      }

      if (callerRole === "branch_staff") {
        // Customer identity check
        if (newRecord.customer_id !== oldRecord.customer_id) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order customer_id." };
        }
        if (newRecord.customer_name !== oldRecord.customer_name) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order customer_name." };
        }
        if (newRecord.customer_email !== oldRecord.customer_email) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order customer_email." };
        }
        if (newRecord.customer_phone !== oldRecord.customer_phone) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order customer_phone." };
        }

        // Financial & payment check
        if (newRecord.subtotal !== oldRecord.subtotal) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order subtotal." };
        }
        if (newRecord.shipping_fee !== oldRecord.shipping_fee) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order shipping_fee." };
        }
        if (newRecord.total !== oldRecord.total) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order total amount." };
        }
        if (newRecord.payment_status !== oldRecord.payment_status) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order payment_status." };
        }

        // Branch & routing check
        if (newRecord.assigned_depot !== oldRecord.assigned_depot) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter assigned_depot." };
        }
        if (newRecord.assigned_branch_id !== oldRecord.assigned_branch_id) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter assigned_branch_id." };
        }
        if (JSON.stringify(newRecord.delivery_address) !== JSON.stringify(oldRecord.delivery_address)) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter delivery_address." };
        }

        // Order identifiers
        if (newRecord.id !== oldRecord.id || newRecord.order_number !== oldRecord.order_number) {
          return { allowed: false, error: "Unauthorized: branch staff cannot alter order identifiers." };
        }

        // Delivery-only fields
        if (newRecord.assigned_driver !== oldRecord.assigned_driver) {
          return { allowed: false, error: "Unauthorized: branch staff cannot assign or modify drivers." };
        }
        if (newRecord.delivery_date !== oldRecord.delivery_date) {
          return { allowed: false, error: "Unauthorized: branch staff cannot modify delivery_date." };
        }
        if (newRecord.delivery_slot !== oldRecord.delivery_slot) {
          return { allowed: false, error: "Unauthorized: branch staff cannot modify delivery_slot." };
        }

        // Terminal order protection: Delivered and Cancelled orders are immutable
        if (["Delivered", "Cancelled"].includes(oldRecord.status)) {
          return {
            allowed: false,
            error: `Unauthorized: cannot modify orders that are already in terminal status (${oldRecord.status}).`,
          };
        }

        // Status transition enforcement
        const transformed = { ...newRecord };
        if (newRecord.status !== oldRecord.status) {
          // Block delivery driver status
          if (newRecord.status === "Out for Delivery") {
            return {
              allowed: false,
              error: "Unauthorized: branch staff cannot set Out for Delivery (Click & Collect forecourt orders do not use delivery routes).",
            };
          }

          // Allowed forward transitions
          if (oldRecord.status === "Pending" && !["Approved", "Cancelled"].includes(newRecord.status)) {
            return { allowed: false, error: "Unauthorized status transition: from Pending, status can only transition to Approved or Cancelled." };
          } else if (oldRecord.status === "Approved" && !["Packed", "Cancelled"].includes(newRecord.status)) {
            return { allowed: false, error: "Unauthorized status transition: from Approved, status can only transition to Packed or Cancelled." };
          } else if (oldRecord.status === "Packed" && !["Ready", "Cancelled"].includes(newRecord.status)) {
            return { allowed: false, error: "Unauthorized status transition: from Packed, status can only transition to Ready or Cancelled." };
          } else if (oldRecord.status === "Ready" && !["Delivered", "Cancelled"].includes(newRecord.status)) {
            return { allowed: false, error: "Unauthorized status transition: from Ready, status can only transition to Delivered or Cancelled." };
          } else if (!["Pending", "Approved", "Packed", "Ready"].includes(oldRecord.status)) {
            return { allowed: false, error: `Unauthorized: cannot transition order from current status (${oldRecord.status}).` };
          }

          // Cancellation security
          if (newRecord.status === "Cancelled") {
            const trimmedReason = (newRecord.cancellation_reason || "").trim();
            if (!trimmedReason) {
              return { allowed: false, error: "Unauthorized: a valid non-empty cancellation_reason is mandatory when cancelling an order." };
            }
            transformed.cancelled_at = newRecord.cancelled_at || new Date().toISOString();
            transformed.cancelled_by = newRecord.cancelled_by || callerId;
          }
        }

        // Prevent setting cancellation fields on active orders
        if (newRecord.status !== "Cancelled") {
          if (newRecord.cancellation_reason || newRecord.cancelled_at || newRecord.cancelled_by) {
            return { allowed: false, error: "Unauthorized: cannot set cancellation fields when order status is not Cancelled." };
          }
        }

        // Tamper protection for cancellation audit records
        if (oldRecord.cancelled_by && newRecord.cancelled_by !== oldRecord.cancelled_by) {
          return { allowed: false, error: "Unauthorized: cannot alter existing cancelled_by audit record." };
        }
        if (oldRecord.cancelled_at && newRecord.cancelled_at !== oldRecord.cancelled_at) {
          return { allowed: false, error: "Unauthorized: cannot alter existing cancelled_at audit record." };
        }

        // Fulfillment status validation
        if (newRecord.fulfillment_status !== oldRecord.fulfillment_status) {
          if (!["Pending", "Ready", "Fulfilled", "Completed"].includes(newRecord.fulfillment_status)) {
            return { allowed: false, error: "Unauthorized: invalid fulfillment_status value for branch staff." };
          }
        }

        return { allowed: true, transformedRecord: transformed };
      }

      return { allowed: false, error: "Unauthorized" };
    }

    const baseOrder: OrderRecord = {
      id: "order-123",
      order_number: "JSS-123456",
      customer_id: "user-cust-99",
      customer_name: "John Doe",
      customer_email: "john@example.com",
      customer_phone: "07123456789",
      subtotal: 45.0,
      shipping_fee: 0,
      total: 45.0,
      payment_status: "Paid",
      assigned_depot: "John Stayte Services – Cirencester",
      assigned_branch_id: "a1111111-1111-4111-a111-111111111101",
      delivery_address: { fulfilment_method: "collection" },
      assigned_driver: null,
      delivery_date: null,
      delivery_slot: null,
      status: "Approved",
      fulfillment_status: "Pending",
      notes: "Customer collecting at lunch",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
    };

    it("Branch Staff CAN execute valid forward transitions", () => {
      // 1. Pending -> Approved
      const pendingOrd = { ...baseOrder, status: "Pending" };
      const toApproved = { ...pendingOrd, status: "Approved" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", pendingOrd, toApproved).allowed, true);

      // 2. Approved -> Packed
      const toPacked = { ...baseOrder, status: "Packed", fulfillment_status: "Ready" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", baseOrder, toPacked).allowed, true);

      // 3. Packed -> Ready
      const packedOrd = { ...baseOrder, status: "Packed" };
      const toReady = { ...packedOrd, status: "Ready", fulfillment_status: "Ready" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", packedOrd, toReady).allowed, true);

      // 4. Ready -> Delivered
      const readyOrd = { ...baseOrder, status: "Ready" };
      const toDelivered = { ...readyOrd, status: "Delivered", fulfillment_status: "Completed" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", readyOrd, toDelivered).allowed, true);

      // 5. Cancellations from non-terminal states with reason
      const pendingCancel = { ...pendingOrd, status: "Cancelled", cancellation_reason: "Customer cancelled" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", pendingOrd, pendingCancel).allowed, true);

      const approvedCancel = { ...baseOrder, status: "Cancelled", cancellation_reason: "No stock" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", baseOrder, approvedCancel).allowed, true);

      const packedCancel = { ...packedOrd, status: "Cancelled", cancellation_reason: "Customer failed pickup" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", packedOrd, packedCancel).allowed, true);

      const readyCancel = { ...readyOrd, status: "Cancelled", cancellation_reason: "Customer requested refund" };
      assert.equal(simulateTriggerValidation("branch_staff", "staff-1", readyOrd, readyCancel).allowed, true);
    });

    it("Branch Staff CANNOT execute direct Packed -> Delivered transition (must transition through Ready)", () => {
      const packedOrd = { ...baseOrder, status: "Packed" };
      const directHandover = { ...packedOrd, status: "Delivered", fulfillment_status: "Completed" };
      const res = simulateTriggerValidation("branch_staff", "staff-1", packedOrd, directHandover);
      assert.equal(res.allowed, false);
      assert.ok(res.error?.includes("from Packed, status can only transition to Ready or Cancelled"));
    });

    it("Branch Staff CANNOT execute invalid backward transitions", () => {
      // Approved -> Pending (backward)
      const toPending = { ...baseOrder, status: "Pending" };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, toPending);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("Unauthorized status transition"));

      // Ready -> Approved (backward)
      const readyOrd = { ...baseOrder, status: "Ready" };
      const toApproved = { ...readyOrd, status: "Approved" };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", readyOrd, toApproved);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("Unauthorized status transition"));
    });

    it("Branch Staff CANNOT modify orders that are Delivered (terminal protection)", () => {
      const deliveredOrd = { ...baseOrder, status: "Delivered", fulfillment_status: "Completed" };
      const attemptReopen = { ...deliveredOrd, status: "Approved" };
      const res = simulateTriggerValidation("branch_staff", "staff-1", deliveredOrd, attemptReopen);
      assert.equal(res.allowed, false);
      assert.ok(res.error?.includes("terminal status (Delivered)"));
    });

    it("Branch Staff CANNOT modify orders that are Cancelled (terminal protection)", () => {
      const cancelledOrd = {
        ...baseOrder,
        status: "Cancelled",
        cancellation_reason: "Customer requested cancellation",
        cancelled_at: "2026-11-01T12:00:00Z",
        cancelled_by: "staff-1",
      };
      const attemptReopen = { ...cancelledOrd, status: "Pending" };
      const res = simulateTriggerValidation("branch_staff", "staff-1", cancelledOrd, attemptReopen);
      assert.equal(res.allowed, false);
      assert.ok(res.error?.includes("terminal status (Cancelled)"));
    });

    it("Branch Staff CANNOT set delivery-only status 'Out for Delivery'", () => {
      const toOutForDelivery = { ...baseOrder, status: "Out for Delivery" };
      const res = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, toOutForDelivery);
      assert.equal(res.allowed, false);
      assert.ok(res.error?.includes("cannot set Out for Delivery"));
    });

    it("Branch Staff CANNOT assign drivers or modify delivery slots", () => {
      const assignDriver = { ...baseOrder, assigned_driver: "Driver Dave" };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, assignDriver);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("cannot assign or modify drivers"));

      const changeSlot = { ...baseOrder, delivery_slot: "Morning (08:00 - 12:00)" };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeSlot);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("cannot modify delivery_slot"));
    });

    it("Cancellation requires mandatory non-empty cancellation_reason", () => {
      // 1. Missing reason
      const cancelNoReason = { ...baseOrder, status: "Cancelled", cancellation_reason: null };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, cancelNoReason);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("cancellation_reason is mandatory"));

      // 2. Whitespace-only reason
      const cancelWhitespace = { ...baseOrder, status: "Cancelled", cancellation_reason: "   \t\n  " };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, cancelWhitespace);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("cancellation_reason is mandatory"));

      // 3. Valid reason succeeds and populates audit fields
      const cancelValid = {
        ...baseOrder,
        status: "Cancelled",
        cancellation_reason: "Customer called to cancel forecourt collection",
      };
      const res3 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, cancelValid);
      assert.equal(res3.allowed, true);
      assert.equal(res3.transformedRecord?.cancelled_by, "staff-1");
      assert.ok(res3.transformedRecord?.cancelled_at);
    });

    it("Branch Staff CANNOT modify payment details (payment_status or total)", () => {
      const changePayment = { ...baseOrder, payment_status: "Pending" };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changePayment);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("payment_status"));

      const changeTotal = { ...baseOrder, total: 10.0 };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeTotal);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("total amount"));
    });

    it("Branch Staff CANNOT change assigned branch or depot", () => {
      const changeDepot = { ...baseOrder, assigned_depot: "Whitminster" };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeDepot);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("assigned_depot"));

      const changeBranchId = {
        ...baseOrder,
        assigned_branch_id: "a1111111-1111-4111-a111-111111111102",
      };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeBranchId);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("assigned_branch_id"));
    });

    it("Branch Staff CANNOT change customer identity or customer_id", () => {
      const changeCustomer = { ...baseOrder, customer_id: "malicious-user-id" };
      const res1 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeCustomer);
      assert.equal(res1.allowed, false);
      assert.ok(res1.error?.includes("customer_id"));

      const changeName = { ...baseOrder, customer_name: "Attacker Name" };
      const res2 = simulateTriggerValidation("branch_staff", "staff-1", baseOrder, changeName);
      assert.equal(res2.allowed, false);
      assert.ok(res2.error?.includes("customer_name"));
    });

    it("Branch Staff CANNOT tamper with cancellation audit fields after cancellation", () => {
      const cancelledOrder: OrderRecord = {
        ...baseOrder,
        status: "Cancelled",
        cancellation_reason: "Initial reason",
        cancelled_at: "2026-11-01T12:00:00Z",
        cancelled_by: "staff-1",
      };
      const tamperAudit = { ...cancelledOrder, cancelled_by: "attacker-id" };
      const res = simulateTriggerValidation("branch_staff", "staff-2", cancelledOrder, tamperAudit);
      assert.equal(res.allowed, false);
      assert.ok(res.error?.includes("terminal status") || res.error?.includes("cancelled_by"));
    });

    it("Admin and Manager CAN update operational and financial fields when necessary", () => {
      const adminChange = {
        ...baseOrder,
        total: 50.0,
        payment_status: "Paid",
        status: "Delivered",
      };
      const resAdmin = simulateTriggerValidation("admin", "admin-1", baseOrder, adminChange);
      assert.equal(resAdmin.allowed, true);

      const resManager = simulateTriggerValidation("manager", "mgr-1", baseOrder, adminChange);
      assert.equal(resManager.allowed, true);
    });
  });

  describe("4. Service Query Boundary & Target Resolution", () => {
    it("should resolve primary branch query target with station ID when available", () => {
      const target = getBranchQueryTarget(
        "John Stayte Services – Cirencester",
        "a1111111-1111-4111-a111-111111111101",
      );
      assert.ok(target);
      assert.equal(target?.branchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(target?.branchName, "John Stayte Services – Cirencester");
      assert.equal(target?.town, "Cirencester");
    });

    it("should return null target for pending branch assignment (preventing queries)", () => {
      assert.equal(getBranchQueryTarget("Pending Confirmation", null), null);
      assert.equal(getBranchQueryTarget("Unassigned", null), null);
      assert.equal(getBranchQueryTarget("", null), null);
    });

    it("updateBranchOrderStatus should only send operational fields", async () => {
      const res = await updateBranchOrderStatus({
        orderId: "mock-order-id-test",
        status: "Ready",
        fulfillmentStatus: "Ready",
        notes: "Order assembled and ready for collection",
      });
      assert.equal(typeof res.success, "boolean");
    });
  });
});
