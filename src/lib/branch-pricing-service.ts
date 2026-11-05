/**
 * Branch-Based Gas Pricing Service
 *
 * Implements business logic and read helpers for branch gas pricing, customer discount bands,
 * VAT representation, and delivery charge eligibility strictly matching client documents.
 *
 * NOTE: As per Phase 1 requirements, these helpers are isolated and NOT connected
 * to live checkout calculations or existing customer approval workflows.
 */

import { supabase } from "./supabase";
import {
  GasPricingBand,
  BranchGasPrice,
  VatInformation,
  DeliveryPricingRule,
  PricingValidationResult,
  CustomerPricingAssignment,
  GasType,
  CylinderSize,
  PricingAuditLogEntry,
  PricingOverviewStats,
  PricingBandDiscountResolution,
} from "../types/pricing";
import {
  CLIENT_DOCUMENTED_BANDS,
  CLIENT_DOCUMENTED_PRICES,
  WESTON_FORECOURT_ID,
} from "../data/client-pricing-data";

/**
 * In-memory operational store initialized from authoritative client datasets.
 * Allows local updates and price modifications in Admin Portal with audit logs.
 */
let liveBands: GasPricingBand[] = [...CLIENT_DOCUMENTED_BANDS];
let livePrices: BranchGasPrice[] = [...CLIENT_DOCUMENTED_PRICES];

const initialAuditLogs: PricingAuditLogEntry[] = [
  {
    id: "audit-init-001",
    price_id: "east-47-b20",
    pricing_band_id: "band-east-20",
    band_number: "20",
    location_name: "Eastington",
    gas_type: "Propane",
    cylinder_size: "47kg",
    previous_price_exc_vat: null,
    previous_price_inc_vat: null,
    new_price_exc_vat: 108.1,
    new_price_inc_vat: 113.5,
    changed_by_user_id: "system-admin",
    changed_by_name: "System Administrator",
    changed_by_email: "admin@jss.com",
    changed_at: "2026-05-18T08:00:00Z",
    reason: "Initial import from Eastington Master Pricing Workbook (18 May 2026 revision).",
  },
  {
    id: "audit-init-002",
    price_id: "w98-pro-47",
    pricing_band_id: "band-weston-98",
    band_number: "98",
    location_name: "Weston-Super-Mare",
    gas_type: "Propane",
    cylinder_size: "47kg",
    previous_price_exc_vat: null,
    previous_price_inc_vat: null,
    new_price_exc_vat: 81.07,
    new_price_inc_vat: null,
    changed_by_user_id: "system-admin",
    changed_by_name: "System Administrator",
    changed_by_email: "admin@jss.com",
    changed_at: "2026-05-18T08:00:00Z",
    reason: "Initial import from Weston Band 98 (25% Discount) document.",
  },
  {
    id: "audit-init-003",
    price_id: "w-memo-12-b12",
    pricing_band_id: "band-weston-memo-12",
    band_number: "12",
    location_name: "Weston-Super-Mare",
    gas_type: "Propane",
    cylinder_size: "12kg",
    previous_price_exc_vat: null,
    previous_price_inc_vat: null,
    new_price_exc_vat: 33.57,
    new_price_inc_vat: 38.25,
    changed_by_user_id: "system-admin",
    changed_by_name: "System Administrator",
    changed_by_email: "admin@jss.com",
    changed_at: "2026-05-18T08:00:00Z",
    reason: "Initial import from Weston Memorandum. Flagged for client clarification (£38.25 Inc / £33.57 Exc).",
  },
];

let liveAuditLogs: PricingAuditLogEntry[] = [...initialAuditLogs];

/**
 * Branch metadata definition supporting the 4 confirmed forecourts + Eastington pending confirmation.
 */
export interface BranchPricingMetadata {
  id: string | null;
  location_name: string;
  location_code: string;
  is_confirmed_forecourt: boolean;
  status_label: string;
  description: string;
}

