const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wttchknauwvbfjatdscc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectDriverSchema() {
  console.log("=== Inspecting Driver & Delivery Tables in Supabase ===");

  const { data: agents, error: agErr } = await supabase.from("delivery_agents").select("*");
  console.log("delivery_agents:", agErr ? agErr.message : `Found ${agents.length} records:`, agents);

  const { data: profs, error: profErr } = await supabase.from("profiles").select("*").eq("role", "delivery_agent");
  console.log("profiles (delivery_agent):", profErr ? profErr.message : `Found ${profs.length} records:`, profs);

  const { data: delivs, error: delErr } = await supabase.from("deliveries").select("*").limit(5);
  console.log("deliveries sample:", delErr ? delErr.message : `Found ${delivs.length} sample records:`, delivs);

  const { data: assign, error: assErr } = await supabase.from("delivery_assignments").select("*").limit(5);
  console.log("delivery_assignments sample:", assErr ? assErr.message : `Found ${assign.length} sample records:`, assign);

  const { data: revs, error: revErr } = await supabase.from("reviews").select("*").limit(5);
  console.log("reviews sample:", revErr ? revErr.message : `Found ${revs.length} sample records:`, revs);
}

inspectDriverSchema();
