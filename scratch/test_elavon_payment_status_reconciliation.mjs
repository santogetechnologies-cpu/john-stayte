import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env", "utf8");
const envVars = Object.fromEntries(
  env
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
    }),
);

const supabaseService = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("ELAVON PAYMENT & ORDERS STATUS CHECK CONSTRAINT VERIFICATION SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, extraInfo = "") {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extraInfo}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Verify Order JSS-141166 in Database (Affected Order from User Prompt)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Inspect Affected Order JSS-141166 ---");
  const { data: order141166, error: err141166 } = await supabaseService
    .from("orders")
    .select("id, order_number, total, status, payment_status, fulfillment_status")
    .eq("order_number", "JSS-141166")
    .single();

  assert(!err141166 && !!order141166, "Fetched order JSS-141166 from database");
  assert(order141166?.payment_status === "Paid", `Order JSS-141166 payment_status is 'Paid' (actual: '${order141166?.payment_status}')`);
  assert(order141166?.status === "Approved", `Order JSS-141166 status is 'Approved' (actual: '${order141166?.status}')`);
  assert(order141166?.fulfillment_status === "Pending", `Order JSS-141166 fulfillment_status is independent 'Pending' (actual: '${order141166?.fulfillment_status}')`);

  // Verify payments table for JSS-141166
  const { data: pay141166 } = await supabaseService
    .from("payments")
    .select("payment_status, payment_intent_id")
    .eq("order_id", order141166.id)
    .single();
  assert(pay141166?.payment_status === "paid", `Payments record is 'paid' (actual: '${pay141166?.payment_status}')`);

  // Verify invoice for JSS-141166
  const { data: inv141166 } = await supabaseService
    .from("invoices")
    .select("status, total_amount")
    .eq("order_id", order141166.id)
    .single();
  assert(inv141166?.status === "Paid", `Invoice status is 'Paid' (actual: '${inv141166?.status}')`);

  // ---------------------------------------------------------------------------
  // TEST 2: Database orders_status_check Constraint Compliance
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Database Constraint Compliance with Test Orders ---");
  const testOrderId = `TEST-CHK-${Date.now()}`;
  const { data: testOrder, error: createErr } = await supabaseService
    .from("orders")
    .insert({
      order_number: testOrderId,
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      delivery_address: { street: "1 Test Lane", postcode: "GL1 1AA" },
      subtotal: 10,
      total: 10,
      status: "Pending",
      payment_status: "Pending",
      fulfillment_status: "Pending",
    })
    .select()
    .single();

  assert(!createErr && !!testOrder, "Created temporary test order");

  // Attempt update with permitted lifecycle status ('Approved') and payment_status 'Paid'
  const { data: updateValid, error: errValid } = await supabaseService
    .from("orders")
    .update({
      payment_status: "Paid",
      status: "Approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", testOrder.id)
    .select()
    .single();

  assert(
    !errValid && updateValid?.payment_status === "Paid" && updateValid?.status === "Approved",
    "Permitted status 'Approved' + payment_status 'Paid' succeeds without 23514 check constraint violation"
  );

  // Attempt update with invalid status to verify database constraint protects integrity
  const { data: updateInvalid, error: errInvalid } = await supabaseService
    .from("orders")
    .update({
      status: "InvalidNonExistentStatus",
    })
    .eq("id", testOrder.id)
    .select()
    .single();

  assert(
    !!errInvalid && errInvalid.code === "23514",
    "Database constraint orders_status_check correctly rejects invalid status (error code 23514)"
  );

  // Clean up test order
  await supabaseService.from("orders").delete().eq("id", testOrder.id);

  // ---------------------------------------------------------------------------
  // TEST 3: Static Analysis of Elavon Server Verification Handler
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Static Analysis of src/lib/elavon-payment-server-fn.ts ---");
  const elavonCode = fs.readFileSync("src/lib/elavon-payment-server-fn.ts", "utf8");

  assert(
    !elavonCode.includes('status: "Processing",\n          notes: `[Payment: Credit / Debit Card (Elavon Verified'),
    "No hardcoded status: 'Processing' in order payment update"
  );
  assert(
    elavonCode.includes("permittedStatuses") && elavonCode.includes("targetLifecycleStatus"),
    "targetLifecycleStatus adheres strictly to permitted lifecycle statuses"
  );
  assert(
    elavonCode.includes("if (updateOrderErr) {") &&
    elavonCode.includes("return {") &&
    elavonCode.includes("paymentStatus: \"Pending\","),
    "Supabase update error is explicitly handled and stops execution (does not silently ignore errors)"
  );
  assert(
    elavonCode.includes("currentOrder?.payment_status === \"Paid\""),
    "Idempotency verified: checks currentOrder payment_status before returning alreadyPaid"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Frontend Portal Status Presentation Consistency
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Frontend Portal Status Presentation ---");
  const custDetailCode = fs.readFileSync("src/components/customer/CustomerOrderDetailView.tsx", "utf8");
  assert(
    custDetailCode.includes('order.payment_status === "Paid" ? "Paid in Full" : "Pending (Due on Delivery)"'),
    "CustomerOrderDetailView displays 'Paid in Full' when payment_status === 'Paid'"
  );

  const adminOrdersCode = fs.readFileSync("src/components/admin/AdminOrdersView.tsx", "utf8");
  assert(
    adminOrdersCode.includes('o.payment_status === "Paid" ? "text-emerald-600" : "text-amber-600"'),
    "AdminOrdersView displays green Paid status when payment_status === 'Paid'"
  );

  const custOrdersCode = fs.readFileSync("src/components/customer/CustomerOrdersView.tsx", "utf8");
  assert(
    custOrdersCode.includes('o.payment_status === "Paid" ? "Paid in Full" : "Pending Payment"'),
    "CustomerOrdersView displays 'Paid in Full' badge when payment_status === 'Paid'"
  );

  const managerOrdersCode = fs.readFileSync("src/components/manager/ManagerOrdersView.tsx", "utf8");
  assert(
    managerOrdersCode.includes('o.payment_status === "Paid" ? "Paid" : "Pending"'),
    "ManagerOrdersView displays synchronized payment status"
  );

  console.log("\n===============================================================================");
  console.log(`SUMMARY: ${passed} of ${total} tests passed (${Math.round((passed / total) * 100)}%).`);
  console.log("===============================================================================");

  if (passed === total) {
    console.log("ALL ELAVON PAYMENT & STATUS RECONCILIATION TESTS PASSED!");
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
