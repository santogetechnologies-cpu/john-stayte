import cylinder from "@/assets/image-2.png";
import truck from "@/assets/image-3.png";
import heater from "@/assets/image-4.png";
import bbqSmart from "@/assets/char_broil_smart_electric_bbq_1.jpg";
import bbqPro3 from "@/assets/char_broil_professionalpro3_1.jpg";
import bbqCore from "@/assets/char_broil_professional_core_b4_1.jpg";
import coalLogs from "@/assets/coal-logs.jpg";
import baits from "@/assets/fishing-baits.jpg";

export const IMG = {
  cylinder: cylinder,
  truck: truck,
  heater: heater,
  bbqSmart: bbqSmart,
  bbqPro3: bbqPro3,
  bbqCore: bbqCore,
  coalLogs,
  baits,
};

export type Category = {
  slug: string;
  name: string;
  icon: string;
  subs: string[];
};

export const categories: Category[] = [
  {
    slug: "gas",
    name: "Gas",
    icon: "Flame",
    subs: ["Butane Cylinders", "Propane Cylinders", "Patio Cylinders", "Camping Gas", "Pub Gas"],
  },
  {
    slug: "coal-logs",
    name: "Coal & Logs",
    icon: "Logs",
    subs: ["Coal", "Smokeless Fuel", "Logs", "Kindling", "Firewood", "Eco Fuel"],
  },
  { slug: "fishing-baits", name: "Fishing Baits", icon: "Fish", subs: ["Groundbait", "Pellets"] },
  {
    slug: "animal-feed",
    name: "Animal Feed",
    icon: "Dog",
    subs: ["Horse Feed", "Chicken Feed", "Dog Food", "Cat Food"],
  },
  {
    slug: "gas-appliances",
    name: "Gas Appliances",
    icon: "CookingPot",
    subs: ["Cookers", "Mobile Heaters", "Blow Heaters", "Patio Heaters", "Barbecues"],
  },
  {
    slug: "gas-spares",
    name: "Gas Spares",
    icon: "Wrench",
    subs: ["Regulators", "Hoses", "Clips", "Connectors"],
  },
  { slug: "garden", name: "Garden", icon: "Sprout", subs: [] },
  { slug: "food", name: "Food", icon: "Utensils", subs: [] },
  { slug: "trailers", name: "Trailers", icon: "Truck", subs: [] },
  { slug: "workwear", name: "Workwear", icon: "Shirt", subs: [] },
];

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sub: string;
  price: number;
  compareAt?: number;
  stock: number;
  image: string;
  rating: number;
  reviews: number;
  featured?: boolean;
  offer?: boolean;
  description: string;
  specs: Record<string, string>;
};

