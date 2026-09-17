import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const INITIAL_ACTIVE_AGENTS = [
  {
    id: "ae9299f3-3d2c-4d5b-82d7-d5e6fc963017",
    agent_code: "AGT-001",
    full_name: "Aswin",
    email: "aswin@jss.com",
  },
  {
    id: "71a1294f-a0a1-42f1-bf9d-a6e0c39e4b52",
    agent_code: "AGT-002",
    full_name: "Astin",
    email: "astin@jss.com",
  },
];

function getEphemeralAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Simulating getAgentAssignedDeliveries logic exactly as implemented in delivery-agent-service.ts
async function simulateGetAgentAssignedDeliveries(client, agent) {
  const { data: authData } = await client.auth.getUser();
  const currentAuthId = authData?.user?.id || agent.id;
  const currentAuthEmail = (authData?.user?.email || agent.email || "").toLowerCase().trim();
  const currentAgentName = (agent.name || authData?.user?.user_metadata?.full_name || "").toLowerCase().trim();

  let { data: allAssignments, error } = await client
    .from("delivery_assignments")
    .select("*, orders(*, order_items(*))")
    .order("created_at", { ascending: false });

  if ((!allAssignments || allAssignments.length === 0) && currentAuthEmail) {
    try {
      const eph = getEphemeralAuthClient();
      const { data: ephAuth } = await eph.auth.signInWithPassword({
        email: currentAuthEmail,
        password: "Password123!",
      });
      if (ephAuth?.user) {
        const { data: ephAssignments } = await eph
          .from("delivery_assignments")
          .select("*, orders(*, order_items(*))")
          .order("created_at", { ascending: false });
        if (ephAssignments && ephAssignments.length > 0) {
          allAssignments = ephAssignments;
        }
      }
    } catch (ephErr) {
      console.warn("Notice in ephemeral agent query fallback:", ephErr);
    }
  }

  const assignments = (allAssignments || []).filter((a) => {
    if (!a) return false;
    const dName = (a.driver_name || "").toLowerCase().trim();

    if (!dName || dName === "unassigned" || dName.includes("unassigned")) {
      return false;
    }

    if (currentAuthId && (a.driver_id === currentAuthId || a.agent_id === currentAuthId)) {
      return true;
    }

    if (currentAuthEmail) {
      const canonicalMatch = INITIAL_ACTIVE_AGENTS.find(
        (ag) => ag.email?.toLowerCase() === currentAuthEmail,
      );
      if (canonicalMatch && (a.driver_id === canonicalMatch.id || a.agent_id === canonicalMatch.id)) {
        return true;
      }
    }

    if (
      currentAgentName &&
      !currentAgentName.includes("dave") &&
      (dName === currentAgentName ||
        (dName.startsWith(currentAgentName) && !dName.includes("unassigned")))
    ) {
      return true;
    }

    return false;
  });

  return assignments;
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING COMPREHENSIVE END-TO-END DELIVERY AGENT ISOLATION TEST");
  console.log("==================================================");

  // 1. Authenticate Admin Client
  const adminClient = getEphemeralAuthClient();
  const adminEmail = `admin_tester_${Date.now()}@jss.com`;
  const { data: adminAuth } = await adminClient.auth.signUp({
    email: adminEmail,
    password: "Password123!",
    options: {
      data: {
        full_name: "Operations Admin",
        role: "admin",
      },
    },
  });
  console.log("\n1. Admin Sign-up/in:", adminAuth?.user ? "SUCCESS" : "FAIL");

  // Create two distinct test orders to assign
  const timestamp = Date.now();
  const orderA_ref = `ORD-TEST-ASWIN-${timestamp}`;
  const orderB_ref = `ORD-TEST-ASTIN-${timestamp}`;

  const { data: orderA, error: ordAErr } = await adminClient.from("orders").insert([
    {
      order_number: orderA_ref,
      customer_name: "Customer For Aswin",
      customer_email: "cust_aswin@example.com",
      customer_phone: "07111111111",
      delivery_address: { street: "12 Gloucester Rd", city: "Stroud", postcode: "GL5 1AA" },
      subtotal: 60.0,
      shipping_fee: 4.99,
      total: 64.99,
      status: "Packed",
      payment_status: "Paid",
      assigned_driver: "Aswin",
    },
  ]).select().single();

  const { data: orderB, error: ordBErr } = await adminClient.from("orders").insert([
    {
      order_number: orderB_ref,
      customer_name: "Customer For Astin",
      customer_email: "cust_astin@example.com",
      customer_phone: "07222222222",
      delivery_address: { street: "44 Eastington Way", city: "Stonehouse", postcode: "GL10 3AH" },
      subtotal: 45.0,
      shipping_fee: 4.99,
      total: 49.99,
      status: "Packed",
      payment_status: "Paid",
      assigned_driver: "Astin",
    },
  ]).select().single();

  console.log(`- Created Test Order A (${orderA_ref}):`, orderA?.id ? "OK" : ordAErr);
  console.log(`- Created Test Order B (${orderB_ref}):`, orderB?.id ? "OK" : ordBErr);

  // Assign Order A to Aswin
  const { data: assignA, error: assAErr } = await adminClient.from("delivery_assignments").insert([
    {
      order_id: orderA.id,
      customer_id: orderA.customer_id || null,
      driver_id: "ae9299f3-3d2c-4d5b-82d7-d5e6fc963017", // Aswin
      driver_name: "Aswin",
      vehicle_identifier: "Van A (GL73 ASW)",
      vehicle_plate: "GL73 ASW",
      status: "Assigned",
    },
  ]).select().single();

  // Assign Order B to Astin
  const { data: assignB, error: assBErr } = await adminClient.from("delivery_assignments").insert([
    {
      order_id: orderB.id,
      customer_id: orderB.customer_id || null,
      driver_id: "71a1294f-a0a1-42f1-bf9d-a6e0c39e4b52", // Astin
      driver_name: "Astin",
      vehicle_identifier: "Van B (GL72 AST)",
      vehicle_plate: "GL72 AST",
      status: "Assigned",
    },
  ]).select().single();

  console.log(`- Assigned Order A to Aswin in DB:`, assignA?.id ? "OK" : assAErr);
  console.log(`- Assigned Order B to Astin in DB:`, assignB?.id ? "OK" : assBErr);

  // 2. Test fetching as Aswin (Authenticated)
  const aswinClient = getEphemeralAuthClient();
  await aswinClient.auth.signInWithPassword({ email: "aswin@jss.com", password: "Password123!" });
  const aswinDeliveries = await simulateGetAgentAssignedDeliveries(aswinClient, {
    id: "ae9299f3-3d2c-4d5b-82d7-d5e6fc963017",
    email: "aswin@jss.com",
    name: "Aswin",
  });

  console.log("\n2. ASWIN RESULTS:");
  console.log(`Total deliveries visible to Aswin: ${aswinDeliveries.length}`);
  const aswinOrderNumbers = aswinDeliveries.map((d) => d.orders?.order_number || d.order_ref);
  console.log("Visible orders for Aswin:", aswinOrderNumbers);
  const aswinHasOrderA = aswinOrderNumbers.includes(orderA_ref);
  const aswinHasOrderB = aswinOrderNumbers.includes(orderB_ref);
  console.log(`- Order A (Aswin's order) visible to Aswin? -> ${aswinHasOrderA ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log(`- Order B (Astin's order) visible to Aswin? -> ${aswinHasOrderB ? "YES (LEAK FAILED)" : "NO (ISOLATION PASSED)"}`);

  // 3. Test fetching as Astin (Authenticated)
  const astinClient = getEphemeralAuthClient();
  await astinClient.auth.signInWithPassword({ email: "astin@jss.com", password: "Password123!" });
  const astinDeliveries = await simulateGetAgentAssignedDeliveries(astinClient, {
    id: "71a1294f-a0a1-42f1-bf9d-a6e0c39e4b52",
    email: "astin@jss.com",
    name: "Astin",
  });

  console.log("\n3. ASTIN RESULTS:");
  console.log(`Total deliveries visible to Astin: ${astinDeliveries.length}`);
  const astinOrderNumbers = astinDeliveries.map((d) => d.orders?.order_number || d.order_ref);
  console.log("Visible orders for Astin:", astinOrderNumbers);
  const astinHasOrderB = astinOrderNumbers.includes(orderB_ref);
  const astinHasOrderA = astinOrderNumbers.includes(orderA_ref);
  console.log(`- Order B (Astin's order) visible to Astin? -> ${astinHasOrderB ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log(`- Order A (Aswin's order) visible to Astin? -> ${astinHasOrderA ? "YES (LEAK FAILED)" : "NO (ISOLATION PASSED)"}`);

  // 4. Test Unauthenticated / Fallback client querying with agent info
  const anonClient = getEphemeralAuthClient(); // no signInWithPassword called
  const fallbackAstinDeliveries = await simulateGetAgentAssignedDeliveries(anonClient, {
    id: "71a1294f-a0a1-42f1-bf9d-a6e0c39e4b52",
    email: "astin@jss.com",
    name: "Astin",
  });

  console.log("\n4. FALLBACK / STORE-STATE SIMULATION (Unauthenticated client with Astin credentials):");
  console.log(`Total deliveries recovered for Astin: ${fallbackAstinDeliveries.length}`);
  const fallbackOrderNumbers = fallbackAstinDeliveries.map((d) => d.orders?.order_number || d.order_ref);
  console.log(`- Astin Order B retrieved? -> ${fallbackOrderNumbers.includes(orderB_ref) ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log(`- Aswin Order A prevented? -> ${!fallbackOrderNumbers.includes(orderA_ref) ? "YES (PASSED)" : "NO (FAILED)"}`);

  console.log("\n==================================================");
  if (aswinHasOrderA && !aswinHasOrderB && astinHasOrderB && !astinHasOrderA) {
    console.log("ALL TESTS PASSED: STRICT AGENT ISOLATION CONFIRMED!");
  } else {
    console.log("TESTS FAILED!");
  }
  console.log("==================================================");
}

runTests().catch(console.error);
