import { supabase } from "../src/lib/supabase";

async function testDelete() {
  console.log("=== TESTING DELETE ON DAVE MILLER ===");
  const agentId = "2ba21774-fc9c-4922-a10f-07e1dcfc799e";

  const { error: delErr } = await (supabase.from("delivery_agents") as any)
    .delete()
    .eq("id", agentId);

  console.log("Direct delete result error:", delErr);

  const { data: remaining } = await (supabase.from("delivery_agents") as any).select("id, full_name");
  console.log("Remaining in delivery_agents:", remaining);
}

testDelete();
