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

async function check() {
  const { data, error } = await supabase.from("cms_content_blocks").select("*");
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(d => {
    console.log(`\n=== KEY: ${d.section_key} ===`);
    try {
      const parsed = JSON.parse(d.content);
      if (Array.isArray(parsed)) {
        console.log(`Type: Array (Length: ${parsed.length})`);
        console.log("Sample:", JSON.stringify(parsed.slice(0, 2)));
      } else if (typeof parsed === "object") {
        console.log(`Type: Object (Keys: ${Object.keys(parsed).join(", ")})`);
        if (parsed.services) console.log("parsed.services length:", Array.isArray(parsed.services) ? parsed.services.length : typeof parsed.services);
        if (parsed.stations) console.log("parsed.stations length:", Array.isArray(parsed.stations) ? parsed.stations.length : typeof parsed.stations);
        if (parsed.offers) console.log("parsed.offers length:", Array.isArray(parsed.offers) ? parsed.offers.length : typeof parsed.offers);
        if (parsed.faqs) console.log("parsed.faqs length:", Array.isArray(parsed.faqs) ? parsed.faqs.length : typeof parsed.faqs);
      }
    } catch(e) {
      console.log("Raw string:", d.content?.slice(0, 100));
    }
  });
}

check();
