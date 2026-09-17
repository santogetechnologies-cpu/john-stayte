const { createClient } = require("@supabase/supabase-js");

const url = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";
const supabase = createClient(url, anonKey);

async function inspectSchema() {
  console.log("==========================================");
  console.log("INSPECTING CUSTOMER FOREIGN KEYS & TABLES");
  console.log("==========================================");

  // Probe tables that may reference customer/user
  const tables = [
    "profiles",
    "orders",
    "order_items",
    "gas_customer_applications",
    "customer_addresses",
    "notifications",
    "customer_notifications",
    "reviews",
    "wishlists",
    "wishlist_items",
    "email_verifications",
    "support_tickets",
    "delivery_assignments",
    "audit_logs"
  ];

  for (const t of tables) {
    try {
      const { data, error, count } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`Table '${t}': Error/Not accessible -> ${error.message} (code: ${error.code})`);
      } else {
        console.log(`Table '${t}': Exists (row count: ${count})`);
      }
    } catch (e) {
      console.log(`Table '${t}': Exception -> ${e.message}`);
    }
  }
}

inspectSchema().catch(console.error);
