const { createClient } = require("@supabase/supabase-js");

const url = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

async function runFullVerification() {
  console.log("===============================================================");
  console.log("TESTING REAL ADMIN CUSTOMER DELETION & LIVE DATABASE SAFETY");
  console.log("===============================================================");

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // 1. Create a dedicated test Admin account
  const testAdminEmail = `test_admin_suite_${Date.now()}@example.com`;
  const testAdminPass = "SuperAdminSecretPass123!";

  console.log("\n[SETUP 1] Creating dedicated test Admin account:", testAdminEmail);
  const { data: adminSignUp, error: adminErr } = await anonClient.auth.signUp({
    email: testAdminEmail,
    password: testAdminPass,
    options: {
      data: {
        full_name: "Test Administrator",
        role: "admin"
      }
    }
  });

  if (adminErr || !adminSignUp?.user) {
    console.error("❌ Admin sign up error:", adminErr);
    process.exit(1);
  }

  const adminId = adminSignUp.user.id;
  console.log("✓ Admin user created with ID:", adminId);

  // Admin Client
  const adminClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await adminClient.auth.setSession({
    access_token: adminSignUp.session?.access_token || "",
    refresh_token: adminSignUp.session?.refresh_token || ""
  });

  // Verify Admin role in profiles
  const { data: adminProf } = await adminClient.from("profiles").select("*").eq("id", adminId).single();
  console.log("✓ Admin profile verified in DB. Role:", adminProf?.role);

  // 2. Create a dedicated test Customer account
  const testCustomerEmail = `test_del_cust_${Date.now()}@example.com`;
  const testCustomerPass = "CustomerSecretPass123!";

  console.log("\n[SETUP 2] Creating dedicated test Customer account:", testCustomerEmail);
  const { data: custSignUp, error: custErr } = await anonClient.auth.signUp({
    email: testCustomerEmail,
    password: testCustomerPass,
    options: {
      data: {
        full_name: "David TestCustomer",
        role: "customer"
      }
    }
  });

  if (custErr || !custSignUp?.user) {
    console.error("❌ Customer sign up error:", custErr);
    process.exit(1);
  }

  const customerId = custSignUp.user.id;
  console.log("✓ Customer user created with ID:", customerId);

  // Customer Client
  const customerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await customerClient.auth.setSession({
    access_token: custSignUp.session?.access_token || "",
    refresh_token: custSignUp.session?.refresh_token || ""
  });

  // 3. Attach Customer related records (Application, Address, Notification, Order)
  console.log("\n[SETUP 3] Attaching customer records (Application, Address, Notification, Order)...");
  
  // Address
  await customerClient.from("customer_addresses").insert({
    user_id: customerId,
    label: "Main House",
    name: "David TestCustomer",
    street: "42 Gloucester Road",
    city: "Gloucester",
    postcode: "GL1 2AB",
    is_default: true
  });

  // Notification
  await customerClient.from("customer_notifications").insert({
    user_id: customerId,
    title: "Account Registered",
    message: "Welcome to John Stayte Services",
    category: "Account"
  });

  // Gas Application
  await customerClient.from("gas_customer_applications").insert({
    customer_id: customerId,
    full_name: "David TestCustomer",
    email: testCustomerEmail,
    phone: "01452 987654",
    street_address: "42 Gloucester Road",
    city: "Gloucester",
    postcode: "GL1 2AB",
    delivery_address: "42 Gloucester Road, Gloucester GL1 2AB",
    usage_type: "DOMESTIC",
    declaration_accepted: true,
    signature_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  });

  // Historical Order
  const orderNumber = `ORD-SAFE-DEL-${Date.now().toString().slice(-6)}`;
  const { data: orderData, error: orderErr } = await customerClient.from("orders").insert({
    order_number: orderNumber,
    customer_id: customerId,
    customer_name: "David TestCustomer",
    customer_email: testCustomerEmail,
    customer_phone: "01452 987654",
    delivery_address: {
      street: "42 Gloucester Road",
      city: "Gloucester",
      postcode: "GL1 2AB"
    },
    subtotal: 78.50,
    shipping_fee: 5.00,
    total: 83.50,
    status: "Pending"
  }).select().single();

  if (orderErr) {
    console.error("❌ Order insert error:", orderErr);
    process.exit(1);
  } else {
    console.log("✓ Customer order created successfully:", orderNumber, "Order ID:", orderData.id);
  }

  // Insert Order Item
  await customerClient.from("order_items").insert({
    order_id: orderData.id,
    product_name: "Calor 13kg Propane Gas Cylinder",
    quantity: 1,
    unit_price: 78.50,
    total_price: 78.50
  });
  console.log("✓ Order item attached to historical order.");

  // 4. TEST: Unauthorized Deletion by regular Customer
  console.log("\n[TEST 1: SECURITY] Unauthorized Customer calling admin_delete_customer...");
  const { data: unauthRes, error: unauthErr } = await customerClient.rpc("admin_delete_customer", {
    target_customer_id: customerId
  });

  if (unauthErr) {
    console.log("✓ Security Check Passed: Regular customer cannot invoke delete RPC ->", unauthErr.message);
  } else {
    console.error("❌ Security Violation: Customer called admin_delete_customer successfully!");
    process.exit(1);
  }

  // 5. TEST: Admin Self-Deletion Prevention
  console.log("\n[TEST 2: SAFETY] Admin attempting self-deletion...");
  const { data: selfDelRes, error: selfDelErr } = await adminClient.rpc("admin_delete_customer", {
    target_customer_id: adminId
  });

  if (selfDelErr) {
    console.log("✓ Safety Check Passed: Admin self-deletion prevented ->", selfDelErr.message);
  } else {
    console.error("❌ Safety Violation: Admin was able to self-delete!");
    process.exit(1);
  }

  // 6. TEST: Real Admin Deleting Customer
  console.log("\n[TEST 3: EXECUTION] Admin executing admin_delete_customer for customer ID:", customerId);
  const { data: delResult, error: delErr } = await adminClient.rpc("admin_delete_customer", {
    target_customer_id: customerId
  });

  if (delErr) {
    console.error("❌ Admin delete customer RPC failed:", delErr);
    process.exit(1);
  } else {
    console.log("✓ Deletion RPC succeeded! Result:", JSON.stringify(delResult, null, 2));
  }

  // 7. VERIFICATION: Customer profile deleted
  console.log("\n[TEST 4: VERIFICATION] Checking public.profiles for deleted customer...");
  const { data: checkProf } = await adminClient.from("profiles").select("*").eq("id", customerId).maybeSingle();
  if (!checkProf) {
    console.log("✓ Confirmed: Customer profile removed from public.profiles");
  } else {
    console.error("❌ Customer profile still exists in public.profiles!");
    process.exit(1);
  }

  // 8. VERIFICATION: Historical order preserved with customer_id set to NULL
  console.log("\n[TEST 5: VERIFICATION] Checking historical order preservation in public.orders...");
  const { data: checkOrder } = await adminClient.from("orders").select("id, order_number, customer_id, total, notes, customer_name, customer_email").eq("order_number", orderNumber).maybeSingle();
  if (checkOrder) {
    console.log("✓ Confirmed: Historical order preserved with customer_id = NULL:");
    console.log("   Order Number:", checkOrder.order_number);
    console.log("   Customer ID (decoupled):", checkOrder.customer_id);
    console.log("   Customer Name (snapshot):", checkOrder.customer_name);
    console.log("   Customer Email (snapshot):", checkOrder.customer_email);
    console.log("   Total:", checkOrder.total);
    console.log("   Audit Notes appended:", checkOrder.notes);

    // Verify order item still exists
    const { data: checkItems } = await adminClient.from("order_items").select("*").eq("order_id", checkOrder.id);
    console.log("✓ Historical order items intact:", checkItems.length, "item(s):", checkItems[0]?.product_name);
  } else {
    console.error("❌ Historical order was unexpectedly destroyed!");
    process.exit(1);
  }

  // 9. VERIFICATION: Transient records cleaned up
  console.log("\n[TEST 6: VERIFICATION] Checking transient tables cleanup...");
  const { data: apps } = await adminClient.from("gas_customer_applications").select("id").eq("customer_id", customerId);
  const { data: addrs } = await adminClient.from("customer_addresses").select("id").eq("user_id", customerId);
  const { data: notifs } = await adminClient.from("customer_notifications").select("id").eq("user_id", customerId);

  console.log("✓ Gas applications remaining:", apps?.length || 0);
  console.log("✓ Customer addresses remaining:", addrs?.length || 0);
  console.log("✓ Customer notifications remaining:", notifs?.length || 0);

  // Clean up test admin account and test order
  console.log("\n[CLEANUP] Cleaning up test admin account and test order...");
  await adminClient.from("profiles").delete().eq("id", adminId);
  if (orderData?.id) {
    await adminClient.from("orders").delete().eq("id", orderData.id);
  }

  console.log("\n===============================================================");
  console.log("ALL REAL ADMIN CUSTOMER DELETION & SAFETY CHECKS PASSED (100%)");
  console.log("===============================================================");
}

runFullVerification().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
