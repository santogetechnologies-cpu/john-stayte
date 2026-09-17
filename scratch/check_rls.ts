import { supabase } from "../src/lib/supabase";

async function checkRls() {
  console.log("=== CHECKING RLS AND RPCs ===");

  // Let's check RPCs
  const { data: rpcTest, error: rpcErr } = await (supabase.rpc as any)("admin_delete_driver", {
    target_driver_id: "2ba21774-fc9c-4922-a10f-07e1dcfc799e"
  });
  console.log("admin_delete_driver RPC result:", rpcTest, "Error:", rpcErr);

  // Let's check if there's any update policy
  const { data: updateData, error: updateErr } = await (supabase.from("delivery_agents") as any)
    .update({ status: "Inactive" })
    .eq("id", "2ba21774-fc9c-4922-a10f-07e1dcfc799e")
    .select();
  console.log("Update status result:", updateData, "Error:", updateErr);
}

checkRls();
