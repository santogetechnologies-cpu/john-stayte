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

function isRefillableLpgCylinderProductCurrent(product) {
  if (!product) return false;

  const name = (product.name || product.product_name || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();
  const category = (product.category_slug || product.category || "").toLowerCase();

  // 0. Explicit Autogas & Vehicle Exclusion
  if (
    product.usage_type === "AUTOGAS" ||
    category.includes("autogas") ||
    category.includes("vehicle") ||
    slug.includes("autogas") ||
    slug.includes("vehicle") ||
    name.includes("autogas") ||
    name.includes("vehicle refuelling") ||
    name.includes("fleet")
  ) {
    return false;
  }

  // 1. Explicit Exclusions
  const EXCLUDED_KEYWORDS = [
    "heater",
    "cabinet heater",
    "room heater",
    "barbecue",
    "bbq",
    "stove",
    "cooker",
    "appliance",
    "regulator",
    "hose",
    "pigtail",
    "clip",
    "torch",
    "blowtorch",
    "fitting",
    "adapter",
    "gauge",
    "trolley",
    "stand",
    "accessory",
    "accessories",
    "spares",
    "part",
    "bait",
    "boilie",
    "coal",
    "logs",
    "wood",
    "briquette",
    "charcoal",
    "kindling",
  ];

  if (EXCLUDED_KEYWORDS.some((kw) => name.includes(kw) || slug.includes(kw))) {
    return false;
  }

  // 2. Specific Cylinder Indicators
  const CYLINDER_INDICATORS = [
    "cylinder",
    "bottle",
    "refillable",
    "patio gas",
    "forklift gas",
    "flt gas",
    "pub gas",
    "air liquide",
    "mixed gas",
    "carbon dioxide",
  ];

  if (CYLINDER_INDICATORS.some((kw) => name.includes(kw) || slug.includes(kw))) {
    return true;
  }

  // 3. Known Calor / Campingaz gas cylinder items
  const isGasBrand = name.includes("calor") || name.includes("campingaz") || name.includes("flogas");
  const isGasFuel = name.includes("propane") || name.includes("butane") || name.includes("patio gas");
  const hasWeight = /\d+(\.\d+)?\s*(kg|g|litre|l)\b/.test(name);

  if (isGasBrand && isGasFuel && hasWeight) {
    return true;
  }

  if (Boolean(product.cylinder_size) || Boolean(product.refill_price)) {
    return true;
  }

  return false;
}

async function run() {
  const { data: prods } = await supabase.from("products").select("*").order("name", { ascending: true });

  const matched = prods.filter(isRefillableLpgCylinderProductCurrent);
  console.log("MATCHED COUNT BY CURRENT LOGIC:", matched.length);
  matched.forEach((p, i) => console.log(`${i+1}. "${p.name}" (id: ${p.id}, cat: ${p.category_slug})`));

  console.log("\nALL UNMATCHED PRODUCTS:");
  prods.filter(p => !isRefillableLpgCylinderProductCurrent(p)).forEach((p, i) => {
    console.log(`${i+1}. "${p.name}" (cat: ${p.category_slug}, brand: ${p.brand})`);
  });
}

run();
