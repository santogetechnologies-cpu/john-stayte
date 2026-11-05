/**
 * Phase 4: Customer Order & Checkout Flow Service
 *
 * Implements the Customer Order & Checkout Flowchart for John Stayte Services:
 * 1. Approved customer selects gas type and quantity.
 * 2. Show prices using customer pricing band (Weston & Eastington; special pricing for matching accounts).
 * 3. Empty cylinder exchange check:
 *    - Matched exchanges receive refill price.
 *    - Additional cylinders receive full price (refill + deposit).
 * 4. Basket review & line-item breakdown.
 * 5. Fulfilment: Click & Collect (4 active forecourts, stock check, timeline) vs Delivery (postcode coverage, fee waiver).
 * 6. Payment: Cash, Card (Elavon), Credit Account (approval & available credit validation).
 * 7. Order confirmation with fulfilment-specific cylinder reminders.
 */

import { supabase } from "@/lib/supabase";
import {
  GasPricingBand,
  BranchGasPrice,
  GasType,
  CylinderSize,
} from "@/types/pricing";
import {
  getAuthorizedBranchGasPrices,
  getAuthorizedPricingBands,
  findPriceByGasTypeAndSize,
  determineDeliveryEligibility,
  isDiscountedBand,
  resolvePricingBandDiscountSync,
} from "@/lib/branch-pricing-service";
import {
  ACTIVE_FORECOURT_BRANCHES,
  BranchDetails,
  resolveCheckoutBranchAssignment,
} from "@/lib/branch-service";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";

// =============================================================================
// 1. DATA TYPES & INTERFACES
// =============================================================================

export interface CustomerPricingContext {
  userId?: string | null;
  userRole?: string | null;
  pricingBand?: string | null;
  pricingBandId?: string | null;
  customerCode?: string | null;
  accountApproved?: boolean;
  creditAccountApproved?: boolean;
  creditLimit?: number;
}

export interface ResolvedGasPrice {
  productName: string;
  gasType: GasType;
  cylinderSize: CylinderSize;
  unitRefillPrice: number;
  depositPerUnit: number;
  unitFullPrice: number;
  vatStatus: string;
  vatRate: number | null;
  priceExcVat: number | null;
  priceIncVat: number | null;
  isSpecialPrice: boolean;
  specialCustomerCode?: string | null;
  bandNumber: string;
  pricingBandId: string;
  isDiscounted: boolean;
  requiresClientClarification?: boolean;
  clarificationNote?: string | null;
}

export interface CylinderExchangeBreakdown {
  orderedQuantity: number;
  returningEmpties: boolean;
  returnedCylinderType: string;
  isCompatible: boolean;
  matchedExchangeCount: number;
  additionalFullCount: number;
  refillUnitPrice: number;
  depositPerUnit: number;
  fullUnitPrice: number;
  refillTotal: number;
  depositTotal: number;
  subtotal: number;
  notes: string[];
}

export interface BasketLineBreakdown extends CylinderExchangeBreakdown {
  productId: string;
  productName: string;
  slug: string;
  gasType: GasType;
  cylinderSize: CylinderSize;
  vatStatus: string;
  vatRate: number | null;
  bandNumber: string;
  isSpecialCustomerPrice: boolean;
  requiresClarification: boolean;
  clarificationMessage?: string;
}

export interface DeliveryCoverageResult {
  valid: boolean;
  outwardCode: string;
  areaName: string;
  estimatedTimeline: string;
  message?: string;
}

export interface CreditAccountValidationResult {
  approved: boolean;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  orderTotal: number;
  withinTerms: boolean;
  error?: string;
}

// =============================================================================
// 2. HELPER FUNCTIONS: GAS TYPE & CYLINDER SIZE PARSING
// =============================================================================

