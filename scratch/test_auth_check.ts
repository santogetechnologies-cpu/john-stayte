import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync("/Users/ashlinjeshma/Desktop/E-commerce 2/.env", "utf-8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogins() {
  const accounts = [
    { email: "admin@stayte.co.uk", pass: "Admin123!" },
    { email: "manager@stayte.co.uk", pass: "Manager123!" },
    { email: "aswin@jss.com", pass: "Password123!" },
    { email: "astin@jss.com", pass: "Password123!" },
    { email: "dave.miller@stayte.co.uk", pass: "Password123!" },
  ];

  for (const acc of accounts) {
    const { data, error } = await client.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass,
    });
    if (data?.user) {
      console.log(`✅ Logged in as ${acc.email} -> User ID: ${data.user.id}`);
      // Query profiles
      const { data: prof } = await client.from("profiles").select("*").eq("id", data.user.id);
      console.log("Profile:", prof);

      // Query delivery_agents
      const { data: da } = await client.from("delivery_agents").select("*");
      console.log(`delivery_agents seen by ${acc.email}: count=${da?.length || 0}`);
      if (da && da.length > 0) {
        console.log(da);
      }
    } else {
      console.log(`❌ Failed to login as ${acc.email}: ${error?.message}`);
    }
  }
}

testLogins();
