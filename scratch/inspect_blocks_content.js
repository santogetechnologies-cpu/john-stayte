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
  const { data: blocks } = await supabase.from("cms_content_blocks").select("*");
  blocks?.forEach(b => {
    console.log(`=== ${b.section_key} (${b.title}) ===`);
    try {
      const parsed = JSON.parse(b.content);
      console.log(typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : `Array of ${parsed.length} items`);
    } catch {
      console.log(b.content?.slice(0, 100));
    }
  });
}

main().catch(console.error);