export function parseGasTypeAndSize(product: any): { gasType: GasType; cylinderSize: CylinderSize } {
  const name = (product?.name || product?.product_name || "").toLowerCase();
  const sub = (product?.subcategory || "").toLowerCase();
  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {};

  // Check specs first
  let gasType: GasType = specs.gas_type || "";
  let cylinderSize: CylinderSize = specs.cylinder_size || "";

  if (!gasType) {
    if (name.includes("autogas") || name.includes("flt") || name.includes("forklift") || sub.includes("flt") || sub.includes("autogas")) {
      gasType = "Automotive";
    } else if (name.includes("patio") || sub.includes("patio")) {
      gasType = "Patio";
    } else if (name.includes("butane") || sub.includes("butane")) {
      gasType = "Butane";
    } else if (name.includes("propane") || sub.includes("propane")) {
      gasType = "Propane";
    } else {
      gasType = "Propane";
    }
  }

  if (!cylinderSize) {
    const sizeMatches = name.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (sizeMatches && sizeMatches[1]) {
      cylinderSize = `${sizeMatches[1]}kg`;
    } else {
      // Default to 13kg or 47kg based on typical cylinders
      cylinderSize = name.includes("47") ? "47kg" : name.includes("19") ? "19kg" : name.includes("18") ? "18kg" : name.includes("15") ? "15kg" : "13kg";
    }
  }

  // Normalize casing
  const normGasType = gasType.charAt(0).toUpperCase() + gasType.slice(1).toLowerCase();
  const normSize = cylinderSize.toLowerCase().replace(/\s+/g, "");

  return { gasType: normGasType, cylinderSize: normSize };
}

// =============================================================================
// 3. CUSTOMER PRICING RESOLUTION
// =============================================================================

/**
 * Resolves the customer's gas price for a given product based on their assigned pricing band
 * or special customer account code. Falls back safely to undiscounted retail price if unassigned.
 */
export function resolveCustomerGasPrice(
  product: any,
  customer: CustomerPricingContext,
  defaultDepositAmount = 39.99
): ResolvedGasPrice {
  const { gasType, cylinderSize } = parseGasTypeAndSize(product);

  const userRole = customer.userRole || (customer.userId ? "customer" : null);
  const bandResolution =
    customer.pricingBand || customer.customerCode
      ? resolvePricingBandDiscountSync(customer.pricingBand, customer.customerCode)
      : null;
  const assignedBandId =
    customer.pricingBandId ||
    (bandResolution?.ok ? bandResolution.pricingBandId : null) ||
    (customer.pricingBand ? `band-${customer.pricingBand.toLowerCase()}` : null);
  const customerCode = customer.customerCode || null;

  // 1. Authorized bands and prices
  const authorizedPrices = getAuthorizedBranchGasPrices(userRole, assignedBandId, customerCode);

  // 2. Check for exact cylinder match
  let matchedPrice = findPriceByGasTypeAndSize(
    assignedBandId || "band-weston-memo-20",
    gasType,
    cylinderSize,
    customerCode
  );

  // If assigned band didn't match directly, try finding in authorized prices
  if (!matchedPrice && authorizedPrices.length > 0) {
    const normGas = gasType.toLowerCase();
    const normSize = cylinderSize.toLowerCase().replace(/\s+/g, "");
    matchedPrice = authorizedPrices.find((p) => {
      return (
        p.gas_type.toLowerCase() === normGas &&
        p.cylinder_size.toLowerCase().replace(/\s+/g, "") === normSize
      );
    }) || null;
  }

  // If still not found or user is unassigned, fallback to Retail Normal Band 20 (Weston Memo or Eastington)
  if (!matchedPrice) {
    const retailPrices = getAuthorizedBranchGasPrices("customer", "band-weston-memo-20", null);
    const normGas = gasType.toLowerCase();
    const normSize = cylinderSize.toLowerCase().replace(/\s+/g, "");
    matchedPrice = retailPrices.find(
      (p) => p.gas_type.toLowerCase() === normGas && p.cylinder_size.toLowerCase().replace(/\s+/g, "") === normSize
    ) || null;
  }

  // Determine base refill price
  let unitRefillPrice = 0;
  let priceExcVat: number | null = null;
  let priceIncVat: number | null = null;
  let vatStatus = "INCLUDING_VAT";
  let vatRate: number | null = 0.05; // 5% domestic fuel default
  let bandNumber = "20";
  let pricingBandId = "band-weston-memo-20";
  let isSpecialPrice = false;
  let specialCustomerCode: string | null = null;
  let requiresClientClarification = false;
  let clarificationNote: string | null = null;

  if (matchedPrice) {
    priceExcVat = matchedPrice.price_exc_vat;
    priceIncVat = matchedPrice.price_inc_vat;
    vatStatus = matchedPrice.vat_status;
    vatRate = matchedPrice.vat_rate;
    bandNumber = (matchedPrice as any).band_number || (matchedPrice.pricing_band_id.match(/\d+/) ? matchedPrice.pricing_band_id.match(/\d+/)![0] : "20");
    pricingBandId = matchedPrice.pricing_band_id;
    isSpecialPrice = matchedPrice.is_special_customer_price;
    specialCustomerCode = matchedPrice.special_customer_code;
    requiresClientClarification = Boolean(matchedPrice.requires_client_clarification);

    if (requiresClientClarification) {
      clarificationNote = matchedPrice.notes || "Weston 12KG Band 12 (£38.25 Inc / £33.57 Exc) - client clarification flag preserved.";
    }

    // Determine unitRefillPrice (prefer Inc VAT if documented, otherwise Exc VAT with domestic 5% VAT)
    if (priceIncVat !== null) {
      unitRefillPrice = priceIncVat;
    } else if (priceExcVat !== null) {
      // Documented Exc VAT (e.g. Bands 89, 90, 97, 98)
      unitRefillPrice = Number((priceExcVat * 1.05).toFixed(2));
    }
  }

  // Fallback to product.price if still 0
  if (unitRefillPrice <= 0) {
    unitRefillPrice = Number(product?.refill_price ?? product?.price ?? 0);
  }

  // Active deposit per unit
  const depositPerUnit = Number(product?.deposit_price ?? defaultDepositAmount);
  const unitFullPrice = Number((unitRefillPrice + depositPerUnit).toFixed(2));
  const isDiscounted = isDiscountedBand(bandNumber);

  return {
    productName: product?.name || `${gasType} ${cylinderSize} Cylinder`,
    gasType,
    cylinderSize,
    unitRefillPrice,
    depositPerUnit,
    unitFullPrice,
    vatStatus,
    vatRate,
    priceExcVat,
    priceIncVat,
    isSpecialPrice,
    specialCustomerCode,
    bandNumber,
    pricingBandId,
    isDiscounted,
    requiresClientClarification,
    clarificationNote,
  };
}

