import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey);

async function main() {
  const brandsFile = fs.readFileSync("src/data/brands.ts", "utf-8");
  // Extract all brands from brands.ts
  const { data: allProducts } = await supabase.from("products").select("id, name, brand, is_active");

  const productBrandCounts = {};
  (allProducts || []).forEach(p => {
    const b = (p.brand || "").trim();
    if (b) productBrandCounts[b] = (productBrandCounts[b] || 0) + 1;
  });

  console.log("=== PRODUCT BRANDS (FROM DB) ===");
  console.log("Count:", Object.keys(productBrandCounts).length);
  console.log(productBrandCounts);

  // Let's also check static ALL_BRANDS in brands.ts
  const brandsMatches = brandsFile.match(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*logo:\s*"([^"]+)"/g);
  console.log("Total ALL_BRANDS entries in brands.ts:", brandsMatches?.length);
}

main().catch(console.error);
