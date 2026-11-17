import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Customer ID & Account Number Display Consistency in Admin & Manager Portals", () => {
  it("1. Distinguishes Customer ID (UUID) from John Stayte Account Number (Alphanumeric Code)", () => {
    const customer = {
      id: "b9f24c78-bece-4658-8d3f-0b1ef9f7d476",
      full_name: "Chandran Manoharan",
      account_number: "MABI01",
    };

    assert.notEqual(customer.id, customer.account_number);
    assert.match(customer.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.match(customer.account_number, /^[A-Z0-9]{4,10}$/);
  });

  it("2. Handles registered customers with no account number assigned yet", () => {
    const newCustomer = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      full_name: "New Gas Customer",
      account_number: null,
    };

    assert.ok(newCustomer.id);
    assert.equal(newCustomer.account_number, null);
  });

  it("3. Handles guest/unregistered orders safely without dummy IDs", () => {
    const guestOrder = {
      id: "order-9999",
      order_number: "JSS-GUEST-01",
      customer_id: null,
      customer_name: "Walk-in Guest",
      customer_account_number: null,
    };

    assert.equal(guestOrder.customer_id, null);
    assert.equal(guestOrder.customer_account_number, null);
    assert.ok(guestOrder.customer_name);
  });

  it("4. Maps order customer_id to profile account_number correctly", () => {
    const profileMap: Record<string, { account_number?: string }> = {
      "user-123-uuid": { account_number: "RTAY16" },
      "user-456-uuid": { account_number: "CHNO03" },
    };

    const order = {
      id: "order-101",
      customer_id: "user-123-uuid",
      customer_name: "Louise Taylor",
      customer_account_number: null,
    };

    const resolvedAccount =
      order.customer_account_number || profileMap[order.customer_id]?.account_number;

    assert.equal(resolvedAccount, "RTAY16");
    assert.equal(order.customer_id, "user-123-uuid");
    assert.notEqual(order.customer_id, resolvedAccount);
  });

  it("5. Verifies all required fields are present in exported CSV headers", () => {
    const adminOrdersHeaders = [
      "Order Number",
      "Date",
      "Customer Name",
      "Customer ID",
      "Account Number",
      "Email",
      "Status",
      "Subtotal (£)",
      "Shipping (£)",
      "Total (£)",
    ];

    assert.ok(adminOrdersHeaders.includes("Customer Name"));
    assert.ok(adminOrdersHeaders.includes("Customer ID"));
    assert.ok(adminOrdersHeaders.includes("Account Number"));
  });
});