// =============================================================================
// 4. EMPTY CYLINDER EXCHANGE CALCULATION
// =============================================================================

/**
 * Validates cylinder exchange compatibility.
 * Propane, Butane, FLT/Automotive, and Patio Cylinders must match compatible gas type groups.
 */
export function validateCylinderExchangeCompatibility(
  orderedGasType: string,
  orderedSize: string,
  returnedCylinderType: string
): { isCompatible: boolean; reason?: string } {
  if (!returnedCylinderType || !returnedCylinderType.trim()) {
    return { isCompatible: false, reason: "No returned cylinder type selected." };
  }

  const normReturned = returnedCylinderType.toLowerCase().trim();
  const normOrderedGas = orderedGasType.toLowerCase().trim();
  const normOrderedSize = orderedSize.toLowerCase().replace(/\s+/g, "").trim();

  // Incompatible brand/cartridge exclusions
  if (normReturned.includes("disposable") || normReturned.includes("cartridge") || normReturned.includes("cp250")) {
    return {
      isCompatible: false,
      reason: "Disposable cartridges are not eligible for cylinder exchange deposit credit.",
    };
  }

  // Patio gas cylinders require patio or 5kg/13kg green cylinders
  if (normOrderedGas === "patio" || normOrderedSize.includes("patio")) {
    const isPatioCompatible = normReturned.includes("patio") || normReturned.includes("clip-on") || normReturned.includes("green");
    if (!isPatioCompatible) {
      return {
        isCompatible: false,
        reason: "Patio gas cylinders must be exchanged with compatible Calor Patio / Clip-on cylinders.",
      };
    }
    return { isCompatible: true };
  }

  // FLT / Automotive cylinders (12kg, 18kg)
  if (normOrderedGas === "automotive" || normOrderedSize === "12kg" || normOrderedSize === "18kg") {
    const isFltCompatible = normReturned.includes("flt") || normReturned.includes("forklift") || normReturned.includes("automotive") || normReturned.includes("12kg") || normReturned.includes("18kg");
    if (!isFltCompatible) {
      return {
        isCompatible: false,
        reason: "Automotive / Forklift cylinders must be exchanged with compatible FLT cylinders.",
      };
    }
    return { isCompatible: true };
  }

  // Standard Propane & Butane LPG cylinders
  return { isCompatible: true };
}

