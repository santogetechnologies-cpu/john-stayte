import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(supabaseUrl, anonKey);

async function promoteAdminAndSeed() {
  const adminEmail = "admin@stayte.com";
  const adminPassword = "AdminSecurePassword2026!";

  console.log("1. Signing in...");
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signInError) {
    console.error("Sign in failed:", signInError);
    return;
  }

  const userId = authData.user.id;
  console.log("Signed in as userId:", userId);

  console.log("2. Updating profile to admin role...");
  const { data: profData, error: profError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: adminEmail,
      full_name: "Admin User",
      role: "admin",
      status: "Active",
    })
    .select();

  console.log("Profile update result:", profData, profError);

  console.log("3. Testing blog post insert...");
  const samplePost = {
    title: "Gas Cylinder Safety Measures",
    slug: "safe-cylinder-storage",
    excerpt:
      "Essential UK safety rules for storing propane, butane and patio gas cylinders safely outdoors, upright and well-ventilated.",
    content:
      "Safe storage of LPG cylinders helps protect your home, family and neighbours. Follow our 5-step leak protocol, upright positioning rules, and emergency guidelines.",
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/gas-cylinder-safety-measures.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
  };

  const { data: postData, error: postError } = await supabase
    .from("cms_blog_posts")
    .upsert(samplePost, { onConflict: "slug" })
    .select();

  console.log("Blog post insert result:", postData, postError);
}

promoteAdminAndSeed().catch(console.error);
