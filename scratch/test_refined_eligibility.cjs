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

function isEligibleLpgCylinderProduct(product) {
  if (!product) return false;

  const name = (product.name || "").toLowerCase().trim();
  const slug = (product.slug || "").toLowerCase().trim();
  const category = (product.category_slug || product.category || "").toLowerCase().trim();
  const brand = (product.brand || "").toLowerCase().trim();
  const subcategory = (product.subcategory || "").toLowerCase().trim();

  // Specs checks
  const specs = product.specs && typeof product.specs === "object" ? product.specs : {};
  const cylinderSize = (specs.cylinder_size || "").toLowerCase().trim();
  const gasType = (specs.gas_type || "").toLowerCase().trim();

  // 1. Explicit Exclusions: Non-gas, solid fuels, animal feed, gardening, accessories, heaters, stoves, appliances, tools, fittings, o-rings, spanners
  const EXCLUDED_KEYWORDS = [
    // Accessories & Hardware
    "o-ring", "oring", "spanner", "regulator", "hose", "pigtail", "clip", "fitting", "adapter",
    "gauge", "trolley", "stand", "spares", "part", "torch", "blowtorch",
    // Appliances & Heating
    "heater", "living flame", "patio heater", "cabinet heater", "catalytic", "fire pit", "bbq", "barbecue",
    "stove", "cooker", "grill", "smoker", "party grill", "camp bistro", "bleuet", "instaflam",
    // Solid Fuels & Combustibles
    "coal", "charcoal", "logs", "kindling", "firelog", "firelighters", "twizlers", "briquette",
    "paraffin", "lighter fluid", "taybrite", "brazier", "stoveflame", "coffee bricks",
    // Animal Feed & Baits
    "animal-feed", "dog food", "bird seed", "salmon", "chicken", "puppy", "mature", "bait",
    "groundbait", "boilie", "pellet", "swim stim", "marine halibut",
    // Garden & Compost & Produce
    "bark", "mulch", "compost", "planter", "eggs",
    // Char-Broil & BBQ Modules
    "smart-e", "core b", "pro s", "ultimate 3200", "ultimate bbq", "corner module", "entertainment",
    // Non-cylinder gas
    "autogas", "vehicle refuelling",
    // Small disposable cartridges
    "cp250", "cartridge"
  ];

  // Check if any keyword matches
  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some(kw => {
    return name.includes(kw) || slug.includes(kw) || cylinderSize.includes(kw);
  });

  if (hasExcludedKeyword) {
    return false;
  }

  // Also check if category is strictly non-gas
  const nonGasCategories = [
    "coal-fuels", "animal-feed", "dynamite-baits", "garden", "char-broil", "kingfisher",
    "lifestyle-appliances", "gas-appliances", "gas-spares", "sahara", "food"
  ];
  if (nonGasCategories.includes(category)) {
    return false;
  }

  // 2. Inclusion criteria: Must be a genuine cylinder/bottle/refillable gas product
  // A. Recognized cylinder sizes or explicit cylinder/gas indicators
  const isCylinderWord = 
    name.includes("cylinder") || 
    name.includes("bottle") || 
    name.includes("refill") || 
    name.includes("propane") || 
    name.includes("butane") || 
    name.includes("patio gas") || 
    name.includes("mixed gas") || 
    name.includes("carbon dioxide") || 
    name.includes("co2") || 
    name.includes("flt") || 
    name.includes("forklift");

  // B. Recognized Gas categories or brands
  const isGasCategoryOrBrand = 
    ["gas", "calor-gas", "bottled-gas", "pub-gas", "air-liquide", "commercial-gas", "domestic-gas", "bulk-lpg", "campingaz"].includes(category) ||
    ["calor", "campingaz", "air liquide", "stayte pub gas"].includes(brand);

  if (isCylinderWord || isGasCategoryOrBrand) {
    return true;
  }

  // C. If specs specify a valid cylinder_size (e.g. "13kg", "19kg", "47kg", "10L", "22.6kg")
  if (cylinderSize && cylinderSize !== "" && !cylinderSize.includes("tool") && !cylinderSize.includes("seal")) {
    return true;
  }

  return false;
}

async function run() {
  const { data: prods } = await supabase.from("products").select("*").order("name", { ascending: true });

  const eligible = [];
  const excluded = [];

  prods.forEach(p => {
    if (isEligibleLpgCylinderProduct(p)) {
      eligible.push(p);
    } else {
      excluded.push(p);
    }
  });

  console.log(`TOTAL PRODUCTS IN DB: ${prods.length}`);
  console.log(`ELIGIBLE CYLINDERS: ${eligible.length}`);
  console.log(`EXCLUDED PRODUCTS: ${excluded.length}\n`);

  console.log("=== ELIGIBLE LPG CYLINDER PRODUCTS ===");
  eligible.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.id}] "${p.name}" | Brand: ${p.brand} | Cat: ${p.category_slug} | Price: £${p.price}`);
  });

  console.log("\n=== EXCLUDED PRODUCTS SAMPLE (first 20) ===");
  excluded.slice(0, 20).forEach((p, idx) => {
    console.log(`${idx + 1}. "${p.name}" (Cat: ${p.category_slug}, Brand: ${p.brand})`);
  });
}

run();