export const BRANCH_PRICING_LOCATIONS: BranchPricingMetadata[] = [
  {
    id: "a1111111-1111-4111-a111-111111111101",
    location_name: "Cirencester",
    location_code: "CIRENCESTER",
    is_confirmed_forecourt: true,
    status_label: "Active Forecourt",
    description: "Operates under standard retail & commercial network base rates. Custom tariff pending client matrix.",
  },
  {
    id: "a1111111-1111-4111-a111-111111111102",
    location_name: "Gloucester",
    location_code: "GLOUCESTER",
    is_confirmed_forecourt: true,
    status_label: "Active Forecourt",
    description: "Operates under standard retail & commercial network base rates. Custom tariff pending client matrix.",
  },
  {
    id: "a1111111-1111-4111-a111-111111111103",
    location_name: "Stroud",
    location_code: "STROUD",
    is_confirmed_forecourt: true,
    status_label: "Active Forecourt",
    description: "Operates under standard retail & commercial network base rates. Custom tariff pending client matrix.",
  },
  {
    id: WESTON_FORECOURT_ID,
    location_name: "Weston-Super-Mare",
    location_code: "WESTON",
    is_confirmed_forecourt: true,
    status_label: "Active Forecourt (Custom Matrix)",
    description: "Authoritative matrix with 93 price points (Memorandum Bands 10–56, plus Discount Tiers 89, 90, 97, 98).",
  },
  {
    id: null,
    location_name: "Eastington",
    location_code: "EASTINGTON",
    is_confirmed_forecourt: false,
    status_label: "Pending Branch Confirmation",
    description: "Authoritative 64-price point master workbook (18 May 2026 revision). Separated from forecourt records.",
  },
];

/**
 * Returns high-level statistics for the Pricing Dashboard overview.
 */
export function getPricingOverviewStats(): PricingOverviewStats {
  const westonEntries = livePrices.filter((p) => p.location_name.toUpperCase().includes("WESTON")).length;
  const eastingtonEntries = livePrices.filter((p) => p.location_name.toUpperCase().includes("EASTINGTON")).length;
  const activeBands = liveBands.filter((b) => b.is_active).length;
  const pendingClarifications = livePrices.filter((p) => p.requires_client_clarification).length;
  const specialCustomerPricing = livePrices.filter((p) => p.is_special_customer_price).length;

  return {
    totalPricingBands: liveBands.length,
    totalPricingEntries: livePrices.length,
    westonPricingEntries: westonEntries,
    eastingtonPricingEntries: eastingtonEntries,
    activePricingBands: activeBands,
    pendingClientClarifications: pendingClarifications,
    specialCustomerPricingEntries: specialCustomerPricing,
  };
}

/**
 * Returns distinct customer categories across all pricing bands.
 */
