import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env", "utf8");
const envVars = Object.fromEntries(
  env.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => {
    const idx = l.indexOf("=");
    return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
  }),
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BASE_URL = "https://api.sandbox.elavonpayments.com";
const authHeader = `Basic ${Buffer.from(`${envVars.ELAVON_MERCHANT_ALIAS}:${envVars.ELAVON_SECRET_KEY}`).toString("base64")}`;

async function debug() {
  console.log("=".repeat(70));
  console.log("ELAVON PAYMENT VERIFICATION DEBUGGER");
  console.log("=".repeat(70));

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, customer_name")
    .order("created_at", { ascending: false })
    .limit(8);

  for (const o of orders) {
    console.log(`\nOrder: ${o.order_number} | Payment: ${o.payment_status} | Total: £${o.total} | ${o.customer_name} | ${o.created_at}`);

    const { data: pay } = await supabase.from("payments").select("payment_intent_id, payment_status, metadata").eq("order_id", o.id).maybeSingle();
    if (!pay) { console.log("  -> No payment record"); continue; }
    console.log(`  Session ID: ${pay.payment_intent_id} | DB status: ${pay.payment_status}`);

    if (o.payment_status === "Paid") { console.log("  -> Already Paid, skipping"); continue; }
    if (!pay.payment_intent_id) { console.log("  -> No session ID"); continue; }

    const sr = await fetch(`${BASE_URL}/payment-sessions/${pay.payment_intent_id}`, { headers: { Authorization: authHeader, "Content-Type": "application/json" } });
    console.log(`  Elavon session HTTP: ${sr.status}`);
    if (!sr.ok) { console.log("  ❌ Session query failed: " + (await sr.text()).slice(0, 200)); continue; }

    const sd = await sr.json();
    console.log(`  Session state: "${sd.status || sd.state || "N/A"}"`);
    console.log(`  Session transaction field: ${JSON.stringify(sd.transaction)}`);

    if (!sd.transaction) { console.log("  ⚠️  No transaction on session — payment redirect may not have completed"); continue; }

    const txUrl = typeof sd.transaction === "string" ? sd.transaction : sd.transaction.href;
    const tr = await fetch(txUrl, { headers: { Authorization: authHeader, "Content-Type": "application/json" } });
    console.log(`  Transaction HTTP: ${tr.status}`);
    if (!tr.ok) { console.log("  ❌ TX query failed: " + (await tr.text()).slice(0, 200)); continue; }

    const td = await tr.json();
    const rawStatus = (td.status || td.state || "").toUpperCase();
    console.log(`  TX ID: ${td.id}`);
    console.log(`  TX Status (raw): "${rawStatus}"`);
    console.log(`  TX Amount: ${JSON.stringify(td.total)}`);
    console.log(`  TX Keys: ${Object.keys(td).join(", ")}`);

    const captured = ["CAPTURED", "FUNDED", "SETTLED", "COMPLETED"];
    if (captured.includes(rawStatus)) {
      console.log(`  ✅ IS captured — verify should work. But order still Pending — redirect callback likely did not fire.`);
    } else {
      console.log(`  ❌ Status "${rawStatus}" NOT in captured list: ${JSON.stringify(captured)}`);
      console.log(`  THIS IS THE ROOT CAUSE — need to add "${rawStatus}" or handle differently`);
    }
  }
}

debug().catch(console.error);
// Also query ALL Elavon sessions to find the captured one from today
async function findTodayCapturedSessions() {
  console.log("\n=== SEARCHING ELAVON FOR TODAY's TRANSACTIONS ===");
  // The transaction in the Elavon dashboard was from today: 10/23/2026 10:53 AM
  // Try to list payment sessions (if API supports it)
  const listRes = await fetch(`${BASE_URL}/payment-sessions?limit=10`, {
    headers: { Authorization: authHeader, "Content-Type": "application/json" }
  });
  console.log("List sessions HTTP:", listRes.status);
  if (listRes.ok) {
    const data = await listRes.json();
    console.log("Sessions:", JSON.stringify(data).slice(0, 1000));
  } else {
    const err = await listRes.text();
    console.log("Error:", err.slice(0, 300));
  }
}
findTodayCapturedSessions().catch(console.error);
