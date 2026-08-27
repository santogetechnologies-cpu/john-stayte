import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthAndSeed() {
  console.log("1. Authenticating as admin...");

  const adminEmail = "admin@stayte.com";
  const adminPassword = "AdminSecurePassword2026!";

  // Try signing in
  let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signInError) {
    console.log("Sign in failed, attempting sign up:", signInError.message);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: "John Stayte Admin",
          role: "admin",
        },
      },
    });

    if (signUpError) {
      console.error("Sign up error:", signUpError.message);
    } else {
      console.log("Signed up successfully:", signUpData.user?.id);
      authData = signUpData as any;
    }
  } else {
    console.log("Signed in successfully as:", authData.user?.email);
  }

  // Update profile to admin role if needed
  if (authData?.user) {
    await supabase.from("profiles").upsert({
      id: authData.user.id,
      email: adminEmail,
      full_name: "John Stayte Admin",
      role: "admin",
      status: "Active",
    });
  }

  // Now test insert to cms_blog_posts
  console.log("2. Testing insert into cms_blog_posts...");
  const samplePost = {
    title: "Gas Cylinder Safety Measures",
    slug: "safe-cylinder-storage",
    excerpt: "Essential UK safety rules for storing propane, butane and patio gas cylinders safely outdoors, upright and well-ventilated.",
    content: "Safe storage of LPG cylinders helps protect your home, family and neighbours. Follow our 5-step leak protocol, upright positioning rules, and emergency guidelines.",
    image_url: "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/gas-cylinder-safety-measures.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
  };

  const { data: insertedPost, error: postErr } = await supabase
    .from("cms_blog_posts")
    .upsert(samplePost, { onConflict: "slug" })
    .select();

  if (postErr) {
    console.error("Failed to insert blog post:", postErr.message, postErr.code, postErr.details);
  } else {
    console.log("✓ SUCCESS! Inserted post into cms_blog_posts:", insertedPost);
  }
}

testAuthAndSeed().catch((err) => console.error("Unhandled error:", err));
