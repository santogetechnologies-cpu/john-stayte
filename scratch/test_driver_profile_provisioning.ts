import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

function getEphemeralAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function testDriverProfiles() {
  console.log("=== PROVISIONING & TESTING DRIVER PROFILES FOR ASWIN AND ASTIN ===");

  const driversToProvision = [
    { name: "Aswin", email: "aswin@jss.com", code: "AGT-001", phone: "07412 345678", plate: "GL73 ASW" },
    { name: "Astin", email: "astin@jss.com", code: "AGT-002", phone: "07890 123456", plate: "GL72 AST" },
  ];

  const driverProfileIds: Record<string, string> = {};

  for (const d of driversToProvision) {
    const client = getEphemeralAuthClient();
    // Try sign in first
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: d.email,
      password: "Password123!",
    });

    if (signInData?.user) {
      console.log(`Driver ${d.name} signed in successfully! User ID: ${signInData.user.id}`);
      driverProfileIds[d.name] = signInData.user.id;

      // Check / update profile
      const { data: p } = await client.from("profiles").select("*").eq("id", signInData.user.id).maybeSingle();
      console.log(`Profile for ${d.name}:`, p);
    } else {
      console.log(`Signing up ${d.name} (${d.email})...`);
      const { data: signUpData, error: signUpErr } = await client.auth.signUp({
        email: d.email,
        password: "Password123!",
        options: {
          data: {
            full_name: d.name,
            role: "delivery_agent",
            phone: d.phone,
          },
        },
      });

      if (signUpData?.user) {
        console.log(`Driver ${d.name} signed up successfully! User ID: ${signUpData.user.id}`);
        driverProfileIds[d.name] = signUpData.user.id;
      } else {
        console.error(`Failed to sign up ${d.name}:`, signUpErr);
      }
    }
  }

  console.log("\nResolved Real Profile IDs for Drivers:", driverProfileIds);

  // Now test Admin creating an order and assigning to Aswin using Aswin's REAL profiles.id!
  const adminClient = getEphemeralAuthClient();
  const adminEmail = `admin_tester_${Date.now()}@jss.com`;
  const { data: adminAuth } = await adminClient.auth.signUp({
    email: adminEmail,
    password: "Password123!",
    options: {
      data: { full_name: "Operations Admin", role: "admin" },
    },
  });

  const { data: testOrder, error: oErr } = await adminClient.from("orders").insert([
    {
      order_number: `ORD-TEST-${Date.now()}`,
      customer_name: "Customer For FK Test",
      customer_email: "cust_fk@example.com",
      customer_phone: "07123456789",
      delivery_address: { street: "1 High St", city: "Stroud", postcode: "GL5 1AA" },
      subtotal: 50.0,
      total: 54.99,
      status: "Processing",
      payment_status: "Paid",
    },
  ]).select().single();

  console.log("Created test order:", testOrder?.id, "Error:", oErr);

  if (testOrder && driverProfileIds["Aswin"]) {
    console.log("\nAttempting assignment with REAL Aswin profile ID:", driverProfileIds["Aswin"]);

    const { data: assignRes, error: assignErr } = await adminClient.from("delivery_assignments").insert([
      {
        order_id: testOrder.id,
        driver_id: driverProfileIds["Aswin"],
        driver_name: "Aswin",
        vehicle_identifier: "Van A (GL73 ASW)",
        vehicle_plate: "GL73 ASW",
        status: "Assigned",
        route_area: "Stroud",
      },
    ]).select().single();

    console.log("Assignment result:", assignRes);
    console.log("Assignment error:", assignErr);
  }
}

testDriverProfiles();
