import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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
  
  // Parse ALL_BRANDS from brands.ts
  const regex = /{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*logo:\s*"([^"]+)",(?:\s*description:\s*"([^"]*)",)?(?:\s*category:\s*"([^"]*)",)?\s*}/g;
  let match;
  const staticBrands = [];
  while ((match = regex.exec(brandsFile)) !== null) {
    staticBrands.push({
      id: match[1],
      name: match[2],
      slug: match[3],
      logo: match[4],
      description: match[5] || "",
      category: match[6] || ""
    });
  }

  const { data: allProducts } = await supabase.from("products").select("id, name, brand");
  const productBrandCounts = {};
  (allProducts || []).forEach(p => {
    const b = (p.brand || "").trim();
    if (b) productBrandCounts[b] = (productBrandCounts[b] || 0) + 1;
  });

  console.log("Static Brands count:", staticBrands.length);
  console.log("Static Brands names:", staticBrands.map(b => b.name));

  console.log("\nProducts Brands count:", Object.keys(productBrandCounts).length);
  console.log("Product Brands:", productBrandCounts);

  // Cross reference
  const staticNamesLower = new Set(staticBrands.map(b => b.name.toLowerCase()));
  const productNames = Object.keys(productBrandCounts);

  const missingInStatic = productNames.filter(name => !staticNamesLower.has(name.toLowerCase()));
  console.log("\nBrands in Products but NOT in static brands.ts:", missingInStatic);
  
  const notInProducts = staticBrands.filter(b => !productBrandCounts[b.name]);
  console.log("\nBrands in static brands.ts with 0 products in DB currently:", notInProducts.map(b => b.name));
}

main().catch(console.error);
