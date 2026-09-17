import { supabase } from "../src/lib/supabase";
import { INITIAL_ACTIVE_AGENTS } from "../src/lib/delivery-agent-service";

async function syncAswinAstin() {
  console.log("=== SYNCING ASWIN AND ASTIN TO SUPABASE ===");

  for (const ag of INITIAL_ACTIVE_AGENTS) {
    const { data: existing } = await (supabase.from("delivery_agents") as any)
      .select("id, full_name, email")
      .or(`id.eq.${ag.id},email.eq.${ag.email}`)
      .maybeSingle();

    if (!existing) {
      const { data: inserted, error: inErr } = await (supabase.from("delivery_agents") as any)
        .insert({
          id: ag.id,
          agent_code: ag.agent_code,
          full_name: ag.full_name,
          email: ag.email,
          phone: ag.phone,
          address: ag.address,
          delivery_zone: ag.delivery_zone,
          vehicle_type: ag.vehicle_type,
          vehicle_plate: ag.vehicle_plate,
          status: ag.status,
          rating: ag.rating,
          total_deliveries: ag.total_deliveries,
          completed_deliveries: ag.completed_deliveries,
          active_deliveries: 0,
        })
        .select();

      console.log(`Inserted ${ag.full_name}:`, inserted, "Error:", inErr);
    } else {
      console.log(`${ag.full_name} already in database.`);
    }
  }

  const { data: all } = await (supabase.from("delivery_agents") as any).select("id, full_name, email, agent_code, active_deliveries");
  console.log("Current delivery_agents in Supabase:", all);
}

syncAswinAstin();
