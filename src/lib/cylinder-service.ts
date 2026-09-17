import { supabase } from "@/lib/supabase";
import { getCustomerGasApplication } from "@/lib/application-service";
import { getActiveDepositForProduct } from "@/lib/cylinder-deposit-service";

export type UsageType = "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
export type OrderType = "NEW_CYLINDER" | "REFILL_EXCHANGE";
export type ReturnMethod = "RETURN_ON_DELIVERY" | "SCHEDULED_PICKUP";

export type CylinderReturnStatus =
  "PENDING_RETURN" | "PICKUP_SCHEDULED" | "COLLECTED" | "RECEIVED" | "VERIFIED" | "REJECTED";

export interface GasProductRecord {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category_slug: string;
  subcategory?: string | null;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  images?: string[];
  usage_type: UsageType;
  gas_type: string;
  cylinder_size?: string;
  deposit_price?: number;
  refill_price?: number;
  delivery_charge?: number;
  is_active: boolean;
  specs?: Record<string, any>;
  features?: string[];
  suitable_for?: string[];
  empty_cylinder_required?: boolean;
  product_mode?: string;
  restricted_to?: string;
}

export interface SlotConfig {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  type: "delivery" | "pickup" | "both";
}

export const DEFAULT_SLOTS: SlotConfig[] = [
  {
    id: "slot-morning",
    slot_name: "Morning Window (08:00 - 12:00)",
    start_time: "08:00",
    end_time: "12:00",
    capacity: 12,
    is_active: true,
    type: "both",
  },
  {
    id: "slot-afternoon",
    slot_name: "Afternoon Window (12:00 - 16:00)",
    start_time: "12:00",
    end_time: "16:00",
    capacity: 12,
    is_active: true,
    type: "both",
  },
  {
    id: "slot-evening",
    slot_name: "Evening Window (16:00 - 19:00)",
    start_time: "16:00",
    end_time: "19:00",
    capacity: 8,
    is_active: true,
    type: "both",
  },
];

