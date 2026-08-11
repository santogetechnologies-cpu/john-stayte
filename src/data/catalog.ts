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
  { slug: "garden", name: "Garden", icon: "Sprout", subs: ["Garden"] },
  { slug: "food", name: "Food", icon: "Utensils", subs: ["Food"] },
  { slug: "trailers", name: "Trailers", icon: "Truck", subs: ["Trailers"] },
  { slug: "workwear", name: "Workwear", icon: "Shirt", subs: ["Workwear"] },
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

const p = (
  name: string,
  brand: string,
  category: string,
  sub: string,
  price: number,
  stock: number,
  image: string,
  extra: Partial<Product> = {},
): Product => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  brand,
  category,
  sub,
  price,
  stock,
  image,
  rating: 4.4 + ((name.length % 5) / 10) * 1.2 > 5 ? 4.9 : 4.4 + (name.length % 5) / 10,
  reviews: 8 + (name.length % 40),
  description: `${name} supplied and delivered by John Stayte Services. Trusted local supply across Gloucestershire with fast, reliable delivery and expert advice from our team.`,
  specs: { Brand: brand, Category: category, Availability: stock > 0 ? "In stock" : "Backorder" },
  ...extra,
});

export const products: Product[] = [
  p("Calor Gas Propane 47kg Refill", "Calor", "gas", "Propane Cylinders", 92.5, 46, IMG.cylinder, {
    featured: true,
  }),
  p("Calor Gas Propane 19kg Refill", "Calor", "gas", "Propane Cylinders", 51.0, 82, IMG.cylinder, {
    featured: true,
  }),
  p("Calor Gas Propane 13kg Refill", "Calor", "gas", "Propane Cylinders", 39.5, 120, IMG.cylinder, {
    featured: true,
  }),
  p("Calor Gas Butane 15kg Refill", "Calor", "gas", "Butane Cylinders", 46.0, 64, IMG.cylinder),
  p("Calor Gas Butane 7kg Refill", "Calor", "gas", "Butane Cylinders", 30.0, 90, IMG.cylinder),
  p("Calor Patio Gas 13kg Refill", "Calor", "gas", "Patio Cylinders", 42.0, 55, IMG.cylinder, {
    offer: true,
    compareAt: 47.5,
  }),
  p("Calor Patio Gas 5kg Refill", "Calor", "gas", "Patio Cylinders", 26.0, 70, IMG.cylinder),
  p("Campingaz 907 Refill", "Campingaz", "gas", "Camping Gas", 34.0, 38, IMG.cylinder),
  p("Campingaz 904 Refill", "Campingaz", "gas", "Camping Gas", 27.0, 41, IMG.cylinder),
  p("6.35kg Carbon Dioxide (Pub)", "Calor", "gas", "Pub Gas", 44.0, 22, IMG.cylinder),
  p("22.6kg Carbon Dioxide (Pub)", "Calor", "gas", "Pub Gas", 96.0, 14, IMG.cylinder),
  p("34kg Carbon Dioxide (Pub)", "Calor", "gas", "Pub Gas", 128.0, 9, IMG.cylinder),
  p("10L 60/40 Mixed Gas (Pub)", "Calor", "gas", "Pub Gas", 58.0, 18, IMG.cylinder),

  p("House Coal 25kg", "JSS", "coal-logs", "Coal", 19.5, 140, IMG.coalLogs, { featured: true }),
  p("Smokeless Ovals 25kg", "Homefire", "coal-logs", "Smokeless Fuel", 22.5, 96, IMG.coalLogs),
  p("Net of Logs Approx 10kg", "JSS", "coal-logs", "Logs", 6.5, 220, IMG.coalLogs, {
    offer: true,
    compareAt: 7.95,
  }),
  p("Kiln Dried Hardwood Crate", "JSS", "coal-logs", "Firewood", 89.0, 24, IMG.coalLogs),
  p("Kindling Net", "JSS", "coal-logs", "Kindling", 4.5, 300, IMG.coalLogs),
  p("Eco Heat Logs 10 Pack", "Homefire", "coal-logs", "Eco Fuel", 12.0, 80, IMG.coalLogs),

  p("Method Mix Groundbait 2kg", "Dynamite", "fishing-baits", "Groundbait", 8.99, 60, IMG.baits),
  p("Swim Stim Groundbait 900g", "Dynamite", "fishing-baits", "Groundbait", 6.49, 75, IMG.baits),
  p("Carp Pellets 4mm 3kg", "Dynamite", "fishing-baits", "Pellets", 11.99, 52, IMG.baits, {
    offer: true,
    compareAt: 14.5,
  }),
  p("Halibut Pellets 8mm 3kg", "Dynamite", "fishing-baits", "Pellets", 12.99, 44, IMG.baits),

  p("Horse & Pony Cubes 20kg", "Country", "animal-feed", "Horse Feed", 14.5, 60, IMG.baits),
  p("Layers Pellets 20kg", "Country", "animal-feed", "Chicken Feed", 13.0, 70, IMG.baits),
  p("Working Dog Food 15kg", "Country", "animal-feed", "Dog Food", 24.0, 40, IMG.baits),
  p("Complete Cat Food 4kg", "Country", "animal-feed", "Cat Food", 11.5, 55, IMG.baits),

  p(
    "SMART-E Electric Barbecue",
    "Char-Broil",
    "gas-appliances",
    "Barbecues",
    899.0,
    4,
    IMG.bbqSmart,
    { featured: true, offer: true, compareAt: 999.0 },
  ),
  p(
    "Professional Pro S3 Gas Barbecue",
    "Char-Broil",
    "gas-appliances",
    "Barbecues",
    649.0,
    6,
    IMG.bbqPro3,
    { featured: true },
  ),
  p(
    "Professional Core B4 Gas Barbecue",
    "Char-Broil",
    "gas-appliances",
    "Barbecues",
    749.0,
    5,
    IMG.bbqCore,
    { featured: true },
  ),
  p(
    "Portable Mobile Gas Heater 4.2kW",
    "Provence",
    "gas-appliances",
    "Mobile Heaters",
    139.0,
    18,
    IMG.heater,
    { featured: true, offer: true, compareAt: 159.0 },
  ),
  p("Blow Heater 15kW", "Sealey", "gas-appliances", "Blow Heaters", 189.0, 8, IMG.heater),
  p("Pyramid Patio Heater", "Kingfisher", "gas-appliances", "Patio Heaters", 269.0, 7, IMG.heater),
  p("Twin Burner Gas Cooker", "Flavel", "gas-appliances", "Cookers", 429.0, 3, IMG.heater),

  p("27mm Clip-On Regulator", "Calor", "gas-spares", "Regulators", 18.5, 120, IMG.cylinder),
  p("Propane Screw-On Regulator 37mbar", "Calor", "gas-spares", "Regulators", 21.0, 95, IMG.cylinder),
  p("8mm Gas Hose (per metre)", "Gasflow", "gas-spares", "Hoses", 4.75, 200, IMG.cylinder),
  p("Jubilee Hose Clips (Pair)", "Gasflow", "gas-spares", "Clips", 2.5, 400, IMG.cylinder),
  p("POL Connector", "Gasflow", "gas-spares", "Connectors", 9.25, 130, IMG.cylinder),

  p("Compost 50L", "JSS Garden", "garden", "Garden", 7.5, 88, IMG.coalLogs),
  p("Rock Salt 25kg", "JSS Garden", "garden", "Garden", 9.5, 150, IMG.coalLogs),
  p("Local Farm Eggs (Dozen)", "Local", "food", "Food", 3.6, 60, IMG.baits),
  p("Charcoal BBQ Bundle", "JSS", "food", "Food", 24.0, 30, IMG.coalLogs, { offer: true, compareAt: 29 }),
  p("Single Axle Trailer 6x4", "Erde", "trailers", "Trailers", 749.0, 2, IMG.truck),
  p("Heavy Duty Work Trousers", "Site", "workwear", "Workwear", 39.0, 25, IMG.truck),
  p("Hi-Vis Waterproof Jacket", "Site", "workwear", "Workwear", 49.0, 30, IMG.truck),
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

export const offers = [
  { title: "Winter Fuel Bundle", desc: "3 × Smokeless 25kg + free kindling", price: "£62.00", tag: "Save £9" },
  { title: "Patio Gas Double Up", desc: "2 × 13kg Patio refills", price: "£78.00", tag: "Save £6" },
  { title: "BBQ Season Deal", desc: "Char-Broil SMART-E + free cover", price: "£899.00", tag: "Save £100" },
  { title: "Angler's Kit", desc: "Groundbait + pellets bundle", price: "£17.50", tag: "Save £3.50" },
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
