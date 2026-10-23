import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n")
    .filter(l=>l&&!l.startsWith("#"))
    .map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()]})
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});

// Order ID from returnUrl in the successful Elavon session fqd3pp3d6ft2qdgt484f3wckdwtm
const orderId = "27282fd2-6937-4bb0-8de0-d8523f1e4aa0";

const { data: order } = await supabase.from("orders")
  .select("id, order_number, status, payment_status, total, customer_name, customer_email, created_at")
  .eq("id", orderId).maybeSingle();
console.log("Order:", JSON.stringify(order, null, 2));

const { data: pay } = await supabase.from("payments")
  .select("*").eq("order_id", orderId).maybeSingle();
console.log("Payment:", JSON.stringify(pay, null, 2));

// Also find the order for the new test (Chandran Manoharan £0.10 from today's screenshot)
console.log("\n--- Searching for Chandran order from today ---");
const { data: chandranOrders } = await supabase.from("orders")
  .select("id, order_number, status, payment_status, total, customer_name, created_at")
  .ilike("customer_name", "%chandran%")
  .order("created_at", {ascending: false})
  .limit(5);
console.log("Chandran orders:", JSON.stringify(chandranOrders, null, 2));
