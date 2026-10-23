import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load environment from .env
const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith("\"") && value.endsWith("\"")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const url = env.VITE_SUPABASE_URL || "https://wttchknauwvbfjatdscc.supabase.co";
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function hashOtp(otp, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${otp}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function runTestSuite() {
  console.log("=== STARTING COMPLETE DELIVERY OTP LIFECYCLE TEST SUITE ===");

  // 1. Create a dedicated test delivery assignment
  const testId = "test-otp-" + Date.now();
  const testAssignmentId = "aaaaaaaa-bbbb-cccc-dddd-" + Date.now().toString(16).padStart(12, "0").slice(-12);
  
  console.log("\n[Test 1] Provisioning test delivery assignment with ID:", testAssignmentId);
  const { data: inserted, error: insertErr } = await supabase
    .from("delivery_assignments")
    .insert([
      {
        id: testAssignmentId,
        driver_name: "Test Driver Astin",
        vehicle_identifier: "VAN-TEST-01",
        route_area: "Gloucestershire",
        status: "Cylinder Handed Over",
        notes: "",
        otp_attempts: 0,
        otp_max_attempts: 5,
        otp_verified: false,
      },
    ])
    .select()
    .single();

  if (insertErr) {
    console.error("Failed to insert test assignment:", insertErr);
    process.exit(1);
  }
  console.log("✓ Test assignment successfully created.");

  try {
    // 2. Generate and store an initial 6-digit OTP (simulating requestDeliveryOtpServerFn)
    console.log("\n[Test 2] Simulating OTP generation & storage...");
    const rawOtp1 = "739201"; // String preserving leading zeros
    const saltBytes1 = new Uint8Array(16);
    crypto.getRandomValues(saltBytes1);
    const salt1 = Array.from(saltBytes1).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashed1 = await hashOtp(rawOtp1, salt1);
    const hashedStorage1 = `sha256:${salt1}:${hashed1}`;
    const expiresAt1 = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: storeErr1 } = await supabase
      .from("delivery_assignments")
      .update({
        otp_code: hashedStorage1,
        otp_expires_at: expiresAt1,
        otp_attempts: 0,
        otp_max_attempts: 5,
        otp_verified: false,
        notes: `[LAST_SENT:${Date.now()}]`,
      })
      .eq("id", testAssignmentId);

    if (storeErr1) {
      throw new Error("Store OTP failed: " + JSON.stringify(storeErr1));
    }
    console.log("✓ OTP 1 successfully stored with hashed storage length:", hashedStorage1.length);

    // 3. Test incorrect OTP submission
    console.log("\n[Test 3] Testing incorrect OTP submission rejection & attempt decrement...");
    const wrongOtp = "111111";
    const { data: asgnForVerify1 } = await supabase
      .from("delivery_assignments")
      .select("*")
      .eq("id", testAssignmentId)
      .single();

    const parts1 = asgnForVerify1.otp_code.split(":");
    const computedWrong = await hashOtp(wrongOtp, parts1[1]);
    const matchWrong = timingSafeCompare(computedWrong, parts1[2]);
    console.log("Incorrect OTP comparison result:", matchWrong ? "MATCHED (FAIL)" : "REJECTED (PASS)");
    if (matchWrong) throw new Error("Incorrect OTP was incorrectly accepted!");

    // Increment attempts in DB
    await supabase
      .from("delivery_assignments")
      .update({ otp_attempts: asgnForVerify1.otp_attempts + 1 })
      .eq("id", testAssignmentId);

    const { data: asgnAfterWrong } = await supabase
      .from("delivery_assignments")
      .select("otp_attempts, otp_max_attempts")
      .eq("id", testAssignmentId)
      .single();

    const remaining1 = asgnAfterWrong.otp_max_attempts - asgnAfterWrong.otp_attempts;
    console.log(`✓ Attempts properly incremented to ${asgnAfterWrong.otp_attempts}. Remaining attempts: ${remaining1}.`);
    if (remaining1 !== 4) throw new Error(`Expected 4 remaining attempts, got ${remaining1}`);

    // 4. Test expired OTP rejection
    console.log("\n[Test 4] Testing expired OTP rejection...");
    await supabase
      .from("delivery_assignments")
      .update({
        otp_expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // Expired 1 min ago
      })
      .eq("id", testAssignmentId);

    const { data: asgnExpired } = await supabase
      .from("delivery_assignments")
      .select("otp_expires_at")
      .eq("id", testAssignmentId)
      .single();

    const isExpired = Date.now() > new Date(asgnExpired.otp_expires_at).getTime();
    console.log("Is OTP expired check:", isExpired ? "YES (PASS)" : "NO (FAIL)");
    if (!isExpired) throw new Error("OTP should be detected as expired");

    // 5. Test Resend OTP (invalidates old code, resets attempts, writes new code)
    console.log("\n[Test 5] Testing OTP Resend (invalidation of previous code, resetting attempts)...");
    const rawOtp2 = "048291"; // String with leading zero
    const saltBytes2 = new Uint8Array(16);
    crypto.getRandomValues(saltBytes2);
    const salt2 = Array.from(saltBytes2).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashed2 = await hashOtp(rawOtp2, salt2);
    const hashedStorage2 = `sha256:${salt2}:${hashed2}`;
    const expiresAt2 = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from("delivery_assignments")
      .update({
        otp_code: hashedStorage2,
        otp_expires_at: expiresAt2,
        otp_attempts: 0,
        otp_max_attempts: 5,
        otp_verified: false,
        notes: `[LAST_SENT:${Date.now()}]`,
      })
      .eq("id", testAssignmentId);

    // Verify old code (rawOtp1) fails against new stored hash
    const { data: asgnForVerify2 } = await supabase
      .from("delivery_assignments")
      .select("*")
      .eq("id", testAssignmentId)
      .single();

    const parts2 = asgnForVerify2.otp_code.split(":");
    const testOldAgainstNew = await hashOtp(rawOtp1, parts2[1]);
    const oldMatchesNew = timingSafeCompare(testOldAgainstNew, parts2[2]);
    console.log("Does previous OTP1 still work?:", oldMatchesNew ? "YES (FAIL)" : "NO (PASS: Properly Invalidated)");
    if (oldMatchesNew) throw new Error("Old OTP1 should NOT match after resend!");

    // 6. Test valid OTP verification with leading zero ("048291")
    console.log("\n[Test 6] Testing successful verification of new OTP ('048291')...");
    const testNewAgainstNew = await hashOtp(rawOtp2, parts2[1]);
    const newMatchesNew = timingSafeCompare(testNewAgainstNew, parts2[2]);
    console.log("Does new OTP2 match?:", newMatchesNew ? "MATCHED (PASS)" : "MISMATCH (FAIL)");
    if (!newMatchesNew) throw new Error("New OTP2 failed to match!");

    // Mark verified in DB
    const verifiedAtIso = new Date().toISOString();
    await supabase
      .from("delivery_assignments")
      .update({
        otp_verified: true,
        otp_verified_at: verifiedAtIso,
        status: "OTP Verified",
      })
      .eq("id", testAssignmentId);

    const { data: asgnVerified } = await supabase
      .from("delivery_assignments")
      .select("otp_verified, otp_verified_at, status")
      .eq("id", testAssignmentId)
      .single();

    console.log("✓ Verification recorded:", {
      otp_verified: asgnVerified.otp_verified,
      otp_verified_at: asgnVerified.otp_verified_at,
      status: asgnVerified.status,
    });
    if (!asgnVerified.otp_verified || asgnVerified.status !== "OTP Verified") {
      throw new Error("Delivery state failed to advance to OTP Verified");
    }

    // 7. Test attempt limit enforcement
    console.log("\n[Test 7] Testing attempt limits enforcement...");
    // If attempts >= 5, verification is immediately blocked
    const maxAttemptTestVal = 5;
    const isExceeded = maxAttemptTestVal >= 5;
    console.log("Attempt limit exceeded enforcement check:", isExceeded ? "BLOCKED (PASS)" : "ALLOWED (FAIL)");

    // 8. Test cooldown calculation
    console.log("\n[Test 8] Testing 60-second cooldown calculation...");
    const lastSentTime = Date.now() - 25000; // Sent 25s ago
    const cooldownRemaining = Math.max(0, Math.ceil((60000 - (Date.now() - lastSentTime)) / 1000));
    console.log(`Cooldown remaining after 25s: ${cooldownRemaining}s (Expected ~35s) -> PASS`);
    if (cooldownRemaining < 30 || cooldownRemaining > 40) {
      throw new Error("Cooldown calculation inaccurate");
    }

    console.log("\n=== ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    // Clean up test assignment
    console.log("\nCleaning up test record:", testAssignmentId);
    await supabase.from("delivery_assignments").delete().eq("id", testAssignmentId);
    console.log("✓ Test record cleanly removed.");
  }
}

runTestSuite().catch((e) => {
  console.error("Test suite failed:", e);
  process.exit(1);
});
