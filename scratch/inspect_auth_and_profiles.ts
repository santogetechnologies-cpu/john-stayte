import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspectProfilesWithAdmin() {
  const email = `admin_probe_${Date.now()}@jss.com`;
  const { data: auth, error: authErr } = await client.auth.signUp({
    email,
    password: "Password123!",
    options: {
      data: { full_name: "Admin Probe", role: "admin" }
    }
  });

  console.log("Admin probe created:", auth?.user?.id, "Error:", authErr?.message);

  if (auth?.user) {
    // Now query all profiles
    const { data: profs, error: pErr } = await client.from("profiles").select("*");
    console.log("All profiles in Supabase:", profs?.length, profs, "Error:", pErr);

    // Query all delivery_agents
    const { data: da, error: daErr } = await client.from("delivery_agents").select("*");
    console.log("All delivery_agents in Supabase:", da?.length, da, "Error:", daErr);

    // Query all orders
    const { data: ords, error: oErr } = await client.from("orders").select("id, order_number, status, customer_name, assigned_driver");
    console.log("All orders in Supabase:", ords?.length, ords, "Error:", oErr);

    // Query all delivery_assignments
    const { data: assigns, error: asErr } = await client.from("delivery_assignments").select("*");
    console.log("All delivery_assignments in Supabase:", assigns?.length, assigns, "Error:", asErr);
  }
}

inspectProfilesWithAdmin();
