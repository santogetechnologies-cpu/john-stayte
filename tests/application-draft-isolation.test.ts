import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
  sanitizeDraftPayload,
} from "../src/lib/application-draft-service";

// Minimal in-memory localStorage mock for Node test environment
function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("Gas Customer Application Draft Persistence & Customer Isolation", () => {
  beforeEach(() => {
    const mockStorage = createLocalStorageMock();
    (globalThis as any).window = {};
    (globalThis as any).localStorage = mockStorage;
  });

  it("Scenario 1 & 5: Customer A fills half the form, exits/restarts, and restores only Customer A's draft", () => {
    const custA = "user-customer-a";
    const saved = saveLocalDraft(custA, {
      fullName: "Alice Stayte",
      email: "alice@example.com",
      phone: "01452123456",
      streetAddress: "10 Stroud Road",
      city: "Gloucester",
      postcode: "GL1 5AA",
      selectedGasTypes: ["Propane LPG (Red Bottles - 37mbar POL)"],
    });

    assert.equal(saved, true);

    const restored = getLocalDraft(custA);
    assert.ok(restored);
    assert.equal(restored.customerId, custA);
    assert.equal(restored.fullName, "Alice Stayte");
    assert.equal(restored.email, "alice@example.com");
    assert.equal(restored.postcode, "GL1 5AA");
    assert.deepEqual(restored.selectedGasTypes, ["Propane LPG (Red Bottles - 37mbar POL)"]);
  });

  it("Scenario 2 & 4: Customer B registers on the same browser and sees zero data from Customer A", () => {
    const custA = "user-customer-a";
    const custB = "user-customer-b";

    saveLocalDraft(custA, {
      fullName: "Alice Stayte",
      email: "alice@example.com",
      phone: "01452123456",
      postcode: "GL1 5AA",
    });

    // Customer B has no draft -> must return null (blank form)
    const custBDraft = getLocalDraft(custB);
    assert.equal(custBDraft, null);
  });

  it("Scenario 3: Customer B logs out and Customer A logs back in -> only Customer A's draft restores", () => {
    const custA = "user-customer-a";
    const custB = "user-customer-b";

    saveLocalDraft(custA, { fullName: "Alice Stayte", postcode: "GL1 5AA" });
    saveLocalDraft(custB, { fullName: "Bob Builder", postcode: "BS23 1AA" });

    const restoredA = getLocalDraft(custA);
    const restoredB = getLocalDraft(custB);

    assert.equal(restoredA?.fullName, "Alice Stayte");
    assert.equal(restoredA?.postcode, "GL1 5AA");
    assert.equal(restoredB?.fullName, "Bob Builder");
    assert.equal(restoredB?.postcode, "BS23 1AA");

    clearLocalDraft(custB);
    assert.equal(getLocalDraft(custB), null);
    assert.equal(getLocalDraft(custA)?.fullName, "Alice Stayte");
  });

  it("Cross-customer contamination guard rejects mismatched customerId in localStorage", () => {
    const custA = "user-customer-a";
    const custB = "user-customer-b";

    // Simulate tampered/corrupted storage key under custB containing custA's draft
    (globalThis as any).localStorage.setItem(
      `jss_gas_app_draft_${custB}`,
      JSON.stringify({ customerId: custA, fullName: "Leaked Alice", updatedAt: new Date().toISOString() }),
    );

    assert.equal(getLocalDraft(custB), null);
  });

  it("Sanitizes OTP codes, passwords, and auth tokens out of draft payloads", () => {
    const clean = sanitizeDraftPayload({
      fullName: "Alice",
      otpCode: "123456",
      password: "secret",
      authToken: "jwt",
      secret: "shh",
    });
    assert.equal(clean.fullName, "Alice");
    assert.equal("otpCode" in clean, false);
    assert.equal("password" in clean, false);
    assert.equal("authToken" in clean, false);
    assert.equal("secret" in clean, false);
  });

  it("Form component enforces blank defaults, account-switch reset, snapshot guard, and autoComplete=off", () => {
    const formSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/customer/GasCustomerApplicationForm.tsx"),
      "utf8",
    );
    const storeSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/store.tsx"),
      "utf8",
    );

    // Must not prefill fullName/email from user profile or shared sessionStorage
    assert.ok(!formSource.includes("useState(user?.name"));
    assert.ok(!formSource.includes("useState(user?.email"));
    assert.ok(!formSource.includes('sessionStorage.getItem("jss_is_existing_customer")'));
    assert.ok(!formSource.includes('sessionStorage.getItem("jss_customer_account_number")'));

    // Must reset on account switch/logout, guard empty auto-saves, and disable browser autocomplete
    assert.ok(formSource.includes("const resetFormToBlank = () => {"));
    assert.ok(formSource.includes("loadedCustomerIdRef"));
    assert.ok(formSource.includes("baselineSnapshotRef"));
    assert.ok(formSource.includes('autoComplete="off"'));

    // Logout must clear shared sessionStorage keys
    assert.ok(storeSource.includes('sessionStorage.removeItem("jss_is_existing_customer")'));
  });
});
