/**
 * Cylinder Exchange Evaluation Service
 * Single source of truth for evaluating empty cylinder collection requirements
 * across Customer, Delivery Agent, Manager, and Admin panels.
 */

export interface CylinderExchangeRequirement {
  required: boolean;
  expectedQuantity: number;
  orderType: "NEW_CYLINDER" | "REFILL_EXCHANGE" | "NON_GAS";
  badgeLabel: string;
  reason: string;
  customerNotice: {
    title: string;
    description: string;
    status: "new_cylinder" | "empty_required" | "non_gas";
  };
}

const CYLINDER_KEYWORDS = [
  "cylinder",
  "propane",
  "butane",
  "patio gas",
  "forklift",
  "campingaz",
  "flt",
  "pub gas",
  "bottle",
  "gas",
];

export function isRefillableLpgCylinderProduct(product: any): boolean {
  if (!product) return false;

  const name = (product.name || product.product_name || "").toLowerCase().trim();
  const slug = (product.slug || "").toLowerCase().trim();
  const category = (product.category_slug || product.category || "").toLowerCase().trim();
  const brand = (product.brand || "").toLowerCase().trim();

  // Specs checks
  const specs = product.specs && typeof product.specs === "object" ? product.specs : {};
  const cylinderSize = (specs.cylinder_size || "").toLowerCase().trim();

  // 0. Explicit Autogas & Vehicle Exclusion (Autogas uses dispenser/station or adapter, not cylinder deposit/return)
  if (
    product.usage_type === "AUTOGAS" ||
    category.includes("autogas") ||
    category.includes("vehicle") ||
    slug.includes("autogas") ||
    slug.includes("vehicle") ||
    name.includes("autogas") ||
    name.includes("vehicle refuelling") ||
    name.includes("fleet")
  ) {
    return false;
  }

  // 1. Explicit Exclusions: Non-cylinder items, appliances, accessories, fuel solid products, tools, o-rings, spanners, small cartridges
  const EXCLUDED_KEYWORDS = [
    // Accessories & Hardware & Tools
    "o-ring",
    "oring",
    "spanner",
    "regulator",
    "hose",
    "pigtail",
    "clip",
    "fitting",
    "adapter",
    "gauge",
    "trolley",
    "stand",
    "accessory",
    "accessories",
    "spares",
    "part",
    "torch",
    "blowtorch",
    // Appliances, Heaters, Cookers, Stoves, Lanterns
    "heater",
    "living flame",
    "cabinet heater",
    "room heater",
    "patio heater",
    "catalytic",
    "fire pit",
    "barbecue",
    "bbq",
    "stove",
    "cooker",
    "grill",
    "smoker",
    "party grill",
    "camp bistro",
    "bleuet",
    "instaflam",
    "lantern",
    "burner",
    "206l",
    "206s",
    "camping 206",
    // Solid Fuels & Combustibles
    "coal",
    "charcoal",
    "logs",
    "kindling",
    "firelog",
    "firelighters",
    "twizlers",
    "briquette",
    "paraffin",
    "lighter fluid",
    "taybrite",
    "brazier",
    "stoveflame",
    "coffee bricks",
    // Animal Feed & Baits
    "animal-feed",
    "dog food",
    "bird seed",
    "salmon",
    "chicken",
    "puppy",
    "mature",
    "bait",
    "groundbait",
    "boilie",
    "pellet",
    "swim stim",
    "marine halibut",
    // Garden & Compost & Food
    "bark",
    "mulch",
    "compost",
    "planter",
    "eggs",
    // Char-Broil & BBQ Modules
    "smart-e",
    "core b",
    "pro s",
    "ultimate 3200",
    "ultimate bbq",
    "corner module",
    "entertainment",
    // Disposable Cartridges
    "cp250",
    "cartridge",
  ];

  if (
    EXCLUDED_KEYWORDS.some(
      (kw) => name.includes(kw) || slug.includes(kw) || cylinderSize.includes(kw),
    )
  ) {
    return false;
  }

  // Strictly non-gas category slugs
  const nonGasCategories = [
    "coal-fuels",
    "animal-feed",
    "dynamite-baits",
    "garden",
    "char-broil",
    "kingfisher",
    "lifestyle-appliances",
    "gas-appliances",
    "gas-spares",
    "sahara",
    "food",
  ];
  if (nonGasCategories.includes(category)) {
    return false;
  }

  // 2. Inclusion criteria for genuine LPG / Gas Cylinders:
  // A. Recognized cylinder naming patterns
  const isCylinderWord =
    name.includes("cylinder") ||
    name.includes("bottle") ||
    name.includes("refill") ||
    name.includes("propane") ||
    name.includes("butane") ||
    name.includes("patio gas") ||
    name.includes("mixed gas") ||
    name.includes("carbon dioxide") ||
    name.includes("co2") ||
    name.includes("flt") ||
    name.includes("forklift") ||
    name.includes("904") ||
    name.includes("907");

  // B. Recognized Gas categories or brands
  const isGasCategoryOrBrand =
    [
      "gas",
      "calor-gas",
      "bottled-gas",
      "pub-gas",
      "air-liquide",
      "commercial-gas",
      "domestic-gas",
      "bulk-lpg",
      "campingaz",
    ].includes(category) ||
    ["calor", "campingaz", "air liquide", "stayte pub gas", "flogas"].includes(brand);

  if (isCylinderWord || isGasCategoryOrBrand) {
    return true;
  }

  // C. Valid cylinder size in specs
  if (
    cylinderSize &&
    cylinderSize !== "" &&
    !cylinderSize.includes("tool") &&
    !cylinderSize.includes("seal")
  ) {
    return true;
  }

  return false;
}