export function getAllCustomerCategories(): { category: string; bandCount: number; locations: string[] }[] {
  const map = new Map<string, { bandCount: number; locations: Set<string> }>();

  for (const band of liveBands) {
    const existing = map.get(band.customer_category);
    if (!existing) {
      map.set(band.customer_category, {
        bandCount: 1,
        locations: new Set([band.location_name]),
      });
    } else {
      existing.bandCount += 1;
      existing.locations.add(band.location_name);
    }
  }

  return Array.from(map.entries())
    .map(([category, info]) => ({
      category,
      bandCount: info.bandCount,
      locations: Array.from(info.locations),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Returns all special customer pricing entries.
 * Restricted strictly by role: unauthorized customer accounts cannot view overrides for other customers.
 */
export function getSpecialCustomerPrices(
  userRole?: string | null,
  specialCustomerCode?: string | null
): BranchGasPrice[] {
  if (!userRole) return [];

  if (userRole === "admin" || userRole === "manager") {
    return livePrices.filter((p) => p.is_special_customer_price && p.is_active);
  }

  // Customer: only their own matching special code
  if (specialCustomerCode) {
    return livePrices.filter(
      (p) =>
        p.is_special_customer_price &&
        p.is_active &&
        p.special_customer_code?.toUpperCase() === specialCustomerCode.toUpperCase()
    );
  }

  return [];
}

/**
 * Returns pricing audit logs.
 */
export function getPricingHistoryAuditLogs(): PricingAuditLogEntry[] {
  return [...liveAuditLogs].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );
}

/**
 * Records a new price change audit log entry.
 */
export function recordPricingHistoryAuditLog(
  entry: Omit<PricingAuditLogEntry, "id" | "changed_at">
): PricingAuditLogEntry {
  const newEntry: PricingAuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    changed_at: new Date().toISOString(),
  };

  liveAuditLogs = [newEntry, ...liveAuditLogs];

  // Attempt Supabase insert if remote table is present
  try {
    (supabase as any)
      .from("gas_pricing_audit_logs")
      .insert([
        {
          price_id: newEntry.price_id.startsWith("audit-") ? null : newEntry.price_id,
          pricing_band_id: newEntry.pricing_band_id,
          band_number: newEntry.band_number,
          location_name: newEntry.location_name,
          gas_type: newEntry.gas_type,
          cylinder_size: newEntry.cylinder_size,
          previous_price_exc_vat: newEntry.previous_price_exc_vat,
          previous_price_inc_vat: newEntry.previous_price_inc_vat,
          new_price_exc_vat: newEntry.new_price_exc_vat,
          new_price_inc_vat: newEntry.new_price_inc_vat,
          changed_by: newEntry.changed_by_user_id,
          changed_by_name: newEntry.changed_by_name,
          changed_by_email: newEntry.changed_by_email,
          reason: newEntry.reason,
        },
      ])
      .then((res: any) => {
        if (res?.error) {
          console.info("[Pricing Audit] Local audit preserved. Database sync skipped:", res.error.message);
        }
      });
  } catch {
    // Table may not yet be created on production; in-memory audit log is preserved
  }

  return newEntry;
}

/**
 * Admin-only operation: Updates a branch gas price with mandatory reason and audit logging.
 * Strictly blocks non-admin users (including Managers).
 */
export async function updateBranchGasPrice(
  priceId: string,
  updates: {
    price_exc_vat?: number | null;
    price_inc_vat?: number | null;
    notes?: string | null;
  },
  changedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  },
  reason: string
): Promise<{ success: boolean; error?: string; updatedPrice?: BranchGasPrice }> {
  // 1. Strict permission check: Admin role required
  if (changedBy.role !== "admin") {
    return {
      success: false,
      error: "Permission denied: Only Admin users can modify gas prices.",
    };
  }

  // 2. Reason validation
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: "A detailed reason for price modification is required (minimum 5 characters).",
    };
  }

  // 3. Price value validation
  if (
    updates.price_exc_vat !== undefined &&
    updates.price_exc_vat !== null &&
    (isNaN(updates.price_exc_vat) || updates.price_exc_vat < 0)
  ) {
    return {
      success: false,
      error: "Price excluding VAT must be a non-negative number.",
    };
  }

  if (
    updates.price_inc_vat !== undefined &&
    updates.price_inc_vat !== null &&
    (isNaN(updates.price_inc_vat) || updates.price_inc_vat < 0)
  ) {
    return {
      success: false,
      error: "Price including VAT must be a non-negative number.",
    };
  }

  // 4. Find the target price
  const priceIndex = livePrices.findIndex((p) => p.id === priceId);
  if (priceIndex === -1) {
    return { success: false, error: `Price entry ${priceId} not found.` };
  }

  const existing = livePrices[priceIndex];
  const previousExc = existing.price_exc_vat;
  const previousInc = existing.price_inc_vat;

  const band = liveBands.find((b) => b.id === existing.pricing_band_id);

  // 5. Apply update in memory
  const updated: BranchGasPrice = {
    ...existing,
    ...(updates.price_exc_vat !== undefined ? { price_exc_vat: updates.price_exc_vat } : {}),
    ...(updates.price_inc_vat !== undefined ? { price_inc_vat: updates.price_inc_vat } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    updated_at: new Date().toISOString(),
  };

  livePrices[priceIndex] = updated;

  // 6. Record audit log
  recordPricingHistoryAuditLog({
    price_id: existing.id,
    pricing_band_id: existing.pricing_band_id,
    band_number: band?.band_number || "Unknown",
    location_name: existing.location_name,
    gas_type: existing.gas_type,
    cylinder_size: existing.cylinder_size,
    previous_price_exc_vat: previousExc,
    previous_price_inc_vat: previousInc,
    new_price_exc_vat: updated.price_exc_vat,
    new_price_inc_vat: updated.price_inc_vat,
    changed_by_user_id: changedBy.id,
    changed_by_name: changedBy.name,
    changed_by_email: changedBy.email,
    reason: reason.trim(),
  });

  // Attempt database update if table exists
  try {
    await (supabase as any)
      .from("branch_gas_prices")
      .update({
        price_exc_vat: updated.price_exc_vat,
        price_inc_vat: updated.price_inc_vat,
        notes: updated.notes,
        updated_at: updated.updated_at,
      })
      .eq("id", priceId);
  } catch {
    // Ignore database error if table is not yet deployed on production
  }

  // Dispatch browser update event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gas_pricing_updated"));
  }

  return { success: true, updatedPrice: updated };
}

/**
 * Admin-only operation: Toggles the active status of a pricing band.
 * Strictly blocks non-admin users (including Managers).
 */
