import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCustomerGasPrice,
  calculateCheckoutOrderTotals,
  type CustomerPricingContext,
} from "../src/lib/customer-order-pricing-service";
import { resolvePricingBandDiscountSync } from "../src/lib/branch-pricing-service";

const samplePropane47kg = {
  id: "prod-propane-47kg",
  slug: "calor-propane-47kg",
  name: "Calor Propane 47kg Cylinder",
  category: "bottled-gas",
  sub: "Propane",
  price: 113.5, // Catalog price (Band 20 inc VAT)
  deposit_price: 39.99,
  specs: { gas_type: "Propane", cylinder_size: "47kg" },
};

const defaultSettings = {
  deliveryChargesEnabled: true,
  defaultShippingFee: 5.0,
  freeDeliveryEnabled: false,
  freeDeliveryThreshold: 0,
  taxEnabled: false,
  vatRate: 0,
  taxPricingMode: "exclusive" as const,
};

describe("Customer Pricing Band & Checkout Totals Integration", () => {
  describe("1. Percentage Discount Bands (89, 90, 97, 98)", () => {
    const cases = [
      { band: "Band 89 - 17.5% Disc", expectedBand: "89", expectedExc: 89.18, expectedPct: 17.5 },
      { band: "Band 90 - 20% Disc", expectedBand: "90", expectedExc: 86.48, expectedPct: 20 },
      { band: "Band 97 - 22.5% Disc", expectedBand: "97", expectedExc: 83.77, expectedPct: 22.5 },
      { band: "Band 98 - 25% Disc", expectedBand: "98", expectedExc: 81.07, expectedPct: 25 },
    ];

    for (const c of cases) {
      it(`should resolve Band ${c.expectedBand} (${c.expectedPct}%) price and waive delivery fee`, () => {
        const res = resolvePricingBandDiscountSync(c.band);
        assert.equal(res.ok, true);
        assert.equal(res.discountPercentage, c.expectedPct);
        assert.equal(res.deliveryFeeWaived, true);

        const customer: CustomerPricingContext = {
          userId: "cust-1",
          userRole: "customer",
          pricingBand: c.band,
          pricingBandId: res.pricingBandId,
          accountApproved: true,
        };

        const gasPrice = resolveCustomerGasPrice(samplePropane47kg, customer);
        assert.equal(gasPrice.pricingError, undefined);
        assert.equal(gasPrice.bandNumber, c.expectedBand);
        assert.equal(gasPrice.priceExcVat, c.expectedExc);
        const expectedInc = Number((c.expectedExc * 1.05).toFixed(2));
        assert.equal(gasPrice.unitRefillPrice, expectedInc);

        const totals = calculateCheckoutOrderTotals({
          lines: [{ product: samplePropane47kg, qty: 2 }],
          customer,
          cylinderExchangeType: "refill",
          returnedCylinderType: "Calor Propane Cylinder",
          returnedEmptyCount: 2,
          fulfilmentMethod: "delivery",
          systemSettings: defaultSettings,
        });

        assert.equal(totals.pricingErrors.length, 0);
        assert.equal(totals.deliveryFeeWaivedByBand, true);
        assert.equal(totals.shipping, 0);
        assert.equal(totals.subtotal, Number((expectedInc * 2).toFixed(2)));
        assert.equal(totals.total, totals.subtotal);
      });
    }
  });

  describe("2. Fixed-Rate Undiscounted Bands (10 and 20)", () => {
    it("should apply Band 20 (Standard Domestic) fixed price and charge standard delivery fee", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-20",
        userRole: "customer",
        pricingBand: "Standard Domestic",
        pricingBandId: "band-weston-memo-20",
        accountApproved: true,
      };

      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      assert.equal(totals.pricingErrors.length, 0);
      assert.equal(totals.deliveryFeeWaivedByBand, false);
      assert.equal(totals.shipping, 5.0);
      assert.equal(totals.subtotal, 113.5);
      assert.equal(totals.total, 118.5);
    });

    it("should apply Band 10 (Business Normal) fixed price and charge standard delivery fee", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-10",
        userRole: "customer",
        pricingBand: "Commercial Trade (Band B)",
        pricingBandId: "band-weston-memo-10",
        accountApproved: true,
      };

      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      assert.equal(totals.pricingErrors.length, 0);
      assert.equal(totals.deliveryFeeWaivedByBand, false);
      assert.equal(totals.shipping, 5.0);
      assert.ok(totals.subtotal > 0);
      assert.equal(totals.total, Number((totals.subtotal + 5.0).toFixed(2)));
    });
  });

  describe("3. Special Customer Overrides & Refill/Deposit Calculations", () => {
    it("should apply special customer code SHAR10 override (£77.50 exc VAT) and add £39.99 deposit for non-returned cylinders", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-shar10",
        userRole: "customer",
        pricingBand: "Band 98 - 25% Disc",
        pricingBandId: "band-weston-98",
        customerCode: "SHAR10",
        accountApproved: true,
      };

      const gasPrice = resolveCustomerGasPrice(samplePropane47kg, customer);
      assert.equal(gasPrice.isSpecialPrice, true);
      assert.equal(gasPrice.specialCustomerCode, "SHAR10");
      assert.equal(gasPrice.priceExcVat, 77.5);
      const expectedRefill = Number((77.5 * 1.05).toFixed(2)); // 81.38
      assert.equal(gasPrice.unitRefillPrice, expectedRefill);

      // Order 3 cylinders, return 1 empty -> 1 refill + 2 full (+2 * 39.99 deposit)
      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 3 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      const expectedSubtotal = Number((3 * expectedRefill + 2 * 39.99).toFixed(2));
      assert.equal(totals.subtotal, expectedSubtotal);
      assert.equal(totals.deliveryFeeWaivedByBand, true);
      assert.equal(totals.shipping, 0);
      assert.equal(totals.total, expectedSubtotal);
      assert.equal(totals.lineBreakdowns[0].totalPrice, expectedSubtotal);
    });
  });

  describe("4. Missing Band Price Error (No Silent Fallback to Retail Normal)", () => {
    it("should return a clear pricingError for synthetic Band A without falling back to Retail Normal", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-band-a",
        userRole: "customer",
        pricingBand: "High Volume Domestic (Band A)",
        accountApproved: true,
      };

      const gasPrice = resolveCustomerGasPrice(samplePropane47kg, customer);
      assert.ok(gasPrice.pricingError, "Expected pricingError for unconfigured Band A");
      assert.ok(gasPrice.pricingError!.includes("No configured price found"));
      assert.equal(gasPrice.unitRefillPrice, 0);

      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      assert.equal(totals.pricingErrors.length, 1);
    });
  });
});
