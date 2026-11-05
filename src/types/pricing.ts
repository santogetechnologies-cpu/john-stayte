/**
 * Branch-Based Gas Pricing and Customer Discount Management Types
 *
 * Models authoritative pricing structures strictly derived from client documents:
 * - Weston Gas Prices Memorandum (18 May 2026)
 * - Weston Discount Band documents (Bands 89, 90, 97, 98)
 * - Eastington Discounted Gas Prices Excel Workbook (18 May 2026 revision)
 *
 * NOTE: Fields remain nullable where client information is unconfirmed. No fake defaults.
 */

export type GasType = "Propane" | "Butane" | "Automotive" | "Patio" | "Mixed Gas" | "CO2" | string;

export type CylinderSize =
  | "47kg"
  | "19kg"
  | "18kg"
  | "15kg"
  | "13kg"
  | "12kg"
  | "7kg"
  | "6kg"
  | "5kg"
  | "4.5kg"
  | "3.9kg"
  | string;

export type VatStatus =
  | "EXCLUDING_VAT"       // Listed price excludes VAT (e.g. Weston Bands 89, 90, 97, 98)
  | "INCLUDING_VAT"       // Listed price includes VAT
  | "SPLIT_DOCUMENTED"    // Both INC VAT and EXC VAT are documented (e.g. Weston Memo, Eastington Sheet)
  | "UNSPECIFIED";        // VAT treatment not explicitly stated

export type PricingSource =
  | "WESTON_MEMORANDUM_2026"
  | "WESTON_BAND_89_TIER_2026"
  | "WESTON_BAND_90_TIER_2026"
  | "WESTON_BAND_97_TIER_2026"
  | "WESTON_BAND_98_TIER_2026"
  | "EASTINGTON_EXCEL_2026"
  | "MANUAL_OVERRIDE";

export type BandType = "percentage" | "fixed";

/**
 * Authoritative pricing band definition.
 */
export interface GasPricingBand {
  id: string;
  /**
   * Reference to confirmed forecourt in public.auto_gas_stations.
   * Null if location is pending confirmation (e.g. Eastington).
   */
  branch_id: string | null;
  location_name: string;        // e.g. "Weston-Super-Mare" or "Eastington"
  location_code: string;        // e.g. "WESTON" or "EASTINGTON"
  band_number: string;          // e.g. "89", "90", "97", "98", "10", "20", "31", "36", etc.
  customer_category: string;    // e.g. "Retail Normal", "Business Astute", "Band 89 - 17.5% Disc"
  band_type: BandType;
  discount_percentage: number | null; // e.g. 17.5, 20.0, 22.5, 25.0, or null if fixed-rate band
  delivery_fee_waived: boolean; // Discounted = true, Undiscounted Retail/Business (Bands 10 & 20) = false
  pricing_source: PricingSource;
  is_active: boolean;
  effective_from: string | null; // e.g. "2026-05-18T00:00:00Z"
  effective_to: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Concrete cylinder price entry for a branch and pricing band.
 */
export interface BranchGasPrice {
  id: string;
  pricing_band_id: string;
  branch_id: string | null;     // Forecourt station ID, or null for Eastington (pending confirmation)
  location_name: string;
  gas_type: GasType;
  cylinder_size: CylinderSize;
  price_exc_vat: number | null; // Price excluding VAT where documented
  price_inc_vat: number | null; // Price including VAT where documented
  vat_status: VatStatus;
  vat_rate: number | null;      // Verified VAT rate (e.g. 0.05 for 5% domestic fuel where verified, else null)
  currency: string;             // Always "GBP"
  cost_price: number | null;    // Documented wholesale cost where supplied (e.g. Eastington Excel)
  is_special_customer_price: boolean;
  special_customer_code: string | null; // e.g. "SHAR10", "SMAG01", "SCH01"
  special_customer_name: string | null; // e.g. "The Glastonbury Egg Company", "Magor Fuels"
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  notes?: string | null;
  requires_client_clarification?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Resolved customer pricing assignment linking profile / application to a pricing band.
 */
export interface CustomerPricingAssignment {
  customer_id: string;
  pricing_band_id: string | null;
  pricing_band_code: string | null;
  customer_category: string | null;
  discount_percentage: number | null;
  is_discounted: boolean;
  delivery_fee_waived: boolean;
  branch_id: string | null;
  location_name: string | null;
}

/**
 * Resolved gas price object for calculation / display.
 */
export interface GasPrice {
  product_id?: string | null;
  gas_type: GasType;
  cylinder_size: CylinderSize;
  unit_price_exc_vat: number | null;
  unit_price_inc_vat: number | null;
  vat_status: VatStatus;
  vat_amount: number | null;
  vat_rate: number | null;
  currency: string;
  band_number: string;
  location_name: string;
  is_special_customer_price: boolean;
  special_customer_code: string | null;
  special_customer_name: string | null;
}

/**
 * VAT details container preserving exact client tax treatment.
 */
export interface VatInformation {
  status: VatStatus;
  rate: number | null;          // null if unverified to prevent assumed rates
  is_domestic_fuel_eligible: boolean | null;
  documented_exc_vat: number | null;
  documented_inc_vat: number | null;
}

/**
 * Delivery charge eligibility rule.
 */
export interface DeliveryPricingRule {
  is_discounted_customer: boolean;
  band_number: string;
  delivery_fee_waived: boolean;
  standard_fee_applicable: boolean;
  rule_description: string;
}

/**
 * Validation result for pricing checks and assertions.
 */
export interface PricingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  price?: BranchGasPrice | null;
}

/**
 * Historical audit log entry recording price changes.
 */
export interface PricingAuditLogEntry {
  id: string;
  price_id: string;
  pricing_band_id: string;
  band_number: string;
  location_name: string;
  gas_type: GasType;
  cylinder_size: CylinderSize;
  previous_price_exc_vat: number | null;
  previous_price_inc_vat: number | null;
  new_price_exc_vat: number | null;
  new_price_inc_vat: number | null;
  changed_by_user_id: string;
  changed_by_name: string;
  changed_by_email: string;
  changed_at: string;
  reason: string;
}

/**
 * High-level pricing metrics for the Admin Dashboard overview.
 */
export interface PricingOverviewStats {
  totalPricingBands: number;
  totalPricingEntries: number;
  westonPricingEntries: number;
  eastingtonPricingEntries: number;
  activePricingBands: number;
  pendingClientClarifications: number;
  specialCustomerPricingEntries: number;
}

/**
 * Result of authoritative pricing band discount resolution.
 */
export interface PricingBandDiscountResolution {
  ok: boolean;
  bandIdentifier: string;
  matchedBand: GasPricingBand | null;
  pricingBandId: string | null;
  pricingBandName: string;
  discountPercentage: number;
  hasPercentageDiscount: boolean;
  isConfigured: boolean;
  isAmbiguous: boolean;
  deliveryFeeWaived: boolean;
  bandType: BandType | "unknown";
  specialCustomerMatch?: {
    code: string;
    name: string;
  } | null;
  statusMessage: string;
  error?: string;
}



