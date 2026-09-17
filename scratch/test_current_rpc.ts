import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testCurrentRpc() {
  console.log("Testing current RPC behavior...");
  
  // 1. Unauthenticated call
  const { data: unauthData, error: unauthErr } = await client.rpc("record_verified_application_email", {
    p_email: "test@example.com"
  });
  console.log("Unauthenticated RPC result:", { data: unauthData, error: unauthErr?.message });

  // 2. Authenticate as a test customer
  const email = `test_customer_${Date.now()}@example.com`;
  const { data: auth, error: authErr } = await client.auth.signUp({
    email,
    password: "Password123!",
    options: {
      data: { full_name: "Test Customer", role: "customer" }
    }
  });
  console.log("Customer signed up:", auth?.user?.id, "Email confirmed at:", auth?.user?.email_confirmed_at, "Auth err:", authErr?.message);

  if (auth?.session) {
    const custClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    await custClient.auth.setSession(auth.session);

    // Try calling RPC with arbitrary email
    const { data: arbData, error: arbErr } = await custClient.rpc("record_verified_application_email", {
      p_email: "arbitrary_victim@company.co.uk"
    });
    console.log("Authenticated caller calling with arbitrary email:", { data: arbData, error: arbErr?.message });

    // Check email_verifications table
    const { data: verifs, error: verifErr } = await custClient.from("email_verifications").select("*");
    console.log("email_verifications in DB:", verifs, "Error:", verifErr?.message);
  }
}

testCurrentRpc();
