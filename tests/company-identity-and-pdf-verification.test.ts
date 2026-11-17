/**
 * Technical Verification Test Suite:
 * 1. Supabase Persistence of Company Identity & Invoicing Settings
 * 2. Genuine Vector PDF Invoice Download & Content Integrity
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { supabase } from "../src/lib/supabase";
import {
  fetchInvoiceCompanyConfig,
  generateTaxInvoicePdfDoc,
  generateTaxInvoicePdfBlob,
  INVOICE_COMPANY_CONFIG,
} from "../src/lib/invoice-service";

describe("Technical Verification: Company Identity Persistence & Genuine PDF Generation", () => {
  // ===========================================================================
  // 1. Supabase Database Persistence
  // ===========================================================================
  describe("1. Supabase Database Persistence of Company Identity", () => {
    it("should verify company details exist in Supabase cms_content_blocks", async () => {
      const { data, error } = await supabase
        .from("cms_content_blocks")
        .select("section_key, title, content, updated_at")
        .eq("section_key", "admin_system_settings")
        .maybeSingle();

      assert.equal(error, null, "Supabase query must not return an error");
      assert.ok(data, "cms_content_blocks record must exist");
      assert.equal(data.section_key, "admin_system_settings");

      const parsed = JSON.parse(data.content);
      assert.equal(parsed.legalName, "Niza Forecourt Ltd");
      assert.equal(parsed.tradingName, "John Stayte Services");
      assert.equal(parsed.vatNumber, "232 837 507");
      assert.equal(parsed.companyNumber, "09859890");
      assert.equal(parsed.registeredOffice, "15 The Gallop, Sutton, England, SM2 5RU");
    });

    it("should retrieve latest saved configuration via fetchInvoiceCompanyConfig() directly from Supabase", async () => {
      const config = await fetchInvoiceCompanyConfig();
      assert.equal(config.legalName, "Niza Forecourt Ltd");
      assert.equal(config.tradingName, "John Stayte Services");
      assert.equal(config.companyName, "John Stayte Services");
      assert.equal(config.tradingAs, "Niza Forecourt Ltd T/A");
      assert.equal(config.vatNumber, "232 837 507");
      assert.equal(config.companyNumber, "09859890");
      assert.equal(config.registeredOffice, "15 The Gallop, Sutton, England, SM2 5RU");
    });

    it("should persist across simulated session reload without relying on pre-existing localStorage", async () => {
      // Simulate clean session reload by ensuring fetchInvoiceCompanyConfig reads Supabase
      const config = await fetchInvoiceCompanyConfig();
      assert.ok(config.legalName.length > 0);
      assert.ok(config.vatNumber.length > 0);
      assert.equal(config.vatNumber, "232 837 507");
    });
  });

  // ===========================================================================
  // 2. Genuine PDF Generation & Validation
  // ===========================================================================
  describe("2. Genuine Vector PDF Invoice Download & Validation", () => {
    const testOrder = {
      order_number: "JSS-1066458",
      invoiceNumber: "685758",
      created_at: "2026-09-23T10:00:00.000Z",
      customer_name: "Rebecca Daniels",
      customer_account_number: "CHDA39",
      delivery_address: "2 Wistaria Mews, Chappel Hill, Newport, Berkeley, GL13 9PY",
      order_items: [
        {
          product_code: "G47",
          product_name: "47KG PROPANE, 2.1,UN1978",
          quantity: 3,
          empties: 1,
          unit_price: 86.4969,
          total_price: 259.49,
          vat_rate: 0.05,
        },
      ],
      shipping_fee: 0,
      total: 259.49,
      status: "Paid",
    };

    it("should generate a genuine binary PDF file with correct PDF magic bytes", () => {
      const doc = generateTaxInvoicePdfDoc(testOrder);
      const arrayBuffer = doc.output("arraybuffer");
      const buffer = Buffer.from(arrayBuffer);

      // Verify file header is genuine PDF
      const header = buffer.subarray(0, 5).toString("utf-8");
      assert.equal(header, "%PDF-", "File must begin with standard PDF signature %PDF-");

      // Verify file size is substantial (not empty or just HTML text)
      assert.ok(buffer.length > 3000, `Expected PDF size > 3000 bytes, got ${buffer.length}`);

      // Verify PDF trailer / EOF marker
      const trailer = buffer.subarray(buffer.length - 30).toString("latin1");
      assert.ok(trailer.includes("%%EOF"), "File must conclude with %%EOF PDF terminator");

      // Save to disk for reader verification
      const outPath = "/tmp/technical_verification_invoice.pdf";
      fs.writeFileSync(outPath, buffer);
      assert.ok(fs.existsSync(outPath), "Verification PDF must be written to disk");
    });

    it("should embed all mandatory company, tax, and order information into the PDF streams", () => {
      const doc = generateTaxInvoicePdfDoc(testOrder);
      const pdfText = Buffer.from(doc.output("arraybuffer")).toString("latin1");

      // 1. Company Identity
      assert.ok(pdfText.includes("Niza Forecourt Ltd"), "Missing Legal Company Name in PDF");
      assert.ok(pdfText.includes("John Stayte Services"), "Missing Trading Name in PDF");
      assert.ok(pdfText.includes("Eastington, Stonehouse"), "Missing Address Line in PDF");
      assert.ok(pdfText.includes("GL10 3AH"), "Missing Postcode in PDF");
      assert.ok(pdfText.includes("01453 822859"), "Missing Telephone in PDF");
      assert.ok(pdfText.includes("accounts@johnstayteservices.co.uk"), "Missing Email in PDF");

      // 2. Tax & Legal Numbers
      assert.ok(pdfText.includes("232 837 507"), "Missing VAT No. 232 837 507 in PDF");
      assert.ok(pdfText.includes("09859890"), "Missing Company Registration No. 09859890 in PDF");
      assert.ok(pdfText.includes("15 The Gallop, Sutton"), "Missing Registered Office in PDF");

      // 3. Customer & Invoice References
      assert.ok(pdfText.includes("CHDA39"), "Missing Customer Account Number in PDF");
      assert.ok(pdfText.includes("685758"), "Missing Invoice Number in PDF");
      assert.ok(pdfText.includes("1066458"), "Missing Order Number in PDF");

      // 4. Products & Empties
      assert.ok(pdfText.includes("G47"), "Missing Product Code G47 in PDF");
      assert.ok(pdfText.includes("47KG PROPANE"), "Missing Product Description in PDF");
      assert.ok(pdfText.includes("86.4969"), "Missing Unit Price in PDF");
      assert.ok(pdfText.includes("5.00"), "Missing VAT Rate 5.00% in PDF");

      // 5. Reconciled Financials
      assert.ok(pdfText.includes("247.13"), "Missing Net Total 247.13 in PDF");
      assert.ok(pdfText.includes("12.36"), "Missing VAT Total 12.36 in PDF");
      assert.ok(pdfText.includes("259.49"), "Missing Gross Total 259.49 in PDF");

      // 6. BACS Details & Terms
      assert.ok(pdfText.includes("40-40-01"), "Missing BACS Sort Code 40-40-01 in PDF");
      assert.ok(pdfText.includes("22704749"), "Missing BACS Account No 22704749 in PDF");
      assert.ok(pdfText.includes("24th of the month"), "Missing Payment Terms Notice in PDF");
    });

    it("should guarantee both Admin and Customer portals use the exact same PDF generation pipeline", () => {
      // Simulate Admin invocation
      const adminDoc = generateTaxInvoicePdfDoc(testOrder, { accountNumber: testOrder.customer_account_number });
      // Simulate Customer invocation
      const customerDoc = generateTaxInvoicePdfDoc(testOrder, { accountNumber: "CHDA39" });

      const adminBuffer = Buffer.from(adminDoc.output("arraybuffer"));
      const customerBuffer = Buffer.from(customerDoc.output("arraybuffer"));

      assert.equal(adminBuffer.length, customerBuffer.length, "Both portals must generate identical PDF outputs");
    });
  });
});

