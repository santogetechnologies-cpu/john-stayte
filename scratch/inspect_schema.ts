import { supabase } from "../src/lib/supabase";

async function inspectSchema() {
  console.log("=== INSPECTING SCHEMA AND FOREIGN KEYS ===");

  const { data: orderCols } = await (supabase.from("orders") as any).select("*").limit(1);
  console.log("Orders columns:", orderCols && orderCols[0] ? Object.keys(orderCols[0]) : "No orders found");

  const { data: assignCols } = await (supabase.from("delivery_assignments") as any).select("*").limit(1);
  console.log("Delivery assignments columns:", assignCols && assignCols[0] ? Object.keys(assignCols[0]) : "Empty table");

  const { data: reviewCols } = await (supabase.from("reviews") as any).select("*").limit(1);
  console.log("Reviews columns:", reviewCols && reviewCols[0] ? Object.keys(reviewCols[0]) : "Empty table");
}

inspectSchema();
