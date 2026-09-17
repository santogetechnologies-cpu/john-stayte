const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wttchknauwvbfjatdscc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectOrdersDeliveryAgentRelations() {
  const { data: sampleOrders } = await supabase.from("orders").select("id, status, assigned_driver, notes").limit(5);
  console.log("sampleOrders:", sampleOrders);

  const { data: sampleAssignments } = await supabase.from("delivery_assignments").select("*").limit(5);
  console.log("sampleAssignments:", sampleAssignments);
}

inspectOrdersDeliveryAgentRelations();
