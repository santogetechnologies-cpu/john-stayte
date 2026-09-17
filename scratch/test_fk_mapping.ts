import { supabase } from "../src/lib/supabase";

async function testFk() {
  console.log("=== TESTING DELIVERY_ASSIGNMENTS FK RELATIONSHIPS ===");

  // Check what drivers exist in delivery_agents table
  const { data: daRows } = await (supabase.from("delivery_agents") as any).select("id, full_name, email");
  console.log("delivery_agents rows in DB:", daRows);

  // Check what users/profiles exist
  const { data: profRows } = await (supabase.from("profiles") as any).select("id, full_name, email, role");
  console.log("profiles rows in DB:", profRows);

  // Let's test what order exists
  const { data: ordRows } = await (supabase.from("orders") as any).select("id, order_number").limit(1);
  console.log("orders rows in DB:", ordRows);

  const testOrderId = ordRows && ordRows[0] ? ordRows[0].id : null;

  // Test 1: driver_id = null
  console.log("\n--- Testing insert with driver_id = null ---");
  const { data: res1, error: err1 } = await (supabase.from("delivery_assignments") as any)
    .insert([
      {
        order_id: testOrderId,
        driver_name: "Unassigned Test",
        driver_id: null,
        agent_id: null,
        vehicle_identifier: "Test Van",
        route_area: "Gloucestershire",
        status: "Pending",
      },
    ])
    .select();
  console.log("Result 1 (null driver_id):", res1, "Error:", err1);

  // If there's a delivery_agent row, test using delivery_agents.id
  if (daRows && daRows.length > 0) {
    const daId = daRows[0].id;
    console.log(`\n--- Testing insert with driver_id = delivery_agents.id (${daId}) ---`);
    const { data: res2, error: err2 } = await (supabase.from("delivery_assignments") as any)
      .insert([
        {
          order_id: testOrderId,
          driver_name: daRows[0].full_name,
          driver_id: daId,
          agent_id: daId,
          vehicle_identifier: "Test Van",
          route_area: "Gloucestershire",
          status: "Pending",
        },
      ])
      .select();
    console.log("Result 2 (delivery_agents.id):", res2, "Error:", err2);
  }

  // If there's a profile row, test using profiles.id
  if (profRows && profRows.length > 0) {
    const profId = profRows[0].id;
    console.log(`\n--- Testing insert with driver_id = profiles.id (${profId}) ---`);
    const { data: res3, error: err3 } = await (supabase.from("delivery_assignments") as any)
      .insert([
        {
          order_id: testOrderId,
          driver_name: profRows[0].full_name || "Driver",
          driver_id: profId,
          agent_id: null,
          vehicle_identifier: "Test Van",
          route_area: "Gloucestershire",
          status: "Pending",
        },
      ])
      .select();
    console.log("Result 3 (profiles.id):", res3, "Error:", err3);
  }
}

testFk();
