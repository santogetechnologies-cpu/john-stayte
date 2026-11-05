import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPricingOverviewStats,
  getPricingBands,
  getPricesByBranchAndBand,
  findPriceByGasTypeAndSize,
  getAuthorizedPricingBands,
  getAuthorizedBranchGasPrices,
  getSpecialCustomerPrices,
  getPricingHistoryAuditLogs,
  updateBranchGasPrice,
  togglePricingBandStatus,
  determineDeliveryEligibility,
  resetLivePricingState,
  BRANCH_PRICING_LOCATIONS,
} from "../src/lib/branch-pricing-service";
import {
  CLIENT_DOCUMENTED_BANDS,
  CLIENT_DOCUMENTED_PRICES,
  WESTON_FORECOURT_ID,
} from "../src/data/client-pricing-data";

describe("Phase 2 – Branch Gas Pricing Management (Admin & Manager Portal Integration)", () => {
  beforeEach(() => {
    resetLivePricingState();
  });

  // ============================================================================
  // 1. ADMIN PRICING ACCESS & GOVERNANCE
  // ============================================================================
  describe("1. Admin Pricing Access & Full Management Privileges", () => {
    it("should allow Admin users to view all active pricing bands", () => {
      const adminBands = getAuthorizedPricingBands("admin");
      assert.equal(adminBands.length, 66, "Admin must have access to all documented pricing bands (66 total)");
      assert.ok(adminBands.some((b) => b.location_code === "WESTON"));
      assert.ok(adminBands.some((b) => b.location_code === "EASTINGTON"));
    });

    it("should allow Admin users to view all 157 authoritative gas prices", () => {
      const adminPrices = getAuthorizedBranchGasPrices("admin");
      assert.equal(adminPrices.length, 157, "Admin must have visibility into all 157 documented prices");
    });

    it("should allow Admin users to retrieve pricing overview stats", () => {
      const stats = getPricingOverviewStats();
      assert.equal(stats.totalPricingBands, 66);
      assert.equal(stats.totalPricingEntries, 157);
      assert.equal(stats.westonPricingEntries, 93);
      assert.equal(stats.eastingtonPricingEntries, 64);
      assert.equal(stats.pendingClientClarifications, 1);
      assert.equal(stats.specialCustomerPricingEntries, 9);
    });

    it("should allow Admin to successfully update a price with mandatory audit reason", async () => {
      const priceToUpdate = CLIENT_DOCUMENTED_PRICES.find((p) => p.id === "w98-pro-47");
      assert.ok(priceToUpdate);
      const originalExc = priceToUpdate.price_exc_vat;

      const res = await updateBranchGasPrice(
        priceToUpdate.id,
        { price_exc_vat: 82.50 },
        {
          id: "admin-123",
          name: "Test Administrator",
          email: "admin@jss.com",
          role: "admin",
        },
        "Client directive: Annual adjustment for 47kg Propane Band 98"
      );

      assert.equal(res.success, true);
      assert.equal(res.updatedPrice?.price_exc_vat, 82.50);

      // Verify audit log entry was created
      const logs = getPricingHistoryAuditLogs();
      const latest = logs[0];
      assert.equal(latest.price_id, priceToUpdate.id);
      assert.equal(latest.previous_price_exc_vat, originalExc);
      assert.equal(latest.new_price_exc_vat, 82.50);
      assert.equal(latest.changed_by_name, "Test Administrator");
      assert.ok(latest.reason.includes("Annual adjustment"));
    });

    it("should allow Admin to toggle pricing band status with reason", async () => {
      const bandToToggle = CLIENT_DOCUMENTED_BANDS.find((b) => b.id === "band-weston-89");
      assert.ok(bandToToggle);
      assert.equal(bandToToggle.is_active, true);

      const res = await togglePricingBandStatus(
        bandToToggle.id,
        false,
        {
          id: "admin-123",
          name: "Test Administrator",
          email: "admin@jss.com",
          role: "admin",
        },
        "Temporary deactivation pending contract renewal"
      );

      assert.equal(res.success, true);
      assert.equal(res.updatedBand?.is_active, false);

      // Verify audit log entry
      const logs = getPricingHistoryAuditLogs();
      assert.ok(logs[0].reason.includes("Deactivated Band 89"));
    });
  });

  // ============================================================================
  // 2. MANAGER PRICING ACCESS & STRICT RESTRICTIONS
  // ============================================================================
  describe("2. Manager Pricing Access & Modification Restrictions", () => {
    it("should allow Manager to view authorized pricing bands", () => {
      const managerBands = getAuthorizedPricingBands("manager");
      assert.equal(managerBands.length, 66);
    });

    it("should allow Manager to view branch prices and special prices in read-only mode", () => {
      const managerPrices = getAuthorizedBranchGasPrices("manager");
      assert.equal(managerPrices.length, 157);
      const specialPrices = getSpecialCustomerPrices("manager");
      assert.equal(specialPrices.length, 9);
    });

    it("should strictly BLOCK Manager from modifying gas prices", async () => {
      const priceToUpdate = CLIENT_DOCUMENTED_PRICES[0];
      const res = await updateBranchGasPrice(
        priceToUpdate.id,
        { price_exc_vat: 99.99 },
        {
          id: "mgr-456",
          name: "Depot Manager",
          email: "manager@jss.com",
          role: "manager",
        },
        "Manager attempting price update"
      );

      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Only Admin users can modify gas prices"));
    });

    it("should strictly BLOCK Manager from activating or deactivating pricing bands", async () => {
      const band = CLIENT_DOCUMENTED_BANDS[0];
      const res = await togglePricingBandStatus(
        band.id,
        false,
        {
          id: "mgr-456",
          name: "Depot Manager",
          email: "manager@jss.com",
          role: "manager",
        },
        "Manager attempting band toggle"
      );

      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Only Admin users can activate or deactivate pricing bands"));
    });
  });

  // ============================================================================
  // 3. UNAUTHORIZED CUSTOMER & ANONYMOUS ACCESS PROTECTION
  // ============================================================================
  describe("3. Confidentiality & Unauthorized Access Protection ('NOT FOR PUBLIC DISPLAY')", () => {
    it("should deny anonymous/unauthenticated users from reading pricing bands", () => {
      const anonBands = getAuthorizedPricingBands(null);
      assert.deepEqual(anonBands, [], "Anonymous users must not receive any pricing bands");
    });

    it("should deny anonymous/unauthenticated users from reading branch prices", () => {
      const anonPrices = getAuthorizedBranchGasPrices(null);
      assert.deepEqual(anonPrices, [], "Anonymous users must not receive any branch gas prices");
    });

    it("should strictly BLOCK customer from modifying prices", async () => {
      const price = CLIENT_DOCUMENTED_PRICES[0];
      const res = await updateBranchGasPrice(
        price.id,
        { price_exc_vat: 10.00 },
        {
          id: "cust-789",
          name: "Malicious Customer",
          email: "customer@gmail.com",
          role: "customer",
        },
        "Customer attempt to discount self"
      );

      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Only Admin users can modify gas prices"));
    });
  });

  // ============================================================================
  // 4. SPECIAL CUSTOMER PRICING PROTECTION
  // ============================================================================
  describe("4. Special Customer Pricing Protection & Isolation", () => {
    it("should hide special customer pricing from unassigned regular customers", () => {
      const custPrices = getAuthorizedBranchGasPrices("customer", "band-weston-98", null);
      const hasSpecial = custPrices.some((p) => p.is_special_customer_price);
      assert.equal(hasSpecial, false, "Special customer overrides must be hidden from normal customers");
    });

    it("should only expose SHAR10 special rate to customer with SHAR10 account code", () => {
      const shar10Prices = getAuthorizedBranchGasPrices("customer", "band-weston-98", "SHAR10");
      const shar10 = shar10Prices.find((p) => p.special_customer_code === "SHAR10");
      assert.ok(shar10);
      assert.equal(shar10.price_exc_vat, 77.50);

      // Verify other special customer overrides are NOT visible
      const otherSpecial = shar10Prices.find((p) => p.special_customer_code === "SGRO02");
      assert.equal(otherSpecial, undefined);
    });
  });

  // ============================================================================
  // 5. BRANCH SEPARATION (WESTON VS EASTINGTON VS FORECOURTS)
  // ============================================================================
  describe("5. Branch Separation & Forecourt Constraints", () => {
    it("should confirm Weston has forecourt station UUID and Eastington has NULL branch_id", () => {
      const westonLoc = BRANCH_PRICING_LOCATIONS.find((l) => l.location_code === "WESTON");
      const eastLoc = BRANCH_PRICING_LOCATIONS.find((l) => l.location_code === "EASTINGTON");

      assert.ok(westonLoc);
      assert.equal(westonLoc.id, WESTON_FORECOURT_ID);
      assert.equal(westonLoc.is_confirmed_forecourt, true);

      assert.ok(eastLoc);
      assert.equal(eastLoc.id, null, "Eastington forecourt ID must remain NULL pending official confirmation");
      assert.equal(eastLoc.is_confirmed_forecourt, false);
      assert.equal(eastLoc.status_label, "Pending Branch Confirmation");
    });

    it("should keep Cirencester, Gloucester, and Stroud on standard base rate", () => {
      const otherForecourts = ["CIRENCESTER", "GLOUCESTER", "STROUD"];
      for (const code of otherForecourts) {
        const loc = BRANCH_PRICING_LOCATIONS.find((l) => l.location_code === code);
        assert.ok(loc);
        assert.equal(loc.is_confirmed_forecourt, true);
        assert.ok(loc.description.includes("standard retail & commercial network base rates"));
      }
    });
  });

  // ============================================================================
  // 6. PRICING BAND FILTERING & SEARCH
  // ============================================================================
  describe("6. Pricing Band Filtering by Branch & Customer Category", () => {
    it("should filter bands strictly by WESTON", () => {
      const westonBands = getPricingBands("WESTON");
      assert.ok(westonBands.every((b) => b.location_code === "WESTON"));
      assert.equal(westonBands.length, 24); // 4 discount tiers + 20 memorandum bands
    });

    it("should filter bands strictly by EASTINGTON", () => {
      const eastBands = getPricingBands("EASTINGTON");
      assert.ok(eastBands.every((b) => b.location_code === "EASTINGTON"));
      assert.equal(eastBands.length, 42); // 42 distinct customer categories in Eastington 18 May revision
    });

    it("should verify all 15 Band 90 entries are present and accessible in Weston branch pricing", () => {
      const band90Prices = getPricesByBranchAndBand("band-weston-90");
      assert.equal(band90Prices.length, 15, "Band 90 must contain exactly 15 entries");

      // Verify all 12 standard cylinders
      const standard90 = band90Prices.filter((p) => !p.is_special_customer_price);
      assert.equal(standard90.length, 12, "Band 90 must contain 12 standard cylinder entries");

      const expectedStandard = [
        { gas: "Butane", size: "4.5kg", exc: 25.52 },
        { gas: "Butane", size: "7kg", exc: 28.19 },
        { gas: "Butane", size: "15kg", exc: 44.38 },
        { gas: "Propane", size: "3.9kg", exc: 21.71 },
        { gas: "Propane", size: "6kg", exc: 25.07 },
        { gas: "Propane", size: "13kg", exc: 38.10 },
        { gas: "Propane", size: "19kg", exc: 47.24 },
        { gas: "Propane", size: "47kg", exc: 86.48 },
        { gas: "Automotive", size: "12kg", exc: 29.14 },
        { gas: "Automotive", size: "18kg", exc: 41.90 },
        { gas: "Patio", size: "13kg", exc: 41.14 },
        { gas: "Patio", size: "5kg", exc: 18.29 },
      ];

      for (const exp of expectedStandard) {
        const found = standard90.find(
          (p) =>
            p.gas_type.toLowerCase() === exp.gas.toLowerCase() &&
            p.cylinder_size.toLowerCase() === exp.size.toLowerCase()
        );
        assert.ok(found, `Missing Band 90 standard entry: ${exp.gas} ${exp.size}`);
        assert.equal(found.price_exc_vat, exp.exc);
        assert.equal(found.vat_status, "EXCLUDING_VAT");
      }

      // Verify all 3 special customer prices
      const special90 = band90Prices.filter((p) => p.is_special_customer_price);
      assert.equal(special90.length, 3, "Band 90 must contain 3 special customer overrides");

      const sch01 = special90.find((p) => p.special_customer_code === "SCH01");
      assert.ok(sch01, "SCH01 Cheddar Bridge Touring must be present in Band 90");
      assert.equal(sch01.price_exc_vat, 77.50);

      const smag01 = special90.find((p) => p.special_customer_code === "SMAG01");
      assert.ok(smag01, "SMAG01 Magor Fuels must be present in Band 90");
      assert.equal(smag01.price_exc_vat, 79.50);

      const sret02 = special90.find((p) => p.special_customer_code === "SRET02");
      assert.ok(sret02, "SRET02 Retreat Caravan Park must be present in Band 90");
      assert.equal(sret02.price_exc_vat, 77.50);
    });

    it("should confirm the other 3 Weston discount bands remain unchanged", () => {
      const b98 = getPricesByBranchAndBand("band-weston-98");
      assert.equal(b98.length, 15, "Band 98 must remain 15 entries (12 standard + 3 special)");

      const b97 = getPricesByBranchAndBand("band-weston-97");
      assert.equal(b97.length, 12, "Band 97 must remain 12 standard entries");

      const b89 = getPricesByBranchAndBand("band-weston-89");
      assert.equal(b89.length, 12, "Band 89 must remain 12 standard entries");
    });
  });

  // ============================================================================
  // 7. PRICE VALIDATION & INTEGRITY
  // ============================================================================
  describe("7. Price Modification Validation Rules", () => {
    it("should reject negative prices", async () => {
      const price = CLIENT_DOCUMENTED_PRICES[0];
      const res = await updateBranchGasPrice(
        price.id,
        { price_exc_vat: -15.00 },
        { id: "admin-1", name: "Admin", email: "admin@jss.com", role: "admin" },
        "Test reason"
      );
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("non-negative number"));
    });

    it("should reject price updates without a mandatory reason", async () => {
      const price = CLIENT_DOCUMENTED_PRICES[0];
      const res = await updateBranchGasPrice(
        price.id,
        { price_exc_vat: 50.00 },
        { id: "admin-1", name: "Admin", email: "admin@jss.com", role: "admin" },
        " "
      );
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("detailed reason"));
    });
  });

  // ============================================================================
  // 8. PRICING HISTORY & AUDIT LOGS
  // ============================================================================
  describe("8. Pricing History & Audit Log Integrity", () => {
    it("should maintain initial audit logs and prepend new changes", async () => {
      const initialLogs = getPricingHistoryAuditLogs();
      assert.ok(initialLogs.length >= 3, "Baseline import audit logs must exist");

      const updateRes = await updateBranchGasPrice(
        "east-47-b20",
        { price_inc_vat: 115.00 },
        { id: "admin-1", name: "Admin Test", email: "admin@jss.com", role: "admin" },
        "Supplier price increase"
      );
      assert.equal(updateRes.success, true);

      const updatedLogs = getPricingHistoryAuditLogs();
      assert.equal(updatedLogs.length, initialLogs.length + 1);
      assert.equal(updatedLogs[0].new_price_inc_vat, 115.00);
      assert.equal(updatedLogs[0].previous_price_inc_vat, 113.50);
    });
  });

  // ============================================================================
  // 9. STATUTORY VAT TREATMENT
  // ============================================================================
  describe("9. VAT Treatment & Preservation", () => {
    it("should verify Weston Discount Tiers specify EXCLUDING_VAT", () => {
      const w98Prices = getPricesByBranchAndBand("band-weston-98");
      assert.ok(w98Prices.every((p) => p.vat_status === "EXCLUDING_VAT"));
      assert.ok(w98Prices.every((p) => p.price_inc_vat === null));
      assert.ok(w98Prices.every((p) => p.price_exc_vat !== null));
    });

    it("should verify Eastington Master prices specify both Inc & Exc VAT (SPLIT_DOCUMENTED)", () => {
      const eastPrices = getPricesByBranchAndBand("band-east-20");
      assert.ok(eastPrices.every((p) => p.vat_status === "SPLIT_DOCUMENTED"));
      assert.ok(eastPrices.every((p) => p.price_inc_vat !== null && p.price_exc_vat !== null));
    });
  });

  // ============================================================================
  // 10. DELIVERY CHARGE RULES & FEE WAIVERS
  // ============================================================================
  describe("10. Delivery Rules Governance", () => {
    it("should charge delivery to undiscounted Retail Normal (Band 20) and Business Normal (Band 10)", () => {
      const rule20 = determineDeliveryEligibility("20");
      assert.equal(rule20.is_discounted_customer, false);
      assert.equal(rule20.delivery_fee_waived, false);
      assert.equal(rule20.standard_fee_applicable, true);

      const rule10 = determineDeliveryEligibility("10");
      assert.equal(rule10.is_discounted_customer, false);
      assert.equal(rule10.delivery_fee_waived, false);
      assert.equal(rule10.standard_fee_applicable, true);
    });

    it("should waive delivery fee for all discounted customer bands", () => {
      const discountedBands = ["89", "90", "97", "98", "12", "15", "31", "32", "36", "48"];
      for (const band of discountedBands) {
        const rule = determineDeliveryEligibility(band);
        assert.equal(rule.is_discounted_customer, true, `Band ${band} must be recognized as discounted`);
        assert.equal(rule.delivery_fee_waived, true, `Band ${band} delivery fee must be waived (£0.00)`);
        assert.equal(rule.standard_fee_applicable, false);
      }
    });
  });

  // ============================================================================
  // 11. PENDING CLIENT CLARIFICATION PRESERVATION
  // ============================================================================
  describe("11. Pending Clarification Item Preservation", () => {
    it("should preserve Weston 12KG Band 12 (£38.25 Inc / £33.57 Exc) flagged for clarification", () => {
      const item = CLIENT_DOCUMENTED_PRICES.find((p) => p.id === "w-memo-12-b12");
      assert.ok(item);
      assert.equal(item.price_inc_vat, 38.25);
      assert.equal(item.price_exc_vat, 33.57);
      assert.equal(item.requires_client_clarification, true);
    });
  });

  // ============================================================================
  // 12. DASHBOARD INTERACTIVE SUMMARY METRIC CARDS
  // ============================================================================
  describe("12. Dashboard Interactive Metric Cards Navigation & State Logic", () => {
    it("Card 1: Total Bands should target Pricing Bands tab with all 66 bands", () => {
      const allBands = getPricingBands();
      assert.equal(allBands.length, 66);
    });

    it("Card 2: Total Entries should target Branch Pricing tab with all 157 entries", () => {
      const stats = getPricingOverviewStats();
      assert.equal(stats.totalPricingEntries, 157);
    });

    it("Card 3: Weston Prices should target Branch Pricing with Weston selected and all 93 entries", () => {
      const westonPrices = CLIENT_DOCUMENTED_PRICES.filter((p) => p.location_name === "Weston-Super-Mare");
      assert.equal(westonPrices.length, 93);
    });

    it("Card 4: Eastington Prices should target Branch Pricing with Eastington selected and all 64 entries", () => {
      const eastPrices = CLIENT_DOCUMENTED_PRICES.filter((p) => p.location_name === "Eastington");
      assert.equal(eastPrices.length, 64);
    });

    it("Card 5: Active Bands should target Pricing Bands with Active filter and return 66 active bands", () => {
      const activeBands = getPricingBands().filter((b) => b.is_active);
      assert.equal(activeBands.length, 66);
    });

    it("Card 6: Clarification should display Weston 12kg Band 12 preserved values", () => {
      const item = CLIENT_DOCUMENTED_PRICES.find((p) => p.id === "w-memo-12-b12");
      assert.ok(item);
      assert.equal(item.price_inc_vat, 38.25);
      assert.equal(item.price_exc_vat, 33.57);
    });

    it("Card 7: Special Accounts should target Special Customer Pricing and return all 9 special records", () => {
      const specialPrices = getSpecialCustomerPrices("admin");
      assert.equal(specialPrices.length, 9);
    });
  });
});
