import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_LIFETIME_TIERS,
  evaluateOrderEligibility,
  calculateEligibleOrdersSpend,
  resolveLifetimeTierForSpend,
} from "../src/lib/lifetime-discount-service";
import {
  calculateCheckoutOrderTotals,
  type CustomerPricingContext,
} from "../src/lib/customer-order-pricing-service";

const samplePropane47kg = {
  id: "prod-propane-47kg",
  slug: "calor-propane-47kg",
  name: "Calor Propane 47kg Cylinder",
  category: "bottled-gas",
  sub: "Propane",
  price: 113.5,
  deposit_price: 39.99,
  specs: { gas_type: "Propane", cylinder_size: "47kg" },
};

const defaultSettings = {
  deliveryChargesEnabled: true,
  defaultShippingFee: 5.0,
  freeDeliveryEnabled: false,
  freeDeliveryThreshold: 0,
  taxEnabled: true,
  vatRate: 5,
  taxPricingMode: "inclusive" as const,
};

describe("Customer Lifetime Purchase-Based Automatic Discount System", () => {
  describe("1. Tier Thresholds & Initial Business Rules", () => {
    const tierCases = [
      { spend: 0, expectedPct: 0, expectedTier: "Standard Starter", nextTier: "Bronze Loyalty (10%)", remaining: 500 },
      { spend: 499.99, expectedPct: 0, expectedTier: "Standard Starter", nextTier: "Bronze Loyalty (10%)", remaining: 0.01 },
      { spend: 500, expectedPct: 10, expectedTier: "Bronze Loyalty (10%)", nextTier: "Silver Loyalty (17.5%)", remaining: 500 },
      { spend: 999.99, expectedPct: 10, expectedTier: "Bronze Loyalty (10%)", nextTier: "Silver Loyalty (17.5%)", remaining: 0.01 },
      { spend: 1000, expectedPct: 17.5, expectedTier: "Silver Loyalty (17.5%)", nextTier: "Gold Loyalty (20%)", remaining: 1500 },
      { spend: 2499.99, expectedPct: 17.5, expectedTier: "Silver Loyalty (17.5%)", nextTier: "Gold Loyalty (20%)", remaining: 0.01 },
      { spend: 2500, expectedPct: 20, expectedTier: "Gold Loyalty (20%)", nextTier: "Platinum Loyalty (25%)", remaining: 2500 },
      { spend: 4999.99, expectedPct: 20, expectedTier: "Gold Loyalty (20%)", nextTier: "Platinum Loyalty (25%)", remaining: 0.01 },
      { spend: 5000, expectedPct: 25, expectedTier: "Platinum Loyalty (25%)", nextTier: null, remaining: 0 },
      { spend: 12450, expectedPct: 25, expectedTier: "Platinum Loyalty (25%)", nextTier: null, remaining: 0 },
    ];

    for (const c of tierCases) {
      it(`spend £${c.spend} resolves to ${c.expectedTier} (${c.expectedPct}%)`, () => {
        const summary = resolveLifetimeTierForSpend({
          customerId: "cust-1",
          eligibleSpend: c.spend,
          eligibleOrderCount: c.spend > 0 ? 1 : 0,
          tiers: DEFAULT_LIFETIME_TIERS,
          programmeEnabled: true,
        });
        assert.equal(summary.discountPercentage, c.expectedPct);
        assert.equal(summary.currentTierName, c.expectedTier);
        assert.equal(summary.nextTierName, c.nextTier);
        assert.equal(summary.remainingToNextTier, c.remaining);
      });
    }

    it("returns 0% when programme is deactivated", () => {
      const summary = resolveLifetimeTierForSpend({
        customerId: "cust-1",
        eligibleSpend: 5500,
        eligibleOrderCount: 5,
        tiers: DEFAULT_LIFETIME_TIERS,
        programmeEnabled: false,
      });
      assert.equal(summary.discountPercentage, 0);
      assert.equal(summary.programmeEnabled, false);
    });
  });

  describe("2. Order Eligibility & Threshold Progression", () => {
    it("counts Delivered or Paid orders and excludes Cancelled, Failed, Refunded, and unpaid Pending orders", () => {
      const orders = [
        { id: "o1", status: "Delivered", payment_status: "Paid", total: 450 },
        { id: "o2", status: "Approved", payment_status: "Paid", total: 100 }, // Paid -> eligible
        { id: "o3", status: "Cancelled", payment_status: "Paid", total: 2000 }, // Cancelled -> excluded
        { id: "o4", status: "Delivered", payment_status: "Failed", total: 1000 }, // Failed -> excluded
        { id: "o5", status: "Delivered", payment_status: "Refunded", total: 1000 }, // Refunded -> excluded
        { id: "o6", status: "Pending", payment_status: "Pending", total: 800 }, // Unpaid pending -> excluded
        { id: "o1", status: "Delivered", payment_status: "Paid", total: 450 }, // Duplicate ID -> deduplicated
      ];

      assert.equal(evaluateOrderEligibility(orders[2]).isEligible, false);
      assert.equal(evaluateOrderEligibility(orders[3]).isEligible, false);
      assert.equal(evaluateOrderEligibility(orders[4]).isEligible, false);
      assert.equal(evaluateOrderEligibility(orders[5]).isEligible, false);

      const calc = calculateEligibleOrdersSpend(orders);
      assert.equal(calc.eligibleOrderCount, 2);
      assert.equal(calc.eligibleSpend, 550);

      const summary = resolveLifetimeTierForSpend({
        customerId: "cust-progress",
        eligibleSpend: calc.eligibleSpend,
        eligibleOrderCount: calc.eligibleOrderCount,
        tiers: DEFAULT_LIFETIME_TIERS,
        programmeEnabled: true,
      });
      assert.equal(summary.discountPercentage, 10);
      assert.equal(summary.currentTierName, "Bronze Loyalty (10%)");
    });

    it("transitions customer across thresholds (£450 -> £550 -> £1,050)", () => {
      const stage1 = resolveLifetimeTierForSpend({
        customerId: "cust-2",
        eligibleSpend: 450,
        eligibleOrderCount: 1,
        tiers: DEFAULT_LIFETIME_TIERS,
        programmeEnabled: true,
      });
      assert.equal(stage1.discountPercentage, 0);

      const stage2 = resolveLifetimeTierForSpend({
        customerId: "cust-2",
        eligibleSpend: 550,
        eligibleOrderCount: 2,
        tiers: DEFAULT_LIFETIME_TIERS,
        programmeEnabled: true,
      });
      assert.equal(stage2.discountPercentage, 10);

      const stage3 = resolveLifetimeTierForSpend({
        customerId: "cust-2",
        eligibleSpend: 1050,
        eligibleOrderCount: 3,
        tiers: DEFAULT_LIFETIME_TIERS,
        programmeEnabled: true,
      });
      assert.equal(stage3.discountPercentage, 17.5);
    });
  });

  describe("3. Checkout Integration & Non-Stacking Conflict Rules", () => {
    it("applies 10% automatic lifetime discount for standard Retail customer with £600 spend", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-retail",
        pricingBand: "10",
        accountApproved: true,
        lifetimeDiscountPercentage: 10,
        lifetimeTierName: "Bronze Loyalty (10%)",
        lifetimeEligibleSpend: 600,
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

      const expectedDiscount = Number((totals.subtotal * 0.1).toFixed(2));
      assert.equal(totals.lifetimeDiscountAmount, expectedDiscount);
      assert.equal(totals.lifetimeDiscountPercentageApplied, 10);
      assert.equal(totals.offerDiscount, 0);
      assert.equal(
        totals.total,
        Number((totals.subtotal - expectedDiscount + totals.shipping).toFixed(2)),
      );
    });

    it("does NOT double-discount or overwrite Special Customer Pricing (SHAR10)", () => {
      const specialCustomer: CustomerPricingContext = {
        userId: "cust-shar10",
        pricingBand: "20",
        customerCode: "SHAR10",
        accountApproved: true,
        lifetimeDiscountPercentage: 25,
        lifetimeTierName: "Platinum Loyalty (25%)",
        lifetimeEligibleSpend: 6000,
      };

      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer: specialCustomer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      assert.equal(totals.lineBreakdowns[0].resolvedGasPrice?.isSpecialPrice, true);
      assert.equal(totals.lifetimeDiscountAmount, 0);
      assert.equal(totals.lifetimeDiscountPercentageApplied, 0);
      assert.ok(totals.lifetimeDiscountSkippedReason?.includes("Special customer pricing"));
    });

    it("does NOT double-discount or overwrite explicitly discounted Band 98 (25%)", () => {
      const bandCustomer: CustomerPricingContext = {
        userId: "cust-band98",
        pricingBand: "Band 98 - 25% Disc",
        accountApproved: true,
        lifetimeDiscountPercentage: 20,
        lifetimeTierName: "Gold Loyalty (20%)",
        lifetimeEligibleSpend: 3000,
      };

      const totals = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer: bandCustomer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "delivery",
        systemSettings: defaultSettings,
      });

      assert.equal(totals.lifetimeDiscountAmount, 0);
      assert.equal(totals.deliveryFeeWaivedByBand, true);
      assert.ok(totals.lifetimeDiscountSkippedReason?.includes("Explicit commercial/discounted band"));
    });

    it("does NOT stack with promotional offer discounts (applies whichever is greater)", () => {
      const customer: CustomerPricingContext = {
        userId: "cust-promo",
        pricingBand: "10",
        accountApproved: true,
        lifetimeDiscountPercentage: 10,
        lifetimeTierName: "Bronze Loyalty (10%)",
        lifetimeEligibleSpend: 700,
      };

      // Case A: Promo £25 > 10% lifetime (~£11.35) -> Promo wins, lifetime = 0
      const promoWins = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "collection",
        systemSettings: defaultSettings,
        offerDiscount: 25,
      });
      assert.equal(promoWins.offerDiscount, 25);
      assert.equal(promoWins.lifetimeDiscountAmount, 0);

      // Case B: Promo £5 < 10% lifetime (~£11.35) -> Lifetime wins, promo = 0
      const lifetimeWins = calculateCheckoutOrderTotals({
        lines: [{ product: samplePropane47kg, qty: 1 }],
        customer,
        cylinderExchangeType: "refill",
        returnedCylinderType: "Calor Propane Cylinder",
        returnedEmptyCount: 1,
        fulfilmentMethod: "collection",
        systemSettings: defaultSettings,
        offerDiscount: 5,
      });
      assert.equal(lifetimeWins.offerDiscount, 0);
      assert.ok(lifetimeWins.lifetimeDiscountAmount > 5);
    });
  });

  describe("4. Admin vs Manager Permissions & Migration 00106 RLS Verification", () => {
    const migrationSql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/00106_lifetime_purchase_discount_system.sql"),
      "utf8",
    );
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/pricing/LifetimeDiscountsPanel.tsx"),
      "utf8",
    );

    it("enforces Admin-only FOR ALL RLS on all 3 lifetime discount tables (Manager read-only)", () => {
      assert.ok(!migrationSql.includes('CREATE POLICY "Admins and Managers can manage'));
      assert.ok(migrationSql.includes('CREATE POLICY "Admins can manage lifetime discount config"'));
      assert.ok(migrationSql.includes('CREATE POLICY "Admins can manage lifetime discount tiers"'));
      assert.ok(migrationSql.includes('CREATE POLICY "Admins can manage lifetime eligibility"'));

      const adminRoleChecks = migrationSql.match(/profiles\.role = 'admin'/g) || [];
      assert.equal(adminRoleChecks.length, 6); // 2 checks (USING + WITH CHECK) per table x 3 tables

      // Read-only SELECT policies remain intact for authenticated / admin_or_manager
      assert.ok(migrationSql.includes('CREATE POLICY "Authenticated users can read lifetime discount config"'));
      assert.ok(migrationSql.includes('CREATE POLICY "Authenticated users can read lifetime discount tiers"'));
      assert.ok(migrationSql.includes('USING (customer_id = auth.uid() OR public.is_admin_or_manager())'));
    });

    it("revokes direct authenticated EXECUTE on recalculate_customer_lifetime_eligibility and protects get_customer_lifetime_discount", () => {
      assert.ok(
        migrationSql.includes(
          "REVOKE ALL ON FUNCTION public.recalculate_customer_lifetime_eligibility(UUID) FROM PUBLIC, anon, authenticated;",
        ),
      );
      assert.ok(
        migrationSql.includes(
          "GRANT EXECUTE ON FUNCTION public.recalculate_customer_lifetime_eligibility(UUID) TO service_role;",
        ),
      );
      assert.ok(
        migrationSql.includes(
          "IF v_target_id <> auth.uid() AND NOT public.is_admin_or_manager() AND auth.role() <> 'service_role' THEN",
        ),
      );
    });

    it("enforces read-only UI for Manager and full configuration controls for Admin in LifetimeDiscountsPanel", () => {
      assert.ok(panelSource.includes('const isAdmin = roleLabel === "Admin";'));
      assert.ok(panelSource.includes("if (!isAdmin) return;"));
      assert.ok(panelSource.includes("{isAdmin && ("));
      assert.ok(panelSource.includes("Read-only view for Manager."));
    });
  });
});
