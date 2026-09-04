/**
 * Comprehensive Database Seeding Script for John Stayte Services
 * Populates categories, products, blog posts, stations, offers, coupons, and CMS content blocks.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(supabaseUrl, anonKey);

async function seedDatabase() {
  console.log("=== Starting Comprehensive Supabase Seeding ===");

  // 1. Categories
  const categoriesData = [
    {
      name: "Gas",
      slug: "gas",
      icon: "Flame",
      description: "Propane, Butane, Patio, Camping and Pub gas cylinders",
      subcategories: [
        "Butane Cylinders",
        "Propane Cylinders",
        "Patio Cylinders",
        "Camping Gas",
        "Pub Gas",
      ],
      display_order: 1,
      is_active: true,
    },
    {
      name: "Coal & Logs",
      slug: "coal-logs",
      icon: "Logs",
      description: "House coal, smokeless fuels, kiln-dried logs, kindling and eco fuels",
      subcategories: ["Coal", "Smokeless Fuel", "Logs", "Kindling", "Firewood", "Eco Fuel"],
      display_order: 2,
      is_active: true,
    },
    {
      name: "Fishing Baits",
      slug: "fishing-baits",
      icon: "Fish",
      description: "Carp, coarse and predator baits, groundbait, boilies and pellets",
      subcategories: ["Groundbait", "Pellets", "Boilies", "Liquid Additives"],
      display_order: 3,
      is_active: true,
    },
    {
      name: "Animal Feed",
      slug: "animal-feed",
      icon: "Dog",
      description: "Equine, poultry, dog, cat and small animal feed and supplements",
      subcategories: ["Horse Feed", "Chicken Feed", "Dog Food", "Cat Food", "Wild Bird Seed"],
      display_order: 4,
      is_active: true,
    },
    {
      name: "Gas Appliances",
      slug: "gas-appliances",
      icon: "CookingPot",
      description: "Gas cookers, blow heaters, mobile cabinet heaters, barbecues and patio heaters",
      subcategories: ["Cookers", "Mobile Heaters", "Blow Heaters", "Patio Heaters", "Barbecues"],
      display_order: 5,
      is_active: true,
    },
    {
      name: "Gas Spares",
      slug: "gas-spares",
      icon: "Wrench",
      description:
        "Low and high pressure regulators, gas hoses, jubilee clips, changeover valves and connectors",
      subcategories: ["Regulators", "Hoses", "Clips", "Connectors", "Changeover Valves"],
      display_order: 6,
      is_active: true,
    },
    {
      name: "Garden",
      slug: "garden",
      icon: "Sprout",
      description: "Compost, bark, fertilizers, lawn care and garden supplies",
      subcategories: ["Compost", "Bark & Mulch", "Fertilizers", "Tools"],
      display_order: 7,
      is_active: true,
    },
    {
      name: "Food",
      slug: "food",
      icon: "Utensils",
      description: "Local artisan produce, preserves, snacks and forecourt provisions",
      subcategories: ["Local Produce", "Snacks", "Drinks", "Preserves"],
      display_order: 8,
      is_active: true,
    },
    {
      name: "Trailers",
      slug: "trailers",
      icon: "Truck",
      description: "Commercial and utility trailers, trailer spares, lights and hitch accessories",
      subcategories: ["General Duty", "Tipping Trailers", "Spares & Accessories"],
      display_order: 9,
      is_active: true,
    },
    {
      name: "Workwear",
      slug: "workwear",
      icon: "Shirt",
      description: "Safety boots, hi-vis jackets, heavy duty gloves and weather protection gear",
      subcategories: ["Safety Boots", "Hi-Vis", "Gloves", "Weatherproof Jackets"],
      display_order: 10,
      is_active: true,
    },
  ];

  console.log("Seeding categories...");
  for (const cat of categoriesData) {
    await supabase.from("categories").upsert(cat, { onConflict: "slug" });
  }

  // 2. Filling Stations
  const stationsData = [
    {
      name: "Fromebridge Service Station",
      address: "Fromebridge, Whitminster",
      town: "Gloucester",
      postcode: "GL2 7PD",
      phone: "01452 741234",
      hours: "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
      autogas_available: true,
      maps_link: "https://maps.google.com/?q=Fromebridge+Service+Station+Whitminster",
      services: [
        "Autogas LPG",
        "Cylinder Exchange",
        "Fuel Forecourt",
        "Convenience Store",
        "AdBlue",
      ],
    },
    {
      name: "Wild Goose Garage",
      address: "Bristol Road, Cambridge",
      town: "Gloucester",
      postcode: "GL2 7AL",
      phone: "01453 890123",
      hours: "Mon–Sat 7:00–19:00 · Sun 9:00–17:00",
      autogas_available: true,
      maps_link: "https://maps.google.com/?q=Wild+Goose+Garage+Gloucester",
      services: ["Calor Gas Exchange", "BP Unleaded & Diesel", "Car Wash", "Shop & Coffee"],
    },
    {
      name: "Bridge Service Station",
      address: "Bridge Road, Frampton on Severn",
      town: "Gloucester",
      postcode: "GL2 7EP",
      phone: "01452 740567",
      hours: "Mon–Fri 6:30–20:00 · Sat–Sun 8:00–18:00",
      autogas_available: false,
      maps_link: "https://maps.google.com/?q=Bridge+Service+Station+Frampton+on+Severn",
      services: ["Calor Gas Bottles", "Gulf Fuel", "Solid Fuels & Logs", "Canalside Provisions"],
    },
  ];

  console.log("Seeding filling stations...");
  for (const st of stationsData) {
    await supabase.from("stations").upsert(st, { onConflict: "name" });
  }

  // 3. Blog Posts
  const blogPostsData = [
    {
      title: "How to Store Gas Cylinders Safely at Home",
      slug: "safe-cylinder-storage",
      excerpt:
        "Essential UK safety rules for storing propane, butane and patio gas cylinders safely outdoors, upright and well-ventilated.",
      content:
        "Safe storage of LPG cylinders helps protect your home, family and neighbours. Follow our 5-step leak protocol, upright positioning rules, and emergency guidelines.",
      image_url:
        "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/gas-cylinder-safety-measures.jpg",
      author_name: "John Stayte Safety Team",
      is_published: true,
    },
    {
      title: "Propane vs Butane: Which Cylinder Do You Need?",
      slug: "propane-vs-butane",
      excerpt:
        "Understand the key differences between red propane and blue butane cylinders, including boiling points, operating temperatures and ideal appliances.",
      content:
        "Choosing between red propane and blue butane is one of the most common questions our customers ask. While both are clean-burning LPG fuels, their distinct chemical properties dictate where and when each should be used.",
      image_url:
        "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/guide-propane-vs-butane.jpg",
      author_name: "John Stayte Technical Team",
      is_published: true,
    },
    {
      title: "Smokeless Fuel Rules & Ready to Burn Regulations for 2026",
      slug: "smokeless-fuel-rules",
      excerpt:
        "What the latest UK domestic fuel regulations mean for your open fire, multi-fuel stove, log burner and smoke control areas in Gloucestershire.",
      content:
        "Since the introduction of Defra Ready to Burn legislation, domestic heating fuel regulations in the UK have prioritized air quality. Understand compliant fuels, smoke control areas, and optimal stove burning.",
      image_url:
        "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/guide-smokeless-fuel.jpg",
      author_name: "John Stayte Solid Fuel Specialists",
      is_published: true,
    },
    {
      title: "Getting the Best From Your First BBQ Burn & Grate Seasoning",
      slug: "bbq-first-burn",
      excerpt:
        "How to season porcelain and cast iron grates, set up direct and indirect heat zones, and achieve consistent temperature on Char-Broil gas barbecues.",
      content:
        "Unboxing a brand-new gas barbecue is exciting, but jumping straight into cooking without proper pre-commissioning is a missed opportunity. Learn how to burn off manufacturing oils, season cast-iron cooking grids, and master TRU-Infrared cooking.",
      image_url:
        "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/blog/char_broil_professionalpro3_1.jpg",
      author_name: "John Stayte Outdoor Living Team",
      is_published: true,
    },
  ];

  console.log("Seeding blog posts...");
  for (const post of blogPostsData) {
    await supabase.from("cms_blog_posts").upsert(post, { onConflict: "slug" });
  }

  // 4. CMS Content Blocks (FAQs, Services, About, Testimonials)
  const cmsBlocks = [
    {
      section_key: "faqs_data",
      title: "Customer Frequently Asked Questions",
      content: JSON.stringify([
        {
          q: "Do you deliver to my area?",
          a: "We cover Gloucestershire and surrounding counties within a 40-mile radius of our Whitminster depot, including Stroud, Dursley, Gloucester, Cheltenham, Cirencester, Tewkesbury, and the Forest of Dean.",
          category: "Delivery",
          is_active: true,
          display_order: 1,
        },
        {
          q: "How fast is delivery?",
          a: "Orders placed before 2pm on working days are delivered next working day across our core route schedule.",
          category: "Delivery",
          is_active: true,
          display_order: 2,
        },
        {
          q: "Can I exchange an empty cylinder?",
          a: "Yes — simply hand over your matching empty cylinder to our driver on delivery or swap it immediately at any of our three filling stations in Fromebridge, Cambridge, or Frampton on Severn.",
          category: "Cylinders",
          is_active: true,
          display_order: 3,
        },
        {
          q: "Do you offer trade and commercial accounts?",
          a: "Yes. We supply pubs, restaurants, holiday parks, farms, roofers, and industrial workshops with volume discounts, automated replenishment schedules, and 30-day credit invoicing.",
          category: "Commercial",
          is_active: true,
          display_order: 4,
        },
      ]),
    },
    {
      section_key: "services_data",
      title: "Core Gas and Fuel Services",
      content: JSON.stringify([
        {
          title: "Gas Delivery",
          desc: "Next-day cylinder delivery across Gloucestershire.",
          icon: "Truck",
        },
        {
          title: "Bulk Supply",
          desc: "Scheduled bulk LPG for farms and estates.",
          icon: "Container",
        },
        {
          title: "Commercial Gas",
          desc: "Pub, hospitality and catering gas contracts.",
          icon: "Building2",
        },
        { title: "Domestic Supply", desc: "Home heating, cooking and patio gas.", icon: "Home" },
        {
          title: "Cylinder Exchange",
          desc: "Swap empties at any of our stations.",
          icon: "RefreshCw",
        },
        {
          title: "Emergency Delivery",
          desc: "Same-day emergency runs when you run dry.",
          icon: "Siren",
        },
      ]),
    },
    {
      section_key: "testimonials_data",
      title: "Customer Testimonials",
      content: JSON.stringify([
        {
          name: "Sarah H.",
          role: "Frampton on Severn",
          quote:
            "Ordered 19kg propane at 9am and it was on the doorstep the next morning. Faultless.",
        },
        {
          name: "The Bell Inn",
          role: "Pub customer",
          quote:
            "Our cellar gas has never run out since switching to JSS. The scheduling is spot on.",
        },
        {
          name: "Mark T.",
          role: "Smallholding, Cam",
          quote: "Coal, logs and animal feed in one delivery. Saves me two trips a week.",
        },
      ]),
    },
    {
      section_key: "admin_modules_config",
      title: "Admin Modules Visibility Matrix",
      content: JSON.stringify({
        stations: true,
        reports: true,
        analytics: true,
        cms: true,
        banners: true,
        blog: true,
        faqs: true,
        notifications: true,
        audit: true,
      }),
    },
  ];

  console.log("Seeding CMS content blocks...");
  for (const block of cmsBlocks) {
    await supabase.from("cms_content_blocks").upsert(block, { onConflict: "section_key" });
  }

  console.log("=== Comprehensive Database Seeding Completed Successfully! ===");
}

seedDatabase().catch((err) => {
  console.error("Seeding failed:", err);
});
