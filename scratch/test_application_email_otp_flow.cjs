const { createClient } = require("@supabase/supabase-js");

const url = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";
const supabase = createClient(url, anonKey);

async function runTest() {
  console.log("==================================================");
  console.log("GAS APPLICATION 2-STEP EMAIL OTP FLOW VERIFICATION");
  console.log("==================================================");

  // 1. Test Send Real Email OTP to a valid email address
  const testEmail = "johnstayte.test." + Date.now() + "@gmail.com";
  console.log("\n[TEST 1] Dispatching real email OTP to:", testEmail);
  const sendRes = await supabase.auth.signInWithOtp({
    email: testEmail,
    options: { shouldCreateUser: true }
  });

  if (sendRes.error) {
    console.error("❌ Send OTP failed:", sendRes.error);
    process.exit(1);
  } else {
    console.log("✓ Send OTP succeeded! Real transactional OTP dispatched via Supabase Auth.");
  }

  // 2. Test verify with incorrect/invalid code
  console.log("\n[TEST 2] Testing verification with invalid 6-digit OTP (000000)...");
  const verifyInvalidRes = await supabase.auth.verifyOtp({
    email: testEmail,
    token: "000000",
    type: "email"
  });

  if (verifyInvalidRes.error) {
    console.log("✓ Invalid OTP correctly rejected:", verifyInvalidRes.error.message);
  } else {
    console.error("❌ Expected invalid OTP to fail but succeeded");
    process.exit(1);
  }

  // 3. Test verification with wrong format code
  console.log("\n[TEST 3] Testing verification with malformed token (abc)...");
  const verifyMalformedRes = await supabase.auth.verifyOtp({
    email: testEmail,
    token: "abc",
    type: "email"
  });

  if (verifyMalformedRes.error) {
    console.log("✓ Malformed OTP correctly rejected:", verifyMalformedRes.error.message);
  } else {
    console.error("❌ Expected malformed OTP to fail");
    process.exit(1);
  }

  // 4. Test Remote Table gas_customer_applications Schema & Persistence
  console.log("\n[TEST 4] Testing Remote gas_customer_applications table query...");
  const { data: apps, error: appErr } = await supabase
    .from("gas_customer_applications")
    .select("id, customer_id, full_name, email, status, created_at")
    .limit(5);

  if (appErr) {
    console.error("❌ gas_customer_applications table query error:", appErr);
    process.exit(1);
  } else {
    console.log("✓ gas_customer_applications table active in remote Supabase. Existing applications in database:", apps.length);
  }

  console.log("\n==================================================");
  console.log("ALL AUTOMATED BACKEND & OTP FLOW CHECKS PASSED (100%)");
  console.log("==================================================");
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
