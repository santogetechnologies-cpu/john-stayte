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
    const name = (item.product_name || item.name || "").toLowerCase();
    const isExcluded =
      name.includes("deposit") ||
      name.includes("accessory") ||
      name.includes("regulator") ||
      name.includes("hose");

    if (!isExcluded && CYLINDER_KEYWORDS.some((kw) => name.includes(kw))) {
      isGasOrder = true;
      gasCylinderCount += Number(item.quantity || 1);

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
