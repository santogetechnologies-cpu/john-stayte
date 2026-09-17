import { supabase } from "../src/lib/supabase";

async function inspectDriverIdFk() {
  console.log("=== INSPECTING driver_id FK TARGET TABLE ===");

  // 1. Fetch current delivery_agents in Supabase
  const { data: daList } = await (supabase.from("delivery_agents") as any).select("*");
  console.log("Current delivery_agents in Supabase:", daList);

  // 2. Fetch current profiles in Supabase
  const { data: profList } = await (supabase.from("profiles") as any).select("*");
  console.log("Current profiles in Supabase:", profList);

  // 3. Fetch orders in Supabase
  const { data: orders } = await (supabase.from("orders") as any).select("id, order_number");
  console.log("Current orders in Supabase:", orders);
}

inspectDriverIdFk();
