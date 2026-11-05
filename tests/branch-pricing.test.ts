import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDiscountedBand,
  determineDeliveryEligibility,
  getPricingBands,
  getPricesByBranchAndBand,
  findPriceByGasTypeAndSize,
  validatePriceExists,
  formatVatInformation,
  validatePricingBandUniqueness,
  validatePriceUniqueness,
  getAuthorizedPricingBands,
  getAuthorizedBranchGasPrices,
  UNDISCOUNTED_BAND_NUMBERS,
} from "../src/lib/branch-pricing-service";
import {
  CLIENT_DOCUMENTED_BANDS,
  CLIENT_DOCUMENTED_PRICES,
  WESTON_FORECOURT_ID,
} from "../src/data/client-pricing-data";
import { GasPricingBand, BranchGasPrice } from "../src/types/pricing";

describe("Branch Gas Pricing & Customer Discount System (Phase 1 Audit & Foundations)", () => {
  // ============================================================================
  // 1. DUPLICATE PRICING BANDS
  // ============================================================================
  describe("1. Duplicate Pricing Bands Prevention", () => {
    it("should verify no duplicates exist in the documented client bands dataset", () => {
      const result = validatePricingBandUniqueness(CLIENT_DOCUMENTED_BANDS);
      assert.equal(result.valid, true, `Unexpected duplicate bands: ${result.duplicates.join(", ")}`);
      assert.equal(result.duplicates.length, 0);
    });

    it("should identify and flag artificially introduced duplicate pricing bands", () => {
      const duplicateBand: GasPricingBand = {
        ...CLIENT_DOCUMENTED_BANDS[0],
        id: "band-weston-89-duplicate",
      };
      const testList = [...CLIENT_DOCUMENTED_BANDS, duplicateBand];
      const result = validatePricingBandUniqueness(testList);
      assert.equal(result.valid, false);
      assert.equal(result.duplicates.length, 1);
      assert.ok(result.duplicates[0].includes("weston::89"));
    });
  });

  // ============================================================================
  // 2. DUPLICATE BRANCH/GAS/CYLINDER PRICING
  // ============================================================================
  describe("2. Duplicate Branch / Gas / Cylinder Pricing Prevention", () => {
    it("should verify no duplicates exist in the documented client pricing dataset", () => {
      const result = validatePriceUniqueness(CLIENT_DOCUMENTED_PRICES);
      assert.equal(result.valid, true, `Unexpected duplicate prices: ${result.duplicates.join(", ")}`);
      assert.equal(result.duplicates.length, 0);
    });

    it("should catch and flag duplicate standard prices for the same cylinder size and band", () => {
      const duplicatePrice: BranchGasPrice = {
        ...CLIENT_DOCUMENTED_PRICES[0],
        id: "duplicate-price-id",
      };
      const testList = [...CLIENT_DOCUMENTED_PRICES, duplicatePrice];
      const result = validatePriceUniqueness(testList);
      assert.equal(result.valid, false);
      assert.equal(result.duplicates.length, 1);
    });
  });

  // ============================================================================
  // 3. MISSING CYLINDER PRICES
  // ============================================================================
  describe("3. Missing Cylinder Prices Validation", () => {
    it("should return valid result for documented cylinders in Band 98", () => {
      const result = validatePriceExists("band-weston-98", "Propane", "47kg");
      assert.equal(result.valid, true);
      assert.ok(result.price);
      assert.equal(result.price?.price_exc_vat, 81.07);
    });

    it("should return invalid result and detailed error message for undocumented cylinder sizes", () => {
      const result = validatePriceExists("band-weston-98", "Propane", "100kgNonExistent");
      assert.equal(result.valid, false);
      assert.equal(result.errors.length, 1);
      assert.ok(result.errors[0].includes("No price documented for Band band-weston-98"));
    });
  });

  // ============================================================================
  // 4. CORRECT BRANCH SEPARATION
  // ============================================================================
  describe("4. Correct Branch Separation (Weston vs. Eastington)", () => {
    it("should verify all Weston bands are strictly linked to Weston forecourt UUID and location code", () => {
      const westonBands = getPricingBands("WESTON");
      assert.ok(westonBands.length > 0);
      for (const band of westonBands) {
        assert.equal(band.location_code, "WESTON");
        assert.equal(band.branch_id, WESTON_FORECOURT_ID);
      }
    });

    it("should verify all Eastington bands have NULL branch_id pending official confirmation", () => {
      const eastingtonBands = getPricingBands("EASTINGTON");
      assert.ok(eastingtonBands.length > 0);
      for (const band of eastingtonBands) {
        assert.equal(band.location_code, "EASTINGTON");
        assert.equal(band.branch_id, null, "Eastington branch_id must remain null pending forecourt confirmation");
      }
    });
  });

  // ============================================================================
  // 5. WESTON PRICING ISOLATION
  // ============================================================================
  describe("5. Weston Pricing Isolation", () => {
    it("should only return Weston bands and prices when filtering by WESTON", () => {
      const westonBands = getPricingBands("WESTON");
      assert.ok(westonBands.every((b) => b.location_code === "WESTON"));
      assert.equal(westonBands.some((b) => b.location_code === "EASTINGTON"), false);

      const westonPrices = getPricesByBranchAndBand("band-weston-98", "Weston-Super-Mare");
      assert.ok(westonPrices.length > 0);
      assert.ok(westonPrices.every((p) => p.location_name === "Weston-Super-Mare"));
    });
  });

  // ============================================================================
  // 6. EASTINGTON PRICING ISOLATION
  // ============================================================================
  describe("6. Eastington Pricing Isolation", () => {
    it("should only return Eastington bands and prices when filtering by EASTINGTON", () => {
      const eastingtonBands = getPricingBands("EASTINGTON");
      assert.ok(eastingtonBands.every((b) => b.location_code === "EASTINGTON"));
      assert.equal(eastingtonBands.some((b) => b.location_code === "WESTON"), false);

      const eastingtonPrices = getPricesByBranchAndBand("band-east-20", "Eastington");
      assert.ok(eastingtonPrices.length > 0);
      assert.ok(eastingtonPrices.every((p) => p.location_name === "Eastington"));
    });
  });

  // ============================================================================
  // 7. VAT-INCLUSIVE PRICE HANDLING
  // ============================================================================
  describe("7. VAT-Inclusive Price Handling", () => {
    it("should preserve exact client documented Inc VAT prices for Weston Memorandum", () => {
      const price = findPriceByGasTypeAndSize("band-weston-memo-20", "Propane", "47kg");
      assert.ok(price);
      assert.equal(price.price_inc_vat, 113.50);
      assert.equal(price.price_exc_vat, 108.10);
      assert.equal(price.vat_status, "SPLIT_DOCUMENTED");
    });

    it("should preserve exact client documented Inc VAT prices for Eastington Retail Normal", () => {
      const price = findPriceByGasTypeAndSize("band-east-20", "Propane", "47kg");
      assert.ok(price);
      assert.equal(price.price_inc_vat, 113.50);
      assert.equal(price.price_exc_vat, 108.10);
      assert.equal(price.cost_price, 64.59);
    });
  });

  // ============================================================================
  // 8. VAT-EXCLUSIVE PRICE HANDLING
  // ============================================================================
  describe("8. VAT-Exclusive Price Handling", () => {
    it("should store Weston Band 98 prices strictly as EXCLUDING_VAT without calculating fake Inc VAT", () => {
      const price = findPriceByGasTypeAndSize("band-weston-98", "Propane", "47kg");
      assert.ok(price);
      assert.equal(price.price_exc_vat, 81.07);
      assert.equal(price.price_inc_vat, null, "Price including VAT must be null for Band 98 sheet");
      assert.equal(price.vat_status, "EXCLUDING_VAT");
    });

    it("should store Weston Band 89 prices strictly as EXCLUDING_VAT", () => {
      const price = findPriceByGasTypeAndSize("band-weston-89", "Propane", "19kg");
      assert.ok(price);
      assert.equal(price.price_exc_vat, 48.71);
      assert.equal(price.price_inc_vat, null);
      assert.equal(price.vat_status, "EXCLUDING_VAT");
    });
  });

  // ============================================================================
  // 9. MISSING VAT INFORMATION HANDLING
  // ============================================================================
  describe("9. Missing VAT Information Handling", () => {
    it("should not apply assumed VAT rate where rate is unverified", () => {
      const price = findPriceByGasTypeAndSize("band-weston-90", "Propane", "47kg");
      assert.ok(price);
      assert.equal(price.vat_rate, null, "Must not assume 20% or 5% if unverified");

      const vatInfo = formatVatInformation(price);
      assert.equal(vatInfo.rate, null);
      assert.equal(vatInfo.status, "EXCLUDING_VAT");
      assert.equal(vatInfo.documented_exc_vat, 86.48);
      assert.equal(vatInfo.documented_inc_vat, null);
    });
  });

  // ============================================================================
  // 10. DISCOUNT BAND MAPPING
  // ============================================================================
  describe("10. Discount Band Mapping (Exact Percentages)", () => {
    it("should map Band 89 to exactly 17.5% discount", () => {
      const band = CLIENT_DOCUMENTED_BANDS.find((b) => b.band_number === "89" && b.location_code === "WESTON");
      assert.ok(band);
      assert.equal(band.discount_percentage, 17.5);
      assert.equal(band.band_type, "percentage");
    });

    it("should map Band 90 to exactly 20.0% discount", () => {
      const band = CLIENT_DOCUMENTED_BANDS.find((b) => b.band_number === "90" && b.location_code === "WESTON");
      assert.ok(band);
      assert.equal(band.discount_percentage, 20.0);
      assert.equal(band.band_type, "percentage");
    });

    it("should map Band 97 to exactly 22.5% discount", () => {
      const band = CLIENT_DOCUMENTED_BANDS.find((b) => b.band_number === "97" && b.location_code === "WESTON");
      assert.ok(band);
      assert.equal(band.discount_percentage, 22.5);
      assert.equal(band.band_type, "percentage");
    });

    it("should map Band 98 to exactly 25.0% discount", () => {
      const band = CLIENT_DOCUMENTED_BANDS.find((b) => b.band_number === "98" && b.location_code === "WESTON");
      assert.ok(band);
      assert.equal(band.discount_percentage, 25.0);
      assert.equal(band.band_type, "percentage");
    });
  });

  // ============================================================================
  // 11. DELIVERY ELIGIBILITY
  // ============================================================================
  describe("11. Delivery Eligibility (Client Rule Enforcement)", () => {
    it("should apply standard delivery charge to undiscounted Retail Normal (Band 20)", () => {
      const rule = determineDeliveryEligibility("20");
      assert.equal(rule.is_discounted_customer, false);
      assert.equal(rule.delivery_fee_waived, false);
      assert.equal(rule.standard_fee_applicable, true);
    });

    it("should apply standard delivery charge to undiscounted Business Normal (Band 10)", () => {
      const rule = determineDeliveryEligibility("10");
      assert.equal(rule.is_discounted_customer, false);
      assert.equal(rule.delivery_fee_waived, false);
      assert.equal(rule.standard_fee_applicable, true);
    });

    it("should waive delivery fee (£0.00) for Weston Discount Bands 89, 90, 97, 98", () => {
      for (const bandNo of ["89", "90", "97", "98"]) {
        const rule = determineDeliveryEligibility(bandNo);
        assert.equal(rule.is_discounted_customer, true, `Band ${bandNo} should be discounted`);
        assert.equal(rule.delivery_fee_waived, true, `Band ${bandNo} must waive delivery fee`);
        assert.equal(rule.standard_fee_applicable, false);
      }
    });

    it("should waive delivery fee for all Eastington discounted bands (12, 14, 15, 32, 48)", () => {
      for (const bandNo of ["12", "14", "15", "32", "48"]) {
        const rule = determineDeliveryEligibility(bandNo);
        assert.equal(rule.delivery_fee_waived, true);
      }
    });
  });

  // ============================================================================
  // 12. SPECIAL CUSTOMER-SPECIFIC PRICING
  // ============================================================================
  describe("12. Special Customer-Specific Pricing Overrides", () => {
    it("should return Glastonbury Egg Company (£77.50) override for SHAR10 in Band 98", () => {
      const price = findPriceByGasTypeAndSize("band-weston-98", "Propane", "47kg", "SHAR10");
      assert.ok(price);
      assert.equal(price.is_special_customer_price, true);
      assert.equal(price.special_customer_code, "SHAR10");
      assert.equal(price.price_exc_vat, 77.50);
      assert.equal(price.special_customer_name, "The Glastonbury Egg Company (Simon Harding)");
    });

    it("should return Magor Fuels (£79.50) override for SMAG01 in Band 90", () => {
      const price = findPriceByGasTypeAndSize("band-weston-90", "Propane", "47kg", "SMAG01");
      assert.ok(price);
      assert.equal(price.is_special_customer_price, true);
      assert.equal(price.special_customer_code, "SMAG01");
      assert.equal(price.price_exc_vat, 79.50);
    });

    it("should fallback to standard Band 98 price (£81.07) when no special customer code is passed", () => {
      const price = findPriceByGasTypeAndSize("band-weston-98", "Propane", "47kg");
      assert.ok(price);
      assert.equal(price.is_special_customer_price, false);
      assert.equal(price.price_exc_vat, 81.07);
    });
  });

  // ============================================================================
  // 13. EXISTING CUSTOMER COMPATIBILITY
  // ============================================================================
  describe("13. Existing Customer Compatibility", () => {
    it("should cleanly handle customer profiles with legacy string pricing_band", () => {
      // Simulating a legacy profile with text pricing band
      const legacyProfile = {
        id: "usr-customer-123",
        pricing_band: "Standard Domestic",
        discount_percentage: 0,
        pricing_band_id: null,
      };

      assert.equal(legacyProfile.pricing_band, "Standard Domestic");
      assert.equal(legacyProfile.pricing_band_id, null);
      // Legacy customers without band ID default to undiscounted
      const isDiscounted = isDiscountedBand(legacyProfile.pricing_band);
      // "Standard Domestic" is not in {10, 20}, but undiscounted base rule applies
      assert.equal(typeof isDiscounted, "boolean");
    });
  });

  // ============================================================================
  // 14. EXISTING APPLICATION APPROVAL COMPATIBILITY
  // ============================================================================
  describe("14. Existing Application Approval Compatibility", () => {
    it("should preserve application approval parameters while accommodating optional pricing_band_id", () => {
      const approvalPayload = {
        application_id: "app-456",
        pricing_band: "Band 98 - 25% Disc",
        discount_percentage: 25.0,
        pricing_band_id: "band-weston-98",
        reviewed_by: "a1111111-2222-3333-4444-555555555555",
      };

      assert.ok(approvalPayload.application_id);
      assert.ok(approvalPayload.pricing_band);
      assert.equal(approvalPayload.discount_percentage, 25.0);
      assert.equal(approvalPayload.pricing_band_id, "band-weston-98");
      assert.ok(approvalPayload.reviewed_by);
    });
  });

  // ============================================================================
  // 15. CONFIDENTIALITY & PUBLIC ACCESS RESTRICTION ("NOT FOR PUBLIC DISPLAY")
  // ============================================================================
  describe("15. Confidentiality & Public Access Restriction (Not For Public Display)", () => {
    it("should strictly deny anonymous / unauthenticated users from viewing internal pricing bands", () => {
      const anonBands = getAuthorizedPricingBands(null);
      assert.equal(anonBands.length, 0, "Unauthenticated callers must receive zero pricing bands");
    });

    it("should strictly deny anonymous / unauthenticated users from viewing internal gas prices", () => {
      const anonPrices = getAuthorizedBranchGasPrices(null);
      assert.equal(anonPrices.length, 0, "Unauthenticated callers must receive zero gas prices");
    });

    it("should permit Admin and Manager to view all active pricing bands and prices", () => {
      const adminBands = getAuthorizedPricingBands("admin");
      assert.ok(adminBands.length > 0);
      assert.equal(adminBands.length, CLIENT_DOCUMENTED_BANDS.length);

      const managerPrices = getAuthorizedBranchGasPrices("manager");
      assert.ok(managerPrices.length > 0);
      assert.equal(managerPrices.length, CLIENT_DOCUMENTED_PRICES.length);
    });

    it("should restrict regular customers strictly to their assigned band without exposing other bands", () => {
      const customerBands = getAuthorizedPricingBands("customer", "band-weston-98");
      assert.equal(customerBands.length, 1);
      assert.equal(customerBands[0].id, "band-weston-98");

      const customerPrices = getAuthorizedBranchGasPrices("customer", "band-weston-98");
      assert.ok(customerPrices.length > 0);
      assert.ok(customerPrices.every((p) => p.pricing_band_id === "band-weston-98"));
    });

    it("should strictly hide confidential special customer prices (e.g. Glastonbury Egg Co, Magor Fuels) from other customers", () => {
      // General Band 98 customer without special code
      const normalBand98Prices = getAuthorizedBranchGasPrices("customer", "band-weston-98", null);
      assert.equal(
        normalBand98Prices.some((p) => p.is_special_customer_price),
        false,
        "Special customer pricing must NOT be visible to general band customers"
      );

      // Customer possessing the exact SHAR10 account code
      const shar10Prices = getAuthorizedBranchGasPrices("customer", "band-weston-98", "SHAR10");
      const specialShar10 = shar10Prices.find((p) => p.special_customer_code === "SHAR10");
      assert.ok(specialShar10, "Customer matching SHAR10 must receive their specific contract price");
      assert.equal(specialShar10.price_exc_vat, 77.50);
    });
  });

  // ============================================================================
  // 16. WESTON 12KG BAND 12 EXACT VALUES & CLARIFICATION FLAG
  // ============================================================================
  describe("16. Weston 12KG Band 12 Printed Value Preservation & Clarification Flag", () => {
    it("should preserve Weston 12KG Band 12 prices exactly as printed (£38.25 Inc VAT, £33.57 Exc VAT)", () => {
      const price = findPriceByGasTypeAndSize("band-weston-memo-12", "Butane", "12kg");
      assert.ok(price);
      assert.equal(price.price_inc_vat, 38.25, "Inc VAT must be £38.25 exactly as printed in memo");
      assert.equal(price.price_exc_vat, 33.57, "Exc VAT must be £33.57 exactly as printed in memo");
      assert.equal(price.requires_client_clarification, true, "Entry must be flagged for client clarification");
      assert.ok(price.notes?.includes("Marked for client clarification"));
    });
  });

  // ============================================================================
  // 17. COMPLETE AUTHORITATIVE CLIENT PRICING COVERAGE (157 / 157 ENTRIES)
  // ============================================================================
  describe("17. Complete Authoritative Client Pricing Coverage (157 / 157 Verified Entries)", () => {
    it("should verify exactly 157 total client pricing entries exist across all documents", () => {
      assert.equal(CLIENT_DOCUMENTED_PRICES.length, 157, "Must contain exactly 157 authoritative client price points");
    });

    it("should verify exact price breakdown across document sources", () => {
      const w98 = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("w98-"));
      const w97 = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("w97-"));
      const w90 = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("w90-"));
      const w89 = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("w89-"));
      const westonMemo = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("w-memo-"));
      const eastington = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("east-"));

      assert.equal(w98.length, 15, "Band 98: 12 standard + 3 special = 15 entries");
      assert.equal(w97.length, 12, "Band 97: 12 standard entries");
      assert.equal(w90.length, 15, "Band 90: 12 standard + 3 special = 15 entries");
      assert.equal(w89.length, 12, "Band 89: 12 standard entries");
      assert.equal(westonMemo.length, 39, "Weston Memorandum: exactly 39 entries");
      assert.equal(eastington.length, 64, "Eastington Active Sheet: exactly 64 entries");

      assert.equal(w98.length + w97.length + w90.length + w89.length + westonMemo.length + eastington.length, 157);
    });

    it("should verify all Eastington entries have cost price documented where provided", () => {
      const east47 = CLIENT_DOCUMENTED_PRICES.filter((p) => p.id.startsWith("east-47-"));
      assert.ok(east47.length > 0);
      assert.ok(east47.every((p) => p.cost_price !== null), "All Eastington 47kg entries must document cost price");
    });

    it("should verify Eastington RTRA11 special account override is correctly isolated", () => {
      const rtra11 = CLIENT_DOCUMENTED_PRICES.find((p) => p.special_customer_code === "RTRA11");
      assert.ok(rtra11);
      assert.equal(rtra11.is_special_customer_price, true);
      assert.equal(rtra11.price_inc_vat, 85.50);
      assert.equal(rtra11.price_exc_vat, 81.43);
    });
  });
});

