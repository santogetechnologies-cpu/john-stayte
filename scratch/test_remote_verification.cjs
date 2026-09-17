const { createClient } = require("@supabase/supabase-js");

const url = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

async function verifyRemoteDatabase() {
  console.log("===============================================================");
  console.log("REMOTE SUPABASE DATABASE VERIFICATION & AUDIT CHECK");
  console.log("===============================================================\n");

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // 1. Create a safe test customer account
  const testCustomerEmail = `remote_audit_${Date.now()}@example.com`;
  const { data: signUpData, error: signUpErr } = await anonClient.auth.signUp({
    email: testCustomerEmail,
    password: "TestAuditPassword123!",
    options: { data: { full_name: "Remote Audit Customer", role: "customer" } }
  });

  if (signUpErr || !signUpData?.user) {
    console.error("❌ Failed to create test user:", signUpErr);
    process.exit(1);
  }

  const userId = signUpData.user.id;
  console.log("✓ Test customer created:", userId);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  if (signUpData.session) {
    await authClient.auth.setSession(signUpData.session);
  }

  // -----------------------------------------------------------------
  // CHECK 1 & 2: Remote RPC Hardening (Authenticated user + arbitrary email)
  // -----------------------------------------------------------------
  console.log("\n[CHECK 1] Testing RPC with arbitrary email: arbitrary_target@corporate.co.uk");
  const { data: rpcArbData, error: rpcArbErr } = await authClient.rpc("record_verified_application_email", {
    p_email: "arbitrary_target@corporate.co.uk"
  });

  const rpcHardenedArbitrary = !!rpcArbErr && (rpcArbErr.message.includes("Unauthorized") || rpcArbErr.message.includes("not been verified"));
  console.log("  RPC Arbitrary Email Result:", rpcArbErr ? `REJECTED (${rpcArbErr.message})` : "ALLOWED");
  console.log("  Hardened Status:", rpcHardenedArbitrary ? "PASS" : "FAIL (Vulnerable: allowed arbitrary email)");

  // -----------------------------------------------------------------
  // CHECK 3: Remote RPC Hardening (Authenticated user + another user's email)
  // -----------------------------------------------------------------
  console.log("\n[CHECK 2] Testing RPC with another user's email: victim_other_user@domain.com");
  const { data: rpcVictimData, error: rpcVictimErr } = await authClient.rpc("record_verified_application_email", {
    p_email: "victim_other_user@domain.com"
  });

  const rpcHardenedVictim = !!rpcVictimErr && (rpcVictimErr.message.includes("Unauthorized") || rpcVictimErr.message.includes("not been verified"));
  console.log("  RPC Another User Email Result:", rpcVictimErr ? `REJECTED (${rpcVictimErr.message})` : "ALLOWED");
  console.log("  Hardened Status:", rpcHardenedVictim ? "PASS" : "FAIL (Vulnerable: allowed another user's email)");

  // -----------------------------------------------------------------
  // CHECK 4: Remote RLS on public.email_verifications (Direct INSERT)
  // -----------------------------------------------------------------
  console.log("\n[CHECK 3] Testing direct REST INSERT into public.email_verifications");
  const { data: rlsInsertData, error: rlsInsertErr } = await authClient.from("email_verifications").insert({
    user_id: userId,
    email: "forged_email@example.com",
    verified_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString()
  });

  const rlsBlocked = !!rlsInsertErr && (rlsInsertErr.message.includes("policy") || rlsInsertErr.code === "42501");
  console.log("  Direct INSERT Result:", rlsInsertErr ? `REJECTED (${rlsInsertErr.message})` : "ALLOWED");
  console.log("  RLS Status:", rlsBlocked ? "PASS" : "FAIL");

  // -----------------------------------------------------------------
  // CHECK 5: Remote Trigger trg_enforce_gas_app_verified_email
  // -----------------------------------------------------------------
  console.log("\n[CHECK 4] Testing trigger on gas_customer_applications with unverified email");
  const { data: trigData, error: trigErr } = await authClient.from("gas_customer_applications").insert({
    customer_id: userId,
    full_name: "Remote Audit Test",
    email: "unverified_probe@example.com",
    phone: "01452300000",
    street_address: "1 Test Lane",
    city: "Gloucester",
    postcode: "GL1 1AA",
    delivery_address: "1 Test Lane, Gloucester GL1 1AA",
    usage_type: "DOMESTIC",
    declaration_accepted: true,
    signature_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    status: "SUBMITTED"
  });

  const triggerActive = !!trigErr && trigErr.message.includes("Email verification required");
  console.log("  Application Trigger Result:", trigErr ? `REJECTED (${trigErr.message})` : "ALLOWED");
  console.log("  Trigger Status:", triggerActive ? "PASS" : "FAIL");

  // -----------------------------------------------------------------
  // CHECK 6: Legitimate verified application email flow
  // -----------------------------------------------------------------
  console.log("\n[CHECK 5] Testing legitimate verified application email flow");
  // Test if user's own confirmed email can invoke RPC
  const { data: legitData, error: legitErr } = await authClient.rpc("record_verified_application_email", {
    p_email: testCustomerEmail
  });
  console.log("  Legitimate caller result:", { data: legitData, error: legitErr?.message });

  console.log("\n===============================================================");
  console.log("REMOTE SUMMARY TABLE");
  console.log("===============================================================");
  console.log(`REMOTE MIGRATION: ${rpcHardenedArbitrary ? "PASS" : "FAIL"}`);
  console.log(`REMOTE RPC HARDENING: ${rpcHardenedArbitrary && rpcHardenedVictim ? "PASS" : "FAIL"}`);
  console.log(`REMOTE TRIGGER: ${triggerActive ? "PASS" : "FAIL"}`);
  console.log(`REMOTE RLS: ${rlsBlocked ? "PASS" : "FAIL"}`);
  console.log(`REMOTE SECURITY TESTS: ${rpcHardenedArbitrary && rpcHardenedVictim && triggerActive && rlsBlocked ? "PASS" : "FAIL"}`);
}

verifyRemoteDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
