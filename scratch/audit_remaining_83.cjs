const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

let supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMDY0MzYsImV4cCI6MjA1NTg4MjQzNn0.2E2J2j4Qk2eBqZcO8i8yL1m3n5p7r9t1v3x5z7b9d1f";

try {
  const envContent = fs.readFileSync(".env", "utf8");
  envContent.split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && v.length) {
      const val = v.join("=").trim().replace(/^["']|["']$/g, "");
      if (k.trim() === "VITE_SUPABASE_URL") supabaseUrl = val;
      if (k.trim() === "VITE_SUPABASE_ANON_KEY") supabaseKey = val;
    }
  });
} catch {}

const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIRMED_CYLINDERS = [
  "10L 30/70 Mixed Gas",
  "10L 50/50 Mixed Gas",
  "10L 60/40 Mixed Gas",
  "22.6kg Carbon Dioxide",
  "34kg Carbon Dioxide",
  "47L 30/70 Mixed Gas",
  "6.35kg Carbon Dioxide",
  "904 Refill",
  "907 Refill",
  "Calor 13kg Butane Gas Cylinder",
  "Calor 13kg Patio Gas Cylinder",
  "Calor 5kg Patio Gas Cylinder",
  "Calor Gas Butane - 15kg Refill",
  "Calor Gas Butane - 7kg Refill",
  "Calor Gas Propane - 13kg Refill",
  "Calor Gas Propane - 19kg Refill",
  "Calor Gas Propane - 47kg Refill",
  "Calor Gas Propane - 6kg Refill",
  "Calor Patio Gas - 13kg Refill",
  "Calor Patio Gas - 5kg Refill",
  "Campingaz 907 Refillable Cylinder (2.72kg)",
];

async function run() {
  const { data: prods } = await supabase.from("products").select("*").order("name", { ascending: true });

  console.log(`TOTAL PRODUCTS: ${prods.length}`);
  console.log(`CONFIRMED CYLINDERS: ${CONFIRMED_CYLINDERS.length}`);

  const remaining = prods.filter(p => !CONFIRMED_CYLINDERS.includes(p.name));
  console.log(`REMAINING PRODUCTS TO AUDIT: ${remaining.length}`);

  console.log("\n--- AUDITING ALL REMAINING 83 PRODUCTS ---");
  remaining.forEach((p, i) => {
    console.log(`${i+1}. [${p.category_slug}] "${p.name}" (Brand: ${p.brand}) - Price: £${p.price}`);
  });
}

run();