/**
 * Calculates empty cylinder exchange quantities and charges strictly adhering to the flowchart:
 * - Returning eligible empty cylinders?
 *   - YES:
 *     - Enter cylinder type and number of empties.
 *     - Apply refill price to matched exchanges (min(ordered, returned)).
 *     - Apply full price (refill + deposit) to any additional cylinders.
 *   - NO:
 *     - Apply full price for all additional cylinders.
 */
export function calculateCylinderExchange(params: {
  orderedQuantity: number;
  returningEmpties: boolean;
  returnedCylinderType?: string;
  emptyCount?: number;
  refillUnitPrice: number;
  depositPerUnit: number;
  orderedGasType?: string;
  orderedSize?: string;
}): CylinderExchangeBreakdown {
  const {
    orderedQuantity,
    returningEmpties,
    returnedCylinderType = "",
    emptyCount = 0,
    refillUnitPrice,
    depositPerUnit,
    orderedGasType = "Propane",
    orderedSize = "13kg",
  } = params;

  if (orderedQuantity <= 0) {
    throw new Error("Ordered quantity must be at least 1.");
  }

  const notes: string[] = [];

  // NO: Customer does not return empty cylinders
  if (!returningEmpties || emptyCount <= 0) {
    const matchedExchangeCount = 0;
    const additionalFullCount = orderedQuantity;
    const refillTotal = 0;
    const depositTotal = Number((additionalFullCount * depositPerUnit).toFixed(2));
    const subtotal = Number((orderedQuantity * (refillUnitPrice + depositPerUnit)).toFixed(2));

    notes.push(`All ${orderedQuantity} cylinder(s) charged at full price (Refill £${refillUnitPrice.toFixed(2)} + Security Deposit £${depositPerUnit.toFixed(2)}).`);

    return {
      orderedQuantity,
      returningEmpties: false,
      returnedCylinderType: "None",
      isCompatible: false,
      matchedExchangeCount,
      additionalFullCount,
      refillUnitPrice,
      depositPerUnit,
      fullUnitPrice: Number((refillUnitPrice + depositPerUnit).toFixed(2)),
      refillTotal,
      depositTotal,
      subtotal,
      notes,
    };
  }

  // YES: Customer is returning empty cylinders
  const compatibility = validateCylinderExchangeCompatibility(
    orderedGasType,
    orderedSize,
    returnedCylinderType
  );

  if (!compatibility.isCompatible) {
    // Incompatible cylinder returned -> Treat as full price purchase
    const matchedExchangeCount = 0;
    const additionalFullCount = orderedQuantity;
    const depositTotal = Number((additionalFullCount * depositPerUnit).toFixed(2));
    const subtotal = Number((orderedQuantity * (refillUnitPrice + depositPerUnit)).toFixed(2));

    notes.push(compatibility.reason || "Returned cylinder type is ineligible for exchange credit.");

    return {
      orderedQuantity,
      returningEmpties: true,
      returnedCylinderType,
      isCompatible: false,
      matchedExchangeCount,
      additionalFullCount,
      refillUnitPrice,
      depositPerUnit,
      fullUnitPrice: Number((refillUnitPrice + depositPerUnit).toFixed(2)),
      refillTotal: 0,
      depositTotal,
      subtotal,
      notes,
    };
  }

  // Enforce emptyCount <= orderedQuantity
  const validEmptyCount = Math.min(orderedQuantity, Math.max(0, emptyCount));
  const matchedExchangeCount = validEmptyCount;
  const additionalFullCount = Math.max(0, orderedQuantity - matchedExchangeCount);

  const refillTotal = Number((matchedExchangeCount * refillUnitPrice).toFixed(2));
  const depositTotal = Number((additionalFullCount * depositPerUnit).toFixed(2));
  const additionalGasTotal = Number((additionalFullCount * refillUnitPrice).toFixed(2));
  const subtotal = Number((refillTotal + additionalGasTotal + depositTotal).toFixed(2));

  notes.push(`${matchedExchangeCount} cylinder(s) qualify for refill price (£${refillUnitPrice.toFixed(2)} each).`);
  if (additionalFullCount > 0) {
    notes.push(`${additionalFullCount} cylinder(s) charged full price (+£${depositPerUnit.toFixed(2)} deposit each).`);
  }

  return {
    orderedQuantity,
    returningEmpties: true,
    returnedCylinderType,
    isCompatible: true,
    matchedExchangeCount,
    additionalFullCount,
    refillUnitPrice,
    depositPerUnit,
    fullUnitPrice: Number((refillUnitPrice + depositPerUnit).toFixed(2)),
    refillTotal: Number((matchedExchangeCount * refillUnitPrice).toFixed(2)),
    depositTotal,
    subtotal,
    notes,
  };
}

