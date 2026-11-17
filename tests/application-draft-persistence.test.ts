import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
  sanitizeDraftPayload,
  GasApplicationDraft,
} from "../src/lib/application-draft-service";

// Mock localStorage for Node.js test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("Customer Gas Application Draft Persistence & Security", () => {
  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = new MockLocalStorage();
  });

  it("1. Automatically saves and restores draft across simulated refresh", () => {
    const customerId = "cust-user-123456";
    const draftPayload: Partial<GasApplicationDraft> = {
      title: "Mr",
      fullName: "Chandran Manoharan",
      phone: "01452 741234",
      streetAddress: "Bristol Road",
      city: "Whitminster",
      postcode: "GL10 3RA",
      selectedGasTypes: ["Propane LPG (Red Bottles - 37mbar POL)", "Patio Gas (Green Bottles - 27mm Clip-on)"],
      selectedCylinderSizes: ["19kg Propane (Catering/Trade)", "13kg Patio Gas (BBQ & Patio Heaters)"],
      hasConfirmedCylinderSizes: true,
      declarationAccepted: true,
      storageConfirmed: true,
    };

    const saved = saveLocalDraft(customerId, draftPayload);
    assert.equal(saved, true, "Draft should save successfully");

    // Simulate page refresh by fetching draft
    const restored = getLocalDraft(customerId);
    assert.ok(restored, "Restored draft should exist");
    assert.equal(restored?.fullName, "Chandran Manoharan");
    assert.equal(restored?.postcode, "GL10 3RA");
    assert.equal(restored?.selectedGasTypes?.length, 2);
    assert.equal(restored?.selectedCylinderSizes?.length, 2);
    assert.equal(restored?.hasConfirmedCylinderSizes, true);
  });

  it("2. Cross-customer isolation: Customer B cannot access Customer A's draft", () => {
    const customerA = "cust-alice-111111";
    const customerB = "cust-bob-222222";

    saveLocalDraft(customerA, {
      fullName: "Alice Smith",
      email: "alice@example.co.uk",
      streetAddress: "10 Eastington Lane",
    });

    // Customer B requests draft
    const draftForB = getLocalDraft(customerB);
    assert.equal(draftForB, null, "Customer B must not receive Customer A's draft");

    // Customer A requests draft
    const draftForA = getLocalDraft(customerA);
    assert.ok(draftForA);
    assert.equal(draftForA?.fullName, "Alice Smith");
  });

  it("3. Sanitization: strictly excludes OTP codes and secrets from draft storage", () => {
    const dirtyPayload: any = {
      fullName: "Secure Customer",
      email: "secure@example.com",
      otpCode: "948201",
      code: "123456",
      token: "secret-token-123",
      password: "secret-password",
    };

    const sanitized = sanitizeDraftPayload(dirtyPayload) as any;
    assert.equal(sanitized.fullName, "Secure Customer");
    assert.equal(sanitized.email, "secure@example.com");
    assert.equal(sanitized.otpCode, undefined, "otpCode must be purged");
    assert.equal(sanitized.code, undefined, "code must be purged");
    assert.equal(sanitized.token, undefined, "token must be purged");
    assert.equal(sanitized.password, undefined, "password must be purged");
  });

  it("4. Clears draft on successful submission", () => {
    const customerId = "cust-submit-333333";
    saveLocalDraft(customerId, {
      fullName: "Submitting Customer",
      postcode: "GL10 3AH",
    });

    assert.ok(getLocalDraft(customerId));

    // Clear after final submission
    clearLocalDraft(customerId);
    assert.equal(getLocalDraft(customerId), null, "Draft must be deleted after final submission");
  });

  it("5. Preserves selected gas types and cylinder sizes", () => {
    const customerId = "cust-multi-444444";
    const gasTypes = [
      "Propane LPG (Red Bottles - 37mbar POL)",
      "Butane Gas (Blue Bottles - 28mbar 21mm)",
    ];
    const cylinderSizes = [
      "47kg Propane (Heavy Commercial)",
      "15kg Butane (Indoor Heaters)",
    ];

    saveLocalDraft(customerId, {
      selectedGasTypes: gasTypes,
      selectedCylinderSizes: cylinderSizes,
      hasConfirmedCylinderSizes: true,
    });

    const restored = getLocalDraft(customerId);
    assert.deepEqual(restored?.selectedGasTypes, gasTypes);
    assert.deepEqual(restored?.selectedCylinderSizes, cylinderSizes);
    assert.equal(restored?.hasConfirmedCylinderSizes, true);
  });
});

