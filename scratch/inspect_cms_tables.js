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
  console.log("=== CHECKING ALL CMS RELATED TABLES ===");

  const tablesToCheck = [
    "cms_content_blocks",
    "cms_banners",
    "offers",
    "posts",
    "blog_posts",
    "stations",
    "services",
    "faqs",
    "reviews",
    "site_settings"
  ];

  for (const t of tablesToCheck) {
    const { data, error } = await supabase.from(t).select("*").limit(3);
    console.log(`Table '${t}':`, { exists: !error, count: data?.length, sample: data?.[0] ? Object.keys(data[0]) : null, error: error?.message });
  }

  // Also check existing section_keys in cms_content_blocks
  const { data: blocks } = await supabase.from("cms_content_blocks").select("id, section_key, title");
  console.log("Existing cms_content_blocks section_keys:", blocks);
}

main().catch(console.error);
