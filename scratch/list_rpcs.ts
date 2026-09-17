import { supabase } from "../src/lib/supabase";

async function listRpcs() {
  const commonRpcs = [
    "admin_delete_customer",
    "admin_delete_user",
    "admin_delete_product",
    "admin_delete_driver",
    "delete_driver",
    "delete_user",
    "admin_delete_delivery_agent",
  ];

  for (const r of commonRpcs) {
    const { data, error } = await (supabase.rpc as any)(r, { dummy: 1 });
    console.log(`RPC ${r}:`, error?.message || "Found!");
  }
}

listRpcs();
