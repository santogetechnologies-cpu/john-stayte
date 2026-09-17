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
  const { data: prods } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  console.log("CHECKING ALL 104 PRODUCTS:");
  prods.forEach((p) => {
    const cat = p.category_slug || "";
    const brand = p.brand || "";
    const name = p.name || "";
    const specs = p.specs || {};

    if (
      cat.includes("gas") ||
      cat.includes("calor") ||
      cat.includes("pub") ||
      cat.includes("air") ||
      brand.includes("Calor") ||
      brand.includes("Air Liquide") ||
      brand.includes("Campingaz") ||
      brand.includes("Stayte") ||
      name.toLowerCase().includes("gas") ||
      name.toLowerCase().includes("cylinder") ||
      name.toLowerCase().includes("refill")
    ) {
      console.log(`[${p.id}] ${p.name} | Cat: ${p.category_slug} | Brand: ${p.brand} | Specs: ${JSON.stringify(specs)}`);
    }
  });
}

run();
