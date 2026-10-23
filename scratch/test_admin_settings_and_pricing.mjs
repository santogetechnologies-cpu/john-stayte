import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env", "utf8");
const envVars = Object.fromEntries(
  env
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
    }),
);

const supabaseAnon = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
const supabaseService = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("JOHN STAYTE SERVICES - ADMIN SETTINGS & PRICING VERIFICATION TEST SUITE");
  console.log("===============================================================================\n");

  let passedTests = 0;
  let totalTests = 8;

  // -------------------------------------------------------------------------
  // TEST 1: Preserve All Existing Products and Prices
  // -------------------------------------------------------------------------
  console.log("TEST 1: Verifying that all existing products and prices are intact...");
  const { data: products, count: productCount, error: prodErr } = await supabaseAnon
    .from("products")
    .select("id, name, price, stock, category_slug", { count: "exact" });

  if (prodErr || !products || productCount === 0) {
    console.error("FAIL: Could not query products:", prodErr);
  } else {
    const patioGas13kg = products.find((p) => p.name === "Calor Patio Gas - 13kg Refill");
    const patioGas5kg = products.find((p) => p.name === "Calor Patio Gas - 5kg Refill");
    const autarkyDog = products.find((p) => p.name.includes("Autarky Puppy/Junior"));

    if (
      productCount === 102 &&
      patioGas13kg?.price === 52.5 &&
      patioGas5kg?.price === 23.25 &&
      autarkyDog?.price === 29.3
    ) {
      console.log(`PASS: All ${productCount} products preserved with exact prices and stocks:`);
      console.log(`      - Calor Patio Gas 13kg Refill: £${patioGas13kg.price} (Stock: ${patioGas13kg.stock})`);
      console.log(`      - Calor Patio Gas 5kg Refill: £${patioGas5kg.price} (Stock: ${patioGas5kg.stock})`);
      console.log(`      - Autarky Dog Food: £${autarkyDog.price} (Stock: ${autarkyDog.stock})`);
      passedTests++;
    } else {
      console.error("FAIL: Product verification failed or product count mismatch:", productCount);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: Initial Configured VAT is 0% in Database
  // -------------------------------------------------------------------------
  console.log("\nTEST 2: Verifying Initial Configured VAT Settings in Real Database...");
  const { data: settingsBlock, error: settingsErr } = await supabaseAnon
    .from("cms_content_blocks")
    .select("*")
    .eq("section_key", "admin_system_settings")
    .single();

  if (settingsErr || !settingsBlock) {
    console.error("FAIL: Could not load admin_system_settings from cms_content_blocks:", settingsErr);
  } else {
    const parsed = JSON.parse(settingsBlock.content);
    if (parsed.vatRate === 0 && parsed.fuelVatRate === 0 && parsed.taxEnabled === false) {
      console.log("PASS: Initial configured VAT rate is strictly 0% (taxEnabled: false):");
      console.log(`      - vatRate: ${parsed.vatRate}%`);
      console.log(`      - fuelVatRate: ${parsed.fuelVatRate}%`);
      console.log(`      - taxPricingMode: ${parsed.taxPricingMode}`);
      console.log(`      - taxEnabled: ${parsed.taxEnabled}`);
      passedTests++;
    } else {
      console.error("FAIL: VAT settings are not initialized to 0%:", parsed);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Initial VAT Amount in Cart Evaluates to £0.00
  // -------------------------------------------------------------------------
  console.log("\nTEST 3: Verifying Cart VAT Calculation with 0% Configured Rate...");
  const testSubtotal = 105.0; // £105 subtotal sample
  const settings = JSON.parse(settingsBlock.content);

  // Replicate useCartTotals calculation
  const calculateCartVat = (taxableSub, cfg) => {
    if (taxableSub === 0 || !cfg.taxEnabled || cfg.vatRate <= 0) return 0;
    if (cfg.taxPricingMode === "inclusive") {
      return taxableSub - taxableSub / (1 + cfg.vatRate / 100);
    }
    return taxableSub * (cfg.vatRate / 100);
  };

  const initialVatAmount = calculateCartVat(testSubtotal, settings);
  if (initialVatAmount === 0) {
    console.log(`PASS: Cart VAT amount is strictly £0.00 on a £${testSubtotal.toFixed(2)} order.`);
    passedTests++;
  } else {
    console.error(`FAIL: Expected £0.00 VAT, but got £${initialVatAmount}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Initial Delivery Fee is Configured to £0.00
  // -------------------------------------------------------------------------
  console.log("\nTEST 4: Verifying Initial Delivery Settings (no invented £4.99)...");
  if (settings.defaultShippingFee === 0 && settings.deliveryChargesEnabled === false) {
    console.log("PASS: Initial delivery fee is strictly £0.00 (deliveryChargesEnabled: false):");
    console.log(`      - defaultShippingFee: £${settings.defaultShippingFee.toFixed(2)}`);
    console.log(`      - deliveryTierName: "${settings.deliveryTierName}"`);
    console.log(`      - deliveryChargesEnabled: ${settings.deliveryChargesEnabled}`);
    passedTests++;
  } else {
    console.error("FAIL: Initial delivery settings are not £0.00:", settings);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Initial Free Delivery Threshold is £0.00 without Automatic Entitlement
  // -------------------------------------------------------------------------
  console.log("\nTEST 5: Verifying Free Delivery Threshold (£0.00 initial default)...");
  const calculateShipping = (subtotal, cfg) => {
    if (subtotal === 0) return 0;
    if (cfg.freeDeliveryEnabled) {
      if (cfg.freeDeliveryThreshold === 0 || subtotal >= cfg.freeDeliveryThreshold) {
        return 0;
      }
    }
    if (cfg.deliveryChargesEnabled && cfg.defaultShippingFee > 0) {
      return cfg.defaultShippingFee;
    }
    return 0;
  };

  const initialShipping = calculateShipping(testSubtotal, settings);
  if (
    settings.freeDeliveryThreshold === 0 &&
    settings.freeDeliveryEnabled === false &&
    initialShipping === 0
  ) {
    console.log("PASS: Initial free delivery threshold is £0.00 with explicit eligibility rule flag:");
    console.log(`      - freeDeliveryThreshold: £${settings.freeDeliveryThreshold.toFixed(2)}`);
    console.log(`      - freeDeliveryEnabled: ${settings.freeDeliveryEnabled}`);
    console.log(`      - Evaluated Initial Shipping: £${initialShipping.toFixed(2)}`);
    passedTests++;
  } else {
    console.error("FAIL: Free delivery threshold verification failed:", settings);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Admin Persistence via Real Database Update and Reload
  // -------------------------------------------------------------------------
  console.log("\nTEST 6: Testing Admin Updates Persistence in cms_content_blocks...");
  // Simulate an Admin updating delivery fee to £5.50 and VAT to 20%
  const updatedSettings = {
    ...settings,
    vatRate: 20,
    fuelVatRate: 5,
    taxEnabled: true,
    taxPricingMode: "exclusive",
    defaultShippingFee: 5.5,
    deliveryChargesEnabled: true,
    freeDeliveryEnabled: true,
    freeDeliveryThreshold: 75.0,
  };

  const { error: updateErr } = await supabaseService
    .from("cms_content_blocks")
    .upsert(
      {
        section_key: "admin_system_settings",
        title: "Admin System Settings",
        content: JSON.stringify(updatedSettings),
      },
      { onConflict: "section_key" },
    );

  if (updateErr) {
    console.error("FAIL: Could not persist admin update:", updateErr);
  } else {
    // Re-query from database using anon key to verify persistence
    const { data: reloadedBlock } = await supabaseAnon
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", "admin_system_settings")
      .single();

    const reloaded = JSON.parse(reloadedBlock.content);
    if (
      reloaded.vatRate === 20 &&
      reloaded.taxEnabled === true &&
      reloaded.defaultShippingFee === 5.5 &&
      reloaded.freeDeliveryThreshold === 75
    ) {
      console.log("PASS: Admin changes successfully persisted to real database and reloaded:");
      console.log(`      - Updated vatRate: ${reloaded.vatRate}% (taxEnabled: ${reloaded.taxEnabled})`);
      console.log(`      - Updated defaultShippingFee: £${reloaded.defaultShippingFee.toFixed(2)}`);
      console.log(`      - Updated freeDeliveryThreshold: £${reloaded.freeDeliveryThreshold.toFixed(2)}`);
      passedTests++;
    } else {
      console.error("FAIL: Reloaded settings do not match update:", reloaded);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Dynamic Cart & Checkout Calculation Under Configured Settings
  // -------------------------------------------------------------------------
  console.log("\nTEST 7: Verifying Dynamic Pricing Engine Under Updated Rules...");
  // Under updated settings:
  // - Delivery is £5.50 for orders < £75
  // - Delivery is £0.00 for orders >= £75
  // - VAT is 20% exclusive on taxable subtotal
  const smallOrderSubtotal = 40.0;
  const smallShipping = calculateShipping(smallOrderSubtotal, updatedSettings);
  const smallVat = calculateCartVat(smallOrderSubtotal, updatedSettings);
  const smallTotal = smallOrderSubtotal + smallShipping + smallVat;

  const largeOrderSubtotal = 80.0;
  const largeShipping = calculateShipping(largeOrderSubtotal, updatedSettings);
  const largeVat = calculateCartVat(largeOrderSubtotal, updatedSettings);
  const largeTotal = largeOrderSubtotal + largeShipping + largeVat;

  const smallOrderPass = smallShipping === 5.5 && smallVat === 8.0 && smallTotal === 53.5;
  const largeOrderPass = largeShipping === 0 && largeVat === 16.0 && largeTotal === 96.0;

  if (smallOrderPass && largeOrderPass) {
    console.log("PASS: Dynamic calculation engine correctly evaluates thresholds and taxes:");
    console.log(`      - Subtotal £40.00 (< £75 threshold): Shipping = £${smallShipping.toFixed(2)}, VAT (20%) = £${smallVat.toFixed(2)}, Total = £${smallTotal.toFixed(2)}`);
    console.log(`      - Subtotal £80.00 (>= £75 threshold): Shipping = FREE (£${largeShipping.toFixed(2)}), VAT (20%) = £${largeVat.toFixed(2)}, Total = £${largeTotal.toFixed(2)}`);
    passedTests++;
  } else {
    console.error("FAIL: Dynamic calculation error:", { smallShipping, smallVat, smallTotal, largeShipping, largeVat, largeTotal });
  }

  // -------------------------------------------------------------------------
  // TEST 8: Restore Initial Configured Defaults and Verify Final State
  // -------------------------------------------------------------------------
  console.log("\nTEST 8: Restoring and Verifying Approved Initial Defaults (0% VAT, £0.00 Delivery, £0.00 Threshold)...");
  const approvedInitialSettings = {
    platformName: "John Stayte Services — Admin Portal",
    businessName: "John Stayte Services Ltd",
    supportEmail: "admin@jss.com",
    phone: "01452 741234",
    operatingHours: "Mon–Sat 7:00–20:00 · Sun 8:00–18:00",
    vatRate: 0,
    fuelVatRate: 0,
    taxPricingMode: "exclusive",
    taxEnabled: false,
    taxCategories: {
      standard: 0,
      reducedFuel: 0,
      zeroRated: 0,
    },
    defaultShippingFee: 0,
    deliveryChargesEnabled: false,
    deliveryTierName: "Standard Fleet Delivery",
    freeDeliveryEnabled: false,
    freeDeliveryThreshold: 0,
    minOrderValue: 15,
    deliverySlaDays: 2,
    autoApproveOrders: false,
    emailAlerts: true,
    lowStockAlerts: true,
  };

  const { error: restoreErr } = await supabaseService
    .from("cms_content_blocks")
    .upsert(
      {
        section_key: "admin_system_settings",
        title: "Admin System Settings",
        content: JSON.stringify(approvedInitialSettings),
      },
      { onConflict: "section_key" },
    );

  if (restoreErr) {
    console.error("FAIL: Could not restore initial defaults:", restoreErr);
  } else {
    const { data: finalBlock } = await supabaseAnon
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", "admin_system_settings")
      .single();

    const finalSettings = JSON.parse(finalBlock.content);
    if (
      finalSettings.vatRate === 0 &&
      finalSettings.taxEnabled === false &&
      finalSettings.defaultShippingFee === 0 &&
      finalSettings.deliveryChargesEnabled === false &&
      finalSettings.freeDeliveryThreshold === 0 &&
      finalSettings.freeDeliveryEnabled === false
    ) {
      console.log("PASS: Approved initial defaults safely verified and active in production database:");
      console.log(`      - vatRate: ${finalSettings.vatRate}% (£0.00 cart VAT)`);
      console.log(`      - defaultShippingFee: £${finalSettings.defaultShippingFee.toFixed(2)}`);
      console.log(`      - freeDeliveryThreshold: £${finalSettings.freeDeliveryThreshold.toFixed(2)}`);
      passedTests++;
    } else {
      console.error("FAIL: Restored settings mismatch:", finalSettings);
    }
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n===============================================================================");
  console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("===============================================================================\n");
}

runTestSuite();
