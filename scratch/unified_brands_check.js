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
  
  // Extract static brands
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

  // Get products
  const { data: allProducts } = await supabase.from("products").select("id, name, brand, is_active");
  const productBrandMap = {};
  (allProducts || []).forEach(p => {
    const b = (p.brand || "").trim();
    if (b) {
      if (!productBrandMap[b]) productBrandMap[b] = [];
      productBrandMap[b].push(p);
    }
  });

  console.log("=== COMPREHENSIVE BRAND RECONCILIATION ===");
  console.log("Static brands in data/brands.ts:", staticBrands.length);
  console.log("Distinct brand names on products:", Object.keys(productBrandMap).length);

  // Merge into complete unified catalog of brands
  const unifiedBrands = new Map();

  // 1. Add all static brands
  staticBrands.forEach(sb => {
    const key = sb.name.toLowerCase();
    unifiedBrands.set(key, {
      name: sb.name,
      slug: sb.slug,
      logo_url: sb.logo,
      description: sb.description,
      category: sb.category,
      productCount: 0
    });
  });

  // 2. Add / Link product brands
  Object.entries(productBrandMap).forEach(([prodBrandName, prods]) => {
    let matchedKey = null;
    for (const [key, b] of unifiedBrands.entries()) {
      if (
        key === prodBrandName.toLowerCase() ||
        (prodBrandName.toLowerCase() === "clesse" && key === "cleese uk") ||
        (prodBrandName.toLowerCase() === "cpl" && key === "cpl products") ||
        (prodBrandName.toLowerCase() === "melcourt" && key === "melcourt industries limited") ||
        (prodBrandName.toLowerCase() === "lifestyle" && key === "lifestyle appliances")
      ) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      const b = unifiedBrands.get(matchedKey);
      b.productCount += prods.length;
    } else {
      // New brand found in products
      const slug = prodBrandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      unifiedBrands.set(prodBrandName.toLowerCase(), {
        name: prodBrandName,
        slug: slug,
        logo_url: `/brands/${slug}.png`,
        description: `Official ${prodBrandName} gas, fuel & supplies.`,
        category: "general",
        productCount: prods.length
      });
    }
  });

  console.log("\nTotal Unified Brands:", unifiedBrands.size);
  console.log("Detailed List:");
  let totalProductsAccounted = 0;
  Array.from(unifiedBrands.values()).sort((a,b) => a.name.localeCompare(b.name)).forEach((b, i) => {
    console.log(`${i + 1}. [${b.name}] (slug: ${b.slug}) - ${b.productCount} products - Logo: ${b.logo_url}`);
    totalProductsAccounted += b.productCount;
  });

  console.log("\nTotal Products:", (allProducts || []).length, "Accounted for:", totalProductsAccounted);
}

main().catch(console.error);
