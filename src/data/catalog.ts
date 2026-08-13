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

export const products: Product[] = [];

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