export function getOrderCylinderExchangeRequirement(
  orderOrDelivery: any,
): CylinderExchangeRequirement {
  if (!orderOrDelivery) {
    return {
      required: false,
      expectedQuantity: 0,
      orderType: "NON_GAS",
      badgeLabel: "No Cylinder",
      reason: "No order data provided",
      customerNotice: {
        title: "Standard Delivery",
        description: "Standard doorstep delivery.",
        status: "non_gas",
      },
    };
  }

  // Handle both delivery_assignment (with nested orders) and pure order objects
  const order = orderOrDelivery.orders || orderOrDelivery;
  const rawNotes = `${orderOrDelivery.notes || ""} ${order.notes || ""}`;
  const address = order.delivery_address || {};

  // Extract items
  const items: any[] = order.order_items || order.items || [];

  // 1. Calculate total gas cylinder quantities from items
  let gasCylinderCount = 0;
  let hasExplicitNewInItems = false;
  let hasExplicitRefillInItems = false;
  let isGasOrder = false;

  items.forEach((item: any) => {
    const isCylinder = isRefillableLpgCylinderProduct(item.product_info || item.product || item);

    if (isCylinder) {
      isGasOrder = true;
      gasCylinderCount += Number(item.quantity || 1);

      const name = (item.product_name || item.name || "").toLowerCase();
      if (name.includes("new cylinder") || name.includes("new bottle") || name.includes("+ gas")) {
        hasExplicitNewInItems = true;
      }
      if (name.includes("refill") || name.includes("exchange")) {
        hasExplicitRefillInItems = true;
      }
    }
  });

  // If no items in array, check notes/order_number for gas indications
  if (
    !isGasOrder &&
    (rawNotes.toLowerCase().includes("lpg") ||
      rawNotes.toLowerCase().includes("cylinder") ||
      rawNotes.toLowerCase().includes("propane") ||
      rawNotes.toLowerCase().includes("butane") ||
      (order.order_number || "").startsWith("GAS-"))
  ) {
    isGasOrder = true;
    gasCylinderCount = 1;
  }

  // 2. Check explicit flags in notes or delivery_address metadata
  const notesUpper = rawNotes.toUpperCase();

  const isExplicitlyNoEmpty =
    notesUpper.includes("EMPTY CYLINDER REQUIRED: NO") ||
    notesUpper.includes("[NEW CYLINDER]") ||
    notesUpper.includes("[NEW_CYLINDER]") ||
    notesUpper.includes("NEW_CYLINDER") ||
    notesUpper.includes("NEW CYLINDER PURCHASE") ||
    address.empty_cylinder_required === false ||
    address.order_type === "NEW_CYLINDER" ||
    (hasExplicitNewInItems && !hasExplicitRefillInItems);

  const isExplicitlyEmptyRequired =
    notesUpper.includes("EMPTY CYLINDER REQUIRED: YES") ||
    notesUpper.includes("[REFILL EXCHANGE]") ||
    notesUpper.includes("[REFILL_EXCHANGE]") ||
    notesUpper.includes("REFILL_EXCHANGE") ||
    notesUpper.includes("REFILL EXCHANGE") ||
    address.empty_cylinder_required === true ||
    address.order_type === "REFILL_EXCHANGE" ||
    hasExplicitRefillInItems;

  // SCENARIO 1: NEW CYLINDER PURCHASE -> Empty Cylinder Required = NO
  if (isGasOrder && isExplicitlyNoEmpty && !isExplicitlyEmptyRequired) {
    return {
      required: false,
      expectedQuantity: 0,
      orderType: "NEW_CYLINDER",
      badgeLabel: "Empty Cylinder: No",
      reason: "New cylinder purchase — no empty cylinder collection required.",
      customerNotice: {
        title: "New Cylinder Purchase",
        description: "No empty cylinder required for this order.",
        status: "new_cylinder",
      },
    };
  }

  // SCENARIO 2: REFILL / EXCHANGE -> Empty Cylinder Required = YES
  if (isGasOrder) {
    const expectedQty = Math.max(1, gasCylinderCount);
    return {
      required: true,
      expectedQuantity: expectedQty,
      orderType: "REFILL_EXCHANGE",
      badgeLabel: `Empty Cylinder: Required (${expectedQty})`,
      reason: `Cylinder exchange — ${expectedQty} empty cylinder(s) expected for collection.`,
      customerNotice: {
        title: "Empty Cylinder Required",
        description:
          "Please keep your empty cylinder ready for collection when your order is delivered.",
        status: "empty_required",
      },
    };
  }

  // SCENARIO 3: NON-GAS PRODUCTS
  return {
    required: false,
    expectedQuantity: 0,
    orderType: "NON_GAS",
    badgeLabel: "Standard Goods",
    reason: "Non-cylinder general order",
    customerNotice: {
      title: "Standard Delivery",
      description: "Standard delivery drop-off.",
      status: "non_gas",
    },
  };
}
