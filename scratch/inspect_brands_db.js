import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const url = env.VITE_SUPABASE_URL || "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function main() {
  console.log("=== CHECKING DATABASE SCHEMA ===");

  // 1. Check if 'brands' table exists
  const { data: brandsData, error: brandsErr } = await supabase.from("brands").select("*").limit(10);
  console.log("brands table query:", { hasData: !!brandsData, count: brandsData?.length, sample: brandsData, error: brandsErr?.message });

  // 2. Check products table schema and brand column
  const { data: productsData, error: prodErr } = await supabase.from("products").select("id, name, brand, category_id, is_active").limit(5);
  console.log("products sample:", { count: productsData?.length, sample: productsData?.slice(0, 3), error: prodErr?.message });

  // 3. Get all distinct brand values from products
  const { data: allProducts, error: allProdErr } = await supabase.from("products").select("id, name, brand");
  if (allProducts) {
    const brandCounts = {};
    allProducts.forEach(p => {
      const b = p.brand || "(empty/null)";
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    });
    console.log("Products total:", allProducts.length);
    console.log("Distinct product brands in DB:", brandCounts);
  } else {
    console.log("Error loading products:", allProdErr);
  }

  // 4. Check storage buckets
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  console.log("Storage buckets:", buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })), "Error:", bucketErr?.message);
}

main().catch(console.error);
