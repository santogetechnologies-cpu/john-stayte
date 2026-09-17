import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testAssignment() {
  console.log("=== TESTING ADMIN DRIVER ASSIGNMENT ===");

  // 1. Authenticate as Admin
  const adminEmail = `admin_tester_${Date.now()}@jss.com`;
  const { data: auth } = await client.auth.signUp({
    email: adminEmail,
    password: "Password123!",
    options: {
      data: { full_name: "Admin User", role: "admin" }
    }
  });

  if (!auth?.user) {
    console.error("Failed to authenticate admin");
    return;
  }

  console.log("Admin authenticated:", auth.user.id);

  // 2. Create test order
  const orderRef = `ORD-TEST-ASSIGN-${Date.now()}`;
  const { data: order, error: ordErr } = await client.from("orders").insert([
    {
      order_number: orderRef,
      customer_name: "John Doe",
      customer_email: "john@example.com",
      delivery_address: { street: "1 High St", city: "Stroud", postcode: "GL5 1AA" },
      subtotal: 50.0,
      total: 54.99,
      status: "Approved",
      payment_status: "Paid",
    }
  ]).select().single();

  console.log("Created order:", order?.id, "Error:", ordErr?.message);

  if (!order) return;

  // 3. Test assigning to Aswin
  console.log("\n--- Assigning Order to Aswin ---");
  const aswinPayload = {
    order_id: order.id,
    driver_name: "Aswin",
    driver_id: null, // Valid FK
    agent_id: null,
    agent_code: "AGT-001",
    vehicle_identifier: "Flatbed Cylinder Van (3.5t)",
    vehicle_plate: "GL73 ASW",
    route_area: "Whitminster & Stroud",
    status: "Assigned",
  };

  const { data: assAswin, error: errAswin } = await client
    .from("delivery_assignments")
    .insert([aswinPayload])
    .select()
    .single();

  console.log("Aswin assignment result:", assAswin?.id ? "SUCCESS" : "FAIL", "Error:", errAswin);

  // 4. Test assigning to Astin
  console.log("\n--- Assigning Order to Astin ---");
  const astinPayload = {
    order_id: order.id,
    driver_name: "Astin",
    driver_id: null, // Valid FK
    agent_id: null,
    agent_code: "AGT-002",
    vehicle_identifier: "Flatbed Cylinder Van (3.5t)",
    vehicle_plate: "GL72 AST",
    route_area: "Whitminster & Stroud",
    status: "Assigned",
  };

  const { data: assAstin, error: errAstin } = await client
    .from("delivery_assignments")
    .insert([astinPayload])
    .select()
    .single();

  console.log("Astin assignment result:", assAstin?.id ? "SUCCESS" : "FAIL", "Error:", errAstin);
}

testAssignment();
