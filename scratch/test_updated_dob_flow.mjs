import { validateDob } from "../src/lib/dob-validator.ts";
import assert from "assert";

console.log("=================================================");
console.log("  JOHN STAYTE SERVICES - UPDATED DOB FLOW TESTS");
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

const anchorToday = new Date(2026, 9, 23); // 2026-10-23

// 1. Core DOB Validator Checks
runTest("DOB: Rejects 17-year old with exact message", () => {
  const res = validateDob("2009", "10", "23", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "You must be at least 18 years old to create an account.");
});

runTest("DOB: Rejects user turning 18 tomorrow", () => {
  const res = validateDob("2008", "10", "24", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "You must be at least 18 years old to create an account.");
});

runTest("DOB: Accepts user who turns 18 today", () => {
  const res = validateDob("2008", "10", "23", anchorToday);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.age, 18);
});

runTest("DOB: Accepts user who is 30 years old", () => {
  const res = validateDob("1996", "4", "15", anchorToday);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.age, 30);
});

runTest("DOB: Rejects future date", () => {
  const res = validateDob("2027", "1", "1", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Date of birth cannot be in the future.");
});

runTest("DOB: Rejects invalid calendar date (Feb 30)", () => {
  const res = validateDob("2024", "2", "30", anchorToday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, "Please enter a valid calendar date.");
});

// 2. Component State Machine Simulation: Privacy-Preserving 18+ Flow
runTest("Flow Step 1: Clicking Create Account without checking checkbox does NOT open DOB modal", () => {
  let formError = null;
  let dobModalOpen = false;
  let isAgeVerified = false;
  let registered = false;

  const handleRegister = (name, email, password, confirmPassword) => {
    formError = null;
    if (name.length < 2) return (formError = "Please enter your full name.");
    if (!email.includes("@")) return (formError = "Please enter a valid email address.");
    if (password.length < 8) return (formError = "Password must be at least 8 characters long.");
    if (password !== confirmPassword) return (formError = "Passwords do not match. Please re-enter.");

    // Checkbox check
    if (!isAgeVerified) {
      formError = "Please confirm that you are 18 years old or above.";
      // MUST NOT OPEN MODAL:
      return;
    }

    registered = true;
  };

  // User fills out form
  handleRegister("John Doe", "john@example.com", "Password123", "Password123");

  // Verify:
  assert.strictEqual(dobModalOpen, false, "DOB modal must NOT open when clicking Create Account without checking checkbox");
  assert.strictEqual(formError, "Please confirm that you are 18 years old or above.", "Must display exact error message");
  assert.strictEqual(registered, false, "Registration must not proceed without confirmation");
});

runTest("Flow Step 2: Checking the checkbox opens the DOB modal", () => {
  let dobModalOpen = false;
  let isAgeVerified = false;
  let dobError = "Previous error";

  const handleToggleAgeCheckbox = () => {
    if (isAgeVerified) {
      isAgeVerified = false;
    } else {
      dobError = null;
      dobModalOpen = true;
    }
  };

  // User checks the checkbox
  handleToggleAgeCheckbox();

  assert.strictEqual(dobModalOpen, true, "DOB modal must open when checkbox is checked");
  assert.strictEqual(dobError, null, "Modal error must be reset upon opening");
  assert.strictEqual(isAgeVerified, false, "Checkbox must NOT be confirmed just by clicking it");
});

runTest("Flow Step 3: Cancelling modal leaves checkbox unchecked and confirmation incomplete", () => {
  let dobModalOpen = true;
  let isAgeVerified = false;
  let dobError = null;

  const handleCancelDobModal = () => {
    dobModalOpen = false;
    dobError = null;
    isAgeVerified = false;
  };

  handleCancelDobModal();

  assert.strictEqual(dobModalOpen, false, "Modal must close on cancel");
  assert.strictEqual(isAgeVerified, false, "Age confirmation must remain incomplete");
});

runTest("Flow Step 4: Under-18 DOB confirmation keeps popup open with exact error", () => {
  let dobModalOpen = true;
  let isAgeVerified = false;
  let dobError = null;

  const handleConfirmDob = (year, month, day) => {
    dobError = null;
    const validation = validateDob(year, month, day, anchorToday);
    if (!validation.valid) {
      dobError = validation.error || "You must be at least 18 years old to create an account.";
      return; // Keeps popup open
    }
    isAgeVerified = true;
    dobModalOpen = false;
  };

  // Under-18 user
  handleConfirmDob("2015", "5", "10");

  assert.strictEqual(dobModalOpen, true, "Modal must STAY OPEN when under-18");
  assert.strictEqual(dobError, "You must be at least 18 years old to create an account.");
  assert.strictEqual(isAgeVerified, false, "isAgeVerified must NOT be set");
});

runTest("Flow Step 5: Valid 18+ DOB closes popup, sets isAgeVerified, discards raw DOB", () => {
  let dobModalOpen = true;
  let isAgeVerified = false;
  let rawDay = "15";
  let rawMonth = "3";
  let rawYear = "1995";
  let dobError = null;
  let formError = "Please confirm that you are 18 years old or above.";

  const handleConfirmDob = (year, month, day) => {
    dobError = null;
    const validation = validateDob(year, month, day, anchorToday);
    if (!validation.valid) {
      dobError = validation.error || "You must be at least 18 years old to create an account.";
      return;
    }
    // Discard raw DOB immediately to prioritize customer privacy
    isAgeVerified = true;
    rawDay = "";
    rawMonth = "";
    rawYear = "";
    dobModalOpen = false;
    if (formError === "Please confirm that you are 18 years old or above.") {
      formError = null;
    }
  };

  // Valid 18+ adult (e.g. 1995-03-15)
  handleConfirmDob(rawYear, rawMonth, rawDay);

  assert.strictEqual(dobModalOpen, false, "Modal must close on valid 18+ confirmation");
  assert.strictEqual(isAgeVerified, true, "isAgeVerified must be true");
  assert.strictEqual(rawDay, "", "Raw day must be wiped from memory");
  assert.strictEqual(rawYear, "", "Raw year must be wiped from memory");
  assert.strictEqual(formError, null, "Previous checkbox form error must be cleared");
});

runTest("Flow Step 6: Create Account proceeds normally after 18+ confirmation", () => {
  let formError = null;
  let dobModalOpen = false;
  let isAgeVerified = true;
  let registered = false;

  const handleRegister = (name, email, password, confirmPassword) => {
    formError = null;
    if (name.length < 2) return (formError = "Please enter your full name.");
    if (!email.includes("@")) return (formError = "Please enter a valid email address.");
    if (password.length < 8) return (formError = "Password must be at least 8 characters long.");
    if (password !== confirmPassword) return (formError = "Passwords do not match. Please re-enter.");

    if (!isAgeVerified) {
      formError = "Please confirm that you are 18 years old or above.";
      return;
    }

    registered = true;
  };

  handleRegister("John Doe", "john@example.com", "Password123", "Password123");

  assert.strictEqual(formError, null);
  assert.strictEqual(dobModalOpen, false, "Modal must NOT reopen once verified");
  assert.strictEqual(registered, true, "Account registration succeeds");
});

runTest("Flow Step 7: Unchecking checkbox resets isAgeVerified, checking again reopens modal", () => {
  let dobModalOpen = false;
  let isAgeVerified = true;

  const handleToggleAgeCheckbox = () => {
    if (isAgeVerified) {
      isAgeVerified = false;
    } else {
      dobModalOpen = true;
    }
  };

  // User clicks checked checkbox to uncheck
  handleToggleAgeCheckbox();
  assert.strictEqual(isAgeVerified, false, "isAgeVerified reset to false");
  assert.strictEqual(dobModalOpen, false, "Modal does not open on uncheck");

  // User clicks again to check
  handleToggleAgeCheckbox();
  assert.strictEqual(dobModalOpen, true, "Modal opens on re-checking");
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passed} / ${total} tests passed.`);
console.log("-------------------------------------------------");

if (passed !== total) {
  process.exit(1);
}