export const products: Product[] = [
  {
    id: "prod-calor-19kg",
    slug: "calor-19kg-propane-gas-cylinder",
    name: "Calor 19kg Propane Gas Cylinder",
    brand: "Calor",
    category: "gas",
    sub: "Propane Cylinders",
    price: 49.5,
    compareAt: 54.0,
    stock: 45,
    rating: 5.0,
    reviews: 32,
    featured: true,
    offer: false,
    image: cylinder,
    description: "Ideal for residential heating, light commercial catering, and space heaters across Gloucestershire. Uses a standard POL screw fitting.",
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
    id: "prod-calor-47kg",
    slug: "calor-47kg-propane-gas-cylinder",
    name: "Calor 47kg Propane Gas Cylinder",
    brand: "Calor",
    category: "gas",
    sub: "Propane Cylinders",
    price: 98.0,
    compareAt: 108.0,
    stock: 28,
    rating: 5.0,
    reviews: 19,
    featured: true,
    offer: true,
    image: cylinder,
    description: "The largest cylinder in the Calor range, designed for whole-home central heating, commercial kitchens, holiday parks, and agricultural grain dryers.",
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
    id: "prod-calor-13kg-butane",
    slug: "calor-13kg-butane-gas-cylinder",
    name: "Calor 13kg Butane Gas Cylinder",
    brand: "Calor",
    category: "gas",
    sub: "Butane Cylinders",
    price: 43.5,
    compareAt: 48.0,
    stock: 35,
    rating: 4.9,
    reviews: 24,
    featured: false,
    offer: false,
    image: cylinder,
    description: "The classic blue Calor butane bottle, purpose-engineered for indoor portable cabinet room heaters and indoor gas cookers.",
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
    id: "prod-calor-13kg-patio",
    slug: "calor-13kg-patio-gas-cylinder",
    name: "Calor 13kg Patio Gas Cylinder (Green)",
    brand: "Calor",
    category: "gas",
    sub: "Patio Cylinders",
    price: 46.5,
    compareAt: 52.0,
    stock: 50,
    rating: 5.0,
    reviews: 41,
    featured: true,
    offer: false,
    image: cylinder,
    description: "Equipped with Calor's built-in Gas Trac indicator so you never run out unexpectedly during summer barbecues or patio heater evenings.",
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
    id: "prod-campingaz-907",
    slug: "campingaz-907-cylinder",
    name: "Campingaz 907 Refillable Cylinder (2.72kg)",
    brand: "Campingaz",
    category: "gas",
    sub: "Camping Gas",
    price: 36.0,
    compareAt: 39.5,
    stock: 22,
    rating: 4.8,
    reviews: 15,
    featured: false,
    offer: false,
    image: cylinder,
    description: "The most popular European camping cylinder size. Lightweight, portable and readily exchangeable across the UK and Continental Europe.",
    specs: {
      capacity: "2.72kg Butane",
      tare_weight: "3.7kg",
      total_height: "250mm",
      diameter: "203mm",
      valve_type: "M16 x 1.5 Campingaz Internal Screw Valve",
      application: "Campervans, boat galleys, small barbecue grills, camping stoves",
    },
  },
  {
    id: "prod-maxibrite-25kg",
    slug: "maxibrite-smokeless-ovals-25kg",
    name: "Maxibrite Smokeless Ovals 25kg Bag",
    brand: "Maxibrite",
    category: "coal-logs",
    sub: "Smokeless Fuel",
    price: 18.5,
    compareAt: 21.0,
    stock: 80,
    rating: 5.0,
    reviews: 38,
    featured: true,
    offer: true,
    image: coalLogs,
    description: "HETAS and Defra approved Ready to Burn smokeless fuel. Produces a consistent, long-lasting high heat output with minimal ash residue.",
    specs: {
      weight: "25kg",
      fuel_type: "Manufactured Smokeless Ovals",
      smoke_control_approved: "Yes (Ready to Burn Certified)",
      appliances: "Multi-fuel stoves, room heaters, open fires, cookers",
    },
  },
  {
    id: "prod-kiln-logs",
    slug: "kiln-dried-hardwood-ash-logs",
    name: "Kiln-Dried Hardwood Ash Logs (Crate)",
    brand: "Renewable Wood Fuels",
    category: "coal-logs",
    sub: "Logs",
    price: 135.0,
    compareAt: 150.0,
    stock: 18,
    rating: 4.9,
    reviews: 27,
    featured: true,
    offer: false,
    image: coalLogs,
    description: "Premium British kiln-dried ash logs with guaranteed moisture content below 18%. Delivers maximum heat efficiency and clean burning glass on log burners.",
    specs: {
      log_length: "25cm (10 inches)",
      moisture_content: "< 18% Guaranteed",
      wood_species: "100% Sustainably Sourced British Ash",
      certification: "Ready to Burn (BS EN ISO 17225-5)",
    },
  },
  {
    id: "prod-mainline-cell",
    slug: "mainline-cell-boilies-1kg",
    name: "Mainline Cell Dedicated Freezer Boilies 1kg (15mm)",
    brand: "Mainline Baits",
    category: "fishing-baits",
    sub: "Boilies",
    price: 13.99,
    compareAt: 15.5,
    stock: 40,
    rating: 5.0,
    reviews: 52,
    featured: false,
    offer: false,
    image: baits,
    description: "The UK's most successful carp bait formulation. Three active protein fractions deliver an instant feeding trigger all year round.",
    specs: {
      weight: "1kg",
      size: "15mm",
      flavour_profile: "Cell (Sweet Coconut/Milk Protein)",
      target_species: "Carp, Barbel, Tench",
    },
  },
  {
    id: "prod-bbq-pro3",
    slug: "char-broil-professional-pro-3",
    name: "Char-Broil Professional PRO 3 Gas Barbecue",
    brand: "Char-Broil",
    category: "gas-appliances",
    sub: "Barbecues",
    price: 499.0,
    compareAt: 549.0,
    stock: 8,
    rating: 5.0,
    reviews: 16,
    featured: true,
    offer: true,
    image: bbqPro3,
    description: "Equipped with patented TRU-Infrared cooking technology that distributes heat evenly across cast iron grates, keeping steaks and chicken up to 50% juicier.",
    specs: {
      burners: "3 High-Performance Stainless Steel Burners + Side Sear Station",
      grate_material: "Porcelain-Enameled Cast Iron",
      cooking_system: "TRU-Infrared Technology",
      fuel_type: "Propane Patio Gas (27mm Clip-on)",
    },
  },
  {
    id: "prod-supercalor-heater",
    slug: "supercalor-mobile-gas-heater-4-2kw",
    name: "Supercalor Mobile Gas Cabinet Room Heater 4.2kW",
    brand: "Lifestyle Appliances",
    category: "gas-appliances",
    sub: "Mobile Heaters",
    price: 119.0,
    compareAt: 135.0,
    stock: 12,
    rating: 4.8,
    reviews: 22,
    featured: true,
    offer: false,
    image: heater,
    description: "Compact mobile room heater on castor wheels with 3 heat settings, piezo ignition, oxygen depletion sensor (ODS) and flame failure safety cut-off.",
    specs: {
      max_heat_output: "4.2 kW (3 Heat Settings: 1.4kW / 2.8kW / 4.2kW)",
      fuel_type: "13kg or 15kg Butane Cylinder (21mm Clip-on)",
      safety_features: "Flame Failure Device + Atmospheric Oxygen Depletion Sensor",
      mobility: "Castor wheels for effortless transport between rooms",
    },
  },
];

