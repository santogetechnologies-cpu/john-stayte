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

  // Extract ALL_BRANDS from brands.ts (currently used by Shop & Order Gas -> Shop by Brand)
  const regex = /{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*logo:\s*"([^"]+)",(?:\s*description:\s*"([^"]*)",)?(?:\s*category:\s*"([^"]*)",)?\s*}/g;
  let match;
  const shopByBrandList = [];
  while ((match = regex.exec(brandsFile)) !== null) {
    shopByBrandList.push({
      id: match[1],
      name: match[2],
      slug: match[3],
      logo: match[4],
      description: match[5] || "",
      category: match[6] || ""
    });
  }

  // Get products from database
  const { data: allProducts, error } = await supabase.from("products").select("id, name, brand, is_active");
  if (error) {
    console.error("Products error:", error);
    return;
  }

  const dbBrandCounts = {};
  allProducts.forEach(p => {
    const b = (p.brand || "").trim();
    if (b) {
      dbBrandCounts[b] = (dbBrandCounts[b] || 0) + 1;
    }
  });

  console.log("=== EXACT BRAND AUDIT RESULTS ===");
  console.log("1. Total brands in Shop & Order Gas (Shop by Brand):", shopByBrandList.length);
  console.log("2. Total distinct brands in Database Products:", Object.keys(dbBrandCounts).length);
  console.log("3. Total products in Database:", allProducts.length);
  
  // Cross check
  const shopBrandNames = new Set(shopByBrandList.map(b => b.name.toLowerCase()));
  const dbBrandNames = Object.keys(dbBrandCounts);

  const inDbNotShop = dbBrandNames.filter(name => !shopBrandNames.has(name.toLowerCase()));
  const inShopNotDb = shopByBrandList.filter(b => !dbBrandCounts[b.name]);

  console.log("4. Brands in DB Products but not in static Shop by Brand list:", inDbNotShop);
  console.log("5. Brands in Shop by Brand list with 0 current products:", inShopNotDb.map(b => b.name));
  console.log("6. Duplicates in Shop by Brand list:", shopByBrandList.length - new Set(shopByBrandList.map(b => b.name.toLowerCase())).size);
  console.log("7. Complete DB brand breakdown:", dbBrandCounts);
}

main().catch(console.error);