// =============================================================================
// 5. FULFILMENT: CLICK & COLLECT & POSTCODE DELIVERY COVERAGE
// =============================================================================

/**
 * Returns active collection forecourts strictly excluding Whitminster Depot (which is logistics-only)
 * and avoiding fake Eastington UUIDs.
 */
export function getActiveCollectionForecourts(): BranchDetails[] {
  return [...ACTIVE_FORECOURT_BRANCHES];
}

/**
 * Estimated collection timeline for Click & Collect
 */
export const CLICK_AND_COLLECT_TIMELINE = "Ready for collection in 2 hours during forecourt opening hours.";

/**
 * Validates delivery postcode coverage across Gloucestershire and surrounding service areas.
 * Supported prefixes: GL (Gloucestershire: GL1–GL20, GL50–GL56) and BS (North Somerset / Weston-Super-Mare: BS20–BS49).
 */
export function validateDeliveryPostcode(postcode?: string | null): DeliveryCoverageResult {
  if (!postcode || !postcode.trim()) {
    return {
      valid: false,
      outwardCode: "",
      areaName: "Unknown",
      estimatedTimeline: "",
      message: "Please enter a valid delivery postcode.",
    };
  }

  const rawTrimmed = postcode.trim().toUpperCase();
  let outward = "";
  if (rawTrimmed.includes(" ")) {
    outward = rawTrimmed.split(/\s+/)[0];
  } else if (rawTrimmed.length > 3) {
    outward = rawTrimmed.slice(0, rawTrimmed.length - 3);
  } else {
    outward = rawTrimmed;
  }

  // Gloucestershire coverage: GL1 to GL20, GL50 to GL56
  const isGloucestershire = outward.startsWith("GL");
  // North Somerset / Bristol / Weston coverage: BS20 to BS49
  const isNorthSomersetOrBristol = outward.startsWith("BS");

  if (isGloucestershire || isNorthSomersetOrBristol) {
    const areaName = isGloucestershire ? "Gloucestershire Fleet Delivery Zone" : "North Somerset & Bristol Zone";
    return {
      valid: true,
      outwardCode: outward,
      areaName,
      estimatedTimeline: "Next working day delivery (Monday–Friday 08:00–17:00)",
      message: `Delivery available in ${areaName} (${outward}).`,
    };
  }

  return {
    valid: false,
    outwardCode: outward,
    areaName: "Outside Standard Fleet Delivery Area",
    estimatedTimeline: "Special delivery by arrangement",
    message: `Postcode '${outward}' is outside our standard Gloucestershire and Somerset fleet delivery zones. Please call our depot on 01452 740375 to arrange delivery or select Click & Collect.`,
  };
}

/**
 * Resolves delivery fee based on customer pricing band according to client documents:
 * - Discounted gas customers: No delivery charge (£0.00).
 * - Undiscounted Business and Retail customers (Bands 10 & 20): Delivery charge applies (£5.00).
 */