export const stations = [
  {
    name: "Fromebridge Service Station",
    address: "Fromebridge, Whitminster, Gloucester GL2 7PD",
    phone: "01452 741234",
    hours: "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
    maps: "https://maps.google.com/?q=Fromebridge+Service+Station+Whitminster",
  },
  {
    name: "Wild Goose Garage",
    address: "Bristol Road, Cambridge, Gloucester GL2 7AL",
    phone: "01453 890123",
    hours: "Mon–Sat 7:00–19:00 · Sun 9:00–17:00",
    maps: "https://maps.google.com/?q=Wild+Goose+Garage+Gloucester",
  },
  {
    name: "Bridge Service Station",
    address: "Bridge Road, Frampton on Severn, Gloucester GL2 7EP",
    phone: "01452 740567",
    hours: "Mon–Fri 6:30–20:00 · Sat–Sun 8:00–18:00",
    maps: "https://maps.google.com/?q=Bridge+Service+Station+Frampton+on+Severn",
  },
];

export const services = [
  { title: "Gas Delivery", desc: "Next-day cylinder delivery across Gloucestershire.", icon: "Truck" },
  { title: "Bulk Supply", desc: "Scheduled bulk LPG for farms and estates.", icon: "Container" },
  { title: "Commercial Gas", desc: "Pub, hospitality and catering gas contracts.", icon: "Building2" },
  { title: "Domestic Supply", desc: "Home heating, cooking and patio gas.", icon: "Home" },
  { title: "Cylinder Exchange", desc: "Swap empties at any of our stations.", icon: "RefreshCw" },
  { title: "Emergency Delivery", desc: "Same-day emergency runs when you run dry.", icon: "Siren" },
];

export const blogPosts = [
  {
    slug: "safe-cylinder-storage",
    title: "How to store gas cylinders safely at home",
    date: "2026-06-14",
    tag: "Safety Guide",
    excerpt: "Simple rules for storing propane and butane outdoors, upright and ventilated.",
  },
  {
    slug: "propane-vs-butane",
    title: "Propane vs butane: which cylinder do you need?",
    date: "2026-05-02",
    tag: "Tips",
    excerpt: "Temperature, pressure and regulators explained in plain English.",
  },
  {
    slug: "smokeless-fuel-rules",
    title: "Smokeless fuel rules for 2026",
    date: "2026-04-19",
    tag: "News",
    excerpt: "What the latest domestic fuel regulations mean for your fire.",
  },
  {
    slug: "bbq-first-burn",
    title: "Getting the best from your first BBQ burn",
    date: "2026-03-30",
    tag: "Tips",
    excerpt: "Season the grates, set your zones and cook like a pro.",
  },
];

export const faqs = [
  { q: "Do you deliver to my area?", a: "We cover Gloucestershire and surrounding counties within a 40-mile radius of Whitminster." },
  { q: "How fast is delivery?", a: "Orders placed before 2pm are usually delivered next working day." },
  { q: "Can I exchange an empty cylinder?", a: "Yes — bring your empty to any of our three filling stations or swap on the doorstep." },
  { q: "Do you offer trade accounts?", a: "We do. Contact our team for commercial pricing and scheduled bulk supply." },
];

export const testimonials = [
  { name: "Sarah H.", role: "Frampton on Severn", quote: "Ordered 19kg propane at 9am and it was on the doorstep the next morning. Faultless." },
  { name: "The Bell Inn", role: "Pub customer", quote: "Our cellar gas has never run out since switching to JSS. The scheduling is spot on." },
  { name: "Mark T.", role: "Smallholding, Cam", quote: "Coal, logs and animal feed in one delivery. Saves me two trips a week." },
];
