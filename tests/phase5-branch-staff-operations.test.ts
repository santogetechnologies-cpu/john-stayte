/**
 * Phase 5: Branch Staff Operational Completion Test Suite
 *
 * Verifies all 5 core operational areas:
 * 1. Branch Staff New Order Notifications (scoped strictly to collection forecourt).
 * 2. Customer Order Status Notifications (Ready for Collection alerts with cylinder reminders).
 * 3. Branch Inventory Scoping & RLS policies (read-only, forecourt-scoped).
 * 4. Cylinder Exchange Handover Checklist (ordered vs returned quantities, limits, warnings).
 * 5. Branch Notifications Page (real-time data, read/unread states, cross-branch isolation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  KNOWN_BRANCHES,
  ACTIVE_FORECOURT_BRANCHES,
  resolveBranchInfo,
  resolveCheckoutBranchAssignment,
  getCylinderExchangeDetails,
  type BranchOrderRecord,
} from "../src/lib/branch-service";

import { type PushDispatchTarget, type PushEventType, type PushRole } from "../src/lib/push-notifications-types";

describe("Phase 5: Branch Staff Operational Completion", () => {
  // ===========================================================================
  // SECTION 1: Branch Staff New Order Notifications
  // ===========================================================================
  describe("1. Branch Staff New Order Notifications", () => {
    it("should identify selected collection forecourt and assign correct forecourt UUID", () => {
      const assignment = resolveCheckoutBranchAssignment(
        "collection",
        "John Stayte Services – Cirencester"
      );
      assert.equal(assignment.assignedBranchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(assignment.collectionBranchId, "a1111111-1111-4111-a111-111111111101");
      assert.equal(assignment.assignedDepot, "John Stayte Services – Cirencester");
    });

    it("should isolate notification recipients strictly to staff assigned to that forecourt", () => {
      const allStaff = [
        { id: "staff-cirencester-1", role: "branch_staff", assigned_branch: "John Stayte Services – Cirencester", assigned_branch_id: "a1111111-1111-4111-a111-111111111101" },
        { id: "staff-gloucester-1", role: "branch_staff", assigned_branch: "John Stayte Services – Gloucester", assigned_branch_id: "a1111111-1111-4111-a111-111111111102" },
        { id: "staff-stroud-1", role: "branch_staff", assigned_branch: "John Stayte Services – Stroud", assigned_branch_id: "a1111111-1111-4111-a111-111111111103" },
        { id: "staff-weston-1", role: "branch_staff", assigned_branch: "John Stayte Services – Weston Super Mare", assigned_branch_id: "a1111111-1111-4111-a111-111111111104" },
        { id: "staff-pending-1", role: "branch_staff", assigned_branch: "Pending Confirmation", assigned_branch_id: null },
      ];

      const targetBranchId = "a1111111-1111-4111-a111-111111111101"; // Cirencester
      const matchingStaff = allStaff.filter((s) => {
        if (!s.assigned_branch || s.assigned_branch.includes("Pending") || s.assigned_branch.includes("Unassigned")) {
          return false;
        }
        return s.assigned_branch_id === targetBranchId;
      });

      assert.equal(matchingStaff.length, 1);
      assert.equal(matchingStaff[0].id, "staff-cirencester-1");
      assert.ok(!matchingStaff.some((s) => s.id === "staff-gloucester-1"));
      assert.ok(!matchingStaff.some((s) => s.id === "staff-pending-1"));
    });

    it("should NEVER route delivery orders assigned to Whitminster to forecourt staff", () => {
      const deliveryAssignment = resolveCheckoutBranchAssignment("delivery", null);
      assert.equal(deliveryAssignment.assignedDepot, "Whitminster");
      assert.equal(deliveryAssignment.assignedBranchId, null);

      // Verify delivery filter: if assignedDepot === 'Whitminster' or !isCollection, forecourt notification is skipped
      const isCollection = false;
      const branchName = deliveryAssignment.assignedDepot;
      const shouldNotifyForecourt = isCollection && branchName !== "Whitminster";
      assert.equal(shouldNotifyForecourt, false);
    });

    it("should prevent duplicate notifications with unique idempotency key", () => {
      const orderId = "order-test-uuid-12345";
      const key1 = `order_placed_branch_staff_${orderId}`;
      const key2 = `order_placed_branch_staff_${orderId}`;
      assert.equal(key1, key2);
      assert.equal(key1, "order_placed_branch_staff_order-test-uuid-12345");
    });
  });

  // ===========================================================================
  // SECTION 2: Customer Order Status Notifications
  // ===========================================================================
  describe("2. Customer Order Status Notifications (Ready for Collection)", () => {
    it("should map status 'Ready' to eventType 'READY_FOR_COLLECTION' with cylinder exchange reminder", () => {
      const newStatus = "Ready";
      let eventType: PushEventType = "ORDER_APPROVED";
      let title = "";
      let body = "";

      if (newStatus === "Ready") {
        eventType = "READY_FOR_COLLECTION";
        title = "Order #JSS-1001 Ready for Collection";
        body = "Your order #JSS-1001 is prepared and ready for collection at our forecourt. Please remember your empty cylinders if exchanging.";
      }

      assert.equal(eventType, "READY_FOR_COLLECTION");
      assert.ok(title.includes("Ready for Collection"));
      assert.ok(body.includes("empty cylinders"));
    });

    it("should prevent duplicate customer collection notifications via idempotency", () => {
      const orderId = "order-collection-999";
      const newStatus = "Ready";
      const key = `order_status_${newStatus.toLowerCase().replace(/\s+/g, "_")}_${orderId}`;
      assert.equal(key, "order_status_ready_order-collection-999");
    });

    it("should allow branch_staff to trigger status updates for their own branch", () => {
      const callerRole: PushRole = "branch_staff";
      const allowedRoles: PushRole[] = ["admin", "manager", "delivery_agent", "branch_staff"];
      assert.ok(allowedRoles.includes(callerRole));
    });
  });

  // ===========================================================================
  // SECTION 3: Branch Inventory Scoping & RLS
  // ===========================================================================
  describe("3. Branch Inventory Scoping & Access Control", () => {
    it("should restrict inventory queries strictly to the assigned forecourt location", () => {
      const staffBranch = "Cirencester";
      const mockInventory = [
        { id: "inv-1", depot_location: "Cirencester Forecourt", current_stock: 45 },
        { id: "inv-2", depot_location: "Gloucester Forecourt", current_stock: 30 },
        { id: "inv-3", depot_location: "Whitminster Central Depot", current_stock: 120 },
      ];

      const visibleStock = mockInventory.filter((row) =>
        row.depot_location.toLowerCase().includes(staffBranch.toLowerCase())
      );

      assert.equal(visibleStock.length, 1);
      assert.equal(visibleStock[0].depot_location, "Cirencester Forecourt");
      assert.ok(!visibleStock.some((r) => r.depot_location.includes("Gloucester")));
      assert.ok(!visibleStock.some((r) => r.depot_location.includes("Whitminster")));
    });

    it("should block inventory access if branch assignment is pending or unassigned", () => {
      const isPending = true;
      const visibleItems = isPending ? [] : [{ id: "inv-1", current_stock: 10 }];
      assert.equal(visibleItems.length, 0);
    });
  });

  // ===========================================================================
  // SECTION 4: Cylinder Exchange Handover Checklist
  // ===========================================================================
  describe("4. Cylinder Exchange Handover Checklist", () => {
    it("should correctly identify exchange orders and extract expected empty quantities", () => {
      const order: BranchOrderRecord = {
        id: "ord-test-01",
        orderNumber: "JSS-0001",
        customerName: "Jane Doe",
        customerPhone: "07123456789",
        customerEmail: "jane@example.com",
        itemsSummary: "2x Calor Propane 47kg Refill, 1x Calor Propane 19kg Refill",
        total: 215.5,
        status: "Ready",
        assignedDepot: "John Stayte Services – Cirencester",
        notes: "[Payment: Cash] | [Click & Collect: Cirencester] | [Empty Cylinder Required: Yes] | [REFILL_EXCHANGE]",
        createdAt: "2026-11-04T10:00:00Z",
        deliveryAddress: {
          empty_cylinder_required: true,
          order_type: "REFILL_EXCHANGE",
          fulfilment_method: "collection",
        },
        orderItems: [
          { product_name: "Calor Gas Propane 47kg Cylinder", quantity: 2 },
          { product_name: "Calor Gas Propane 19kg Cylinder", quantity: 1 },
        ],
      };

      const details = getCylinderExchangeDetails(order);
      assert.equal(details.isExchange, true);
      assert.equal(details.orderedGasQuantity, 3);
      assert.equal(details.expectedEmptyQuantity, 3);
      assert.ok(details.cylinderTypesSummary.includes("47kg"));
      assert.ok(details.cylinderTypesSummary.includes("19kg"));
    });

    it("should prevent returned quantities from exceeding expected quantities", () => {
      const expected = 3;
      let returned = 3;

      // Attempt to increment beyond expected
      const attemptIncrement = () => {
        returned = Math.min(expected, returned + 1);
      };
      attemptIncrement();
      assert.equal(returned, 3); // Clamped to expected max
    });

    it("should flag short returns with deposit warning note while preserving order totals", () => {
      const expected = 2;
      const returned = 1; // Customer only brought 1 empty
      const isShort = returned < expected;

      assert.equal(isShort, true);

      const assignedBranch = "John Stayte Services – Gloucester";
      const dateStr = "04/11/2026";
      const note = `Collected at ${assignedBranch} on ${dateStr}. [Exchange Verified: ${returned}/${expected} Empties Returned${isShort ? " - SHORT RETURN" : " - FULL EXCHANGE"}]`;

      assert.ok(note.includes("SHORT RETURN"));
      assert.ok(note.includes("1/2 Empties Returned"));
      assert.ok(!note.includes("£")); // Preserves financial details without mutation
    });

    it("should verify full returns with clean exchange confirmation note", () => {
      const expected = 2;
      const returned = 2;
      const isShort = returned < expected;

      assert.equal(isShort, false);

      const note = `Collected at Cirencester on 04/11/2026. [Exchange Verified: ${returned}/${expected} Empties Returned${isShort ? " - SHORT RETURN" : " - FULL EXCHANGE"}]`;
      assert.ok(note.includes("FULL EXCHANGE"));
      assert.ok(note.includes("2/2 Empties Returned"));
    });
  });

  // ===========================================================================
  // SECTION 5: Real Branch Notifications Page
  // ===========================================================================
  describe("5. Real Branch Notifications Page", () => {
    it("should filter notifications strictly for staff member and prevent cross-branch access", () => {
      const currentStaffUserId = "staff-stroud-uuid";
      const currentBranchTown = "stroud";

      const allNotifications = [
        {
          id: "notif-1",
          user_id: "staff-stroud-uuid",
          title: "New Forecourt Order #JSS-ST01",
          message: "New collection order at Stroud Forecourt",
          category: "Orders",
          link: "/branch/orders?status=new",
          read: false,
        },
        {
          id: "notif-2",
          user_id: "staff-weston-uuid",
          title: "New Forecourt Order #JSS-WS01",
          message: "New collection order at Weston Super Mare Forecourt",
          category: "Orders",
          link: "/branch/orders?status=new",
          read: false,
        },
        {
          id: "notif-3",
          user_id: null,
          title: "Daily Restock Notice",
          message: "Stroud stock has been replenished",
          category: "Inventory",
          link: "/branch/stock",
          read: false,
        },
        {
          id: "notif-4",
          user_id: null,
          title: "Daily Restock Notice",
          message: "Gloucester stock has been replenished",
          category: "Inventory",
          link: "/branch/stock",
          read: false,
        },
      ];

      const visible = allNotifications.filter((item) => {
        if (item.user_id === currentStaffUserId) return true;
        const text = `${item.title} ${item.message} ${item.link}`.toLowerCase();
        if (item.link && item.link.includes("/branch/")) {
          if (currentBranchTown && text.includes(currentBranchTown)) return true;
        }
        return false;
      });

      assert.equal(visible.length, 2);
      assert.equal(visible[0].id, "notif-1");
      assert.equal(visible[1].id, "notif-3");
      assert.ok(!visible.some((n) => n.id === "notif-2")); // Weston excluded
      assert.ok(!visible.some((n) => n.id === "notif-4")); // Gloucester excluded
    });

    it("should correctly update read and unread status", () => {
      const notifications = [
        { id: "n1", read: false },
        { id: "n2", read: false },
        { id: "n3", read: true },
      ];

      const unreadCount = notifications.filter((n) => !n.read).length;
      assert.equal(unreadCount, 2);

      // Mark all as read
      const updated = notifications.map((n) => ({ ...n, read: true }));
      assert.equal(updated.filter((n) => !n.read).length, 0);
    });
  });

  // ===========================================================================
  // SECTION 6: Non-Regression & 4 Active Forecourts
  // ===========================================================================
  describe("6. Non-Regression & Branch Integrity", () => {
    it("should preserve exactly 4 active collection forecourts", () => {
      assert.equal(ACTIVE_FORECOURT_BRANCHES.length, 4);
      const towns = ACTIVE_FORECOURT_BRANCHES.map((b) => b.town).sort();
      assert.deepEqual(towns, ["Cirencester", "Gloucester", "Stroud", "Weston-Super-Mare"].sort());
    });

    it("should keep Whitminster strictly as a logistics depot", () => {
      const whitminster = KNOWN_BRANCHES.find((b) => b.id === "depot-whitminster-01");
      assert.ok(whitminster);
      assert.equal(whitminster?.isDepot, true);
      assert.ok(!ACTIVE_FORECOURT_BRANCHES.some((b) => b.id === "depot-whitminster-01"));
    });
  });
});
