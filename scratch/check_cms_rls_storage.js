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
  console.log("=== CHECKING CMS STORAGE & RLS ===");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log("Buckets:", buckets, "Error:", bErr?.message);

  const { data: blocks, error: blkErr } = await supabase.from("cms_content_blocks").select("*");
  console.log("cms_content_blocks count:", blocks?.length, "Error:", blkErr?.message);
}

main().catch(console.error);
