import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  handleSendApplicationEmailVerify,
  handleVerifyApplicationEmailCode,
} from "../src/lib/application-email-verify-server-fn";
import {
  resolveTwilioSender,
  normalizeToE164,
  maskPhoneNumber,
} from "../src/lib/delivery-otp-server-fn";

// Load .env into process.env for local integration testing (never log values)
const envText = fs.existsSync(".env") ? fs.readFileSync(".env", "utf-8") : "";
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const TEST_EMAIL_SINK = "delivered@resend.dev";
const TEST_PERSIST_EMAIL = `otp-persist-test-${Date.now()}@example.com`;

describe("Production Readiness: Email Verification & Delivery OTP", () => {
  let adminClient: SupabaseClient<any>;

  before(() => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(url, "SUPABASE_URL must be set");
    assert.ok(key, "SUPABASE_SERVICE_ROLE_KEY must be set");
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  after(async () => {
    // Clean up only synthetic test rows created by this test run
    await adminClient.from("email_verifications").delete().eq("email", TEST_EMAIL_SINK);
    await adminClient.from("email_verifications").delete().eq("email", TEST_PERSIST_EMAIL);
  });

  describe("1. Real Resend API & Persistent Supabase Storage (email_verifications)", () => {
    it("should dispatch a real verification email via Resend to delivered@resend.dev and persist hashed OTP in Supabase", async () => {
      // Ensure clean slate for test sink
      await adminClient.from("email_verifications").delete().eq("email", TEST_EMAIL_SINK);

      const sendRes = await handleSendApplicationEmailVerify({ email: TEST_EMAIL_SINK });
      assert.equal(sendRes.ok, true, `Resend + Supabase send failed: ${sendRes.message} (${sendRes.error})`);

      // Verify persistent row in public.email_verifications
      const { data: row, error: rowErr } = await adminClient
        .from("email_verifications")
        .select("id, email, verification_token, verified_at, expires_at, attempts, max_attempts")
        .eq("email", TEST_EMAIL_SINK)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      assert.equal(rowErr, null);
      assert.ok(row, "Expected persisted row in public.email_verifications");
      assert.ok(
        typeof row.verification_token === "string" && row.verification_token.startsWith("sha256:"),
        "OTP must be stored as salted sha256 hash",
      );
      assert.equal(row.verified_at, null);
      assert.equal(row.attempts, 0);

      // Verify DB-backed 30s cooldown blocks immediate resend
      const cooldownRes = await handleSendApplicationEmailVerify({ email: TEST_EMAIL_SINK });
      assert.equal(cooldownRes.ok, false);
      assert.equal(cooldownRes.error, "Rate limit reached");
    });

    it("should validate OTP against persistent Supabase record, increment attempts on mismatch, and invalidate on success", async () => {
      // Insert a known salted SHA-256 hash for OTP "654321" directly into email_verifications
      const salt = "0123456789abcdef0123456789abcdef";
      const enc = new TextEncoder().encode(`${salt}:654321`);
      const digest = await crypto.subtle.digest("SHA-256", enc);
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { error: insErr } = await adminClient.from("email_verifications").insert([
        {
          email: TEST_PERSIST_EMAIL,
          verification_token: `sha256:${salt}:${hash}`,
          verified_at: null,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          metadata: { provider: "resend", type: "gas_application", last_sent_at: Date.now() },
        },
      ]);
      assert.equal(insErr, null);

      // Wrong code should fail and increment attempts in DB
      const badRes = await handleVerifyApplicationEmailCode({
        email: TEST_PERSIST_EMAIL,
        code: "111111",
      });
      assert.equal(badRes.ok, false);
      assert.ok(badRes.error?.includes("4 attempts remaining"));

      // Correct code should succeed, set verified_at, and clear verification_token
      const goodRes = await handleVerifyApplicationEmailCode({
        email: TEST_PERSIST_EMAIL,
        code: "654321",
      });
      assert.equal(goodRes.ok, true);
      assert.equal(goodRes.verifiedEmail, TEST_PERSIST_EMAIL);

      const { data: verifiedRow } = await adminClient
        .from("email_verifications")
        .select("verified_at, verification_token, attempts")
        .eq("email", TEST_PERSIST_EMAIL)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      assert.ok(verifiedRow?.verified_at, "verified_at must be persisted");
      assert.equal(verifiedRow?.verification_token, null, "verification_token must be cleared after use");
      assert.equal(verifiedRow?.attempts, 2);

      // Replay must be rejected
      const replayRes = await handleVerifyApplicationEmailCode({
        email: TEST_PERSIST_EMAIL,
        code: "654321",
      });
      assert.equal(replayRes.ok, false);
      assert.ok(replayRes.error?.includes("already been used"));
    });
  });

  describe("2. Twilio Configuration, Sender Routing & Delivery OTP Hardening", () => {
    it("should authenticate against Twilio REST API using configured TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN", async () => {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      assert.ok(sid && token, "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured");

      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      assert.equal(res.status, 200, `Expected Twilio Account API 200, got ${res.status}`);
      const account = (await res.json()) as { status?: string; type?: string };
      assert.ok(account.status, "Twilio account status should be returned");
    });

    it("should reject unregistered UK alpha sender fallback for +91 India destinations", () => {
      const sender = resolveTwilioSender("+919876543210", {
        alphaSenderId: "JOHNSTAYTE",
      });
      assert.equal(sender, null);

      const senderWithIndia = resolveTwilioSender("+919876543210", {
        alphaSenderId: "JOHNSTAYTE",
        indiaSenderId: "+441234567890",
      });
      assert.deepEqual(senderWithIndia, { senderType: "From", senderValue: "+441234567890" });
    });

    it("should normalize and mask phone numbers without exposing full digits", () => {
      assert.equal(normalizeToE164("07517825555"), "+447517825555");
      assert.equal(maskPhoneNumber("+447517825555"), "+44 •••• •••555");
    });
  });
});
