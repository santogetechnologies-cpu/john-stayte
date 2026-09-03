/**
 * Comprehensive Product Catalog Seeding Script for John Stayte Services
 * Seeds realistic inventory with images, descriptions, pricing, specs, and categories into public.products.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wttchknauwvbfjatdscc.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

const supabase = createClient(supabaseUrl, anonKey);

const fullProductCatalog = [
  // 1. Gas Cylinders
  {
    name: "Calor 19kg Propane Gas Cylinder",
    slug: "calor-19kg-propane-gas-cylinder",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    price: 49.5,
    compare_at_price: 54.0,
    stock: 45,
    rating: 5.0,
    reviews_count: 32,
    is_featured: true,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/calor-19kg-propane.jpg",
    description:
      "Ideal for residential heating, light commercial catering, and space heaters across Gloucestershire. Uses a standard POL screw fitting.",
    specs: {
      capacity: "19kg",
      tare_weight: "18.5kg",
      total_height: "800mm",
      diameter: "310mm",
      valve_type: "POL Screw Fitting (Female 5/8 inch LH)",
      application: "Domestic heating, catering trailers, workshop blow heaters",
    },
  },
  {
    name: "Calor 47kg Propane Gas Cylinder",
    slug: "calor-47kg-propane-gas-cylinder",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    price: 98.0,
    compare_at_price: 108.0,
    stock: 28,
    rating: 5.0,
    reviews_count: 19,
    is_featured: true,
    is_offer: true,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/calor-47kg-propane.jpg",
    description:
      "The largest cylinder in the Calor range, designed for whole-home central heating, commercial kitchens, holiday parks, and agricultural grain dryers.",
    specs: {
      capacity: "47kg",
      tare_weight: "34kg",
      total_height: "1290mm",
      diameter: "375mm",
      valve_type: "POL Screw Fitting (Female 5/8 inch LH)",
      application: "Off-grid home central heating, commercial hospitality",
    },
  },
  {
    name: "Calor 13kg Butane Gas Cylinder",
    slug: "calor-13kg-butane-gas-cylinder",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Butane Cylinders",
    price: 43.5,
    compare_at_price: 48.0,
    stock: 35,
    rating: 4.9,
    reviews_count: 24,
    is_featured: false,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/calor-13kg-butane.jpg",
    description:
      "The classic blue Calor butane bottle, purpose-engineered for indoor portable cabinet room heaters and indoor gas cookers.",
    specs: {
      capacity: "13kg",
      tare_weight: "14kg",
      total_height: "580mm",
      diameter: "310mm",
      valve_type: "21mm Clip-on Fitting",
      application: "Indoor mobile cabinet heaters, indoor gas cookers",
    },
  },
  {
    name: "Calor 13kg Patio Gas Cylinder (Green)",
    slug: "calor-13kg-patio-gas-cylinder",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Patio Cylinders",
    price: 46.5,
    compare_at_price: 52.0,
    stock: 50,
    rating: 5.0,
    reviews_count: 41,
    is_featured: true,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/calor-13kg-patio.jpg",
    description:
      "Equipped with Calor's built-in Gas Trac indicator so you never run out unexpectedly during summer barbecues or patio heater evenings.",
    specs: {
      capacity: "13kg",
      tare_weight: "15.2kg",
      total_height: "580mm",
      diameter: "315mm",
      valve_type: "27mm Easy Clip-on Fitting",
      application: "4-burner+ gas barbecues, patio heaters, fire pits",
    },
  },
  {
    name: "Campingaz 907 Refillable Cylinder (2.72kg)",
    slug: "campingaz-907-cylinder",
    brand: "Campingaz",
    category_slug: "gas",
    subcategory: "Camping Gas",
    price: 36.0,
    compare_at_price: 39.5,
    stock: 22,
    rating: 4.8,
    reviews_count: 15,
    is_featured: false,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/campingaz-907.jpg",
    description:
      "The most popular European camping cylinder size. Lightweight, portable and readily exchangeable across the UK and Continental Europe.",
    specs: {
      capacity: "2.72kg Butane",
      tare_weight: "3.7kg",
      total_height: "250mm",
      diameter: "203mm",
      valve_type: "M16 x 1.5 Campingaz Internal Screw Valve",
      application: "Campervans, boat galleys, small barbecue grills, camping stoves",
    },
  },

  // 2. Coal & Logs
  {
    name: "Maxibrite Smokeless Ovals 25kg Bag",
    slug: "maxibrite-smokeless-ovals-25kg",
    brand: "Maxibrite",
    category_slug: "coal-logs",
    subcategory: "Smokeless Fuel",
    price: 18.5,
    compare_at_price: 21.0,
    stock: 80,
    rating: 5.0,
    reviews_count: 38,
    is_featured: true,
    is_offer: true,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/maxibrite-25kg.jpg",
    description:
      "HETAS and Defra approved Ready to Burn smokeless fuel. Produces a consistent, long-lasting high heat output with minimal ash residue.",
    specs: {
      weight: "25kg",
      fuel_type: "Manufactured Smokeless Ovals",
      smoke_control_approved: "Yes (Ready to Burn Certified)",
      appliances: "Multi-fuel stoves, room heaters, open fires, cookers",
    },
  },
  {
    name: "Kiln-Dried Hardwood Ash Logs (Crate)",
    slug: "kiln-dried-hardwood-ash-logs",
    brand: "Renewable Wood Fuels",
    category_slug: "coal-logs",
    subcategory: "Logs",
    price: 135.0,
    compare_at_price: 150.0,
    stock: 18,
    rating: 4.9,
    reviews_count: 27,
    is_featured: true,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/kiln-dried-logs.jpg",
    description:
      "Premium British kiln-dried ash logs with guaranteed moisture content below 18%. Delivers maximum heat efficiency and clean burning glass on log burners.",
    specs: {
      log_length: "25cm (10 inches)",
      moisture_content: "< 18% Guaranteed",
      wood_species: "100% Sustainably Sourced British Ash",
      certification: "Ready to Burn (BS EN ISO 17225-5)",
    },
  },

  // 3. Fishing Baits
  {
    name: "Mainline Cell Dedicated Freezer Boilies 1kg (15mm)",
    slug: "mainline-cell-boilies-1kg",
    brand: "Mainline Baits",
    category_slug: "fishing-baits",
    subcategory: "Boilies",
    price: 13.99,
    compare_at_price: 15.5,
    stock: 40,
    rating: 5.0,
    reviews_count: 52,
    is_featured: false,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/mainline-cell.jpg",
    description:
      "The UK's most successful carp bait formulation. Three active protein fractions deliver an instant feeding trigger all year round.",
    specs: {
      weight: "1kg",
      size: "15mm",
      flavour_profile: "Cell (Sweet Coconut/Milk Protein)",
      target_species: "Carp, Barbel, Tench",
    },
  },

  // 4. Animal Feed
  {
    name: "Dodson & Horrell Pasture Mix Horse Feed 20kg",
    slug: "dodson-horrell-pasture-mix-20kg",
    brand: "Dodson & Horrell",
    category_slug: "animal-feed",
    subcategory: "Horse Feed",
    price: 16.5,
    compare_at_price: 18.0,
    stock: 30,
    rating: 4.9,
    reviews_count: 14,
    is_featured: false,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/dodson-horrell-pasture.jpg",
    description:
      "The UK's favourite horse feed formulation, packed with micronized cereals, spearmint and garlic for horses and ponies in light to medium work.",
    specs: {
      bag_size: "20kg",
      digestible_energy: "10.0 MJ/kg",
      crude_protein: "9.5%",
      crude_fibre: "13.5%",
    },
  },

  // 5. Gas Appliances
  {
    name: "Char-Broil Professional PRO 3 Gas Barbecue",
    slug: "char-broil-professional-pro-3",
    brand: "Char-Broil",
    category_slug: "gas-appliances",
    subcategory: "Barbecues",
    price: 499.0,
    compare_at_price: 549.0,
    stock: 8,
    rating: 5.0,
    reviews_count: 16,
    is_featured: true,
    is_offer: true,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/char_broil_professionalpro3_1.jpg",
    description:
      "Equipped with patented TRU-Infrared cooking technology that distributes heat evenly across cast iron grates, keeping steaks and chicken up to 50% juicier.",
    specs: {
      burners: "3 High-Performance Stainless Steel Burners + Side Sear Station",
      grate_material: "Porcelain-Enameled Cast Iron",
      cooking_system: "TRU-Infrared Technology",
      fuel_type: "Propane Patio Gas (27mm Clip-on)",
    },
  },
  {
    name: "Supercalor Mobile Gas Cabinet Room Heater 4.2kW",
    slug: "supercalor-mobile-gas-heater-4-2kw",
    brand: "Lifestyle Appliances",
    category_slug: "gas-appliances",
    subcategory: "Mobile Heaters",
    price: 119.0,
    compare_at_price: 135.0,
    stock: 12,
    rating: 4.8,
    reviews_count: 22,
    is_featured: true,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/supercalor-heater.jpg",
    description:
      "Compact mobile room heater on castor wheels with 3 heat settings, piezo ignition, oxygen depletion sensor (ODS) and flame failure safety cut-off.",
    specs: {
      max_heat_output: "4.2 kW (3 Heat Settings: 1.4kW / 2.8kW / 4.2kW)",
      fuel_type: "13kg or 15kg Butane Cylinder (21mm Clip-on)",
      safety_features: "Flame Failure Device + Atmospheric Oxygen Depletion Sensor",
      mobility: "Castor wheels for effortless transport between rooms",
    },
  },

  // 6. Gas Spares
  {
    name: "Low Pressure 37mbar Propane Screw-on POL Regulator",
    slug: "37mbar-propane-pol-regulator",
    brand: "Calor Gas Spares",
    category_slug: "gas-spares",
    subcategory: "Regulators",
    price: 14.5,
    compare_at_price: 16.5,
    stock: 60,
    rating: 5.0,
    reviews_count: 47,
    is_featured: false,
    is_offer: false,
    image_url:
      "https://wttchknauwvbfjatdscc.supabase.co/storage/v1/object/public/product-images/products/propane-pol-regulator.jpg",
    description:
      "UK standard low pressure regulator designed for red Calor 19kg and 47kg propane cylinders. Features female brass 5/8 inch LH POL thread with nozzle outlet.",
    specs: {
      operating_pressure: "37 mbar",
      inlet_connection: "POL Screw-on (BS 3016 / BS 3212)",
      outlet_connection: "8mm Nozzle Barbed Hose Tail",
      capacity: "1.5 kg/h throughput",
    },
  },
];

async function seedProducts() {
  console.log("=== Seeding Full Product Catalog to Supabase ===");

  // Retrieve category map from Supabase
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catMap = new Map((categories || []).map((c) => [c.slug, c.id]));

  for (const prod of fullProductCatalog) {
    const category_id = catMap.get(prod.category_slug) || null;
    const payload = {
      ...prod,
      category_id,
    };

    const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
    if (error) {
      console.error(`Failed to upsert product ${prod.slug}:`, error.message);
    } else {
      console.log(`✓ Product upserted: ${prod.name}`);
    }
  }

  console.log("=== Product Catalog Seeding Finished Successfully! ===");
}

seedProducts().catch((e) => console.error("Product seeding error:", e));