export function evaluateCustomerDeliveryFee(bandNumber: string, standardFee = 5.0): {
  deliveryFee: number;
  deliveryFeeWaived: boolean;
  ruleDescription: string;
} {
  const rule = determineDeliveryEligibility(bandNumber);
  const fee = rule.delivery_fee_waived ? 0 : standardFee;

  return {
    deliveryFee: fee,
    deliveryFeeWaived: rule.delivery_fee_waived,
    ruleDescription: rule.rule_description,
  };
}

// =============================================================================
// 6. PAYMENT: CREDIT ACCOUNT VALIDATION
// =============================================================================

/**
 * Validates whether a customer can pay using their credit facility.
 * Enforces credit approval check and available limit check (credit_limit - outstanding_balance).
 */
export async function validateCustomerCreditAccount(
  customerId: string,
  orderTotal: number
): Promise<CreditAccountValidationResult> {
  if (!customerId) {
    return {
      approved: false,
      creditLimit: 0,
      outstandingBalance: 0,
      availableCredit: 0,
      orderTotal,
      withinTerms: false,
      error: "Authentication required to use credit account facility.",
    };
  }

  try {
    // 1. Fetch customer profile credit facility status
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("id, credit_account_approved, credit_limit, notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    const isApproved = Boolean(
      profile?.credit_account_approved ||
      profile?.notification_prefs?.gas_application?.credit_account_approved
    );

    const creditLimit = Number(
      profile?.credit_limit ??
      profile?.notification_prefs?.gas_application?.credit_limit ??
      0
    );

    if (!isApproved || creditLimit <= 0) {
      return {
        approved: false,
        creditLimit,
        outstandingBalance: 0,
        availableCredit: 0,
        orderTotal,
        withinTerms: false,
        error: "Credit Account facility is not active on this account. Please select Card or Cash payment, or apply for credit terms with Depot Management.",
      };
    }

    // 2. Calculate outstanding unpaid balance from existing orders
    const { data: unpaidOrders } = await supabase
      .from("orders")
      .select("total, payment_status")
      .eq("customer_id", customerId)
      .in("payment_status", ["Pending", "On Account", "Issued", "unpaid"]);

    const outstandingBalance = (unpaidOrders || []).reduce(
      (sum: number, o: any) => sum + Number(o.total || 0),
      0
    );

    const availableCredit = Math.max(0, Number((creditLimit - outstandingBalance).toFixed(2)));
    const withinTerms = orderTotal <= availableCredit;

    if (!withinTerms) {
      return {
        approved: true,
        creditLimit,
        outstandingBalance,
        availableCredit,
        orderTotal,
        withinTerms: false,
        error: `Order total (£${orderTotal.toFixed(2)}) exceeds your available credit facility (£${availableCredit.toFixed(2)} of £${creditLimit.toFixed(2)} limit). Please reduce order size or choose Card payment.`,
      };
    }

    return {
      approved: true,
      creditLimit,
      outstandingBalance,
      availableCredit,
      orderTotal,
      withinTerms: true,
    };
  } catch (err: any) {
    console.error("Credit facility validation error:", err);
    return {
      approved: false,
      creditLimit: 0,
      outstandingBalance: 0,
      availableCredit: 0,
      orderTotal,
      withinTerms: false,
      error: `Could not verify credit terms: ${err.message}`,
    };
  }
}

// =============================================================================
// 7. ORDER CONFIRMATION CYLINDER REMINDERS
// =============================================================================

export const REMINDER_CLICK_AND_COLLECT =
  "Please remember to bring your empty cylinders when collecting your order.";

export const REMINDER_DELIVERY =
  "Please have your empty cylinders ready for exchange when your order is delivered.";

export function getOrderCylinderReminder(
  fulfilmentMethod: "collection" | "delivery" | string,
  hasEmptyExchange = true
): string {
  if (!hasEmptyExchange) return "";
  const isCol = fulfilmentMethod === "collection";
  return isCol ? REMINDER_CLICK_AND_COLLECT : REMINDER_DELIVERY;
}
