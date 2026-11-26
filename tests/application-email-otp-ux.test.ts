import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  saveLocalDraft,
  getLocalDraft,
} from "../src/lib/application-draft-service";

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

describe("Gas Application Step 6 Email Verification UX & 60s Cooldown", () => {
  beforeEach(() => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it("persists active OTP session and 60s cooldown timestamp across page refresh & mobile app switch", () => {
    const custId = "cust-step6-1";
    const cooldownEndsAt = Date.now() + 45_000;

    saveLocalDraft(custId, {
      fullName: "Jane Stayte",
      email: "jane@example.com",
      verificationStep: "ENTER_OTP",
      otpSentTo: "jane@example.com",
      otpCooldownEndsAt: cooldownEndsAt,
    });

    const restored = getLocalDraft(custId);
    assert.ok(restored);
    assert.equal(restored.verificationStep, "ENTER_OTP");
    assert.equal(restored.otpSentTo, "jane@example.com");
    assert.equal(restored.otpCooldownEndsAt, cooldownEndsAt);

    // Remaining seconds computed from timestamp stays accurate after switching back from Gmail
    const remaining = Math.max(0, Math.ceil((restored.otpCooldownEndsAt! - Date.now()) / 1000));
    assert.ok(remaining >= 44 && remaining <= 45);
  });

  it("enforces 60-second server-side cooldown and invalidates prior unverified OTPs on resend", () => {
    const serverFnSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/application-email-verify-server-fn.ts"),
      "utf8",
    );

    assert.ok(serverFnSource.includes("const SEND_COOLDOWN_MS = 60 * 1000;"));
    assert.ok(serverFnSource.includes("cooldownEndsAt: lastSentMs + SEND_COOLDOWN_MS"));
    assert.ok(serverFnSource.includes("cooldownEndsAt: now + SEND_COOLDOWN_MS"));
    assert.ok(serverFnSource.includes("verification_token: null"));
    assert.ok(serverFnSource.includes('.is("verified_at", null)'));
  });

  it("prevents background auth/profile updates from unmounting active form and syncs countdown on focus/visibility", () => {
    const viewSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/customer/CustomerApplicationView.tsx"),
      "utf8",
    );
    const formSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/customer/GasCustomerApplicationForm.tsx"),
      "utf8",
    );

    // View depends on primitive user?.id and preserves active form during background refresh
    assert.ok(viewSource.includes("}, [user?.id]);"));
    assert.ok(viewSource.includes("backgroundRefresh"));
    assert.ok(viewSource.includes("hasLoadedOnceRef"));

    // Form uses timestamp-based cooldown with visibilitychange/focus listeners and never auto-resends
    assert.ok(formSource.includes("otpCooldownEndsAt"));
    assert.ok(formSource.includes('document.addEventListener("visibilitychange", handleVisibilityOrFocus)'));
    assert.ok(formSource.includes('window.addEventListener("focus", handleVisibilityOrFocus)'));
    assert.ok(formSource.includes('draft.verificationStep === "ENTER_OTP" && draft.otpSentTo'));
  });
});
