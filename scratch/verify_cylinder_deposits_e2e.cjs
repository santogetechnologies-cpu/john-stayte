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

// Same function as implemented in src/lib/cylinder-exchange-service.ts
function isRefillableLpgCylinderProduct(product) {
  if (!product) return false;

  const name = (product.name || product.product_name || "").toLowerCase().trim();
  const slug = (product.slug || "").toLowerCase().trim();
  const category = (product.category_slug || product.category || "").toLowerCase().trim();
  const brand = (product.brand || "").toLowerCase().trim();

  const specs = product.specs && typeof product.specs === "object" ? product.specs : {};
  const cylinderSize = (specs.cylinder_size || "").toLowerCase().trim();

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
    "o-ring", "oring", "spanner", "regulator", "hose", "pigtail", "clip", "fitting", "adapter",
    "gauge", "trolley", "stand", "accessory", "accessories", "spares", "part", "torch", "blowtorch",
    "heater", "living flame", "cabinet heater", "room heater", "patio heater", "catalytic",
    "fire pit", "barbecue", "bbq", "stove", "cooker", "grill", "smoker", "party grill",
    "camp bistro", "bleuet", "instaflam", "lantern", "burner", "206l", "206s", "camping 206",
    "coal", "charcoal", "logs", "kindling", "firelog", "firelighters", "twizlers", "briquette",
    "paraffin", "lighter fluid", "taybrite", "brazier", "stoveflame", "coffee bricks",
    "animal-feed", "dog food", "bird seed", "salmon", "chicken", "puppy", "mature", "bait",
    "groundbait", "boilie", "pellet", "swim stim", "marine halibut",
    "bark", "mulch", "compost", "planter", "eggs",
    "smart-e", "core b", "pro s", "ultimate 3200", "ultimate bbq", "corner module", "entertainment",
    "cp250", "cartridge"
  ];

  if (EXCLUDED_KEYWORDS.some((kw) => name.includes(kw) || slug.includes(kw) || cylinderSize.includes(kw))) {
    return false;
  }

  const nonGasCategories = [
    "coal-fuels", "animal-feed", "dynamite-baits", "garden", "char-broil", "kingfisher",
    "lifestyle-appliances", "gas-appliances", "gas-spares", "sahara", "food"
  ];
  if (nonGasCategories.includes(category)) {
    return false;
  }

  // 2. Inclusion criteria
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
    name.includes("forklift") ||
    name.includes("904") ||
    name.includes("907");

  const isGasCategoryOrBrand =
    [
      "gas", "calor-gas", "bottled-gas", "pub-gas", "air-liquide", "commercial-gas",
      "domestic-gas", "bulk-lpg", "campingaz"
    ].includes(category) ||
    ["calor", "campingaz", "air liquide", "stayte pub gas", "flogas"].includes(brand);

  if (isCylinderWord || isGasCategoryOrBrand) {
    return true;
  }

  if (cylinderSize && cylinderSize !== "" && !cylinderSize.includes("tool") && !cylinderSize.includes("seal")) {
    return true;
  }

  return false;
}

async function verifyAll() {
  console.log("Fetching live products from Supabase...");
  const { data: allProducts, error } = await supabase
    .from("products")
    .select("id, name, slug, category_slug, brand, subcategory, price, specs")
    .order("name", { ascending: true });

  if (error) {
    console.error("Products query error:", error);
    return;
  }

  const eligibleProducts = allProducts.filter(isRefillableLpgCylinderProduct);
  const excludedProducts = allProducts.filter((p) => !isRefillableLpgCylinderProduct(p));

  console.log("\n=======================================================");
  console.log(`TOTAL PRODUCTS IN SUPABASE: ${allProducts.length}`);
  console.log(`TOTAL ELIGIBLE LPG CYLINDER PRODUCTS: ${eligibleProducts.length}`);
  console.log(`TOTAL EXCLUDED NON-CYLINDER PRODUCTS: ${excludedProducts.length}`);
  console.log("=======================================================\n");

  console.log("--- ELIGIBLE LPG CYLINDERS (MUST ALL APPEAR IN DROPDOWN) ---");
  eligibleProducts.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.id}] "${p.name}" (Cat: "${p.category_slug}", Brand: "${p.brand}", Price: £${p.price})`);
  });

  // Check deposit table or CMS block
  const { data: depositsData } = await supabase
    .from("cms_content_blocks")
    .select("content")
    .eq("section_key", "cylinder_security_deposits")
    .maybeSingle();

  let depositCount = 0;
  if (depositsData?.content) {
    try {
      const parsed = JSON.parse(depositsData.content);
      if (Array.isArray(parsed)) depositCount = parsed.length;
    } catch {}
  }

  console.log(`\nExisting Cylinder Deposit configurations in CMS/DB: ${depositCount}`);
}

verifyAll();