export const INITIAL_GAS_PRODUCTS: Omit<GasProductRecord, "id">[] = [
  // Domestic Products
  {
    name: "Calor Gas Propane - 13kg Refill",
    slug: "calor-gas-propane-13kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    description:
      "13kg Propane gas cylinder refill with standard POL screw connection for whole-home heating, cooking and light commercial use. Requires an empty cylinder exchange on delivery.",
    price: 50.0,
    stock: 30,
    image_url: "/calor-propane-13kg.png",
    images: ["/calor-propane-13kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Propane",
    cylinder_size: "13kg",
    deposit_price: 39.99,
    refill_price: 50.0,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Standard POL screw fitting (Female 5/8 inch LH)",
      "High off-take rate suitable for whole-home continuous demand",
      "Reliable sub-zero outdoor vaporisation performance",
      "Compatible with automatic 2-cylinder & 4-cylinder changeover valves",
    ],
    suitable_for: [
      "Home Central Heating",
      "Gas Hobs & Cookers",
      "Domestic Water Heating",
      "Workshop Space Heaters",
    ],
  },
  {
    name: "Calor Gas Butane - 15kg Refill",
    slug: "calor-gas-butane-15kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Butane Cylinders",
    description:
      "15kg Butane gas cylinder refill for indoor portable room heaters and domestic gas appliances. Requires an empty cylinder exchange on delivery.",
    price: 58.25,
    stock: 35,
    image_url: "/calor-butane-15kg.png",
    images: ["/calor-butane-15kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "15kg",
    deposit_price: 39.99,
    refill_price: 58.25,
    delivery_charge: 0,
    is_active: true,
    features: [
      "21mm Easy-clip valve connection",
      "High-output clean-burning indoor room heating",
      "Standard UK cabinet heater cavity compatibility",
      "Long-lasting 15kg capacity for cold winter periods",
    ],
    suitable_for: [
      "Portable Cabinet Heaters",
      "Living Room Mobile Heating",
      "Indoor Domestic Cookers",
    ],
  },
  {
    name: "Calor Gas Butane - 7kg Refill",
    slug: "calor-gas-butane-7kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Butane Cylinders",
    description:
      "7kg Butane gas cylinder refill for small portable heaters, camping stoves and indoor appliances. Requires an empty cylinder exchange on delivery.",
    price: 37.00,
    stock: 28,
    image_url: "/calor-butane-7kg.png",
    images: ["/calor-butane-7kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "7kg",
    deposit_price: 34.99,
    refill_price: 37.00,
    delivery_charge: 0,
    is_active: true,
    features: [
      "21mm Easy-clip valve connection",
      "Compact size for easy movement and smaller cabinet heaters",
      "Clean burning indoor butane flame",
    ],
    suitable_for: [
      "Small Mobile Heaters",
      "Camping Stoves & Caravans",
      "Indoor Heating",
    ],
  },
  {
    name: "Calor Patio Gas - 13kg Refill",
    slug: "calor-patio-gas-13kg-refill",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Patio Cylinders",
    description:
      "Equipped with easy 27mm clip-on connector and built-in Gas Trac indicator for domestic BBQs and garden patio warmers.",
    price: 52.5,
    stock: 30,
    image_url: "/calor-patio-13kg.png",
    images: ["/calor-patio-13kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Patio Gas",
    cylinder_size: "13kg",
    deposit_price: 44.99,
    refill_price: 52.5,
    delivery_charge: 0,
    is_active: true,
    features: [
      "27mm Quick clip-on regulator fitting",
      "Calor built-in Gas Trac level indicator to monitor fuel reserve",
      "Specially formulated propane for consistent flame in any weather",
      "Large capacity designed for multi-burner outdoor kitchens",
    ],
    suitable_for: [
      "4-Burner+ Gas Barbecues",
      "Patio Tower Heaters",
      "Garden Fire Pits",
      "Outdoor Hospitality",
    ],
  },
  {
    name: "Calor Patio Gas - 5kg Refill",
    slug: "calor-patio-gas-5kg-refill",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Patio Cylinders",
    description:
      "Compact domestic patio gas cylinder for tabletop barbecues, small terrace warmers, and weekend garden cookouts.",
    price: 23.25,
    stock: 25,
    image_url: "/calor-patio-5kg.png",
    images: ["/calor-patio-5kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Patio Gas",
    cylinder_size: "5kg",
    deposit_price: 34.99,
    refill_price: 23.25,
    delivery_charge: 0,
    is_active: true,
    features: [
      "27mm Quick clip-on regulator fitting",
      "Ultra-compact lightweight design for easy moving",
      "Calor Gas Trac gauge included",
      "Ideal for compact gardens, balconies, and tabletop grills",
    ],
    suitable_for: ["Tabletop Barbecues", "Compact Patio Heaters", "Picnics & Garden Parties"],
  },
  {
    name: "Calor Gas Propane - 6kg Refill",
    slug: "calor-gas-propane-6kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    description:
      "6kg Propane gas cylinder refill with standard POL screw connection for caravans, campervans and outdoor catering. Requires an empty cylinder exchange on delivery.",
    price: 32.90,
    stock: 25,
    image_url: "/calor-propane-6kg.png",
    images: ["/calor-propane-6kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Propane",
    cylinder_size: "6kg",
    deposit_price: 34.99,
    refill_price: 32.90,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Standard POL screw valve connection",
      "Lightweight steel casing for easy caravan locker loading",
      "All-weather sub-zero propane performance",
      "Compatible with caravan bulkhead regulators",
    ],
    suitable_for: ["Touring Caravans", "Motorhomes & Campervans", "Camping Stoves", "Blowtorches"],
  },
  {
    name: "904 Refill",
    slug: "904-refill",
    brand: "Campingaz",
    category_slug: "campingaz",
    subcategory: "Refill",
    description:
      "Campingaz 904 refillable butane gas cylinder (1.81kg) – compact and widely available across the UK and Europe for camping stoves and small barbecues.",
    price: 39.95,
    stock: 50,
    image_url: "/campingaz-904-refill.png",
    images: ["/campingaz-904-refill.png"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "1.81kg",
    deposit_price: 35.0,
    refill_price: 39.95,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    features: [
      "Standard Campingaz M16x1.5 internal valve",
      "Refillable exchange cylinder across UK & Europe",
      "Ultra-compact footprint for small camping setups and barbecues",
      "Safety self-sealing valve when disconnected",
    ],
    suitable_for: [
      "Camping Stoves",
      "Small Barbecues",
      "Portable Outdoor Cooking",
    ],
  },
  {
    name: "907 Refill",
    slug: "907-refill",
    brand: "Campingaz",
    category_slug: "campingaz",
    subcategory: "Refill",
    description:
      "Campingaz 907 refillable butane gas cylinder (2.72kg) – popular high-capacity cylinder for camping, campervans, and portable gas appliances.",
    price: 44.25,
    stock: 50,
    image_url: "/campingaz-907-refill.png",
    images: ["/campingaz-907-refill.png"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "2.72kg",
    deposit_price: 35.0,
    refill_price: 44.25,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    features: [
      "Standard Campingaz M16x1.5 internal valve",
      "Refillable exchange cylinder across UK & Europe",
      "High capacity for extended camping trips and campervans",
      "Safety self-sealing valve when disconnected",
    ],
    suitable_for: [
      "Camping Stoves",
      "Campervan Conversions",
      "Marine & Boating",
      "Portable Outdoor Cooking",
    ],
  },
  {
    name: "Camping Gaz Party Grill 400",
    slug: "camping-gaz-party-grill-400",
    brand: "Campingaz",
    category_slug: "campingaz",
    subcategory: "Grill",
    description:
      "Camping Gaz Party Grill 400 – essential camping companion offering stove, grill, griddle, and plancha cooking options with piezo ignition.",
    price: 79.95,
    stock: 25,
    image_url: "/campingaz-party-grill-400.png",
    images: ["/campingaz-party-grill-400.png"],
    usage_type: "DOMESTIC",
    gas_type: "Appliance",
    cylinder_size: "Multi-cooker Stove",
    deposit_price: 0,
    refill_price: 79.95,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Multi-cooking options: stove, grill, griddle and plancha",
      "Integrated piezo ignition for matchless lighting",
      "Runs on Campingaz 904 and 907 refillable cylinders",
      "Detachable legs and lockable lid for easy transport",
    ],
    suitable_for: [
      "Camping & Caravanning",
      "Garden Picnics",
      "Outdoor Barbecues",
    ],
  },
  {
    name: "CP250 4 Pack",
    slug: "cp250-4-pack",
    brand: "Campingaz",
    category_slug: "campingaz",
    subcategory: "Gas Cartridges",
    description:
      "Campingaz CP250 4 Pack – high-performance isobutane gas cartridges designed for Bistro stoves and Camp'Bistro portable cookers.",
    price: 8.15,
    stock: 100,
    image_url: "/campingaz-cp250-4pack.png",
    images: ["/campingaz-cp250-4pack.png"],
    usage_type: "DOMESTIC",
    gas_type: "Isobutane",
    cylinder_size: "4 x 220g Cartridges",
    deposit_price: 0,
    refill_price: 8.15,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "4 x 220g isobutane gas cartridges",
      "Self-sealing safety valve for easy connection and disconnection",
      "Compatible with Campingaz Bistro, Festivio and Bistro 300 stoves",
    ],
    suitable_for: [
      "Tabletop Stoves",
      "Camping Bistro Cookers",
      "Picnics & Day Trips",
    ],
  },

  // Commercial Products
  {
    name: "Calor Gas Propane - 47kg Refill",
    slug: "calor-gas-propane-47kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    description:
      "47kg Propane gas cylinder refill with standard POL screw connection for central heating packs, drying kilns and large commercial installations. Requires an empty cylinder exchange on delivery.",
    price: 113.50,
    stock: 15,
    image_url: "/calor-propane-47kg.png",
    images: ["/calor-propane-47kg.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Propane",
    cylinder_size: "47kg",
    deposit_price: 69.99,
    refill_price: 113.50,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Standard POL screw fitting (Female 5/8 inch LH)",
      "Largest cylinder in the Calor cylinder range",
      "High vaporisation rate for demanding commercial cooking & heating",
      "Ideal for multi-cylinder automatic changeover manifolds",
    ],
    suitable_for: [
      "Whole-Home Off-Grid Heating",
      "Commercial Kitchens & Restaurants",
      "Holiday Parks & Lodges",
      "Agricultural Grain Dryers",
    ],
  },
  {
    name: "Calor Gas Propane - 19kg Refill",
    slug: "calor-gas-propane-19kg-refill",
    brand: "Calor",
    category_slug: "gas",
    subcategory: "Propane Cylinders",
    description:
      "19kg Propane gas cylinder refill with standard POL screw connection for commercial kitchens, catering trailers and space heaters. Requires an empty cylinder exchange on delivery.",
    price: 62.00,
    stock: 20,
    image_url: "/calor-propane-19kg.png",
    images: ["/calor-propane-19kg.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Propane",
    cylinder_size: "19kg",
    deposit_price: 49.99,
    refill_price: 62.00,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Standard POL screw fitting",
      "Versatile mid-capacity commercial format",
      "Heavy-duty commercial propane for high-heat equipment",
      "Mobile catering health & safety compliant",
    ],
    suitable_for: [
      "Mobile Catering Trailers",
      "Bitumen & Roofing Boilers",
      "Site Blow Heaters",
      "Agricultural Sheds",
    ],
  },
  {
    name: "Calor 18kg FLT Forklift Truck Gas",
    slug: "calor-18kg-flt-forklift-gas",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Commercial FLT",
    description:
      "Liquid withdrawal FLT cylinder engineered specifically for industrial forklift trucks.",
    price: 62.0,
    stock: 35,
    image_url: "/safety_upright_v3.jpg",
    images: ["/safety_upright_v3.jpg"],
    usage_type: "COMMERCIAL",
    gas_type: "Forklift Gas",
    cylinder_size: "18kg",
    deposit_price: 49.99,
    refill_price: 62.0,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Liquid withdrawal internal dip-tube design",
      "Standard quick-release FLT fitting",
      "Dedicated engine-grade LPG formulation",
      "Prevents cold engine stalling and regulator freezing",
    ],
    suitable_for: ["Industrial Forklift Trucks", "Warehouse Material Handling", "Yard FLT Fleets"],
  },
  // 10 Real Pub Gas Products (Dispense Gases, Hardware & Accessories)
  {
    name: "6.35kg Carbon Dioxide",
    slug: "6-35kg-carbon-dioxide",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "CO2 / Carbon Dioxide",
    description:
      "6.35kg food-grade Carbon Dioxide (CO2) cylinder for draught beer, cider and soft drinks dispense. Restricted to pub and licensed hospitality customers.",
    price: 28.80,
    stock: 25,
    image_url: "/pub-gas-co2-0-35kg.png",
    images: ["/pub-gas-co2-0-35kg.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "6.35kg",
    deposit_price: 25.0,
    refill_price: 28.80,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "100% beverage grade Carbon Dioxide (CO2)",
      "Standard BS 341 No. 8 outlet connection",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Pubs & Bars", "Draught Soft Drinks", "Craft Beer Dispense"],
  },
  {
    name: "10L 30/70 Mixed Gas",
    slug: "10l-30-70-mixed-gas",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "Mixed Gas",
    description:
      "10L 30% CO2 / 70% Nitrogen dispense gas mixture for creamy stouts, smooth ales and draught bitters. Restricted to pub and licensed hospitality customers.",
    price: 25.20,
    stock: 30,
    image_url: "/pub-gas-mixed-10l-30-70.png",
    images: ["/pub-gas-mixed-10l-30-70.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "10L",
    deposit_price: 35.0,
    refill_price: 25.20,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "30% CO2 / 70% Nitrogen certified food-grade blend",
      "BS 341 No. 3 cellar valve standard",
      "Produces dense, creamy head on stouts and smooth beers",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Guinness & Draught Stouts", "Smooth Creamflow Ales", "Pub Cellars"],
  },
  {
    name: "10L 50/50 Mixed Gas",
    slug: "10l-50-50-mixed-gas",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "Mixed Gas",
    description:
      "10L 50% CO2 / 50% Nitrogen dispense gas mixture for craft beers, ales and designated draught lines. Restricted to pub and licensed hospitality customers.",
    price: 27.00,
    stock: 20,
    image_url: "/pub-gas-mixed-10l-50-50.png",
    images: ["/pub-gas-mixed-10l-50-50.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "10L",
    deposit_price: 35.0,
    refill_price: 27.00,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "50% CO2 / 50% Nitrogen certified beverage mixture",
      "BS 341 No. 3 cellar valve standard",
      "Optimised carbonation level for traditional and craft draught beers",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Craft Breweries", "Draught Ales & Bitters", "Hotel & Restaurant Cellars"],
  },
  {
    name: "10L 60/40 Mixed Gas",
    slug: "10l-60-40-mixed-gas",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "Mixed Gas",
    description:
      "10L 60% CO2 / 40% Nitrogen dispense gas mixture for lagers, ciders and highly carbonated draught drinks. Restricted to pub and licensed hospitality customers.",
    price: 28.80,
    stock: 35,
    image_url: "/pub-gas-mixed-10l-60-40.png",
    images: ["/pub-gas-mixed-10l-60-40.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "10L",
    deposit_price: 35.0,
    refill_price: 28.80,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "60% CO2 / 40% Nitrogen certified food-grade blend",
      "BS 341 No. 3 cellar valve standard",
      "Prevents fobbing and maintains crisp, lively carbonation on lagers",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Draught Lagers", "Draught Ciders", "Pub & Nightclub Cellars"],
  },
  {
    name: "47L 30/70 Mixed Gas",
    slug: "47l-30-70-mixed-gas",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "Mixed Gas",
    description:
      "High-capacity 47L 30% CO2 / 70% Nitrogen dispense cylinder for busy pub cellars and high-turnover draught venues. Restricted to pub and licensed hospitality customers.",
    price: 68.40,
    stock: 15,
    image_url: "/pub-gas-mixed-47l-30-70.png",
    images: ["/pub-gas-mixed-47l-30-70.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "47L",
    deposit_price: 55.0,
    refill_price: 68.40,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "High-capacity 47L vessel for multi-tap dispense systems",
      "30% CO2 / 70% Nitrogen certified blend",
      "Fewer cylinder changes during peak trading times",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["High-Volume Pubs & Stadiums", "Brewery Taprooms", "Event Venues"],
  },
  {
    name: "Pub Gas Spanner (CO2 and Mixed)",
    slug: "pub-gas-spanner-co2-and-mixed",
    brand: "Stayte Pub Gas",
    category_slug: "pub-gas",
    subcategory: "Pub Gas Spanner",
    description:
      "Heavy-duty dual-ended combination spanner designed for tightening and changing both CO2 and Mixed Gas cylinder regulator connections securely.",
    price: 5.95,
    stock: 50,
    image_url: "/pub-gas-spanner.png",
    images: ["/pub-gas-spanner.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Hardware & Adapter",
    cylinder_size: "Universal Tool",
    deposit_price: 0,
    refill_price: 5.95,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Dual-ended combination head for BS 341 No. 8 & No. 3 fittings",
      "Drop-forged industrial steel construction",
      "Prevents rounded regulator nuts and gas line leaks",
    ],
    suitable_for: ["Cellar Technicians", "Pub Managers & Bar Staff", "Cellar Gas Maintenance"],
  },
  {
    name: "Mixed Gas O-ring",
    slug: "mixed-gas-o-ring",
    brand: "Stayte Pub Gas",
    category_slug: "pub-gas",
    subcategory: "Mixed Gas O-ring",
    description:
      "Replacement sealing O-rings for Mixed Gas bottle valves and secondary regulators. Prevents cellar gas leaks and maintains optimal line pressure.",
    price: 1.50,
    stock: 100,
    image_url: "/pub-gas-mixed-oring.png",
    images: ["/pub-gas-mixed-oring.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Hardware & Adapter",
    cylinder_size: "Mixed Gas Seal",
    deposit_price: 0,
    refill_price: 1.50,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Heavy-duty nitrile rubber pressure-rated seal",
      "Direct fit for all 30/70, 50/50 and 60/40 mixed gas valves",
      "Essential preventative maintenance item for cellars",
    ],
    suitable_for: ["Cellar Regulators", "Mixed Gas Cylinder Valves", "Gas Line Seals"],
  },
  {
    name: "CO2 O-ring",
    slug: "co2-o-ring",
    brand: "Stayte Pub Gas",
    category_slug: "pub-gas",
    subcategory: "CO2 O-ring",
    description:
      "High-durability sealing O-rings specifically sized for CO2 Carbon Dioxide cylinder valves and cellar regulators.",
    price: 1.50,
    stock: 100,
    image_url: "/pub-gas-co2-oring.png",
    images: ["/pub-gas-co2-oring.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Hardware & Adapter",
    cylinder_size: "CO2 Seal",
    deposit_price: 0,
    refill_price: 1.50,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Precision-machined high-durometer sealing ring",
      "Tight seal for high-pressure CO2 connections",
      "Eliminates audible hissing and bottle pressure drop",
    ],
    suitable_for: ["CO2 Regulators", "Soft Drink Carbonators", "Cellar Gas Manifolds"],
  },
  {
    name: "22.6kg Carbon Dioxide",
    slug: "22-6kg-carbon-dioxide",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "CO2 / Carbon Dioxide",
    description:
      "22.6kg food-grade Carbon Dioxide (CO2) cellar cylinder for high-volume soft drinks and draught beer dispense. Restricted to pub and licensed hospitality customers.",
    price: 69.00,
    stock: 20,
    image_url: "/pub-gas-co2-22-6kg.png",
    images: ["/pub-gas-co2-22-6kg.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "22.6kg",
    deposit_price: 55.0,
    refill_price: 69.00,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "Food and beverage grade high-purity CO2",
      "BS 341 No. 8 connection standard",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Multi-tap Pubs", "Post-mix Soda Fountains", "Busy Hotel Bars"],
  },
  {
    name: "34kg Carbon Dioxide",
    slug: "34kg-carbon-dioxide",
    brand: "Air Liquide",
    category_slug: "pub-gas",
    subcategory: "CO2 / Carbon Dioxide",
    description:
      "Large 34kg industrial/commercial food-grade Carbon Dioxide cylinder for multi-line pub cellars, clubs and brewery taprooms. Restricted to pub and licensed hospitality customers.",
    price: 97.20,
    stock: 15,
    image_url: "/pub-gas-co2-34kg.png",
    images: ["/pub-gas-co2-34kg.png"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "34kg",
    deposit_price: 65.0,
    refill_price: 97.20,
    delivery_charge: 0,
    is_active: true,
    empty_cylinder_required: true,
    product_mode: "Refill / Cylinder Exchange",
    restricted_to: "Pub customers only",
    features: [
      "Maximum capacity beverage grade CO2 supply",
      "Standard BS 341 No. 8 valve connection",
      "Restricted to licensed hospitality & pub accounts",
      "Empty cylinder exchange required on delivery",
    ],
    suitable_for: ["Large Nightclubs & Venues", "Breweries & Taprooms", "High-Volume Draught Systems"],
  },
  // 20 Coal & Other Fuels Products (Smokeless Fuel, Firewood, Kindling, BBQ & Paraffin)
  {
    name: "Brazier - 10kg",
    slug: "brazier-10kg",
    brand: "Brazier",
    category_slug: "coal-fuels",
    subcategory: "Smokeless Fuel",
    description: "Brazier smokeless fuel (10kg) – value for money smokeless fuel for open fires and multi-fuel stoves.",
    price: 6.50,
    stock: 50,
    image_url: "/fuel-brazier-10kg.png",
    images: ["/fuel-brazier-10kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "10kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Value for money smokeless fuel", "Ideal for open fires and stoves", "Clean burning & consistent heat"],
    suitable_for: ["Open Fires", "Multi-Fuel Stoves", "Room Heaters"],
  },
  {
    name: "Brazier - 20kg",
    slug: "brazier-20kg",
    brand: "Brazier",
    category_slug: "coal-fuels",
    subcategory: "Smokeless Fuel",
    description: "Brazier smokeless fuel (20kg) – 24% hotter and produces up to 80% less smoke. Suitable for open fires and multi-fuel stoves.",
    price: 12.75,
    stock: 45,
    image_url: "/fuel-brazier-20kg.png",
    images: ["/fuel-brazier-20kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "20kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["24% hotter output", "Produces up to 80% less smoke", "Long burning economy fuel"],
    suitable_for: ["Open Fires", "Multi-Fuel Stoves", "Closed Appliances"],
  },
  {
    name: "Coffee Bricks - 7kg",
    slug: "coffee-bricks-7kg",
    brand: "Homefire",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Homefire Coffee Bricks (7kg) – eco-friendly briquettes made from recycled coffee grounds for open fires, chimineas and stoves.",
    price: 7.75,
    stock: 35,
    image_url: "/fuel-coffee-bricks-7kg.png",
    images: ["/fuel-coffee-bricks-7kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "7kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Made from recycled coffee grounds", "High heat output with pleasant aroma", "Eco-friendly sustainable alternative"],
    suitable_for: ["Open Fires", "Chimineas", "Multi-Fuel Stoves"],
  },
  {
    name: "Homefire Twizlers (Wood Wool) Natural Firelighters",
    slug: "homefire-twizlers-wood-wool-natural-firelighters",
    brand: "Homefire",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Homefire Twizlers wood wool firelighters – 100% natural, odorless and quick to light for open fires and multi-fuel stoves.",
    price: 2.30,
    stock: 100,
    image_url: "/fuel-homefire-twizlers.png",
    images: ["/fuel-homefire-twizlers.png"],
    usage_type: "DOMESTIC",
    gas_type: "Firelighting",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["100% natural wood wool & wax", "Odourless & easy to light", "Reliable ignition for all solid fuels"],
    suitable_for: ["Fireplaces", "Log Burners", "BBQs & Firepits"],
  },
  {
    name: "Kiln Dried Kindling",
    slug: "kiln-dried-kindling",
    brand: "Stayte Fuels",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Premium kiln dried kindling wood – ideal starter fuel for open fires, log burners and chimineas.",
    price: 4.00,
    stock: 80,
    image_url: "/fuel-kiln-dried-kindling.png",
    images: ["/fuel-kiln-dried-kindling.png"],
    usage_type: "DOMESTIC",
    gas_type: "Kindling",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Moisture content below 12%", "Fast ignition & clean burn", "Standard bag for convenient storage"],
    suitable_for: ["Open Fires", "Log Burners", "Chimineas & Pizza Ovens"],
  },
  {
    name: "Stoveflame Original 25kg",
    slug: "stoveflame-original-25kg",
    brand: "National Coal",
    category_slug: "coal-fuels",
    subcategory: "Smokeless Fuel",
    description: "Stoveflame Original 25kg smokeless fuel ovoids for multi-fuel stoves, roomheaters and boilers.",
    price: 18.25,
    stock: 40,
    image_url: "/fuel-stoveflame-25kg.png",
    images: ["/fuel-stoveflame-25kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "25kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Authorised smokeless fuel", "High radiant heat & low ash", "Consistent ovoid size"],
    suitable_for: ["Multi-Fuel Stoves", "Roomheaters", "Domestic Boilers"],
  },
  {
    name: "Taybrite - 25kg",
    slug: "taybrite-25kg",
    brand: "Taybrite",
    category_slug: "coal-fuels",
    subcategory: "Smokeless Fuel",
    description: "Taybrite 25kg multi-purpose economy smokeless fuel for room heaters, boilers and multi-fuel stoves.",
    price: 18.75,
    stock: 40,
    image_url: "/fuel-taybrite-25kg.png",
    images: ["/fuel-taybrite-25kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "25kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Multi-purpose economy briquette", "Long slumbering burn time", "Low residual ash content"],
    suitable_for: ["Multi-Fuel Stoves", "Room Heaters", "Gravity Feed Boilers"],
  },
  {
    name: "Homefire - 25kg",
    slug: "homefire-25kg",
    brand: "Homefire",
    category_slug: "coal-fuels",
    subcategory: "Smokeless Fuel",
    description: "Homefire 25kg premier smokeless coal for open fires and multi-fuel stoves. Up to 33% more heat and burns for up to 9 hours.",
    price: 21.15,
    stock: 50,
    image_url: "/fuel-homefire-25kg.png",
    images: ["/fuel-homefire-25kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Solid Fuel",
    cylinder_size: "25kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Up to 33% more heat than ordinary coal", "Lasts up to 9 hours", "Attractive flame picture on open fires"],
    suitable_for: ["Open Fires", "Multi-Fuel Stoves", "Rayburns & Cookers"],
  },
  {
    name: "Net of Logs - Approx 10kg",
    slug: "net-of-logs-approx-10kg",
    brand: "Stayte Fuels",
    category_slug: "coal-fuels",
    subcategory: "Kiln Dried Logs",
    description: "Net bag of seasoned hardwood logs (approx 10kg) for open fireplaces and wood-burning stoves.",
    price: 5.25,
    stock: 60,
    image_url: "/fuel-net-of-logs-10kg.png",
    images: ["/fuel-net-of-logs-10kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Firewood",
    cylinder_size: "approx 10kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Seasoned premium hardwood", "Convenient net bag packaging", "Ready to burn certified"],
    suitable_for: ["Open Fireplaces", "Wood-burning Stoves", "Fire Pits"],
  },
  {
    name: "Homefire Kiln Dried Logs - Approx 8kg",
    slug: "homefire-kiln-dried-logs-approx-8kg",
    brand: "Homefire",
    category_slug: "coal-fuels",
    subcategory: "Kiln Dried Logs",
    description: "Homefire premium kiln dried hardwood logs (approx 8kg) – Ready to Burn certified with moisture content under 20%.",
    price: 8.00,
    stock: 45,
    image_url: "/fuel-homefire-kiln-dried-logs-8kg.png",
    images: ["/fuel-homefire-kiln-dried-logs-8kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Firewood",
    cylinder_size: "approx 8kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["100% FSC certified kiln dried hardwood", "Moisture below 20%", "Maximum heat output with minimal smoke"],
    suitable_for: ["Modern Woodstoves", "Open Grates", "Pizza Ovens"],
  },
  {
    name: "Pre-packed Paraffin 4L",
    slug: "pre-packed-paraffin-4l",
    brand: "Barrettine",
    category_slug: "coal-fuels",
    subcategory: "Liquid Fuel",
    description: "Barrettine premium pre-packed paraffin (4 Litres) for greenhouse heaters, domestic paraffin heaters and lamps.",
    price: 10.00,
    stock: 30,
    image_url: "/fuel-pre-packed-paraffin-4l.png",
    images: ["/fuel-pre-packed-paraffin-4l.png"],
    usage_type: "DOMESTIC",
    gas_type: "Liquid Fuel",
    cylinder_size: "4L",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["High grade clean-burning paraffin", "Child-safe sealed container", "Ideal for horticulture and mobile heating"],
    suitable_for: ["Greenhouse Heaters", "Paraffin Stoves", "Pressure Lamps"],
  },
  {
    name: "Instant Lighting Firelog - Single",
    slug: "instant-lighting-firelog-single",
    brand: "Big K",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Big K instant lighting firelog (single) – just light the wrapper for up to 2 hours of warm ambient fire.",
    price: 2.00,
    stock: 75,
    image_url: "/fuel-instant-lighting-firelog.png",
    images: ["/fuel-instant-lighting-firelog.png"],
    usage_type: "DOMESTIC",
    gas_type: "Firelog",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Single wrapper lighting", "Burns for up to 2 hours", "No mess & no kindling needed"],
    suitable_for: ["Open Hearth Fires", "Chimineas", "Outdoor Fire Pits"],
  },
  {
    name: "Heat Logs Hollow - wrapped pack of 12",
    slug: "heat-logs-hollow-wrapped-pack-of-12",
    brand: "Big K",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Hollow heat logs (wrapped pack of 12) – high-density compressed sawdust logs. Maximum 10 packs per order.",
    price: 7.35,
    stock: 50,
    image_url: "/fuel-heat-logs-hollow-12.png",
    images: ["/fuel-heat-logs-hollow-12.png"],
    usage_type: "DOMESTIC",
    gas_type: "Heat Logs",
    cylinder_size: "Pack of 12",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["100% recycled high-density sawdust", "Hollow core for optimal airflow", "Max order limit: 10 packs"],
    suitable_for: ["Stoves", "Log Burners", "Open Grates"],
  },
  {
    name: "Net of Kindling - Approx 5kg",
    slug: "net-of-kindling-approx-5kg",
    brand: "Stayte Fuels",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "Net bag of dry kindling sticks (approx 5kg) for lighting log fires and stoves effortlessly.",
    price: 4.45,
    stock: 60,
    image_url: "/fuel-net-of-kindling-5kg.png",
    images: ["/fuel-net-of-kindling-5kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Kindling",
    cylinder_size: "approx 5kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Large approx 5kg economical net", "Kiln dried for rapid ignition", "Clean uniform sticks"],
    suitable_for: ["Fireplaces", "Woodstoves", "Campfires"],
  },
  {
    name: "Instant Lighting Charcoal - 2kg",
    slug: "instant-lighting-charcoal-2kg",
    brand: "Big K",
    category_slug: "coal-fuels",
    subcategory: "Charcoal & BBQ",
    description: "Big K instant lighting charcoal (2kg pack) – ready to cook in 20 minutes with no firelighters required.",
    price: 4.50,
    stock: 45,
    image_url: "/fuel-instant-lighting-charcoal-2kg.png",
    images: ["/fuel-instant-lighting-charcoal-2kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "BBQ Fuel",
    cylinder_size: "2kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["No lighter fluid needed", "Ready in 20 minutes", "Includes two 1kg inner bags"],
    suitable_for: ["Kettle BBQs", "Charcoal Grills", "Picnic BBQs"],
  },
  {
    name: "Heat Log Blocks - Pack of 8",
    slug: "heat-log-blocks-pack-of-8",
    brand: "CPL",
    category_slug: "coal-fuels",
    subcategory: "Kindling & Heat Logs",
    description: "CPL high energy ultra dry heat log blocks (pack of 8) for open fires, chimineas and multi-fuel stoves.",
    price: 3.85,
    stock: 40,
    image_url: "/fuel-heat-log-blocks-8.png",
    images: ["/fuel-heat-log-blocks-8.png"],
    usage_type: "DOMESTIC",
    gas_type: "Heat Logs",
    cylinder_size: "Pack of 8",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["High energy compressed wood briquettes", "Ultra low moisture content", "Minimal ash output"],
    suitable_for: ["Open Fires", "Multi-Fuel Stoves", "Chimineas"],
  },
  {
    name: "Lumpwood Charcoal - 4kg",
    slug: "lumpwood-charcoal-4kg",
    brand: "Homefire",
    category_slug: "coal-fuels",
    subcategory: "Charcoal & BBQ",
    description: "Homefire 100% natural lumpwood charcoal (4kg) – fast lighting, high heat for authentic barbecue flavor.",
    price: 5.60,
    stock: 50,
    image_url: "/fuel-lumpwood-charcoal-4kg.png",
    images: ["/fuel-lumpwood-charcoal-4kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "BBQ Fuel",
    cylinder_size: "4kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["100% natural lumpwood charcoal", "High cooking temperatures", "Imparts rich smoky BBQ flavor"],
    suitable_for: ["Barbecues", "Smokers", "Ceramic Grills"],
  },
  {
    name: "Small Instant Barbecue",
    slug: "small-instant-barbecue",
    brand: "Kingfisher",
    category_slug: "coal-fuels",
    subcategory: "Charcoal & BBQ",
    description: "Kingfisher instant disposable barbecue – all in one pack, easy to light, ready in 20 minutes, burns for up to 1.5 hours.",
    price: 3.00,
    stock: 40,
    image_url: "/fuel-small-instant-bbq.png",
    images: ["/fuel-small-instant-bbq.png"],
    usage_type: "DOMESTIC",
    gas_type: "BBQ Fuel",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["All-in-one single use barbecue tray", "Stand included", "Cooks for up to 1.5 hours"],
    suitable_for: ["Camping", "Picnics", "Day Trips & Festivals"],
  },
  {
    name: "Large Party Barbecue",
    slug: "large-party-barbecue",
    brand: "Big K",
    category_slug: "coal-fuels",
    subcategory: "Charcoal & BBQ",
    description: "Big K party size disposable instant BBQ – extra-large cooking surface for family gatherings and outdoor parties.",
    price: 7.15,
    stock: 35,
    image_url: "/fuel-large-party-bbq.png",
    images: ["/fuel-large-party-bbq.png"],
    usage_type: "DOMESTIC",
    gas_type: "BBQ Fuel",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Extra-large grill surface", "Quick lighting formula", "Burns hotter and longer for party crowds"],
    suitable_for: ["Garden Parties", "Family Gatherings", "Outdoor Events"],
  },
  {
    name: "BBQ Lighter Fluid 1L",
    slug: "bbq-lighter-fluid-1l",
    brand: "Big K",
    category_slug: "coal-fuels",
    subcategory: "Charcoal & BBQ",
    description: "Big K premium barbecue lighting fluid (1 Litre bottle) with safety cap for charcoal barbecues.",
    price: 4.00,
    stock: 60,
    image_url: "/fuel-bbq-lighter-fluid-1l.png",
    images: ["/fuel-bbq-lighter-fluid-1l.png"],
    usage_type: "DOMESTIC",
    gas_type: "Firelighting",
    cylinder_size: "1L",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: ["Clean lighting formula", "Child-resistant safety cap", "Directional nozzle for precise application"],
    suitable_for: ["Charcoal Grills", "BBQ Chimneys", "Outdoor Firepits"],
  },

  // Dynamite Fishing Baits
  {
    name: "Marine Halibut Groundbait 1kg",
    slug: "marine-halibut-groundbait-1kg",
    brand: "Dynamite Baits",
    category_slug: "dynamite-baits",
    subcategory: "Groundbait",
    description:
      "High energy marine halibut groundbait (1kg) – specially formulated with marine halibut attractants for coarse and match angling.",
    price: 5.00,
    stock: 50,
    image_url: "/bait-marine-halibut-groundbait-1kg.png",
    images: ["/bait-marine-halibut-groundbait-1kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Fishing Bait",
    cylinder_size: "1kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "High energy marine halibut formula",
      "Packed with attractants and amino acids",
      "Ideal for method feeder and balling in",
    ],
    suitable_for: ["Carp & Coarse Fishing", "Method Feeders", "Match Angling"],
  },
  {
    name: "Marine Halibut Method Mix - 2kg",
    slug: "marine-halibut-method-mix-2kg",
    brand: "Dynamite Baits",
    category_slug: "dynamite-baits",
    subcategory: "Groundbait",
    description:
      "High energy marine halibut method mix (2kg) – big carp range with proven attraction and binding properties for method feeders.",
    price: 7.30,
    stock: 50,
    image_url: "/bait-marine-halibut-method-mix-2kg.png",
    images: ["/bait-marine-halibut-method-mix-2kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Fishing Bait",
    cylinder_size: "2kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Specially designed for method and open-end feeders",
      "Fast breakdown releasing attractive scent trail",
      "High protein marine halibut recipe",
    ],
    suitable_for: ["Big Carp Fishing", "Commercial Fisheries", "Feeder Work"],
  },
  {
    name: "Swim Stim Carp Groundbait - Amino Black - 900g",
    slug: "swim-stim-carp-groundbait-amino-black-900g",
    brand: "Dynamite Baits",
    category_slug: "dynamite-baits",
    subcategory: "Groundbait",
    description:
      "Swim Stim carp groundbait amino black (900g) – advanced koi technology groundbait with amino acids and dark finish for wary fish.",
    price: 4.25,
    stock: 50,
    image_url: "/bait-swim-stim-carp-groundbait-amino-black-900g.png",
    images: ["/bait-swim-stim-carp-groundbait-amino-black-900g.png"],
    usage_type: "DOMESTIC",
    gas_type: "Fishing Bait",
    cylinder_size: "900g",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Advanced Koi feed technology & amino blend",
      "Dark black color for clear waters and pressured fish",
      "Versatile groundbait, paste or method mix",
    ],
    suitable_for: ["Clear Water Angling", "Pressured Carp", "Match & Pole Fishing"],
  },

  // Animal Feed Products
  {
    name: "No Mess Wild Bird Seed 20kg",
    slug: "no-mess-wild-bird-seed-20kg",
    brand: "Countrywide",
    category_slug: "animal-feed",
    subcategory: "Wild Bird Food",
    description:
      "Countrywide No Mess Wild Bird Seed (20kg) – husk-free premium seed mix to attract wild birds without garden waste.",
    price: 28.25,
    stock: 50,
    image_url: "/feed-no-mess-wild-bird-seed-20kg.png",
    images: ["/feed-no-mess-wild-bird-seed-20kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Animal Feed",
    cylinder_size: "20kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "100% edible husk-free formulation",
      "Prevents lawn debris and seed growth under feeders",
      "High protein energy blend for garden songbirds",
    ],
    suitable_for: ["Wild Birds", "Garden Bird Feeders", "Ground Feeding"],
  },
  {
    name: "Summer Wild Bird 20kg",
    slug: "summer-wild-bird-20kg",
    brand: "Countrywide",
    category_slug: "animal-feed",
    subcategory: "Wild Bird Food",
    description:
      "Countrywide Summer Season Wild Bird Food (20kg) – specially formulated high-energy blend for garden birds during warm breeding months.",
    price: 13.70,
    stock: 50,
    image_url: "/feed-summer-wild-bird-20kg.png",
    images: ["/feed-summer-wild-bird-20kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Animal Feed",
    cylinder_size: "20kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Balanced summer maintenance seed blend",
      "Essential nutrients for breeding adults & fledglings",
      "Suitable for bird tables, tubes and ground trays",
    ],
    suitable_for: ["Wild Birds", "Bird Tables", "Garden Feeders"],
  },
  {
    name: "Autarky Mature Lite - Chicken 12kg",
    slug: "autarky-mature-lite-chicken-12kg",
    brand: "Autarky",
    category_slug: "animal-feed",
    subcategory: "Dog Food",
    description:
      "Autarky Mature Lite Complete Dog Food with Delicious Chicken (12kg) – 100% natural goodness with added herbs for senior and weight-conscious dogs.",
    price: 25.20,
    stock: 50,
    image_url: "/feed-autarky-mature-lite-chicken-12kg.png",
    images: ["/feed-autarky-mature-lite-chicken-12kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Animal Feed",
    cylinder_size: "12kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Natural joint care package (glucosamine & herbs)",
      "Reduced calorie formula for senior dogs",
      "Wheat-gluten free recipe",
    ],
    suitable_for: ["Senior Dogs", "Weight Control", "Mature Working Dogs"],
  },
  {
    name: "Autarky Puppy/Junior - Chicken 12kg",
    slug: "autarky-puppy-junior-chicken-12kg",
    brand: "Autarky",
    category_slug: "animal-feed",
    subcategory: "Dog Food",
    description:
      "Autarky Puppy/Junior Complete Dog Food with Delicious Chicken (12kg) – hypoallergenic recipe with prebiotics and minerals for healthy puppy development.",
    price: 29.30,
    stock: 50,
    image_url: "/feed-autarky-puppy-junior-chicken-12kg.png",
    images: ["/feed-autarky-puppy-junior-chicken-12kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Animal Feed",
    cylinder_size: "12kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Optimum calcium-to-phosphorus ratio for bone growth",
      "Prebiotics for healthy gut digestion",
      "Smaller bite-sized kibble",
    ],
    suitable_for: ["Puppies (2-12 Months)", "Junior Working Dogs", "Nursing Mothers"],
  },
  {
    name: "Autarky Adult - Salmon 12kg",
    slug: "autarky-adult-salmon-12kg",
    brand: "Autarky",
    category_slug: "animal-feed",
    subcategory: "Dog Food",
    description:
      "Autarky Adult Complete Dog Food with Succulent Salmon (12kg) – rich in Omega 3 fatty acids, wheat-gluten free for active adult working dogs.",
    price: 26.00,
    stock: 50,
    image_url: "/feed-autarky-adult-salmon-12kg.png",
    images: ["/feed-autarky-adult-salmon-12kg.png"],
    usage_type: "DOMESTIC",
    gas_type: "Animal Feed",
    cylinder_size: "12kg",
    is_active: true,
    empty_cylinder_required: false,
    product_mode: "Outright Purchase",
    features: [
      "Rich in Omega 3 fatty acids for healthy skin & glossy coat",
      "Natural antioxidants and prebiotics",
      "Hypoallergenic wheat-gluten free blend",
    ],
    suitable_for: ["Adult Working Dogs", "Sensitive Skin & Stomachs", "Active Sporting Breeds"],
  },

  // Bulk Products
  {
    name: "Bulk LPG Tank Fill (Commercial / Agricultural)",
    slug: "bulk-lpg-tank-fill-agricultural",
    brand: "Stayte Bulk LPG",
    category_slug: "bulk-gas",
    subcategory: "Bulk Tank Supply",
    description:
      "Bulk road tanker metered delivery directly into on-site bulk storage vessels across Gloucestershire.",
    price: 780.0,
    stock: 50,
    image_url: "/own_vehicle_fleet_truck_1787408938768.jpg",
    images: [
      "/own_vehicle_fleet_truck_1787408938768.jpg",
      "/photorealistic_lpg_truck_hero_1787400698764.jpg",
    ],
    usage_type: "BULK",
    gas_type: "Bulk Propane",
    cylinder_size: "1,000L - 4,000L Vessel",
    deposit_price: 0,
    refill_price: 780.0,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Direct metered bulk road tanker pump delivery",
      "On-site bulk vessel replenishment across Gloucestershire",
      "Telemetry tank monitoring & automatic top-ups available",
      "Lowest cost per litre for high-volume commercial users",
    ],
    suitable_for: [
      "Poultry & Livestock Rearing",
      "Crop & Grain Drying",
      "Commercial Glasshouses",
      "Large Rural Estates",
    ],
  },
  {
    name: "Bulk Autogas Forecourt Tanker Supply",
    slug: "bulk-autogas-tanker-supply",
    brand: "Stayte Bulk LPG",
    category_slug: "bulk-gas",
    subcategory: "Bulk Autogas",
    description:
      "Scheduled road tanker delivery for commercial fleet depots and forecourt autogas dispensers.",
    price: 1450.0,
    stock: 30,
    image_url: "/photorealistic_lpg_truck_hero_1787400698764.jpg",
    images: ["/photorealistic_lpg_truck_hero_1787400698764.jpg"],
    usage_type: "BULK",
    gas_type: "Autogas",
    cylinder_size: "5,000L Vessel",
    deposit_price: 0,
    refill_price: 1450.0,
    delivery_charge: 0,
    is_active: true,
    features: [
      "High-flow metered tanker transfer",
      "Automotive grade EN 589 certified LPG fuel",
      "Commercial fleet bunkering & depot tanks",
      "Scheduled contracted deliveries with emergency backup",
    ],
    suitable_for: [
      "Forecourt Fuel Stations",
      "Commercial Fleet Depots",
      "Taxi & Van Operators",
      "Local Authority Vehicles",
    ],
  },
  // Vehicle LPG / Autogas Products
  {
    name: "Forecourt Vehicle Autogas Refuelling (Per Litre)",
    slug: "forecourt-vehicle-autogas-refuelling",
    brand: "John Stayte Services",
    category_slug: "vehicle-lpg-autogas",
    subcategory: "Forecourt Autogas Refuelling",
    description:
      "Direct pump-dispensed Automotive LPG fuel for bi-fuel and dedicated LPG cars, taxis, and vans at our Gloucestershire service stations.",
    price: 0.89,
    stock: 5000,
    image_url: "/photorealistic_lpg_truck_hero_1787400698764.jpg",
    images: ["/photorealistic_lpg_truck_hero_1787400698764.jpg"],
    usage_type: "AUTOGAS",
    gas_type: "Autogas (Automotive LPG)",
    cylinder_size: "Per Litre Forecourt Dispensed",
    deposit_price: 0,
    refill_price: 0.89,
    delivery_charge: 0,
    is_active: true,
    features: [
      "EN 589 compliant automotive grade LPG fuel",
      "High octane 105+ for smooth engine performance and low emissions",
      "Available at Fromebridge and Wild Goose Garage forecourts",
      "Compatible with all UK bayonet filler nozzles",
    ],
    suitable_for: [
      "LPG Cars & Taxis",
      "Bi-fuel Vans & Light Commercials",
      "Motorhomes & Campervan Refillable Autogas Tanks",
    ],
  },
  {
    name: "Commercial Fleet Vehicle Autogas Account (Metered Keycard)",
    slug: "commercial-fleet-autogas-account",
    brand: "John Stayte Services",
    category_slug: "vehicle-lpg-autogas",
    subcategory: "Commercial Fleet LPG Refuelling",
    description:
      "Commercial fleet autogas account for local businesses, delivery fleets, and taxi operators with weekly itemised invoicing and keycard pump access.",
    price: 0.84,
    stock: 10000,
    image_url: "/station.jpg",
    images: ["/station.jpg"],
    usage_type: "AUTOGAS",
    gas_type: "Autogas (Automotive LPG)",
    cylinder_size: "Per Litre Fleet Account",
    deposit_price: 0,
    refill_price: 0.84,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Dedicated fleet driver RFID keycard access",
      "Discounted commercial fleet tariff per litre",
      "Weekly consolidated VAT invoicing",
      "24/7 automated forecourt refuelling authorization",
    ],
    suitable_for: [
      "Commercial Van Fleets",
      "Taxi & Private Hire Operators",
      "Municipal & Utility Vehicles",
    ],
  },
  {
    name: "UK Bayonet to Euro Dish & ACME Autogas Adapter Kit",
    slug: "uk-bayonet-to-euro-autogas-adapter-kit",
    brand: "John Stayte Services",
    category_slug: "vehicle-lpg-autogas",
    subcategory: "Autogas Adapters & Connectors",
    description:
      "Solid brass precision-machined vehicle LPG refuelling adapter kit for travelling between the UK and Continental Europe.",
    price: 24.99,
    stock: 60,
    image_url: "/service_bulk_supply.jpg",
    images: ["/service_bulk_supply.jpg"],
    usage_type: "AUTOGAS",
    gas_type: "Hardware & Adapter",
    cylinder_size: "Standard Fitting Kit",
    deposit_price: 0,
    refill_price: 24.99,
    delivery_charge: 0,
    is_active: true,
    features: [
      "High-grade solid brass construction with leak-proof seals",
      "Converts UK W21.8 bayonet filler to European Dish & ACME",
      "Protective storage pouch included",
      "Tested to 30 bar pressure rating",
    ],
    suitable_for: [
      "European Touring Vehicles",
      "Motorhomes & Campervans",
      "Imported LPG Vehicles",
    ],
  },
  {
    name: "Compact Double Burner Stove",
    slug: "compact-double-burner-stove",
    brand: "SunnGas",
    category_slug: "gas-appliances",
    subcategory: "Camping",
    description: "Compact Double Burner Stove, compact size and high performance. Quality construction that works from butane or propane.",
    price: 20.00,
    deposit_price: 0,
    refill_price: 20.00,
    delivery_charge: 0,
    stock: 1,
    image_url: "/camping-compact-double-burner.png",
    usage_type: "DOMESTIC",
    gas_type: "Butane or Propane",
    cylinder_size: "Portable Appliance",
    is_active: true,
    features: [
      "Compact Double Burner Stove, compact size and high performance",
      "Quality construction that works from butane or propane",
      "Model: CCKE210",
      "Manufactured by SunnGas",
    ],
    suitable_for: [
      "Camping & Caravanning",
      "Outdoor Cooking",
      "Picnics & Festivals",
    ],
  },
];

const VALID_GAS_CATEGORY_SLUGS = new Set([
  "gas",
  "bottled-gas",
  "bulk-gas",
  "calor-gas",
  "lpg-cylinders",
  "gas-cylinders",
  "vehicle-lpg-autogas",
  "autogas",
  "vehicle-lpg",
  "autogas-refuelling",
]);

const NON_GAS_CATEGORY_SLUGS = new Set([
  "coal-logs",
  "solid-fuel",
  "fishing-baits",
  "fishing-bait",
  "animal-feed",
  "pet-care",
  "gas-appliances",
  "gas-spares",
  "garden",
  "food",
  "trailers",
  "workwear",
]);

/**
 * Initializes/Seeds Gas Products into Supabase DB in the background without blocking.
 */
export async function seedGasProductsIfEmpty() {
  try {
    const { data: existing, error } = await supabase.from("products").select("id, slug, specs");
    if (error || !existing) return;

    const missingSeeds = INITIAL_GAS_PRODUCTS.filter(
      (seed) => !existing.some((p) => p.slug === seed.slug),
    );

    if (missingSeeds.length > 0) {
      const toInsert = missingSeeds.map((seed) => ({
        name: seed.name,
        slug: seed.slug,
        brand: seed.brand,
        category_slug: seed.category_slug,
        subcategory: seed.subcategory,
        description: seed.description,
        price: seed.price,
        stock: seed.stock,
        image_url: seed.image_url,
        specs: {
          usage_type: seed.usage_type,
          gas_type: seed.gas_type,
          cylinder_size: seed.cylinder_size,
          deposit_price: seed.deposit_price,
          refill_price: seed.refill_price,
          delivery_charge: seed.delivery_charge,
          is_gas_product: true,
          is_active: seed.is_active,
          features: seed.features || [],
          suitable_for: seed.suitable_for || [],
        },
      }));
      await (supabase.from("products") as any).insert(toInsert);
    }
  } catch (e) {
    // Non-blocking background sync notice
  }
}

/**
 * Fetches Gas Products filtered strictly by usage type from the REAL database.
 * Ensures non-gas products (fishing baits, solid fuel, animal feed) never appear.
 */
export async function getGasProductsByUsage(usageType: UsageType): Promise<GasProductRecord[]> {
  // Trigger background seed non-blockingly
  seedGasProductsIfEmpty().catch(() => {});

  // Direct fetch with a 5-second timeout
  const fetchPromise = supabase.from("products").select("*").order("price", { ascending: true });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), 5000),
  );

  let data: any[] | null = null;
  try {
    const result: any = await Promise.race([fetchPromise, timeoutPromise]);
    if (result.error) {
      throw new Error(result.error.message || "Failed to fetch products");
    }
    data = result.data || [];
  } catch (err: any) {
    console.warn("Gas products fetch error:", err);
    throw new Error(err.message || "Could not retrieve products");
  }

  const products: GasProductRecord[] = (data || [])
    .filter((p: any) => {
      // 1. Explicitly reject non-gas shop categories (fishing baits, solid fuel, etc.)
      const catSlug = (p.category_slug || "").toLowerCase();
      if (NON_GAS_CATEGORY_SLUGS.has(catSlug)) {
        return false;
      }

      const specs = p.specs && typeof p.specs === "object" ? p.specs : {};

      // 2. Must be verified as an authentic gas cylinder / LPG bulk / autogas product
      const isGasProduct =
        specs.is_gas_product === true ||
        VALID_GAS_CATEGORY_SLUGS.has(catSlug) ||
        specs.usage_type === "DOMESTIC" ||
        specs.usage_type === "COMMERCIAL" ||
        specs.usage_type === "BULK" ||
        specs.usage_type === "AUTOGAS";

      if (!isGasProduct) {
        return false;
      }

      // 3. Must match the exact requested usageType
      const productUsage: UsageType =
        specs.usage_type ||
        (catSlug === "vehicle-lpg-autogas" || catSlug === "autogas" || p.name.toLowerCase().includes("autogas")
          ? "AUTOGAS"
          : catSlug === "bulk-gas"
            ? "BULK"
            : p.name.toLowerCase().includes("commercial") ||
                p.name.toLowerCase().includes("flt") ||
                p.name.toLowerCase().includes("pub gas") ||
                p.name.toLowerCase().includes("47kg") ||
                p.name.toLowerCase().includes("19kg")
              ? "COMMERCIAL"
              : "DOMESTIC");

      return productUsage === usageType;
    })
    .map((p: any) => {
      const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
      const catSlug = (p.category_slug || "").toLowerCase();
      const productUsage: UsageType =
        specs.usage_type ||
        (catSlug === "vehicle-lpg-autogas" || catSlug === "autogas" || p.name.toLowerCase().includes("autogas")
          ? "AUTOGAS"
          : catSlug === "bulk-gas"
            ? "BULK"
            : p.name.toLowerCase().includes("commercial") ||
                p.name.toLowerCase().includes("flt") ||
                p.name.toLowerCase().includes("pub gas") ||
                p.name.toLowerCase().includes("47kg") ||
                p.name.toLowerCase().includes("19kg")
              ? "COMMERCIAL"
              : "DOMESTIC");

      const rawImages =
        Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : p.image_url
            ? [p.image_url]
            : ["/calor-cylinders-studio.jpg"];

      const features =
        Array.isArray(p.features) && p.features.length > 0
          ? p.features
          : Array.isArray(specs.features) && specs.features.length > 0
            ? specs.features
            : undefined;

      const suitableFor =
        Array.isArray(p.suitable_for) && p.suitable_for.length > 0
          ? p.suitable_for
          : Array.isArray(specs.suitable_for) && specs.suitable_for.length > 0
            ? specs.suitable_for
            : Array.isArray(specs.applications) && specs.applications.length > 0
              ? specs.applications
              : undefined;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Calor",
        category_slug: p.category_slug || "bottled-gas",
        subcategory: p.subcategory || null,
        description: p.description || "",
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        image_url: p.image_url || rawImages[0] || "/calor-cylinders-studio.jpg",
        images: rawImages,
        usage_type: productUsage,
        gas_type:
          specs.gas_type ||
          (p.name.toLowerCase().includes("butane")
            ? "Butane"
            : p.name.toLowerCase().includes("patio")
              ? "Patio Gas"
              : p.name.toLowerCase().includes("forklift") || p.name.toLowerCase().includes("flt")
                ? "Forklift Gas"
                : p.name.toLowerCase().includes("pub")
                  ? "Pub Gas"
                  : "Propane"),
        cylinder_size: specs.cylinder_size || p.name.match(/\d+(\.\d+)?kg/i)?.[0] || "13kg",
        deposit_price: typeof specs.deposit_price === "number" ? Number(specs.deposit_price) : 0,
        refill_price: Number(specs.refill_price ?? p.price ?? 45.0),
        delivery_charge: Number(specs.delivery_charge ?? 0),
        is_active: specs.is_active !== false && p.is_active !== false,
        specs: typeof specs === "object" ? specs : {},
        features,
        suitable_for: suitableFor,
      };
    })
    .filter((p) => p.is_active);

  return products;
}

/**
 * Loads scheduling slot configuration and verifies capacity for a given date.
 */
export async function getAvailableSlots(params: {
  type: "delivery" | "pickup";
  date: string;
}): Promise<
  { slot: SlotConfig; bookedCount: number; available: boolean; remainingCapacity: number }[]
> {
  const { type, date } = params;

  // 1. Fetch slots config from cms_content_blocks or fallback to defaults
  let slotConfigs: SlotConfig[] = DEFAULT_SLOTS;
  try {
    const { data: configBlock } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", "delivery_pickup_slots_config")
      .maybeSingle();

    if (configBlock?.content) {
      const parsed = JSON.parse(configBlock.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        slotConfigs = parsed;
      }
    }
  } catch (e) {
    // fallback to defaults
  }

  // Filter slots for requested type
  const activeSlots = slotConfigs.filter(
    (s) => s.is_active && (s.type === "both" || s.type === type),
  );

  // 2. Count existing bookings for this date and time slots from orders & delivery_assignments
  const { data: assignments } = await supabase
    .from("delivery_assignments")
    .select("time_slot, created_at, status")
    .not("status", "eq", "Cancelled");

  return activeSlots.map((slot) => {
    // Approximate matching on slot name or time string
    const booked = (assignments || []).filter(
      (a) =>
        a.time_slot && (a.time_slot === slot.slot_name || a.time_slot.includes(slot.start_time)),
    ).length;

    const remaining = Math.max(0, slot.capacity - booked);
    return {
      slot,
      bookedCount: booked,
      available: remaining > 0,
      remainingCapacity: remaining,
    };
  });
}

/**
 * Recalculates and validates order pricing securely on the backend.
 */
export async function validateAndCalculateOrderTotal(params: {
  productId: string;
  quantity: number;
  orderType: OrderType;
}) {
  const { productId, quantity, orderType } = params;
  if (quantity < 1) throw new Error("Quantity must be at least 1.");

  // Fetch product directly from Supabase
  const { data: prod, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !prod) {
    throw new Error("Invalid gas product selected.");
  }

  const specs: Record<string, any> =
    prod.specs && typeof prod.specs === "object" && !Array.isArray(prod.specs)
      ? (prod.specs as Record<string, any>)
      : {};
  const isNew = orderType === "NEW_CYLINDER";

  const gasPriceUnit = Number(specs.refill_price ?? prod.price ?? 0);
  let depositUnit = 0;
  if (isNew) {
    const depositStatus = await getActiveDepositForProduct(productId);
    depositUnit = depositStatus.depositAmount;
  }
  const deliveryFee = Number(specs.delivery_charge ?? 0);

  const gasPriceTotal = gasPriceUnit * quantity;
  const depositTotal = depositUnit * quantity;
  const subtotal = gasPriceTotal + depositTotal;
  const total = subtotal + deliveryFee;

  return {
    product: prod,
    quantity,
    orderType,
    gasPriceUnit,
    gasPriceTotal,
    depositUnit,
    depositTotal,
    deliveryFee,
    subtotal,
    total,
  };
}

/**
 * Creates a real database order for Gas Ordering with full validation.
 */
export async function createGasOrder(params: {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  usageType: UsageType;
  orderType: OrderType;
  productId: string;
  quantity: number;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  returnMethod?: ReturnMethod;
  pickupAddress?: string;
  pickupDate?: string;
  pickupTimeSlot?: string;
  cylinderTag?: string;
  notes?: string;
  paymentMethod?: string;
}) {
  const {
    userId,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    usageType,
    orderType,
    productId,
    quantity,
    deliveryDate,
    deliveryTimeSlot,
    returnMethod = "RETURN_ON_DELIVERY",
    pickupAddress,
    pickupDate,
    pickupTimeSlot,
    cylinderTag,
    notes = "",
    paymentMethod = "Credit / Debit Card",
  } = params;

  if (!userId) {
    throw new Error(
      "Authentication required: Order must be linked to an authenticated customer account.",
    );
  }

  // 1. Mandatory Gas Customer Application Verification (Backend Enforcement)
  const app = await getCustomerGasApplication(userId);
  if (!app || (app.status !== "SUBMITTED" && app.status !== "APPROVED")) {
    throw new Error(
      "Gas Customer Application Required: You must complete and submit your Gas Customer Application Form before placing your first gas order.",
    );
  }

  // 2. Recalculate price on the backend
  const calculated = await validateAndCalculateOrderTotal({
    productId,
    quantity,
    orderType,
  });

  const isNew = orderType === "NEW_CYLINDER";
  const timestamp = Date.now().toString().slice(-6);
  const prefixMap: Record<UsageType, string> = {
    DOMESTIC: "CYL-DOM",
    COMMERCIAL: "CYL-COM",
    BULK: "CYL-BLK",
    AUTOGAS: "AUT-LPG",
  };
  const orderNumber = `${prefixMap[usageType]}-${timestamp}`;

  const initialStatus = "Pending";

  // 2. Insert main order into existing Supabase orders table
  const isPaidOnline =
    paymentMethod.toLowerCase().includes("card") || paymentMethod.toLowerCase().includes("paypal");
  const normalizedMethod = paymentMethod.toLowerCase().includes("paypal")
    ? "PayPal"
    : paymentMethod.toLowerCase().includes("card")
      ? "Credit / Debit Card"
      : "Pay on Delivery / Collection";

  const { data: orderData, error: orderErr } = await (supabase.from("orders") as any)
    .insert([
      {
        order_number: orderNumber,
        customer_id: userId,
        customer_name: customerName,
        customer_email: customerEmail || "",
        customer_phone: customerPhone || null,
        delivery_address: {
          name: customerName,
          address: deliveryAddress,
          street: deliveryAddress,
          phone: customerPhone || "",
          delivery_date: deliveryDate || null,
          delivery_slot: deliveryTimeSlot || null,
          payment_method: normalizedMethod,
          empty_cylinder_required: !isNew,
          order_type: orderType,
        },
        subtotal: calculated.subtotal,
        shipping_fee: calculated.deliveryFee,
        total: calculated.total,
        status: initialStatus,
        fulfillment_status: "Pending",
        assigned_depot: "Whitminster",
        payment_status: isPaidOnline ? "Paid" : "Pending",
        notes: [
          `[${usageType} LPG]`,
          `[${orderType.replace(/_/g, " ")}]`,
          `[Empty Cylinder Required: ${isNew ? "No" : "Yes"}]`,
          `[Expected: ${isNew ? 0 : quantity}]`,
          `[Payment: ${normalizedMethod}]`,
          deliveryDate ? `Delivery: ${deliveryDate} (${deliveryTimeSlot || "Standard"})` : "",
          isNew
            ? `Deposit: £${calculated.depositTotal.toFixed(2)}`
            : `Return Method: ${returnMethod.replace(/_/g, " ")}`,
          pickupDate ? `Pickup: ${pickupDate} (${pickupTimeSlot || "Anytime"})` : "",
          cylinderTag ? `Tag: ${cylinderTag}` : "",
          notes,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    ])
    .select()
    .single();

  if (orderErr) {
    throw new Error(`Order placement error: ${orderErr.message}`);
  }

  const orderId = orderData.id;

  // 3. Insert order items
  const itemInserts: any[] = [
    {
      order_id: orderId,
      product_id: productId,
      product_name: `${calculated.product.name} (${isNew ? "New Cylinder + Gas" : "Refill Exchange"})`,
      unit_price: calculated.gasPriceUnit,
      quantity,
      total_price: calculated.gasPriceTotal,
    },
  ];

  if (isNew && calculated.depositTotal > 0) {
    itemInserts.push({
      order_id: orderId,
      product_id: productId,
      product_name: `Cylinder Security Deposit (${calculated.product.name})`,
      unit_price: calculated.depositUnit,
      quantity,
      total_price: calculated.depositTotal,
    });
  }

  try {
    await (supabase.from("order_items") as any).insert(itemInserts);
  } catch (itemErr) {
    console.warn("Order items insertion notice:", itemErr);
  }

  // 4. Record initial Order Status History
  try {
    await supabase.from("order_status_history").insert([
      {
        order_id: orderId,
        status: initialStatus,
        notes: isNew
          ? "New cylinder purchase — no empty cylinder collection required."
          : `Refill exchange placed — empty cylinder collection required (${quantity} bottle(s)).`,
      },
    ]);
  } catch (histErr) {
    console.warn("Status history notice:", histErr);
  }

  // 5. Create Delivery Assignment / Route Entry awaiting Admin/Manager assignment
  try {
    await (supabase.from("delivery_assignments") as any).insert([
      {
        order_id: orderId,
        order_ref: orderNumber,
        customer_name: customerName,
        address: deliveryAddress,
        area: "Gloucestershire",
        driver_name: "Unassigned",
        agent_id: null,
        driver_id: null,
        vehicle_plate: null,
        time_slot: deliveryTimeSlot || pickupTimeSlot || "Morning (08:00 - 12:00)",
        status: "Pending",
        notes: `[${usageType}] ${orderType} | Empty Cylinder Required: ${isNew ? "No" : "Yes"} | Expected: ${isNew ? 0 : quantity}`,
      },
    ]);
  } catch (delErr) {
    console.warn("Delivery assignment notice:", delErr);
  }

  // 6. Generate Customer & Staff Notifications
  try {
    await (supabase.from("notifications") as any).insert([
      {
        user_id: userId,
        title: `Order #${orderNumber} Confirmed`,
        message: `Your ${usageType.toLowerCase()} LPG order for ${quantity}x ${calculated.product.name} has been placed.`,
        category: "Orders",
        link: `/account/orders`,
        read: false,
        is_read: false,
      },
      {
        user_id: null,
        title: `New ${usageType} LPG Order: ${orderNumber}`,
        message: `${customerName} ordered ${quantity}x ${calculated.product.name} (${orderType.replace(/_/g, " ")}).`,
        category: "Orders",
        link: `/admin/orders`,
        read: false,
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Notification insert notice:", notifErr);
  }

  // 7. Create Invoice record
  try {
    await supabase.from("invoices").insert([
      {
        invoice_number: `INV-${orderNumber}`,
        order_id: orderId,
        customer_id: userId,
        total_amount: calculated.total,
        status: isPaidOnline ? "Paid" : "Issued",
      },
    ]);
  } catch (invErr) {
    console.warn("Invoice creation notice:", invErr);
  }

  return {
    orderId,
    orderNumber,
    calculated,
  };
}

/**
 * Manages cylinder return workflow transitions with audit logging.
 */
export async function updateCylinderReturnStatus(params: {
  orderId: string;
  status: CylinderReturnStatus;
  notes?: string;
  verifiedBy?: string;
}) {
  const { orderId, status, notes = "", verifiedBy = "Depot Staff" } = params;

  const friendlyStatusMap: Record<CylinderReturnStatus, string> = {
    PENDING_RETURN: "Pending Return",
    PICKUP_SCHEDULED: "Pickup Scheduled",
    COLLECTED: "Empty Cylinder Collected",
    RECEIVED: "Cylinder Received at Depot",
    VERIFIED: "Empty Cylinder Verified",
    REJECTED: "Cylinder Return Rejected",
  };

  const friendlyStatus = friendlyStatusMap[status];

  // Map to canonical orders.status allowed by orders_status_check
  let canonicalOrderStatus = "Approved";
  if (status === "REJECTED") {
    canonicalOrderStatus = "Cancelled";
  } else if (status === "VERIFIED" || status === "RECEIVED") {
    canonicalOrderStatus = "Packed";
  }

  // Update order status in Supabase
  const { error: updateErr } = await (supabase.from("orders") as any)
    .update({
      status: canonicalOrderStatus,
      fulfillment_status: friendlyStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) throw updateErr;

  // Insert status history
  await supabase.from("order_status_history").insert([
    {
      order_id: orderId,
      status: canonicalOrderStatus,
      notes: notes || `Cylinder return marked as ${friendlyStatus} by ${verifiedBy}.`,
    },
  ]);

  // Update delivery assignment status
  await supabase
    .from("delivery_assignments")
    .update({
      status: friendlyStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);

  return { success: true, status: friendlyStatus };
}

export const REFILL_STATUS_STEPS = [
  {
    key: "REFILL_REQUESTED",
    label: "Refill Requested",
    description: "Refill request logged in system.",
  },
  {
    key: "PICKUP_SCHEDULED",
    label: "Pickup Scheduled",
    description: "Driver and pickup window assigned.",
  },
  {
    key: "EMPTY_COLLECTED",
    label: "Empty Cylinder Collected",
    description: "Driver collected empty cylinder.",
  },
  {
    key: "EMPTY_VERIFIED",
    label: "Empty Cylinder Verified",
    description: "Cylinder inspected & passed safety checks.",
  },
  {
    key: "REFILL_IN_PROGRESS",
    label: "Refill In Progress",
    description: "Cylinder being refilled at station.",
  },
  {
    key: "REFILL_COMPLETED",
    label: "Refill Completed",
    description: "Cylinder filled, tested & sealed.",
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    description: "Refilled cylinder on vehicle for drop-off.",
  },
  { key: "DELIVERED", label: "Delivered", description: "Refilled cylinder delivered to customer." },
  { key: "COMPLETED", label: "Completed", description: "Order complete and cylinder registered." },
] as const;

export type RefillStatusKey = (typeof REFILL_STATUS_STEPS)[number]["key"];

/**
 * Advances a refill request through sequential status steps.
 */
export async function advanceRefillStatus(params: {
  orderId: string;
  nextStatus: RefillStatusKey;
  notes?: string;
  verifiedBy?: string;
}) {
  const { orderId, nextStatus, notes = "", verifiedBy = "Staff" } = params;

  const { data: order, error: fetchErr } = await (supabase.from("orders") as any)
    .select("*, order_items(*), delivery_assignments(*)")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    throw new Error("Order record not found.");
  }

  // Validation: Check if attempting to dispatch delivery before empty is verified
  const currentHistory = await supabase
    .from("order_status_history")
    .select("status")
    .eq("order_id", orderId);

  const pastStatuses = (currentHistory.data || []).map((h) => h.status);

  if (
    (nextStatus === "OUT_FOR_DELIVERY" ||
      nextStatus === "DELIVERED" ||
      nextStatus === "COMPLETED") &&
    order.notes?.includes("[REFILL") &&
    !pastStatuses.includes("Empty Cylinder Verified") &&
    !pastStatuses.includes("EMPTY_VERIFIED")
  ) {
    throw new Error(
      "Exchange Policy Violation: An empty cylinder MUST be collected and verified before the refilled cylinder can be dispatched or delivered.",
    );
  }

  const stepMeta = REFILL_STATUS_STEPS.find((s) => s.key === nextStatus);
  const friendlyLabel = stepMeta?.label || nextStatus;

  // Map to canonical orders.status
  let canonicalOrderStatus = "Approved";
  if (nextStatus === "OUT_FOR_DELIVERY") {
    canonicalOrderStatus = "Out for Delivery";
  } else if (nextStatus === "DELIVERED" || nextStatus === "COMPLETED") {
    canonicalOrderStatus = "Delivered";
  } else if (
    nextStatus === "REFILL_COMPLETED" ||
    nextStatus === "REFILL_IN_PROGRESS" ||
    nextStatus === "EMPTY_VERIFIED"
  ) {
    canonicalOrderStatus = "Packed";
  }

  // Update order status
  const { error: updateErr } = await (supabase.from("orders") as any)
    .update({
      status: canonicalOrderStatus,
      fulfillment_status: friendlyLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) throw updateErr;

  // Insert status history
  await supabase.from("order_status_history").insert([
    {
      order_id: orderId,
      status: canonicalOrderStatus,
      notes: notes || `${friendlyLabel} by ${verifiedBy}.`,
    },
  ]);

  // Update delivery assignment if exists
  await supabase
    .from("delivery_assignments")
    .update({
      status: friendlyLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);

  return { success: true, status: friendlyLabel };
}
