import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  generateTaxInvoiceHtml,
  generateTaxInvoicePdfDoc,
} from "../src/lib/invoice-service";

const sampleOrder = {
  id: "ord-logo-test",
  order_number: "JSS-994334",
  created_at: "2026-10-30T10:00:00Z",
  customer_name: "ASHLY",
  customer_account_number: "JS-A41070",
  total: 140.0,
  subtotal: 140.0,
  payment_status: "Paid",
  notes: "[Payment: Credit / Debit Card (Elavon)]",
  delivery_address: {
    street: "NAGERCOIL",
    postcode: "629165",
    payment_method: "Credit / Debit Card (Elavon)",
  },
  order_items: [
    {
      product_id: "prod-1",
      product_name: "COMPACT 800 ACOV (OPSO) - 2 PACK",
      quantity: 1,
      unit_price: 140.0,
      total_price: 140.0,
    },
  ],
};

describe("John Stayte Services Logo on All Printable Documents & PDFs", () => {
  it("embeds the original /image-5.png logo inside generated Tax Invoice PDF", () => {
    const logoPath = path.resolve(process.cwd(), "public/image-5.png");
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    const logoDataUrl = `data:image/png;base64,${logoBase64}`;

    const pdfNoLogo = generateTaxInvoicePdfDoc(sampleOrder);
    const pdfWithLogo = generateTaxInvoicePdfDoc(sampleOrder, { logoDataUrl });

    const bytesNoLogo = pdfNoLogo.output("arraybuffer").byteLength;
    const bytesWithLogo = pdfWithLogo.output("arraybuffer").byteLength;
    const pdfText = pdfWithLogo.output();

    assert.ok(bytesWithLogo > bytesNoLogo, "PDF with embedded logo should be larger than PDF without logo");
    assert.ok(pdfText.includes("/Subtype /Image"), "Generated PDF must contain embedded image XObject");
  });

  it("includes the original /image-5.png logo in HTML Print / Download Invoice while preserving VAT & BACS", () => {
    const html = generateTaxInvoiceHtml(sampleOrder);
    assert.ok(html.includes("/image-5.png"));
    assert.ok(html.includes("John Stayte Services Logo"));
    assert.ok(html.includes("VAT No. 232 837 507"));
    assert.ok(html.includes("Sort Code 40-40-01"));
  });

  it("includes the original JSS logo in Branch Daily Report and Police Incident Pack print views", () => {
    const branchReportSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branch/BranchDailyReportView.tsx"),
      "utf8",
    );
    const driveOffSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/drive-offs/DriveOffDetailSheet.tsx"),
      "utf8",
    );

    assert.ok(branchReportSrc.includes('from "@/assets/image-5.png"'));
    assert.ok(branchReportSrc.includes("print:flex"));
    assert.ok(driveOffSrc.includes('from "@/assets/image-5.png"'));
    assert.ok(driveOffSrc.includes("report-logo"));
  });
});
