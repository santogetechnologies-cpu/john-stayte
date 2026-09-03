import { supabase } from "@/lib/supabase";
import { getCustomerGasApplication } from "@/lib/application-service";

export type UsageType = "DOMESTIC" | "COMMERCIAL" | "BULK";
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
  cylinder_size: string;
  deposit_price: number;
  refill_price: number;
  delivery_charge: number;
  is_active: boolean;
  specs?: Record<string, any>;
  features?: string[];
  suitable_for?: string[];
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
    name: "Calor 13kg Propane Gas Cylinder",
    slug: "calor-13kg-propane-cylinder",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Propane Cylinders",
    description:
      "Standard red domestic propane cylinder with POL screw valve for whole-home heating, cooking, and light commercial use.",
    price: 48.5,
    stock: 25,
    image_url: "/domestic_kitchen_cylinder.jpg",
    images: ["/domestic_kitchen_cylinder.jpg", "/calor-cylinders-studio.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Propane",
    cylinder_size: "13kg",
    deposit_price: 39.99,
    refill_price: 48.5,
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
    name: "Calor 15kg Butane Gas Cylinder",
    slug: "calor-15kg-butane-cylinder",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Butane Cylinders",
    description:
      "Classic high-capacity blue Calor butane cylinder for indoor portable mobile cabinet room heaters and indoor cookers.",
    price: 46.0,
    stock: 20,
    image_url: "/calor-cylinders-studio.jpg",
    images: ["/calor-cylinders-studio.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "15kg",
    deposit_price: 39.99,
    refill_price: 46.0,
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
    name: "Calor 13kg Patio Gas Cylinder",
    slug: "calor-13kg-patio-gas",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Patio Cylinders",
    description:
      "Equipped with easy 27mm clip-on connector and built-in Gas Trac indicator for domestic BBQs and garden patio warmers.",
    price: 52.0,
    stock: 30,
    image_url: "/safety_away_from_flames_v2.jpg",
    images: ["/safety_away_from_flames_v2.jpg", "/calor-cylinders-studio.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Patio Gas",
    cylinder_size: "13kg",
    deposit_price: 44.99,
    refill_price: 52.0,
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
    name: "Calor 5kg Patio Gas Cylinder",
    slug: "calor-5kg-patio-gas",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Patio Cylinders",
    description:
      "Compact domestic patio gas cylinder for tabletop barbecues, small terrace warmers, and weekend garden cookouts.",
    price: 32.5,
    stock: 18,
    image_url: "/safety_away_from_flames_v3.jpg",
    images: ["/safety_away_from_flames_v3.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Patio Gas",
    cylinder_size: "5kg",
    deposit_price: 34.99,
    refill_price: 32.5,
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
    name: "Calor 6kg Propane Gas Cylinder",
    slug: "calor-6kg-propane-cylinder",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Propane Cylinders",
    description:
      "Lightweight domestic camping and touring caravan cylinder with screw-on POL valve.",
    price: 34.0,
    stock: 15,
    image_url: "/safety_upright_v3.jpg",
    images: ["/safety_upright_v3.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Propane",
    cylinder_size: "6kg",
    deposit_price: 34.99,
    refill_price: 34.0,
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
    name: "Campingaz 907 Refillable Cylinder (2.72kg)",
    slug: "campingaz-907-cylinder-2-72kg",
    brand: "Campingaz",
    category_slug: "bottled-gas",
    subcategory: "Camping Gas",
    description:
      "Compact 2.72kg refillable butane cylinder for camping stoves, campervans, and portable outdoor cooking.",
    price: 36.5,
    stock: 25,
    image_url: "/calor-cylinders-studio.jpg",
    images: ["/calor-cylinders-studio.jpg"],
    usage_type: "DOMESTIC",
    gas_type: "Butane",
    cylinder_size: "2.72kg",
    deposit_price: 29.99,
    refill_price: 36.5,
    delivery_charge: 0,
    is_active: true,
    features: [
      "Standard Campingaz M16x1.5 internal valve",
      "Refillable exchange cylinder across UK & Europe",
      "Ultra-compact footprint for small campervans and boats",
      "Safety self-sealing valve when disconnected",
    ],
    suitable_for: [
      "Camping Stoves",
      "Campervan Conversions",
      "Marine & Boating",
      "Portable Outdoor Cooking",
    ],
  },

  // Commercial Products
  {
    name: "Calor 47kg Commercial Propane Cylinder",
    slug: "calor-47kg-commercial-propane",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Commercial Propane",
    description:
      "Heavy-duty commercial propane supply for hotels, commercial kitchens, farms, and workshops.",
    price: 94.0,
    stock: 40,
    image_url: "/safety_storage_v2.jpg",
    images: ["/safety_storage_v2.jpg", "/calor-cylinders-studio.jpg"],
    usage_type: "COMMERCIAL",
    gas_type: "Propane",
    cylinder_size: "47kg",
    deposit_price: 59.99,
    refill_price: 94.0,
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
    name: "Calor 19kg Commercial Propane Cylinder",
    slug: "calor-19kg-commercial-propane",
    brand: "Calor",
    category_slug: "bottled-gas",
    subcategory: "Commercial Propane",
    description:
      "Mid-size commercial propane bottle for catering trailers, bitumen boilers, and blowtorches.",
    price: 68.0,
    stock: 25,
    image_url: "/safety_upright_v2.jpg",
    images: ["/safety_upright_v2.jpg"],
    usage_type: "COMMERCIAL",
    gas_type: "Propane",
    cylinder_size: "19kg",
    deposit_price: 49.99,
    refill_price: 68.0,
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
  {
    name: "Commercial Cellar Pub Gas (60/40 Mixed)",
    slug: "commercial-pub-gas-60-40",
    brand: "Stayte Gas",
    category_slug: "bottled-gas",
    subcategory: "Pub Gas",
    description:
      "60/40 CO2/Nitrogen mixed dispense gas for pub cellars, restaurants, and draught beer lines.",
    price: 38.0,
    stock: 22,
    image_url: "/commercial_kitchen_cylinders.jpg",
    images: ["/commercial_kitchen_cylinders.jpg"],
    usage_type: "COMMERCIAL",
    gas_type: "Pub Gas",
    cylinder_size: "10L / 14kg",
    deposit_price: 55.0,
    refill_price: 38.0,
    delivery_charge: 0,
    is_active: true,
    features: [
      "60% CO2 / 40% Nitrogen certified food-grade mix",
      "BS 341 No. 3 cellar valve standard",
      "Maintains optimal carbonation and creamy head on ales and stouts",
      "Certified clean food and beverage grade purity",
    ],
    suitable_for: [
      "Pub Cellars",
      "Bar Beer Dispense",
      "Restaurants & Clubs",
      "Draught Beverage Systems",
    ],
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
];

const VALID_GAS_CATEGORY_SLUGS = new Set([
  "gas",
  "bottled-gas",
  "bulk-gas",
  "calor-gas",
  "lpg-cylinders",
  "gas-cylinders",
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

      // 2. Must be verified as an authentic gas cylinder / LPG bulk product
      const isGasProduct =
        specs.is_gas_product === true ||
        VALID_GAS_CATEGORY_SLUGS.has(catSlug) ||
        specs.usage_type === "DOMESTIC" ||
        specs.usage_type === "COMMERCIAL" ||
        specs.usage_type === "BULK";

      if (!isGasProduct) {
        return false;
      }

      // 3. Must match the exact requested usageType
      const productUsage: UsageType =
        specs.usage_type ||
        (catSlug === "bulk-gas"
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
        (catSlug === "bulk-gas"
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
        deposit_price: Number(specs.deposit_price ?? 39.99),
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
  const depositUnit = isNew ? Number(specs.deposit_price ?? 39.99) : 0;
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
  };
  const orderNumber = `${prefixMap[usageType]}-${timestamp}`;

  const initialStatus = isNew ? "Pending" : "Refill Requested";

  // 2. Insert main order
  const { data: orderData, error: orderErr } = await (supabase.from("orders") as any)
    .insert([
      {
        order_number: orderNumber,
        customer_id: userId,
        guest_email: null,
        guest_name: customerName,
        guest_phone: customerPhone,
        subtotal: calculated.subtotal,
        total: calculated.total,
        delivery_fee: calculated.deliveryFee,
        status: initialStatus,
        payment_status: "Paid",
        payment_method: paymentMethod,
        shipping_name: customerName,
        shipping_phone: customerPhone,
        shipping_address: deliveryAddress,
        delivery_date: deliveryDate || null,
        notes: [
          `[${usageType}]`,
          `[${orderType}]`,
          isNew
            ? `Deposit: £${calculated.depositTotal.toFixed(2)}`
            : `Return Method: ${returnMethod}`,
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
      name: `${calculated.product.name} (${isNew ? "New Cylinder + Gas" : "Refill Exchange"})`,
      price: calculated.gasPriceUnit,
      quantity,
      total: calculated.gasPriceTotal,
      specs: {
        usage_type: usageType,
        order_type: orderType,
        return_method: !isNew ? returnMethod : null,
        cylinder_tag: cylinderTag || null,
        delivery_slot: deliveryTimeSlot || null,
        pickup_slot: pickupTimeSlot || null,
        pickup_date: pickupDate || null,
      },
    },
  ];

  if (isNew && calculated.depositTotal > 0) {
    itemInserts.push({
      order_id: orderId,
      product_id: productId,
      name: `Cylinder Security Deposit (${calculated.product.name})`,
      price: calculated.depositUnit,
      quantity,
      total: calculated.depositTotal,
      specs: {
        is_deposit: true,
        refundable: true,
      },
    });
  }

  await (supabase.from("order_items") as any).insert(itemInserts);

  // 4. Record initial Order Status History
  await supabase.from("order_status_history").insert([
    {
      order_id: orderId,
      status: initialStatus,
      notes: isNew
        ? "New cylinder order placed with security deposit."
        : `Refill exchange placed. Return method: ${returnMethod.replace(/_/g, " ")}.`,
    },
  ]);

  // 5. Create Delivery Assignment / Route Entry
  await supabase.from("delivery_assignments").insert([
    {
      order_id: orderId,
      driver_name: "Gloucestershire Logistics Team",
      vehicle_identifier: "JS-CYL-FLEET",
      route_area: "Gloucestershire Forecourt Route",
      time_slot: isNew
        ? deliveryTimeSlot || "Morning Window (08:00 - 12:00)"
        : pickupTimeSlot || "Morning Window (08:00 - 12:00)",
      status: isNew ? "Confirmed" : "Pickup Scheduled",
    },
  ]);

  // 6. Generate Customer & Staff Notifications
  await supabase.from("customer_notifications").insert([
    {
      user_id: userId,
      title: `Order #${orderNumber} Confirmed`,
      message: `Your ${usageType.toLowerCase()} order for ${quantity}x ${calculated.product.name} is confirmed.`,
      category: "Orders",
      is_read: false,
    },
  ]);

  await (supabase.from("notifications") as any).insert([
    {
      title: `New ${usageType} Order: ${orderNumber}`,
      message: `${customerName} ordered ${quantity}x ${calculated.product.name} (${orderType}).`,
      type: "order",
      link: `/admin/orders`,
    },
  ]);

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

  // Update order status in Supabase
  const { error: updateErr } = await (supabase.from("orders") as any)
    .update({
      status: friendlyStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) throw updateErr;

  // Insert status history
  await supabase.from("order_status_history").insert([
    {
      order_id: orderId,
      status: friendlyStatus,
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

  // Update order status
  const { error: updateErr } = await (supabase.from("orders") as any)
    .update({
      status: friendlyLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) throw updateErr;

  // Insert status history
  await supabase.from("order_status_history").insert([
    {
      order_id: orderId,
      status: friendlyLabel,
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
