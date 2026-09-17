import { supabase } from "../src/lib/supabase";

async function inspectForeignKeys() {
  console.log("=== INSPECTING DATABASE FOREIGN KEYS & SCHEMA ===");

  // 1. Try querying PostgreSQL information_schema or test insert with fake ID to see exact FK message
  const testFakeId = "00000000-0000-0000-0000-000000000000";

  // Test insert into delivery_assignments
  const { data: testIns, error: testErr } = await (supabase.from("delivery_assignments") as any)
    .insert({
      order_id: testFakeId,
      driver_id: testFakeId,
    })
    .select();

  console.log("FK test error:", testErr);

  // 2. Check all columns of delivery_assignments
  const { data: cols, error: cErr } = await (supabase.from("delivery_assignments") as any)
    .select("*")
    .limit(1);
  console.log("delivery_assignments sample:", cols);

  // 3. Inspect delivery_agents in Supabase
  const { data: agents, error: aErr } = await (supabase.from("delivery_agents") as any).select("*");
  console.log("\n=== ALL delivery_agents in DB ===");
  console.log(agents);

  // 4. Inspect profiles in Supabase
  const { data: profiles, error: pErr } = await (supabase.from("profiles") as any).select("*");
  console.log("\n=== ALL profiles in DB ===");
  console.log(profiles);

  // 5. Inspect orders in Supabase
  const { data: orders, error: oErr } = await (supabase.from("orders") as any).select("id, order_number, status, total, customer_id, customer_name");
  console.log("\n=== ALL orders in DB ===");
  console.log(orders);
}

inspectForeignKeys();
