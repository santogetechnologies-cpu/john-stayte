import { validateDob } from "../src/lib/dob-validator.ts";
import assert from "assert";

console.log("=================================================");
console.log("  JOHN STAYTE SERVICES - DOB AGE GATE TEST SUITE");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// Fixed anchor date for deterministic boundary testing: 2026-10-23
const anchorToday = new Date(2026, 9, 23); // October 23, 2026

// 1. A user who is 17 years old
runTest("Test 1: User who is 17 years old (born 2009-10-23)", () => {
  const res = validateDob("2009", "10", "23", anchorToday);
  assert.strictEqual(res.valid, false, "Should be invalid for 17 year old");
  assert.strictEqual(res.age, 17, "Age should be 17");
  assert.strictEqual(
    res.error,
    "You must be at least 18 years old to create an account.",
    "Should return exact under-18 message"
  );
});

runTest("Test 1b: User who turns 18 tomorrow (born 2008-10-24)", () => {
  const res = validateDob("2008", "10", "24", anchorToday);
  assert.strictEqual(res.valid, false, "Should be invalid until birthday arrives");
  assert.strictEqual(res.age, 17, "Age should still be 17 today");
  assert.strictEqual(
    res.error,
    "You must be at least 18 years old to create an account."
  );
});

// 2. A user who is exactly 18 years old
runTest("Test 2: User who is exactly 18 years old today (born 2008-10-23)", () => {
  const res = validateDob("2008", "10", "23", anchorToday);
  assert.strictEqual(res.valid, true, "Should be valid on 18th birthday");
  assert.strictEqual(res.age, 18, "Age should be exactly 18");
  assert.strictEqual(res.error, undefined, "Error should be undefined");
});

runTest("Test 2b: User who turned 18 yesterday (born 2008-10-22)", () => {
  const res = validateDob("2008", "10", "22", anchorToday);
  assert.strictEqual(res.valid, true, "Should be valid");
  assert.strictEqual(res.age, 18, "Age should be 18");
});

// 3. A user who is over 18
runTest("Test 3: User who is over 18 (born 1995-04-12, 31 yo)", () => {
  const res = validateDob("1995", "4", "12", anchorToday);
  assert.strictEqual(res.valid, true, "Should be valid for adult over 18");
  assert.strictEqual(res.age, 31, "Age should be 31");
});

runTest("Test 3b: Senior customer (born 1950-01-01, 76 yo)", () => {
  const res = validateDob("1950", "1", "1", anchorToday);
  assert.strictEqual(res.valid, true, "Should be valid for senior customer");
  assert.strictEqual(res.age, 76, "Age should be 76");
});

// 4. Leap year handling (February 29)
runTest("Test 4a: Leap year birthday (born 2008-02-29, evaluated today on 2026-10-23)", () => {
  const res = validateDob("2008", "2", "29", anchorToday);
  assert.strictEqual(res.valid, true, "Leap year baby is 18 in late 2026");
  assert.strictEqual(res.age, 18, "Age should be 18");
});

runTest("Test 4b: Leap year birthday on non-leap anniversary day (Feb 28 in non-leap year 2026)", () => {
  const feb28_2026 = new Date(2026, 1, 28);
  const res = validateDob("2008", "2", "29", feb28_2026);
  assert.strictEqual(res.valid, false, "On Feb 28, has not completed 18th year yet");
  assert.strictEqual(res.age, 17, "Age should be 17 on Feb 28");
});

runTest("Test 4c: Leap year birthday on anniversary (March 1 in non-leap year 2026)", () => {
  const mar01_2026 = new Date(2026, 2, 1);
  const res = validateDob("2008", "2", "29", mar01_2026);
  assert.strictEqual(res.valid, true, "On March 1, 18th year is completed");
  assert.strictEqual(res.age, 18, "Age should be 18");
});

// 5. Future DOB
runTest("Test 5a: Future date in next year (2027-01-01)", () => {
  const res = validateDob("2027", "1", "1", anchorToday);
  assert.strictEqual(res.valid, false, "Future date must be rejected");
  assert.strictEqual(res.error, "Date of birth cannot be in the future.");
});

runTest("Test 5b: Future date tomorrow (2026-10-24)", () => {
  const res = validateDob("2026", "10", "24", anchorToday);
  assert.strictEqual(res.valid, false, "Tomorrow must be rejected as future date");
  assert.strictEqual(res.error, "Date of birth cannot be in the future.");
});

// 6. Incomplete & Invalid dates
runTest("Test 6a: Incomplete DOB - missing day", () => {
  const res = validateDob("1995", "4", "", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter your complete date of birth.");
});

runTest("Test 6b: Incomplete DOB - missing year", () => {
  const res = validateDob("", "4", "15", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter your complete date of birth.");
});

runTest("Test 6c: Invalid calendar date (February 30)", () => {
  const res = validateDob("2020", "2", "30", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter a valid calendar date.");
});

runTest("Test 6d: Invalid calendar date (February 29 in non-leap year 2025)", () => {
  const res = validateDob("2025", "2", "29", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter a valid calendar date.");
});

runTest("Test 6e: Invalid calendar date (April 31)", () => {
  const res = validateDob("1998", "4", "31", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter a valid calendar date.");
});

// 7. Flow Simulation: Registration session state transitions
runTest("Test 7: Modal Cancellation and Reopening Lifecycle", () => {
  // Initial state: form fields filled
  const state = {
    name: "John Stayte Test",
    email: "customer@example.com",
    password: "Password123",
    confirmPassword: "Password123",
    verifiedDob: null,
    dobModalOpen: false,
    accountCreated: false,
  };

  // Step 1: User clicks "Create Account"
  if (!state.verifiedDob) {
    state.dobModalOpen = true;
  }
  assert.strictEqual(state.dobModalOpen, true, "Modal opens on first submit");
  assert.strictEqual(state.accountCreated, false, "Account NOT created without DOB");

  // Step 2: User clicks "Cancel" in modal
  state.dobModalOpen = false;
  assert.strictEqual(state.dobModalOpen, false, "Modal closed on cancel");
  assert.strictEqual(state.verifiedDob, null, "DOB remains unverified");
  assert.strictEqual(state.name, "John Stayte Test", "Form data preserved");

  // Step 3: User clicks "Create Account" again
  if (!state.verifiedDob) {
    state.dobModalOpen = true;
  }
  assert.strictEqual(state.dobModalOpen, true, "Modal reopens cleanly on subsequent submit");

  // Step 4: User selects under-18 date (e.g. 2012-05-10)
  const under18Check = validateDob("2012", "5", "10", anchorToday);
  assert.strictEqual(under18Check.valid, false, "Under 18 rejected");

  // Step 5: User enters valid DOB (1996-08-15) and confirms
  const adultCheck = validateDob("1996", "8", "15", anchorToday);
  assert.strictEqual(adultCheck.valid, true, "Adult accepted");
  state.verifiedDob = "1996-08-15";
  state.dobModalOpen = false;
  state.accountCreated = true;

  assert.strictEqual(state.dobModalOpen, false, "Modal closed on confirmation");
  assert.strictEqual(state.accountCreated, true, "Account creation initiated");

  // Step 6: If user submits form again, modal does NOT reopen
  let modalReopened = false;
  if (!state.verifiedDob) {
    modalReopened = true;
  }
  assert.strictEqual(modalReopened, false, "Modal does NOT reopen once DOB verified in session");
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passed} / ${total} tests passed.`);
console.log("-------------------------------------------------");

if (passed !== total) {
  process.exit(1);
}
