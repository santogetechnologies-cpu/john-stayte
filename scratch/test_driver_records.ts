import { supabase } from "../src/lib/supabase";

async function testDeleteCheck() {
  console.log("=== CHECKING ACTIVE ASSIGNMENTS AND ORDERS FOR ALL DRIVERS ===");

  const { data: drivers } = await (supabase.from("delivery_agents") as any).select("*");

  for (const d of drivers) {
    console.log(`\nDriver: ${d.full_name} (ID: ${d.id})`);

    // 1. Check real active assignments in delivery_assignments
    const { data: activeAssignments, error: aErr } = await (supabase.from("delivery_assignments") as any)
      .select("id, status, order_id")
      .or(`agent_id.eq.${d.id},driver_id.eq.${d.id}`)
      .in("status", ["assigned", "in_transit", "pending", "active", "out_for_delivery", "out of delivery"]);

    console.log("Active assignments in delivery_assignments:", activeAssignments || [], "Error:", aErr);

    // 2. Check active orders in orders table
    const { data: activeOrders, error: oErr } = await (supabase.from("orders") as any)
      .select("id, order_number, status, delivery_driver_id, assigned_driver_id")
      .or(`delivery_driver_id.eq.${d.id},assigned_driver_id.eq.${d.id}`)
      .in("status", ["Pending", "Processing", "Approved", "Out for Delivery"]);

    console.log("Active orders referencing driver:", activeOrders || [], "Error:", oErr);

    // 3. Check historical records
    const { data: historicalAssignments } = await (supabase.from("delivery_assignments") as any)
      .select("id, status")
      .or(`agent_id.eq.${d.id},driver_id.eq.${d.id}`);

    const { data: historicalOrders } = await (supabase.from("orders") as any)
      .select("id, order_number, status")
      .or(`delivery_driver_id.eq.${d.id},assigned_driver_id.eq.${d.id}`);

    console.log("Historical assignments count:", historicalAssignments?.length || 0);
    console.log("Historical orders count:", historicalOrders?.length || 0);
  }
}

testDeleteCheck();
