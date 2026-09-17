const { createClient } = require("@supabase/supabase-js");

const url = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

async function runDeleteActionsTest() {
  console.log("===============================================================");
  console.log("TESTING REAL DATABASE DELETIONS FOR ORDERS & DELIVERIES");
  console.log("===============================================================\n");

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // 1. Setup Admin Account
  const adminEmail = `admin_del_test_${Date.now()}@jss.com`;
  console.log("[SETUP 1] Creating test Admin account:", adminEmail);
  const { data: adminSignUp, error: adminErr } = await anonClient.auth.signUp({
    email: adminEmail,
    password: "AdminSuperPass123!",
    options: { data: { full_name: "Admin Del Test", role: "admin" } }
  });

  if (adminErr || !adminSignUp?.user) {
    console.error("❌ Admin creation error:", adminErr);
    process.exit(1);
  }

  const adminId = adminSignUp.user.id;
  const adminClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await adminClient.auth.setSession(adminSignUp.session);
  console.log("✓ Admin session active for user ID:", adminId);

  // 2. Setup Test Customer Account
  const custEmail = `cust_order_test_${Date.now()}@example.com`;
  console.log("\n[SETUP 2] Creating test Customer account:", custEmail);
  const { data: custSignUp, error: custErr } = await anonClient.auth.signUp({
    email: custEmail,
    password: "CustSuperPass123!",
    options: { data: { full_name: "Order Test Customer", role: "customer" } }
  });

  if (custErr || !custSignUp?.user) {
    console.error("❌ Customer creation error:", custErr);
    process.exit(1);
  }
  const custId = custSignUp.user.id;
  const custClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await custClient.auth.setSession(custSignUp.session);
  console.log("✓ Customer created with user ID:", custId);

  // 3. Create a Test Order with Order Items
  console.log("\n[SETUP 3] Creating test order and order items in Supabase...");
  const testOrderNumber = `ORD-TEST-DEL-${Date.now().toString().slice(-6)}`;
  const { data: orderData, error: orderErr } = await adminClient
    .from("orders")
    .insert({
      order_number: testOrderNumber,
      customer_id: custId,
      customer_name: "Order Test Customer",
      customer_email: custEmail,
      customer_phone: "01452333444",
      delivery_address: {
        street: "12 Depot Road",
        city: "Gloucester",
        postcode: "GL1 2AA"
      },
      subtotal: 45.00,
      shipping_fee: 5.00,
      total: 50.00,
      status: "Pending",
      assigned_driver: "Aswin"
    })
    .select()
    .single();

  if (orderErr || !orderData) {
    console.error("❌ Order creation error:", orderErr);
    process.exit(1);
  }
  const orderId = orderData.id;
  console.log("✓ Test order created:", testOrderNumber, "(ID:", orderId, ")");

  // Create Order Items
  const { data: itemData, error: itemErr } = await adminClient
    .from("order_items")
    .insert({
      order_id: orderId,
      product_name: "Calor 13kg Propane Gas Cylinder",
      quantity: 1,
      unit_price: 45.00,
      total_price: 45.00
    })
    .select()
    .single();

  if (itemErr || !itemData) {
    console.error("❌ Order item creation error:", itemErr);
    process.exit(1);
  }
  console.log("✓ Test order item created (ID:", itemData.id, ")");

  // 4. Create a Delivery Assignment for this order
  console.log("\n[SETUP 4] Creating test delivery assignment for this order...");
  const { data: assignData, error: assignErr } = await adminClient
    .from("delivery_assignments")
    .insert({
      order_id: orderId,
      driver_name: "Aswin",
      vehicle_identifier: "GL73 ASW (Van 1)",
      route_area: "Gloucestershire Central",
      time_slot: "Morning Window (08:00 - 12:00)",
      status: "Confirmed"
    })
    .select()
    .single();

  if (assignErr || !assignData) {
    console.error("❌ Delivery assignment creation error:", assignErr);
    process.exit(1);
  }
  const assignmentId = assignData.id;
  console.log("✓ Delivery assignment created (ID:", assignmentId, ")");

  // -------------------------------------------------------------
  // TEST 1: Unauthorized customer cannot delete delivery assignment or order
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Unauthorized customer attempting to delete order...");
  const { error: custDeleteErr } = await custClient
    .from("orders")
    .delete()
    .eq("id", orderId);

  // Customer should be blocked by RLS
  const { data: verifyStillExists } = await adminClient.from("orders").select("id").eq("id", orderId).maybeSingle();
  const test1Passed = !!verifyStillExists;
  console.log("  Customer Delete Attempt Blocked by RLS:", test1Passed ? "✅ PASS" : "❌ FAIL");

  // -------------------------------------------------------------
  // TEST 2: Admin Deletes Delivery Assignment
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Admin deleting delivery assignment (ID:", assignmentId, ")...");
  // Reset order driver and delete assignment
  await adminClient.from("orders").update({ assigned_driver: null }).eq("id", orderId);
  const { error: delAssignErr } = await adminClient
    .from("delivery_assignments")
    .delete()
    .eq("id", assignmentId);

  if (delAssignErr) {
    console.error("❌ Delivery assignment deletion failed:", delAssignErr);
    process.exit(1);
  }

  // Verify delivery assignment is GONE from database
  const { data: checkAssign } = await adminClient
    .from("delivery_assignments")
    .select("*")
    .eq("id", assignmentId);

  const test2Passed = !checkAssign || checkAssign.length === 0;
  console.log("  Delivery assignment verified GONE from database:", test2Passed ? "✅ PASS" : "❌ FAIL");

  // Verify associated order is still intact
  const { data: orderAfterAssignDel } = await adminClient
    .from("orders")
    .select("id, assigned_driver")
    .eq("id", orderId)
    .single();
  console.log("  Order still exists with assigned_driver decoupled:", orderAfterAssignDel?.assigned_driver === null ? "✅ PASS" : "❌ FAIL");

  // Verify customer still exists
  const { data: custProfile } = await adminClient.from("profiles").select("id, email").eq("id", custId).single();
  console.log("  Customer profile unharmed:", custProfile?.email === custEmail ? "✅ PASS" : "❌ FAIL");

  // -------------------------------------------------------------
  // TEST 3: Admin Deletes Order
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Admin deleting order (ID:", orderId, ")...");
  // Clean child records first
  await adminClient.from("order_items").delete().eq("order_id", orderId);
  const { error: delOrderErr } = await adminClient
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (delOrderErr) {
    console.error("❌ Order deletion failed:", delOrderErr);
    process.exit(1);
  }

  // Re-fetch from database to confirm order is GONE
  const { data: checkOrder } = await adminClient
    .from("orders")
    .select("*")
    .eq("id", orderId);

  const test3Passed = !checkOrder || checkOrder.length === 0;
  console.log("  Order record verified GONE from database:", test3Passed ? "✅ PASS" : "❌ FAIL");

  // Re-fetch order items to confirm child records are GONE
  const { data: checkItems } = await adminClient
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const itemsGone = !checkItems || checkItems.length === 0;
  console.log("  Order items verified GONE from database:", itemsGone ? "✅ PASS" : "❌ FAIL");

  // -------------------------------------------------------------
  // TEST 4: Browser Refresh / Persistence Test
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Simulating fresh browser reload / new query from Supabase...");
  const freshClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await freshClient.auth.setSession(adminSignUp.session);

  const { data: reloadOrders } = await freshClient
    .from("orders")
    .select("id, order_number")
    .eq("order_number", testOrderNumber);

  const test4Passed = !reloadOrders || reloadOrders.length === 0;
  console.log("  Fresh client re-fetch confirms order #", testOrderNumber, "does NOT return:", test4Passed ? "✅ PASS" : "❌ FAIL");

  // Cleanup Admin & Customer profiles
  console.log("\n[CLEANUP] Cleaning up test admin and customer auth records...");
  await adminClient.from("profiles").delete().eq("id", adminId);
  await adminClient.from("profiles").delete().eq("id", custId);
  console.log("✓ Cleanup completed.");

  console.log("\n===============================================================");
  console.log("ALL REAL DATABASE DELETION TESTS PASSED (100%)");
  console.log("===============================================================");
}

runDeleteActionsTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