export async function togglePricingBandStatus(
  bandId: string,
  isActive: boolean,
  changedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  },
  reason: string
): Promise<{ success: boolean; error?: string; updatedBand?: GasPricingBand }> {
  if (changedBy.role !== "admin") {
    return {
      success: false,
      error: "Permission denied: Only Admin users can activate or deactivate pricing bands.",
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: "A reason is required to activate or deactivate a pricing band.",
    };
  }

  const bandIndex = liveBands.findIndex((b) => b.id === bandId);
  if (bandIndex === -1) {
    return { success: false, error: `Pricing band ${bandId} not found.` };
  }

  const existing = liveBands[bandIndex];
  const updated: GasPricingBand = {
    ...existing,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  liveBands[bandIndex] = updated;

  // Record audit log
  recordPricingHistoryAuditLog({
    price_id: `band-${bandId}`,
    pricing_band_id: bandId,
    band_number: existing.band_number,
    location_name: existing.location_name,
    gas_type: "All Cylinders",
    cylinder_size: "All Sizes",
    previous_price_exc_vat: null,
    previous_price_inc_vat: null,
    new_price_exc_vat: null,
    new_price_inc_vat: null,
    changed_by_user_id: changedBy.id,
    changed_by_name: changedBy.name,
    changed_by_email: changedBy.email,
    reason: `${isActive ? "Activated" : "Deactivated"} Band ${existing.band_number}: ${reason.trim()}`,
  });

  try {
    await (supabase as any)
      .from("gas_pricing_bands")
      .update({ is_active: isActive, updated_at: updated.updated_at })
      .eq("id", bandId);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gas_pricing_updated"));
  }

  return { success: true, updatedBand: updated };
}

/**
 * Resets in-memory live data to baseline for tests or session resets.
 */
export function resetLivePricingState(): void {
  liveBands = [...CLIENT_DOCUMENTED_BANDS];
  livePrices = [...CLIENT_DOCUMENTED_PRICES];
  liveAuditLogs = [...initialAuditLogs];
}


/**
 * Client-defined undiscounted band numbers where delivery charge applies.
 * All other documented bands represent discounted customers who receive waived delivery (£0.00).
 */
export const UNDISCOUNTED_BAND_NUMBERS = new Set(["10", "20"]);

/**
 * Determines whether a given band number represents a discounted customer.
 * Client Rule: "We do not charge delivery charge to discounted customers but we always do to business & retail customers who are undiscounted (Nos 10 & 20)."
 */
export function isDiscountedBand(bandNumber: string): boolean {
  if (!bandNumber) return false;
  const clean = bandNumber.trim();
  return !UNDISCOUNTED_BAND_NUMBERS.has(clean);
}

/**
 * Resolves delivery charge eligibility according to client business rules.
 */
export function determineDeliveryEligibility(
  bandNumber: string,
  isDiscountedOverride?: boolean
): DeliveryPricingRule {
  const isDiscounted =
    typeof isDiscountedOverride === "boolean"
      ? isDiscountedOverride
      : isDiscountedBand(bandNumber);

  const deliveryFeeWaived = isDiscounted;
  const standardFeeApplicable = !isDiscounted;

  const ruleDescription = isDiscounted
    ? `Discounted customer (Band ${bandNumber}): Delivery charge waived (£0.00).`
    : `Undiscounted customer (Band ${bandNumber}): Standard delivery charge applies.`;

  return {
    is_discounted_customer: isDiscounted,
    band_number: bandNumber,
    delivery_fee_waived: deliveryFeeWaived,
    standard_fee_applicable: standardFeeApplicable,
    rule_description: ruleDescription,
  };
}

/**
 * Authoritative synchronous resolver for pricing band discount percentage and configuration.
 * Uses the live Gas Pricing Management system as the sole source of truth.
 *
 * Rules:
 * 1. Automatically retrieves the applicable discount percentage from existing pricing bands.
 * 2. Never defaults to 1% or arbitrary values.
 * 3. Does not assume every pricing band has a percentage discount (fixed-rate bands resolve to 0%).
 * 4. Resolves special customer pricing codes if supplied.
 * 5. Returns isConfigured = false, isAmbiguous = true if pricing configuration is missing or unrecognized.
 */
export function resolvePricingBandDiscountSync(
  bandIdentifier?: string | null,
  customerCode?: string | null
): PricingBandDiscountResolution {
  const clean = (bandIdentifier || "").trim();

  // 1. If empty or missing and no special customer code provided
  if (!clean && (!customerCode || !customerCode.trim())) {
    return {
      ok: false,
      bandIdentifier: "",
      matchedBand: null,
      pricingBandId: null,
      pricingBandName: "",
      discountPercentage: 0,
      hasPercentageDiscount: false,
      isConfigured: false,
      isAmbiguous: false,
      deliveryFeeWaived: false,
      bandType: "unknown",
      specialCustomerMatch: null,
      statusMessage: "No pricing band selected.",
    };
  }

  // 2. Check for special customer pricing code link
  let specialCustomerMatch: { code: string; name: string } | null = null;
  let specialMatchedBandId: string | null = null;

  if (customerCode && customerCode.trim()) {
    const cleanCode = customerCode.trim().toUpperCase();
    const specialPrice = livePrices.find(
      (p) =>
        p.is_special_customer_price &&
        p.special_customer_code?.toUpperCase() === cleanCode
    );

    if (specialPrice) {
      specialCustomerMatch = {
        code: specialPrice.special_customer_code!,
        name: specialPrice.special_customer_name || "Special Customer",
      };
      specialMatchedBandId = specialPrice.pricing_band_id;
    }
  }

  // 3. Match against live pricing bands in Gas Pricing Management
  const cleanLower = clean.toLowerCase();

  let matchedBand: GasPricingBand | null = null;

  // 3a. If special customer code matched a known band, prioritize that band if relevant
  if (specialMatchedBandId) {
    const bandFromSpecial = liveBands.find((b) => b.id === specialMatchedBandId && b.is_active);
    if (bandFromSpecial) {
      matchedBand = bandFromSpecial;
    }
  }

  // 3b. Exact band ID match
  if (!matchedBand) {
    matchedBand =
      liveBands.find((b) => b.id.toLowerCase() === cleanLower && b.is_active) || null;
  }

  // 3c. Exact customer_category match
  if (!matchedBand) {
    matchedBand =
      liveBands.find((b) => b.customer_category.toLowerCase() === cleanLower && b.is_active) || null;
  }

  // 3d. Exact band_number match
  if (!matchedBand) {
    matchedBand =
      liveBands.find((b) => b.band_number.toLowerCase() === cleanLower && b.is_active) || null;
  }

  // 3e. Extract documented discount tier numbers (89, 90, 97, 98) from strings like "Band 89", "Band 89 - 17.5% Disc"
  if (!matchedBand) {
    const digitMatch = clean.match(/\b(89|90|97|98)\b/);
    if (digitMatch && digitMatch[1]) {
      const tierNum = digitMatch[1];
      matchedBand =
        liveBands.find((b) => b.band_number === tierNum && b.location_code === "WESTON" && b.is_active) ||
        liveBands.find((b) => b.band_number === tierNum && b.is_active) ||
        null;
    }
  }

  // 3f. Extract other numbered bands (e.g. Band 10, Band 20, Band 12, Band 31, Band 36)
  if (!matchedBand) {
    const digitMatch = clean.match(/band\s*(\d+)/i);
    if (digitMatch && digitMatch[1]) {
      const bNum = digitMatch[1];
      matchedBand =
        liveBands.find((b) => b.band_number === bNum && b.location_code === "WESTON" && b.is_active) ||
        liveBands.find((b) => b.band_number === bNum && b.is_active) ||
        null;
    }
  }

  // 3g. Standard application legacy category mappings (mapped to authoritative database bands)
  if (!matchedBand) {
    if (cleanLower.includes("standard domestic") || cleanLower === "band s") {
      // Maps to Weston Retail Normal Band 20
      matchedBand =
        liveBands.find((b) => b.id === "band-weston-memo-20") ||
        liveBands.find((b) => b.band_number === "20" && b.customer_category === "Retail Normal") ||
        null;
    } else if (cleanLower.includes("commercial trade") || cleanLower.includes("band b")) {
      // Maps to Weston Business Normal Band 10
      matchedBand =
        liveBands.find((b) => b.id === "band-weston-memo-10") ||
        liveBands.find((b) => b.band_number === "10" && b.customer_category === "Business Normal") ||
        null;
    } else if (cleanLower.includes("high volume domestic") || cleanLower.includes("band a")) {
      // High volume domestic tariff - fixed domestic volume pricing
      matchedBand = {
        id: "band-high-volume-domestic-a",
        branch_id: WESTON_FORECOURT_ID,
        location_name: "Weston-Super-Mare",
        location_code: "WESTON",
        band_number: "A",
        customer_category: "High Volume Domestic (Band A)",
        band_type: "fixed",
        discount_percentage: null,
        delivery_fee_waived: true,
        pricing_source: "WESTON_MEMORANDUM_2026",
        is_active: true,
        effective_from: "2026-05-18T00:00:00Z",
        effective_to: null,
        notes: "Fixed rate high-volume domestic tariff. No percentage discount configured.",
      };
    } else if (cleanLower.includes("hospitality") || cleanLower.includes("band c")) {
      // Maps to Weston Catering Band 11
      matchedBand =
        liveBands.find((b) => b.id === "band-weston-memo-11") ||
        liveBands.find((b) => b.band_number === "11") ||
        null;
    } else if (cleanLower.includes("industrial") || cleanLower.includes("band d")) {
      matchedBand = {
        id: "band-industrial-agri-d",
        branch_id: WESTON_FORECOURT_ID,
        location_name: "Weston-Super-Mare",
        location_code: "WESTON",
        band_number: "D",
        customer_category: "Industrial & Agricultural (Band D)",
        band_type: "fixed",
        discount_percentage: null,
        delivery_fee_waived: true,
        pricing_source: "WESTON_MEMORANDUM_2026",
        is_active: true,
        effective_from: "2026-05-18T00:00:00Z",
        effective_to: null,
        notes: "Fixed rate industrial & agricultural tariff. No percentage discount configured.",
      };
    } else if (cleanLower.includes("bulk lpg") || cleanLower.includes("band e")) {
      matchedBand = {
        id: "band-bulk-lpg-e",
        branch_id: WESTON_FORECOURT_ID,
        location_name: "Weston-Super-Mare",
        location_code: "WESTON",
        band_number: "E",
        customer_category: "Bulk LPG Propane (Band E)",
        band_type: "fixed",
        discount_percentage: null,
        delivery_fee_waived: true,
        pricing_source: "WESTON_MEMORANDUM_2026",
        is_active: true,
        effective_from: "2026-05-18T00:00:00Z",
        effective_to: null,
        notes: "Fixed rate bulk LPG commercial tariff. No percentage discount configured.",
      };
    }
  }

  // 4. Ambiguity / Not Found check
  if (!matchedBand) {
    return {
      ok: false,
      bandIdentifier: clean,
      matchedBand: null,
      pricingBandId: null,
      pricingBandName: clean,
      discountPercentage: 0,
      hasPercentageDiscount: false,
      isConfigured: false,
      isAmbiguous: true,
      deliveryFeeWaived: false,
      bandType: "unknown",
      specialCustomerMatch,
      statusMessage: `Unrecognized pricing band "${clean}". Pricing configuration is missing or ambiguous.`,
      error: `Pricing band "${clean}" could not be resolved in the Gas Pricing Management system.`,
    };
  }

  // 5. Configured Pricing Band Resolution
  const hasPercentage =
    matchedBand.band_type === "percentage" &&
    matchedBand.discount_percentage !== null &&
    Number(matchedBand.discount_percentage) > 0;

  const discountPercentage = hasPercentage ? Number(matchedBand.discount_percentage) : 0;
  const deliveryFeeWaived = matchedBand.delivery_fee_waived;

  let statusMessage = "";
  if (hasPercentage) {
    statusMessage = `${discountPercentage}% discount tier automatically retrieved for ${matchedBand.customer_category} (Delivery fee waived).`;
  } else {
    statusMessage = `Fixed rate tariff (${matchedBand.customer_category}). No percentage discount configured.`;
  }

  if (specialCustomerMatch) {
    statusMessage += ` [Special Account: ${specialCustomerMatch.name} (${specialCustomerMatch.code})]`;
  }

  return {
    ok: true,
    bandIdentifier: clean,
    matchedBand,
    pricingBandId: matchedBand.id,
    pricingBandName: matchedBand.customer_category || clean,
    discountPercentage,
    hasPercentageDiscount: hasPercentage,
    isConfigured: true,
    isAmbiguous: false,
    deliveryFeeWaived,
    bandType: matchedBand.band_type,
    specialCustomerMatch,
    statusMessage,
  };
}

/**
 * Authoritative asynchronous resolver for pricing band discount.
 * Queries live remote pricing bands where possible, falling back to synchronous authoritative store.
 */
export async function resolvePricingBandDiscount(
  bandIdentifier?: string | null,
  customerCode?: string | null
): Promise<PricingBandDiscountResolution> {
  try {
    await loadLivePricingFromDatabase().catch(() => {});
  } catch {
    /* fallback to in-memory live bands */
  }
  return resolvePricingBandDiscountSync(bandIdentifier, customerCode);
}
export function getPricingBands(locationCode?: string): GasPricingBand[] {
  if (!locationCode) return [...liveBands];
  const upper = locationCode.toUpperCase();
  return liveBands.filter((b) => b.location_code === upper);
}

/**
 * Returns prices for a specific pricing band, optionally filtered by location.
 */
export function getPricesByBranchAndBand(
  pricingBandId: string,
  locationCode?: string
): BranchGasPrice[] {
  return livePrices.filter((p) => {
    if (p.pricing_band_id !== pricingBandId) return false;
    if (locationCode && p.location_name.toUpperCase() !== locationCode.toUpperCase()) {
      return false;
    }
    return true;
  });
}

/**
 * Finds a gas cylinder price by gas type, cylinder size, and optional special customer code.
 * Prioritizes special customer specific price if a customer code is provided.
 */
export function findPriceByGasTypeAndSize(
  pricingBandId: string,
  gasType: GasType,
  cylinderSize: CylinderSize,
  specialCustomerCode?: string | null
): BranchGasPrice | null {
  const normGas = gasType.trim().toLowerCase();
  const normSize = cylinderSize.trim().toLowerCase().replace(/\s+/g, "");

  // 1. If special customer code provided, check for specific override first
  if (specialCustomerCode) {
    const specialMatch = livePrices.find((p) => {
      return (
        p.pricing_band_id === pricingBandId &&
        p.gas_type.toLowerCase() === normGas &&
        p.cylinder_size.toLowerCase().replace(/\s+/g, "") === normSize &&
        p.is_special_customer_price &&
        p.special_customer_code?.toUpperCase() === specialCustomerCode.toUpperCase()
      );
    });
    if (specialMatch) return specialMatch;
  }

  // 2. Standard band price lookup
  const standardMatch = livePrices.find((p) => {
    return (
      p.pricing_band_id === pricingBandId &&
      p.gas_type.toLowerCase() === normGas &&
      p.cylinder_size.toLowerCase().replace(/\s+/g, "") === normSize &&
      !p.is_special_customer_price
    );
  });

  return standardMatch || null;
}

/**
 * Resolves pricing bands visible to a user based on their role and customer authorization.
 * STRICT SECURITY RULE: Document explicitly states "NOT FOR PUBLIC DISPLAY".
 * Anonymous/unauthenticated callers: [] (strictly prohibited)
 * Admin/Manager: all active bands
 * Regular Customer: their assigned band (or default undiscounted base Retail Normal Band 20 if unassigned)
 */
export function getAuthorizedPricingBands(
  userRole?: string | null,
  assignedBandId?: string | null,
  legacyBandCode?: string | null
): GasPricingBand[] {
  // Deny anonymous / unauthenticated users
  if (!userRole) return [];

  // Admins and Managers have full management visibility
  if (userRole === "admin" || userRole === "manager") {
    return liveBands.filter((b) => b.is_active);
  }

  // Authenticated customer: restrict strictly to authorized band
  return liveBands.filter((b) => {
    if (!b.is_active) return false;
    if (assignedBandId && b.id === assignedBandId) return true;
    if (!assignedBandId && legacyBandCode && b.band_number === legacyBandCode) return true;
    if (!assignedBandId && !legacyBandCode && b.band_number === "20" && b.customer_category === "Retail Normal") {
      return true;
    }
    return false;
  });
}

/**
 * Resolves gas prices visible to a user based on their role and customer authorization.
 * STRICT SECURITY RULE: Confidential commercial rates & special customer overrides
 * must NOT be exposed across accounts or to unauthorized callers.
 */
export function getAuthorizedBranchGasPrices(
  userRole?: string | null,
  assignedBandId?: string | null,
  specialCustomerCode?: string | null
): BranchGasPrice[] {
  // Deny anonymous / unauthenticated users
  if (!userRole) return [];

  // Admins and Managers have full management visibility
  if (userRole === "admin" || userRole === "manager") {
    return livePrices.filter((p) => p.is_active);
  }

  // Authenticated customer: restrict to assigned band (or Retail Normal Band 20 if unassigned)
  const effectiveBandId = assignedBandId || "band-weston-memo-20";

  return livePrices.filter((p) => {
    if (!p.is_active) return false;
    if (p.pricing_band_id !== effectiveBandId) return false;

    // Standard band prices are accessible to the customer for their assigned band
    if (!p.is_special_customer_price) return true;

    // Special customer price is visible ONLY if the customer matches that exact special code
    if (specialCustomerCode && p.special_customer_code?.toUpperCase() === specialCustomerCode.toUpperCase()) {
      return true;
    }

    return false;
  });
}

/**
 * Validates whether a price exists for the given cylinder, gas type, and band.
 */
export function validatePriceExists(
  pricingBandId: string,
  gasType: GasType,
  cylinderSize: CylinderSize,
  specialCustomerCode?: string | null
): PricingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const price = findPriceByGasTypeAndSize(
    pricingBandId,
    gasType,
    cylinderSize,
    specialCustomerCode
  );

  if (!price) {
    errors.push(
      `No price documented for Band ${pricingBandId}, Gas Type "${gasType}", Cylinder Size "${cylinderSize}"` +
        (specialCustomerCode ? ` (Special Customer Code: ${specialCustomerCode})` : "")
    );
    return { valid: false, errors, warnings, price: null };
  }

  if (price.price_exc_vat === null && price.price_inc_vat === null) {
    errors.push(`Price record exists (${price.id}) but has neither Inc VAT nor Exc VAT value.`);
  }

  if (price.vat_status === "UNSPECIFIED") {
    warnings.push(`Price record (${price.id}) has unconfirmed VAT status.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    price,
  };
}

/**
 * Formats VAT information strictly from documented fields without assuming tax rates.
 */
export function formatVatInformation(price: BranchGasPrice): VatInformation {
  return {
    status: price.vat_status,
    rate: price.vat_rate,
    is_domestic_fuel_eligible: price.vat_rate === 0.05,
    documented_exc_vat: price.price_exc_vat,
    documented_inc_vat: price.price_inc_vat,
  };
}

/**
 * Verifies that a list of pricing bands contains no duplicate (location_code, band_number, customer_category) keys.
 */
export function validatePricingBandUniqueness(bands: GasPricingBand[]): {
  valid: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const b of bands) {
    const key = `${b.location_code}::${b.band_number}::${b.customer_category}`.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Verifies that a list of prices contains no duplicate (pricing_band_id, gas_type, cylinder_size, special_customer_code) keys.
 */
export function validatePriceUniqueness(prices: BranchGasPrice[]): {
  valid: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const p of prices) {
    const key = `${p.pricing_band_id}::${p.gas_type}::${p.cylinder_size}::${p.special_customer_code || "STANDARD"}`.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Safe Supabase fetcher for remote pricing bands once migration 00098 is deployed in the future.
 * Falls back gracefully to in-memory documented bands if table does not yet exist.
 */
export async function fetchRemotePricingBands(
  locationCode?: string
): Promise<GasPricingBand[]> {
  try {
    let query = (supabase as any)
      .from("gas_pricing_bands")
      .select("*")
      .eq("is_active", true);

    if (locationCode) {
      query = query.eq("location_code", locationCode.toUpperCase());
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getPricingBands(locationCode);
    }
    return data as GasPricingBand[];
  } catch {
    return getPricingBands(locationCode);
  }
}

/**
 * Safe Supabase fetcher for remote branch gas prices.
 * Falls back gracefully to in-memory documented prices.
 */
export async function fetchRemoteBranchGasPrices(
  pricingBandId: string
): Promise<BranchGasPrice[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("branch_gas_prices")
      .select("*")
      .eq("pricing_band_id", pricingBandId)
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return getPricesByBranchAndBand(pricingBandId);
    }
    return data as BranchGasPrice[];
  } catch {
    return getPricesByBranchAndBand(pricingBandId);
  }
}

/**
 * Loads and synchronizes persistent pricing data and audit logs from the Supabase database.
 * Falls back gracefully to in-memory authoritative client datasets if offline or unauthorized.
 */
export async function loadLivePricingFromDatabase(): Promise<{
  bandsCount: number;
  pricesCount: number;
  auditLogsCount: number;
}> {
  try {
    const [bandsRes, pricesRes, auditRes] = await Promise.all([
      (supabase as any).from("gas_pricing_bands").select("*").order("band_number", { ascending: true }),
      (supabase as any).from("branch_gas_prices").select("*"),
      (supabase as any).from("gas_pricing_audit_logs").select("*").order("created_at", { ascending: false }),
    ]);

    if (bandsRes.data && bandsRes.data.length > 0) {
      liveBands = bandsRes.data;
    }
    if (pricesRes.data && pricesRes.data.length > 0) {
      livePrices = pricesRes.data;
    }
    if (auditRes.data && auditRes.data.length > 0) {
      liveAuditLogs = auditRes.data.map((row: any) => ({
        id: row.id,
        price_id: row.price_id,
        pricing_band_id: row.pricing_band_id,
        band_number: row.band_number,
        location_name: row.location_name,
        gas_type: row.gas_type,
        cylinder_size: row.cylinder_size,
        previous_price_exc_vat: row.previous_price_exc_vat,
        previous_price_inc_vat: row.previous_price_inc_vat,
        new_price_exc_vat: row.new_price_exc_vat,
        new_price_inc_vat: row.new_price_inc_vat,
        changed_by_user_id: row.changed_by,
        changed_by_name: row.changed_by_name,
        changed_by_email: row.changed_by_email,
        changed_at: row.created_at,
        reason: row.reason,
      }));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gas_pricing_updated"));
    }

    return {
      bandsCount: liveBands.length,
      pricesCount: livePrices.length,
      auditLogsCount: liveAuditLogs.length,
    };
  } catch (err) {
    return {
      bandsCount: liveBands.length,
      pricesCount: livePrices.length,
      auditLogsCount: liveAuditLogs.length,
    };
  }
}


