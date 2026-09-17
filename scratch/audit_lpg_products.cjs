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

async function run() {
  const { data: prods, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  console.log("TOTAL PRODUCTS IN DB:", prods.length);

  const gasCategories = ["calor-gas", "gas", "pub-gas", "air-liquide", "commercial-gas", "domestic-gas", "bulk-lpg", "autogas", "gas-appliances", "gas-spares"];

  console.log("\n--- GAS / CYLINDER RELATED PRODUCTS ---");
  prods.forEach((p, idx) => {
    const isGas = gasCategories.includes(p.category_slug) || 
                  (p.name && (p.name.toLowerCase().includes("calor") || p.name.toLowerCase().includes("gas") || p.name.toLowerCase().includes("propane") || p.name.toLowerCase().includes("butane") || p.name.toLowerCase().includes("cylinder") || p.name.toLowerCase().includes("air liquide") || p.name.toLowerCase().includes("campingaz")));
    
    if (isGas) {
      console.log(`[${idx + 1}] ID: ${p.id}`);
      console.log(`     Name: "${p.name}"`);
      console.log(`     Slug: "${p.slug}"`);
      console.log(`     Category: "${p.category_slug}"`);
      console.log(`     Brand: "${p.brand}"`);
      console.log(`     Price: £${p.price}`);
      console.log(`     Specs:`, JSON.stringify(p.specs));
      console.log(`     Active: ${p.is_active}`);
      console.log("-----------------------------------------");
    }
  });
}

run();
