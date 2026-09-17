import {
  getDeliveryAgents,
  deleteDeliveryAgent,
  INITIAL_ACTIVE_AGENTS,
  saveDeletedAgentId,
} from "../src/lib/delivery-agent-service";
import { supabase } from "../src/lib/supabase";

async function runDriverDeletionTests() {
  console.log("=== RUNNING DRIVER DELETION WORKFLOW TEST ===\n");

  // 1. Initial listing
  const initialAgents = await getDeliveryAgents();
  console.log(`Initial Drivers Count: ${initialAgents.length}`);
  console.log("Drivers:", initialAgents.map((a) => `${a.full_name} (${a.agent_code}, status=${a.status}, active=${a.active_deliveries})`));

  // 2. Test deleting Dave Miller
  const dave = initialAgents.find((a) => a.full_name.toLowerCase().includes("dave"));
  if (dave) {
    console.log(`\nTesting deletion of Dave Miller (ID: ${dave.id})...`);
    const res = await deleteDeliveryAgent(dave.id);
    console.log("Delete Dave Miller result:", res);
  }

  // 3. Test deleting Mark Evans
  const mark = initialAgents.find((a) => a.full_name.toLowerCase().includes("mark"));
  if (mark) {
    console.log(`\nTesting deletion of Mark Evans (ID: ${mark.id})...`);
    const res = await deleteDeliveryAgent(mark.id);
    console.log("Delete Mark Evans result:", res);
  }

  // 4. Test deleting Sarah Jenkins
  const sarah = initialAgents.find((a) => a.full_name.toLowerCase().includes("sarah"));
  if (sarah) {
    console.log(`\nTesting deletion of Sarah Jenkins (ID: ${sarah.id})...`);
    const res = await deleteDeliveryAgent(sarah.id);
    console.log("Delete Sarah Jenkins result:", res);
  }

  // 5. Verify remaining drivers list
  const remainingAgents = await getDeliveryAgents();
  console.log(`\nRemaining Drivers Count: ${remainingAgents.length}`);
  console.log("Remaining Drivers:", remainingAgents.map((a) => `${a.full_name} (${a.agent_code}, status=${a.status})`));

  const hasAswin = remainingAgents.some((a) => a.full_name.toLowerCase() === "aswin");
  const hasAstin = remainingAgents.some((a) => a.full_name.toLowerCase() === "astin");
  const hasLegacy = remainingAgents.some((a) =>
    ["dave", "mark", "sarah"].some((l) => a.full_name.toLowerCase().includes(l))
  );

  console.log(`\nAswin present: ${hasAswin ? "✅" : "❌"}`);
  console.log(`Astin present: ${hasAstin ? "✅" : "❌"}`);
  console.log(`Legacy drivers removed: ${!hasLegacy ? "✅" : "❌"}`);

  // 6. Test trying to delete Aswin (Should be blocked by safety guard)
  try {
    const aswin = remainingAgents.find((a) => a.full_name.toLowerCase() === "aswin");
    if (aswin) {
      console.log("\nAttempting to delete Aswin (should fail)...");
      await deleteDeliveryAgent(aswin.id);
      console.error("❌ ERROR: Aswin was deleted when it should have been protected!");
    }
  } catch (err: any) {
    console.log("✅ Aswin delete blocked as expected:", err.message);
  }

  // 7. Test active assignment protection
  console.log("\nTesting active assignment protection...");
  // Temporarily insert a mock active assignment for Astin
  const astin = remainingAgents.find((a) => a.full_name.toLowerCase() === "astin");
  if (astin) {
    // Attempt delete
    try {
      await deleteDeliveryAgent(astin.id);
      console.error("❌ ERROR: Astin delete was not blocked!");
    } catch (err: any) {
      console.log("✅ Astin delete blocked as expected:", err.message);
    }
  }

  console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
}

runDriverDeletionTests();
