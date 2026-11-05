import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolvePricingBandDiscountSync,
  getPricingBands,
  isDiscountedBand,
} from "../src/lib/branch-pricing-service";
import {
  resolveCustomerGasPrice,
  type CustomerPricingContext,
} from "../src/lib/customer-order-pricing-service";

describe("Admin Gas Customer Application Approval - Automatic Discount Population", () => {
  // ===========================================================================
  // 1. SELECTING EACH AVAILABLE PRICING BAND
  // ===========================================================================
  describe("1. Selecting Each Documented Percentage Discount Band", () => {
    it("should automatically populate 17.5% discount for Band 89", () => {
      const res = resolvePricingBandDiscountSync("Band 89 - 17.5% Disc");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.isAmbiguous, false);
      assert.equal(res.discountPercentage, 17.5);
      assert.equal(res.hasPercentageDiscount, true);
      assert.equal(res.pricingBandId, "band-weston-89");
      assert.equal(res.deliveryFeeWaived, true);
      assert.match(res.statusMessage, /17\.5%/);
    });

    it("should automatically populate 20.0% discount for Band 90", () => {
      const res = resolvePricingBandDiscountSync("Band 90 - 20% Disc");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.isAmbiguous, false);
      assert.equal(res.discountPercentage, 20.0);
      assert.equal(res.hasPercentageDiscount, true);
      assert.equal(res.pricingBandId, "band-weston-90");
      assert.equal(res.deliveryFeeWaived, true);
      assert.match(res.statusMessage, /20%/);
    });

    it("should automatically populate 22.5% discount for Band 97", () => {
      const res = resolvePricingBandDiscountSync("Band 97 - 22.5% Disc");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.isAmbiguous, false);
      assert.equal(res.discountPercentage, 22.5);
      assert.equal(res.hasPercentageDiscount, true);
      assert.equal(res.pricingBandId, "band-weston-97");
      assert.equal(res.deliveryFeeWaived, true);
      assert.match(res.statusMessage, /22\.5%/);
    });

    it("should automatically populate 25.0% discount for Band 98", () => {
      const res = resolvePricingBandDiscountSync("Band 98 - 25% Disc");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.isAmbiguous, false);
      assert.equal(res.discountPercentage, 25.0);
      assert.equal(res.hasPercentageDiscount, true);
      assert.equal(res.pricingBandId, "band-weston-98");
      assert.equal(res.deliveryFeeWaived, true);
      assert.match(res.statusMessage, /25%/);
    });

    it("should resolve bands passed by raw ID (e.g. band-weston-89)", () => {
      const res = resolvePricingBandDiscountSync("band-weston-89");
      assert.equal(res.ok, true);
      assert.equal(res.discountPercentage, 17.5);
      assert.equal(res.pricingBandId, "band-weston-89");
    });
  });

  // ===========================================================================
  // 2. AUTOMATIC POPULATION & NEVER SILENTLY DEFAULTING TO 1%
  // ===========================================================================
  describe("2. Automatic Population & Defaulting Integrity", () => {
    it("should never silently default to 1% for standard applications", () => {
      const standardDomestic = resolvePricingBandDiscountSync("Standard Domestic");
      assert.notEqual(standardDomestic.discountPercentage, 1);
      assert.equal(standardDomestic.discountPercentage, 0);

      const commercial = resolvePricingBandDiscountSync("Commercial Trade (Band B)");
      assert.notEqual(commercial.discountPercentage, 1);
      assert.equal(commercial.discountPercentage, 0);
    });

    it("should retrieve discount percentage directly from the authoritative pricing band record", () => {
      const allBands = getPricingBands();
      const band98 = allBands.find((b) => b.id === "band-weston-98")!;
      assert.ok(band98);
      assert.equal(band98.discount_percentage, 25.0);

      const resolved = resolvePricingBandDiscountSync(band98.id);
      assert.equal(resolved.discountPercentage, band98.discount_percentage);
    });
  });

  // ===========================================================================
  // 3. CHANGING PRICING BANDS IMMEDIATELY UPDATES DISCOUNT
  // ===========================================================================
  describe("3. Dynamic Pricing Band Switching", () => {
    it("should update discount immediately as Admin switches between bands", () => {
      // Step 1: Admin starts with Standard Domestic
      let currentSelection = "Standard Domestic";
      let res = resolvePricingBandDiscountSync(currentSelection);
      assert.equal(res.discountPercentage, 0);
      assert.equal(res.hasPercentageDiscount, false);

      // Step 2: Admin changes to Band 89 (17.5%)
      currentSelection = "Band 89 - 17.5% Disc";
      res = resolvePricingBandDiscountSync(currentSelection);
      assert.equal(res.discountPercentage, 17.5);
      assert.equal(res.hasPercentageDiscount, true);

      // Step 3: Admin changes to Band 98 (25%)
      currentSelection = "Band 98 - 25% Disc";
      res = resolvePricingBandDiscountSync(currentSelection);
      assert.equal(res.discountPercentage, 25.0);
      assert.equal(res.hasPercentageDiscount, true);

      // Step 4: Admin switches back to Retail Normal Band 20
      currentSelection = "band-weston-memo-20";
      res = resolvePricingBandDiscountSync(currentSelection);
      assert.equal(res.discountPercentage, 0);
      assert.equal(res.hasPercentageDiscount, false);
    });
  });

  // ===========================================================================
  // 4. BANDS WITH NO CONFIGURED DISCOUNT (FIXED RATE TARIFFS)
  // ===========================================================================
  describe("4. Bands With No Configured Percentage Discount (Fixed Rate Tariffs)", () => {
    it("should identify Band 20 (Retail Normal) as fixed tariff without percentage discount", () => {
      const res = resolvePricingBandDiscountSync("band-weston-memo-20");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.discountPercentage, 0);
      assert.equal(res.hasPercentageDiscount, false);
      assert.match(res.statusMessage, /no percentage discount/i);
    });

    it("should identify Band 10 (Business Normal) as fixed tariff without percentage discount", () => {
      const res = resolvePricingBandDiscountSync("band-weston-memo-10");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.discountPercentage, 0);
      assert.equal(res.hasPercentageDiscount, false);
      assert.match(res.statusMessage, /no percentage discount/i);
    });

    it("should identify Band 12 (Business Discounted) as fixed tariff without percentage discount", () => {
      const res = resolvePricingBandDiscountSync("band-weston-memo-12");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.discountPercentage, 0);
      assert.equal(res.hasPercentageDiscount, false);
      assert.match(res.statusMessage, /no percentage discount/i);
    });

    it("should identify application category bands as fixed rate tariffs without percentage discount", () => {
      const bands = [
        "Standard Domestic",
        "High Volume Domestic (Band A)",
        "Commercial Trade (Band B)",
        "Hospitality & Catering (Band C)",
        "Industrial & Agricultural (Band D)",
        "Bulk LPG Propane (Band E)",
      ];

      for (const b of bands) {
        const res = resolvePricingBandDiscountSync(b);
        assert.equal(res.ok, true, `Band "${b}" must resolve cleanly`);
        assert.equal(res.isConfigured, true);
        assert.equal(res.discountPercentage, 0, `Band "${b}" must have 0% discount`);
        assert.equal(res.hasPercentageDiscount, false);
      }
    });
  });

  // ===========================================================================
  // 5. SPECIAL CUSTOMER PRICING CODE RESOLUTION
  // ===========================================================================
  describe("5. Special Customer Pricing Code Resolution", () => {
    it("should resolve SHAR10 (The Glastonbury Egg Co) to Band 98 (25% discount tier)", () => {
      const res = resolvePricingBandDiscountSync(null, "SHAR10");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.discountPercentage, 25.0);
      assert.equal(res.pricingBandId, "band-weston-98");
      assert.ok(res.specialCustomerMatch);
      assert.equal(res.specialCustomerMatch?.code, "SHAR10");
      assert.match(res.specialCustomerMatch?.name || "", /glastonbury egg/i);
    });

    it("should resolve SCH01 (Cheddar Bridge) to Band 90 (20% discount tier)", () => {
      const res = resolvePricingBandDiscountSync(null, "SCH01");
      assert.equal(res.ok, true);
      assert.equal(res.isConfigured, true);
      assert.equal(res.discountPercentage, 20.0);
      assert.equal(res.pricingBandId, "band-weston-90");
      assert.ok(res.specialCustomerMatch);
      assert.equal(res.specialCustomerMatch?.code, "SCH01");
      assert.match(res.specialCustomerMatch?.name || "", /cheddar bridge/i);
    });
  });

  // ===========================================================================
  // 6. APPROVAL AND CUSTOMER CHECKOUT PRICE CONSISTENCY
  // ===========================================================================
  describe("6. Approval and Customer Checkout Price Consistency", () => {
    const product47 = {
      name: "Calor Gas Propane - 47kg",
      price: 113.5,
      deposit_price: 39.99,
      specs: { gas_type: "Propane", cylinder_size: "47kg" },
    };

    it("Customer approved under Band 98 (25% discount) receives £81.07 Exc VAT at checkout", () => {
      const customerBand98: CustomerPricingContext = {
        userId: "cust-98-user",
        userRole: "customer",
        pricingBand: "Band 98 - 25% Disc",
        pricingBandId: "band-weston-98",
        customerCode: null,
        accountApproved: true,
      };

      const resolved = resolveCustomerGasPrice(product47, customerBand98);
      assert.equal(resolved.bandNumber, "98");
      assert.equal(resolved.priceExcVat, 81.07);
      assert.equal(resolved.isDiscounted, true);
    });

    it("Customer approved under Band 89 (17.5% discount) receives £89.18 Exc VAT at checkout", () => {
      const customerBand89: CustomerPricingContext = {
        userId: "cust-89-user",
        userRole: "customer",
        pricingBand: "Band 89 - 17.5% Disc",
        pricingBandId: "band-weston-89",
        customerCode: null,
        accountApproved: true,
      };

      const resolved = resolveCustomerGasPrice(product47, customerBand89);
      assert.equal(resolved.bandNumber, "89");
      assert.equal(resolved.priceExcVat, 89.18);
      assert.equal(resolved.isDiscounted, true);
    });

    it("Customer approved under Band 20 (Retail Normal) receives standard undiscounted price", () => {
      const customerBand20: CustomerPricingContext = {
        userId: "cust-20-user",
        userRole: "customer",
        pricingBand: "Standard Domestic",
        pricingBandId: "band-weston-memo-20",
        customerCode: null,
        accountApproved: true,
      };

      const resolved = resolveCustomerGasPrice(product47, customerBand20);
      assert.equal(resolved.bandNumber, "20");
      assert.equal(resolved.priceIncVat, 113.5);
      assert.equal(resolved.isDiscounted, false);
    });
  });

  // ===========================================================================
  // 7. MISSING OR AMBIGUOUS PRICING BAND INTEGRITY GATES
  // ===========================================================================
  describe("7. Missing or Ambiguous Pricing Band Protection", () => {
    it("should flag unrecognized arbitrary band strings as isAmbiguous and prevent approval", () => {
      const res = resolvePricingBandDiscountSync("NonExistentInvalidBand999");
      assert.equal(res.ok, false);
      assert.equal(res.isConfigured, false);
      assert.equal(res.isAmbiguous, true);
      assert.equal(res.discountPercentage, 0);
      assert.match(res.statusMessage, /missing or ambiguous/i);
    });

    it("should safely handle empty or null pricing band input", () => {
      const res = resolvePricingBandDiscountSync(null);
      assert.equal(res.ok, false);
      assert.equal(res.isConfigured, false);
      assert.equal(res.isAmbiguous, false);
      assert.equal(res.discountPercentage, 0);
      assert.match(res.statusMessage, /no pricing band selected/i);
    });
  });
});

