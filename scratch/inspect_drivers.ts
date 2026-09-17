import { supabase } from "../src/lib/supabase";

async function inspectDrivers() {
  console.log("=== INSPECTING DRIVERS IN DATABASE ===");

  // 1. Fetch all delivery_agents
  const { data: agents, error: aErr } = await (supabase.from("delivery_agents") as any).select("*");
  if (aErr) {
    console.error("Error fetching delivery_agents:", aErr);
    return;
  }

  console.log(`Found ${agents.length} drivers in delivery_agents:`);
  for (const a of agents) {
    console.log(`\n--- Driver: ${a.full_name} (${a.email}) ---`);
    console.log(`ID: ${a.id}`);
    console.log(`User/Profile ID: ${a.user_id}`);
    console.log(`Agent Code: ${a.agent_code}`);
    console.log(`Status: ${a.status}`);
    console.log(`Active Deliveries field: ${a.active_deliveries}`);
    console.log(`Total Deliveries field: ${a.total_deliveries}`);

    // Check delivery_assignments
    const { data: assignments, error: asErr } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, status, assigned_at, delivered_at")
      .eq("agent_id", a.id);
    console.log(`Assignments for agent_id=${a.id}: count=${assignments?.length || 0}`);
    if (assignments && assignments.length > 0) {
      console.log("Assignment details:", assignments);
    }

    // Check if user_id was used in delivery_assignments
    if (a.user_id && a.user_id !== a.id) {
      const { data: userAssignments } = await (supabase.from("delivery_assignments") as any)
        .select("id, order_id, status, assigned_at, delivered_at")
        .eq("agent_id", a.user_id);
      console.log(`Assignments for agent_id (user_id)=${a.user_id}: count=${userAssignments?.length || 0}`);
      if (userAssignments && userAssignments.length > 0) {
        console.log("User assignment details:", userAssignments);
      }
    }

    // Check orders table
    const { data: ordersWithDriver } = await (supabase.from("orders") as any)
      .select("id, order_number, status, delivery_driver_id, assigned_driver_id")
      .or(`delivery_driver_id.eq.${a.id},assigned_driver_id.eq.${a.id}`);
    console.log(`Orders directly referencing driver ID ${a.id}: count=${ordersWithDriver?.length || 0}`);
    if (ordersWithDriver && ordersWithDriver.length > 0) {
      console.log("Orders details:", ordersWithDriver);
    }

    // Check profiles
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("id, email, full_name, role")
      .or(`id.eq.${a.user_id || a.id},email.eq.${a.email}`);
    console.log(`Profiles for driver:`, profile);

    // Check reviews
    const { data: reviews } = await (supabase.from("reviews") as any)
      .select("id, rating, comment")
      .eq("delivery_agent_id", a.id);
    console.log(`Reviews for agent_id=${a.id}: count=${reviews?.length || 0}`);
  }

  // 2. Also check all delivery_assignments table records in total
  const { data: allAssignments } = await (supabase.from("delivery_assignments") as any).select("*");
  console.log("\n=== ALL DELIVERY ASSIGNMENTS IN DB ===");
  console.log(`Total assignments: ${allAssignments?.length || 0}`);
  console.log(allAssignments);
}

inspectDrivers();
