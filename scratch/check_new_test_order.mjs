import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n")
    .filter(l=>l&&!l.startsWith("#"))
    .map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()]})
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const BASE_URL = "https://api.sandbox.elavonpayments.com";
const authHeader = `Basic ${Buffer.from(`${env.ELAVON_MERCHANT_ALIAS}:${env.ELAVON_SECRET_KEY}`).toString("base64")}`;

// The order still showing Pending from today's test — JSS-288788
const { data: order } = await supabase.from("orders")
  .select("id, order_number, status, payment_status, total, customer_name, customer_email, created_at")
  .eq("order_number", "JSS-288788").maybeSingle();
console.log("Order JSS-288788:", JSON.stringify(order, null, 2));

const { data: pay } = await supabase.from("payments")
  .select("*").eq("order_id", order?.id).maybeSingle();
console.log("Payment record:", JSON.stringify(pay, null, 2));

if (pay?.payment_intent_id) {
  console.log("\n--- Checking Elavon session:", pay.payment_intent_id, "---");
  const sr = await fetch(`${BASE_URL}/payment-sessions/${pay.payment_intent_id}`, {
    headers: { Authorization: authHeader, "Content-Type": "application/json" }
  });
  const sd = await sr.json();
  console.log("Session returnUrl:", sd.returnUrl);
  console.log("Session cancelUrl:", sd.cancelUrl);
  console.log("Session transaction:", JSON.stringify(sd.transaction));
  console.log("Session expiresAt:", sd.expiresAt);
  console.log("Session invoiceNumber:", sd.invoiceNumber);
  console.log("Session url (HPP link):", sd.url);
}

// Also check what the Elavon transaction list says for today
console.log("\n--- All Elavon transactions (for cross-reference) ---");
const txRes = await fetch(`${BASE_URL}/transactions?limit=10`, {
  headers: { Authorization: authHeader, "Content-Type": "application/json" }
});
const txList = await txRes.json();
for (const tx of txList.items || []) {
  console.log(`TX: ${tx.id} | state: ${tx.state} | amount: ${tx.total?.amount} ${tx.total?.currencyCode} | invoice: ${tx.invoiceNumber} | date: ${tx.createdAt}`);
}
