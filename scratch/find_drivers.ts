import { supabase } from "../src/lib/supabase";

async function findAswinAstin() {
  console.log("=== SEARCHING FOR ASWIN AND ASTIN ===");

  const { data: profiles } = await (supabase.from("profiles") as any).select("*");
  console.log("All profiles in DB:", profiles);

  const { data: authUsers } = await (supabase.from("delivery_agents") as any).select("*");
  console.log("All delivery_agents:", authUsers);
}

findAswinAstin();
