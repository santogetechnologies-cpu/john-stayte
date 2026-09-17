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
    console.error(error);
    return;
  }

  console.log("TOTAL PRODUCTS IN SUPABASE:", prods.length);

  // Analyze each product
  const nonCylinders = [];
  const eligibleCylinders = [];

  for (const p of prods) {
    const name = (p.name || "").toLowerCase();
    const slug = (p.slug || "").toLowerCase();
    const cat = (p.category_slug || "").toLowerCase();
    const brand = (p.brand || "").toLowerCase();
    const specs = (p.specs && typeof p.specs === "object") ? p.specs : {};
    const gasType = (specs.gas_type || "").toLowerCase();
    const cylSize = (specs.cylinder_size || "").toLowerCase();

    // Is it a gas product category or brand?
    // Exclude accessories / non-cylinders:
    // Non-cylinder keywords:
    const EXCLUDED_KEYWORDS = [
      "heater", "living flame", "bbq", "barbecue", "stove", "cooker", "appliance", "fire pit",
      "regulator", "hose", "pigtail", "clip", "clip-on", "torch", "blowtorch",
      "fitting", "adapter", "gauge", "trolley", "stand", "accessory", "accessories",
      "spares", "o-ring", "spanner", "part", "bait", "boilie", "pellet", "groundbait", "liquid",
      "coal", "logs", "wood", "briquette", "charcoal", "kindling", "paraffin",
      "feed", "seed", "nuts", "bark", "mulch", "compost", "planter", "grower", "chick", "poultry",
      "module", "cover", "smart-e", "core b", "pro s", "entertainment", "rotisserie",
      "autogas", "vehicle refuelling"
    ];

    const isExcluded = EXCLUDED_KEYWORDS.some(kw => name.includes(kw) || slug.includes(kw) || cat.includes(kw) || brand.includes(kw));

    // Cylinder criteria:
    // 1. Calor gas cylinders (Propane, Butane, Patio Gas, FLT)
    // 2. Air Liquide gas cylinders (Industrial, Welding, Albee, Argon, Oxygen, Acetylene, CO2, Nitrogen, etc.)
    // 3. Campingaz refillable gas cylinders (907, 904, 901, etc.)
    // 4. Pub Gas cylinders (CO2, 30/70, 50/50, 60/40 mixed gas, etc.)
    // 5. Any product having cylinder in name/slug or cylinder_size / deposit_price / refill_price in specs

    const isCylinderCategory = ["calor-gas", "gas", "pub-gas", "air-liquide", "commercial-gas", "domestic-gas", "bulk-lpg"].includes(cat);
    const hasCylinderWord = name.includes("cylinder") || name.includes("bottle") || name.includes("patio gas") || name.includes("pub gas") || name.includes("propane") || name.includes("butane") || name.includes("campingaz") || name.includes("albee") || name.includes("air liquide") || name.includes("co2") || name.includes("mixed gas") || name.includes("argon") || name.includes("nitrogen") || name.includes("oxygen") || name.includes("acetylene");

    if (!isExcluded && (isCylinderCategory || hasCylinderWord || (cylSize && cylSize !== "universal tool" && !cylSize.includes("seal")))) {
      eligibleCylinders.push(p);
    } else {
      nonCylinders.push({ p, reason: isExcluded ? "Excluded accessory/non-cylinder" : "Not a cylinder category/keyword" });
    }
  }

  console.log("\n================ ELIGIBLE CYLINDERS (" + eligibleCylinders.length + ") ================");
  eligibleCylinders.forEach((p, idx) => {
    console.log(`[${idx + 1}] ID: ${p.id} | Name: "${p.name}" | Cat: "${p.category_slug}" | Brand: "${p.brand}" | Price: £${p.price}`);
  });
}

run();
