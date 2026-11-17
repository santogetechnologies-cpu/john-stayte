/**
 * John Stayte Services — Upgraded Official Tax Invoice Service
 *
 * Implements UK Tax Invoice generation modeled on the client-provided reference PDF
 * ("customer invoice.pdf" for Niza Forecourt Ltd T/A John Stayte Services).
 *
 * Discrepancy & Verification Notice:
 * - Client Sample Invoice PDF specifies: VAT No. 232 837 507
 * - Legacy UI / screenshot specifies: VAT Reg No: GB 275 8841 02
 * - Website test suite specifies: GB 207 610 984 (John Stayte Services (WSM) Ltd)
 * - Bank BACS Details (Sort Code 40-40-01, Account 22704749) require client verification.
 */

import { jsPDF } from "jspdf";

export interface InvoiceCompanyConfig {
  tradingAs: string;
  companyName: string;
  legalName?: string;
  tradingName?: string;
  registeredOffice?: string;
  addressLine1: string;
  townCity: string;
  postcode: string;
  phone: string;
  email: string;
  vatNumber: string;
  legacyVatNumber: string;
  companyNumber?: string;
  bacsBankName: string;
  bacsSortCode: string;
  bacsAccountNumber: string;
  bacsAccountName: string;
  paymentTermsNotice: string;
}

export const INVOICE_COMPANY_CONFIG: InvoiceCompanyConfig = {
  tradingAs: "Niza Forecourt Ltd T/A",
  companyName: "John Stayte Services",
  legalName: "Niza Forecourt Ltd",
  tradingName: "John Stayte Services",
  registeredOffice: "15 The Gallop, Sutton, England, SM2 5RU",
  addressLine1: "Eastington, Stonehouse",
  townCity: "Gloucestershire",
  postcode: "GL10 3AH",
  phone: "01453 822859",
  email: "accounts@johnstayteservices.co.uk",
  // Primary VAT number from client sample PDF (VAT No. 232 837 507)
  // Preserved alongside legacy config to surface discrepancy for client confirmation.
  vatNumber: "232 837 507",
  legacyVatNumber: "GB 275 8841 02",
  companyNumber: "09859890", // Niza Forecourt Ltd
  // Bank BACS details from client reference PDF
  bacsBankName: "HSBC Bank",
  bacsSortCode: "40-40-01",
  bacsAccountNumber: "22704749",
  bacsAccountName: "Niza Forecourt Ltd",
  paymentTermsNotice:
    "All goods supplied are the property of John Stayte Services until payment is made in full; please ensure payment is made by the 24th of the month to prevent loss of supply. Please note our Bank details have changed, please amend any BACS payments to Niza Forecourt Ltd, HSBC Bank Sortcode 40-40-01 Account No 22704749. Please ensure you quote your JSS account No.",
};

/**
 * Returns the effective company configuration for invoices, reading saved admin settings
 * from browser storage (with fallback to default INVOICE_COMPANY_CONFIG) and applying
 * any explicit per-call overrides.
 */
export function getEffectiveInvoiceCompanyConfig(
  customOverride?: Partial<InvoiceCompanyConfig>
): InvoiceCompanyConfig {
  const base: InvoiceCompanyConfig = { ...INVOICE_COMPANY_CONFIG };

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("jss.admin_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (parsed.legalName) {
            base.legalName = parsed.legalName;
            base.tradingAs = `${parsed.legalName} T/A`;
          }
          if (parsed.tradingName) {
            base.tradingName = parsed.tradingName;
            base.companyName = parsed.tradingName;
          } else if (parsed.businessName) {
            base.companyName = parsed.businessName;
          }
          if (parsed.vatNumber) {
            base.vatNumber = String(parsed.vatNumber).trim();
          }
          if (parsed.companyNumber) {
            base.companyNumber = String(parsed.companyNumber).trim();
          }
          if (parsed.registeredOffice) {
            base.registeredOffice = String(parsed.registeredOffice).trim();
          }
          if (parsed.phone) {
            base.phone = parsed.phone;
          }
          if (parsed.supportEmail) {
            base.email = parsed.supportEmail;
          }
        }
      }
    } catch {
      // Safe fallback to base defaults
    }
  }

  return { ...base, ...(customOverride || {}) };
}

/**
 * Asynchronously loads the latest saved admin system settings from Supabase cms_content_blocks,
 * synchronizes with localStorage, and returns the effective invoice company config.
 */
export async function fetchInvoiceCompanyConfig(): Promise<InvoiceCompanyConfig> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", "admin_system_settings")
      .maybeSingle();

    if (data?.content) {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("jss.admin_settings", data.content);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("fetchInvoiceCompanyConfig fetch warning:", err);
  }

  return getEffectiveInvoiceCompanyConfig();
}

export interface InvoiceLineItem {
  productCode: string;
  description: string;
  quantity: number;
  empties: number;
  unitPriceIncVat: number;
  totalValue: number;
  vatRate: number; // e.g. 0.05 for 5%, 0.20 for 20%
  vatPercentStr: string; // e.g. "5.00" or "20.00"
  netValue: number;
  vatValue: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  customerOrderRef: string;
  yourReference: string;
  taxPointDate: string;
  dueDate: string;
  customerAccountNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddressLines: string[];
  deliveryAddressLines: string[];
  items: InvoiceLineItem[];
  totalNet: number;
  totalVat: number;
  deliveryCharges: number;
  totalGross: number;
  paymentMethod: string;
  paymentStatus: string;
  hazardNotes?: string[];
}

/**
 * Determine the applicable VAT rate for a product based on its category and name.
 * - Domestic LPG fuels (Propane, Butane, Patio Gas refills/cylinders, Autogas): 5.00% VAT (0.05)
 * - Appliances, regulators, accessories, general stock: 20.00% standard VAT (0.20)
 */
export function determineProductVatRate(item: any): number {
  if (typeof item?.vat_rate === "number" && item.vat_rate >= 0) {
    return item.vat_rate;
  }
  const name = String(item?.product_name || item?.name || "").toLowerCase();
  const slug = String(item?.product_slug || item?.slug || "").toLowerCase();
  const category = String(item?.category_slug || item?.category || "").toLowerCase();

  // Domestic LPG fuel cylinders/refills qualify for 5% reduced VAT
  const isFuel =
    name.includes("propane") ||
    name.includes("butane") ||
    name.includes("patio gas") ||
    name.includes("autogas") ||
    name.includes("lpg") ||
    name.includes("gas refill") ||
    name.includes("gas cylinder") ||
    name.includes("47kg") ||
    name.includes("19kg") ||
    name.includes("13kg") ||
    name.includes("6kg") ||
    name.includes("15kg") ||
    name.includes("7kg") ||
    name.includes("5kg") ||
    category.includes("bottled-gas") ||
    category.includes("gas");

  // Non-fuel exclusions that are always standard 20% VAT
  const isNonFuel =
    name.includes("regulator") ||
    name.includes("hose") ||
    name.includes("heater") ||
    name.includes("barbecue") ||
    name.includes("bbq") ||
    name.includes("spanner") ||
    name.includes("fitting") ||
    name.includes("pigtail") ||
    name.includes("appliance") ||
    category.includes("appliances") ||
    category.includes("garden") ||
    category.includes("dynamite-baits");

  if (isFuel && !isNonFuel) {
    return 0.05; // 5% domestic fuel rate
  }

  return 0.20; // 20% standard rate
}

/**
 * Extract or generate a clean product code / SKU matching the reference PDF style (e.g. G47, CAL-13KG).
 */
export function extractProductCode(item: any): string {
  if (item?.product_code) return String(item.product_code).toUpperCase();
  if (item?.sku) return String(item.sku).toUpperCase();
  if (item?.specs?.sku) return String(item.specs.sku).toUpperCase();
  if (item?.specs?.product_code) return String(item.specs.product_code).toUpperCase();

  const name = String(item?.product_name || item?.name || "").toUpperCase();
  if (name.includes("47KG") && name.includes("PROPANE")) return "G47";
  if (name.includes("19KG") && name.includes("PROPANE")) return "G19";
  if (name.includes("13KG") && name.includes("PROPANE")) return "G13P";
  if (name.includes("6KG") && name.includes("PROPANE")) return "G6";
  if (name.includes("13KG") && name.includes("PATIO")) return "G13PT";
  if (name.includes("5KG") && name.includes("PATIO")) return "G5PT";
  if (name.includes("15KG") && name.includes("BUTANE")) return "G15B";
  if (name.includes("7KG") && name.includes("BUTANE")) return "G7B";

  if (item?.product_id) {
    return `P-${String(item.product_id).slice(0, 6).toUpperCase()}`;
  }
  return "JSS-PROD";
}

/**
 * Formats an address string or JSON into clean uppercase lines matching the reference invoice.
 */
export function formatAddressLines(addressInput: any, customerName?: string): string[] {
  const lines: string[] = [];

  if (typeof addressInput === "string") {
    const parts = addressInput
      .split(/[,\n]+/)
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    return parts.length > 0 ? parts : ["GLOUCESTERSHIRE"];
  }

  if (addressInput && typeof addressInput === "object") {
    if (addressInput.street) lines.push(addressInput.street.toUpperCase());
    if (addressInput.line1) lines.push(addressInput.line1.toUpperCase());
    if (addressInput.line2) lines.push(addressInput.line2.toUpperCase());
    if (addressInput.city) lines.push(addressInput.city.toUpperCase());
    if (addressInput.county && addressInput.county.toUpperCase() !== addressInput.city?.toUpperCase()) {
      lines.push(addressInput.county.toUpperCase());
    }
    if (addressInput.postcode) lines.push(addressInput.postcode.toUpperCase());
  }

  if (lines.length === 0) {
    lines.push("GLOUCESTERSHIRE");
  }

  return lines;
}

/**
 * Transform an order record from Supabase / application state into authoritative invoice data.
 */
export function prepareInvoiceData(order: any, options?: { accountNumber?: string | null }): InvoiceData {
  const orderNumber = String(order.order_number || "ORDER").replace("#", "");
  const invoiceNumber =
    order.invoiceNumber ||
    order.invoice_number ||
    `INV-${orderNumber.replace("JSS-", "")}`;

  const taxPointDateObj = order.created_at ? new Date(order.created_at) : new Date();
  const taxPointDate = `${taxPointDateObj.getDate()}/${taxPointDateObj.getMonth() + 1}/${taxPointDateObj.getFullYear()}`;

  // Due Date: if paid, same as order date; if 30-day account, 30 days after
  const isPaid = order.status !== "Cancelled" && (order.status === "Paid" || order.status === "Delivered" || order.fulfillment_status === "Delivered" || order.payment_status === "Paid");
  let dueDateObj = new Date(taxPointDateObj);
  if (!isPaid) {
    dueDateObj.setDate(dueDateObj.getDate() + 30);
  }
  const dueDate = `${dueDateObj.getDate()}/${dueDateObj.getMonth() + 1}/${dueDateObj.getFullYear()}`;

  // Resolve Customer Account Number (e.g. CHDA39 or JSS-MABIO1)
  const customerAccountNumber =
    options?.accountNumber ||
    order.customer_account_number ||
    order.customer_code ||
    order.account_number ||
    (order.customer_id ? `JS-${String(order.customer_id).slice(0, 6).toUpperCase()}` : "CUST-01");

  const customerName = (order.customer_name || "Valued Customer").toUpperCase();
  const customerEmail = order.customer_email || "";
  const customerPhone = order.customer_phone || "";

  const deliveryAddressLines = formatAddressLines(order.delivery_address, customerName);
  const billingAddressLines = formatAddressLines(order.billing_address || order.delivery_address, customerName);

  // Line Items Calculation (Reconciled with VAT Inclusive pricing)
  const rawItems: any[] = order.order_items || order.items || [];
  const items: InvoiceLineItem[] = [];

  let calculatedNetSum = 0;
  let calculatedVatSum = 0;

  if (rawItems.length === 0) {
    // Single fallback line if no item details attached
    const grandTotal = Number(order.total || 0);
    const shipping = Number(order.shipping_fee || 0);
    const goodsTotalInc = Math.max(0, grandTotal - shipping);
    const vatRate = 0.05; // default domestic gas rate
    const netVal = Number((goodsTotalInc / (1 + vatRate)).toFixed(2));
    const vatVal = Number((goodsTotalInc - netVal).toFixed(2));

    items.push({
      productCode: "G47",
      description: "47KG PROPANE, 2.1,UN1978",
      quantity: 1,
      empties: 1,
      unitPriceIncVat: goodsTotalInc,
      totalValue: goodsTotalInc,
      vatRate: vatRate,
      vatPercentStr: "5.00",
      netValue: netVal,
      vatValue: vatVal,
    });
    calculatedNetSum += netVal;
    calculatedVatSum += vatVal;
  } else {
    rawItems.forEach((it: any) => {
      const qty = Number(it.quantity || 1);
      const unitPriceInc = Number(it.unit_price || 0);
      const lineTotalInc = Number(it.total_price || (unitPriceInc * qty) || 0);
      const vatRate = determineProductVatRate(it);
      const lineNet = Number((lineTotalInc / (1 + vatRate)).toFixed(2));
      const lineVat = Number((lineTotalInc - lineNet).toFixed(2));

      // Check empties returned or expected
      let emptiesCount = Number(it.empties_returned || it.empties || 0);
      if (emptiesCount === 0 && (it.is_exchange || String(it.product_name || "").toLowerCase().includes("refill") || String(it.product_name || "").toLowerCase().includes("exchange"))) {
        emptiesCount = qty;
      }

      items.push({
        productCode: extractProductCode(it),
        description: (it.product_name || "LPG Supply & Cylinder Refill").toUpperCase(),
        quantity: qty,
        empties: emptiesCount,
        unitPriceIncVat: unitPriceInc,
        totalValue: lineTotalInc,
        vatRate: vatRate,
        vatPercentStr: (vatRate * 100).toFixed(2),
        netValue: lineNet,
        vatValue: lineVat,
      });

      calculatedNetSum += lineNet;
      calculatedVatSum += lineVat;
    });
  }

  const deliveryCharges = Number(order.shipping_fee || 0);
  const totalGross = Number(order.total || (calculatedNetSum + calculatedVatSum + deliveryCharges));
  
  // Reconcile Total Net + Total VAT + Delivery = Total Gross to exact penny
  const totalNet = Number(calculatedNetSum.toFixed(2));
  const totalVat = Number((totalGross - totalNet - deliveryCharges).toFixed(2));

  // Hazard / Dangerous goods info for LPG
  const hazardNotes: string[] = [];
  const hasGas = items.some((i) => i.vatRate === 0.05 || i.description.includes("PROPANE") || i.description.includes("BUTANE"));
  if (hasGas) {
    hazardNotes.push("Hazard Weight: 0 Kg (UN1978 / UN1965 Flammable Gas Class 2)");
  }
  const paymentMethod = String(order.payment_method || (order.notes?.includes("BACS") ? "BACS" : "Card")).toUpperCase();
  hazardNotes.push(`PAYING BY ${paymentMethod === "BACS" ? "BACS" : paymentMethod}`);

  const emptiesTotal = items.reduce((sum, i) => sum + i.empties, 0);
  if (emptiesTotal > 0) {
    hazardNotes.push(`${emptiesTotal} MT'S (EMPTIES) COLLECTED / RETURNED`);
  }

  return {
    invoiceNumber,
    orderNumber,
    customerOrderRef: orderNumber,
    yourReference: order.notes?.match(/\[PO:\s*([^\]]+)\]/)?.[1] || orderNumber,
    taxPointDate,
    dueDate,
    customerAccountNumber,
    customerName,
    customerEmail,
    customerPhone,
    billingAddressLines,
    deliveryAddressLines,
    items,
    totalNet,
    totalVat,
    deliveryCharges,
    totalGross,
    paymentMethod,
    paymentStatus: isPaid ? "Paid & Issued" : "Payment Due",
    hazardNotes,
  };
}

/**
 * Generate a complete, self-contained HTML Tax Invoice document matching the client reference PDF layout.
 */
export function generateTaxInvoiceHtml(order: any, options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }): string {
  // Preserve historical invoice snapshots if present on the order
  const snapshotConfig =
    order?.invoice_snapshot?.company ||
    order?.metadata?.invoice_company_config ||
    order?.invoice_details?.company;
  const baseConfig = snapshotConfig
    ? { ...INVOICE_COMPANY_CONFIG, ...snapshotConfig }
    : getEffectiveInvoiceCompanyConfig();
  const cfg: InvoiceCompanyConfig = { ...baseConfig, ...(options?.config || {}) };
  if (options?.config?.tradingName && !options?.config?.companyName) {
    cfg.companyName = options.config.tradingName;
  }
  if (options?.config?.legalName && !options?.config?.tradingAs) {
    cfg.tradingAs = `${options.config.legalName} T/A`;
  }
  const inv = prepareInvoiceData(order, { accountNumber: options?.accountNumber });

  const itemsRowsHtml = inv.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: bold;">${item.productCode}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${item.description}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${item.empties || "—"}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">${item.unitPriceIncVat.toFixed(4)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; font-weight: bold;">${item.totalValue.toFixed(2)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">${item.vatPercentStr}</td>
      </tr>
    `,
    )
    .join("");

  const hazardNotesHtml = (inv.hazardNotes || [])
    .map((note) => `<div style="font-size: 10px; color: #334155; font-weight: 600; line-height: 1.4;">${note}</div>`)
    .join("");

  const billingLinesHtml = inv.billingAddressLines.map((l) => `<div>${l}</div>`).join("");
  const deliveryLinesHtml = inv.deliveryAddressLines.map((l) => `<div>${l}</div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice ${inv.invoiceNumber} — ${cfg.companyName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px;
      font-size: 11px;
      line-height: 1.35;
    }
    .invoice-sheet {
      max-width: 210mm;
      min-height: 275mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px 30px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
      position: relative;
    }
    .action-bar {
      max-width: 210mm;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
    }
    .btn {
      background: #e31b23;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .btn-secondary {
      background: #334155;
    }
    .header-center {
      text-align: center;
      margin-bottom: 18px;
    }
    .trading-name {
      color: #dc2626;
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 2px 0;
    }
    .company-name {
      color: #e31b23;
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
      font-family: Georgia, serif;
    }
    .header-address {
      color: #dc2626;
      font-size: 13px;
      font-weight: 600;
      margin: 3px 0 0 0;
    }
    .header-contact {
      color: #dc2626;
      font-size: 13px;
      font-weight: 600;
      margin: 2px 0 0 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.1fr 1.1fr 1.4fr;
      gap: 16px;
      margin-top: 14px;
      margin-bottom: 16px;
      align-items: start;
    }
    .address-card {
      font-size: 11px;
      line-height: 1.35;
    }
    .address-title {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .invoice-info-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
    }
    .invoice-info-header {
      background: #cbd5e1;
      padding: 6px 12px;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-align: center;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .info-table td {
      padding: 4px 10px;
    }
    .info-label {
      font-weight: 800;
      color: #1e293b;
      width: 45%;
    }
    .info-val {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      border: 1px solid #cbd5e1;
    }
    .items-table th {
      background: #cbd5e1;
      color: #0f172a;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 800;
      border-bottom: 1px solid #94a3b8;
    }
    .page-indicator {
      text-align: right;
      font-size: 10px;
      color: #475569;
      font-weight: bold;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .totals-wrapper {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      align-items: start;
    }
    .hazard-box {
      padding: 4px 0;
    }
    .bacs-and-totals {
      margin-left: auto;
      width: 100%;
      max-width: 280px;
    }
    .bacs-header {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .totals-box {
      border: 1px solid #0f172a;
      padding: 8px 12px;
      background: #ffffff;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 0;
      color: #0f172a;
    }
    .gross-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
      padding-top: 6px;
      margin-top: 6px;
      border-top: 1px solid #cbd5e1;
    }
    .vat-number-line {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    .legal-notice {
      color: #dc2626;
      font-size: 9.5px;
      font-weight: 700;
      line-height: 1.35;
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .invoice-sheet {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
        min-height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div style="font-weight: bold; font-size: 13px;">Official Tax Invoice: #${inv.invoiceNumber}</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-secondary" onclick="window.print()">
        🖨️ Print Invoice (A4)
      </button>
      <button class="btn" onclick="saveAsHtml()">
        ⬇️ Download File
      </button>
    </div>
  </div>

  <div class="invoice-sheet" id="invoice">
    <!-- Header -->
    <div class="header-center">
      <div class="trading-name">${cfg.tradingAs}</div>
      <div class="company-name">${cfg.companyName}</div>
      <div class="header-address">${cfg.addressLine1}, ${cfg.townCity}, ${cfg.postcode}</div>
      <div class="header-contact">Tel: ${cfg.phone} Email: ${cfg.email}</div>
    </div>

    <!-- Meta Grid -->
    <div class="meta-grid">
      <!-- Invoice To -->
      <div class="address-card">
        <div class="address-title">Invoice To : ${inv.customerAccountNumber}</div>
        <div style="font-weight: 800; margin-bottom: 2px;">${inv.customerName}</div>
        ${billingLinesHtml}
      </div>

      <!-- Supplied To -->
      <div class="address-card">
        <div class="address-title">Supplied to: ${inv.customerAccountNumber}</div>
        <div style="font-weight: 800; margin-bottom: 2px;">${inv.customerName}</div>
        ${deliveryLinesHtml}
      </div>

      <!-- Invoice Details Box -->
      <div class="invoice-info-box">
        <div class="invoice-info-header">Invoice ${inv.invoiceNumber}</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Tax Point/Date</td>
            <td class="info-val">${inv.taxPointDate}</td>
          </tr>
          <tr>
            <td class="info-label">Our Order Ref</td>
            <td class="info-val">${inv.customerOrderRef}</td>
          </tr>
          <tr>
            <td class="info-label">Due Date</td>
            <td class="info-val">${inv.dueDate}</td>
          </tr>
          <tr>
            <td class="info-label">Your Reference</td>
            <td class="info-val">${inv.yourReference}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Page Indicator -->
    <div class="page-indicator">Page 1</div>

    <!-- Products Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 14%;">Product</th>
          <th style="text-align: left; width: 40%;">Description</th>
          <th style="text-align: center; width: 7%;">Qty</th>
          <th style="text-align: center; width: 9%;">Empties</th>
          <th style="text-align: right; width: 12%;">Price Inc</th>
          <th style="text-align: right; width: 10%;">Value</th>
          <th style="text-align: right; width: 8%;">Vat %</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
    </table>

    <!-- Totals and BACS details -->
    <div class="totals-wrapper">
      <div class="hazard-box">
        ${hazardNotesHtml}
      </div>

      <div class="bacs-and-totals">
        <div class="bacs-header">
          Bacs Details : Sort Code ${cfg.bacsSortCode}<br>
          Account Number ${cfg.bacsAccountNumber}
        </div>

        <div class="totals-box">
          <div class="totals-row">
            <span>Total Net</span>
            <span>${inv.totalNet.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Total VAT</span>
            <span>${inv.totalVat.toFixed(2)}</span>
          </div>
          ${
            inv.deliveryCharges > 0
              ? `
          <div class="totals-row">
            <span>Delivery Charges</span>
            <span>${inv.deliveryCharges.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          <div class="gross-row">
            <span>Total Gross</span>
            <span>${inv.totalGross.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- VAT Registration Line -->
    <div class="vat-number-line">
      VAT No. ${cfg.vatNumber}
    </div>

    <!-- Legal Payment Notice -->
    <div class="legal-notice">
      ${cfg.paymentTermsNotice}
      ${
        cfg.companyNumber || cfg.registeredOffice
          ? `<div style="margin-top: 6px; font-size: 8.5px; color: #475569; font-weight: normal; line-height: 1.4;">
              ${(cfg.legalName || cfg.tradingAs || "Niza Forecourt Ltd").replace(/\s+T\/A$/, "")} · Registered in England & Wales No. ${cfg.companyNumber || "09859890"} · Registered Office: ${cfg.registeredOffice || "15 The Gallop, Sutton, England, SM2 5RU"}
            </div>`
          : ""
      }
    </div>
  </div>

  <script>
    function saveAsHtml() {
      const clone = document.documentElement.cloneNode(true);
      const action = clone.querySelector('.action-bar');
      if (action) action.remove();
      const blob = new Blob([clone.outerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Tax_Invoice_${inv.invoiceNumber}.html';
      a.click();
    }
  </script>
</body>
</html>`;
}

/**
 * Generates an authentic, crisp vector PDF document using jsPDF matching the client-approved reference invoice layout.
 */
export function generateTaxInvoicePdfDoc(
  order: any,
  options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }
): jsPDF {
  const snapshotConfig =
    order?.invoice_snapshot?.company ||
    order?.metadata?.invoice_company_config ||
    order?.invoice_details?.company;
  const baseConfig = snapshotConfig
    ? { ...INVOICE_COMPANY_CONFIG, ...snapshotConfig }
    : getEffectiveInvoiceCompanyConfig();
  const cfg: InvoiceCompanyConfig = { ...baseConfig, ...(options?.config || {}) };
  if (options?.config?.tradingName && !options?.config?.companyName) {
    cfg.companyName = options.config.tradingName;
  }
  if (options?.config?.legalName && !options?.config?.tradingAs) {
    cfg.tradingAs = `${options.config.legalName} T/A`;
  }
  const inv = prepareInvoiceData(order, { accountNumber: options?.accountNumber });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // 1. Header (Centered Red & Slate Official Branding)
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(cfg.tradingAs || "Niza Forecourt Ltd T/A", 105, 14, { align: "center" });

  doc.setTextColor(227, 27, 35);
  doc.setFontSize(22);
  doc.text(cfg.companyName || "John Stayte Services", 105, 22, { align: "center" });

  doc.setTextColor(220, 38, 38);
  doc.setFontSize(8.5);
  doc.text(`${cfg.addressLine1}, ${cfg.townCity}, ${cfg.postcode}`, 105, 27, { align: "center" });
  doc.text(`Tel: ${cfg.phone} Email: ${cfg.email}`, 105, 31, { align: "center" });

  // 2. Meta Grid (3 Cards / Columns)
  const metaY = 38;
  const colW1 = 54;
  const colW2 = 54;
  const colW3 = 68;

  // Col 1: Invoice To
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Invoice To : ${inv.customerAccountNumber}`, marginX, metaY);
  doc.setFontSize(8);
  doc.text(inv.customerName, marginX, metaY + 4.5);
  doc.setFont("helvetica", "normal");
  let addr1Y = metaY + 8.5;
  inv.billingAddressLines.forEach((l) => {
    doc.text(l, marginX, addr1Y);
    addr1Y += 3.8;
  });

  // Col 2: Supplied to
  const col2X = marginX + colW1 + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Supplied to: ${inv.customerAccountNumber}`, col2X, metaY);
  doc.setFontSize(8);
  doc.text(inv.customerName, col2X, metaY + 4.5);
  doc.setFont("helvetica", "normal");
  let addr2Y = metaY + 8.5;
  inv.deliveryAddressLines.forEach((l) => {
    doc.text(l, col2X, addr2Y);
    addr2Y += 3.8;
  });

  // Col 3: Invoice Info Box
  const col3X = marginX + colW1 + colW2 + 6;
  const boxH = 26;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(col3X, metaY - 3, colW3, boxH, "FD");

  // Box Header
  doc.setFillColor(203, 213, 225);
  doc.rect(col3X, metaY - 3, colW3, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice ${inv.invoiceNumber}`, col3X + colW3 / 2, metaY + 1.2, { align: "center" });

  // Box rows
  const rowStartX = col3X + 2.5;
  const rowValX = col3X + colW3 - 2.5;
  doc.setFontSize(7.5);
  const infoRows = [
    ["Tax Point/Date", inv.taxPointDate],
    ["Our Order Ref", inv.customerOrderRef],
    ["Your Reference", inv.yourReference],
    ["Due Date", inv.dueDate],
  ];
  let currentInfoY = metaY + 7.5;
  infoRows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(lbl, rowStartX, currentInfoY);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), rowValX, currentInfoY, { align: "right" });
    currentInfoY += 4.5;
  });

  // 3. Line Items Table
  const maxMetaY = Math.max(addr1Y, addr2Y, currentInfoY);
  const tableY = Math.max(68, maxMetaY + 3);
  doc.setFillColor(203, 213, 225);
  doc.rect(marginX, tableY, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  doc.text("Product", marginX + 2, tableY + 4.2);
  doc.text("Description", marginX + 22, tableY + 4.2);
  doc.text("Qty", marginX + 92, tableY + 4.2, { align: "center" });
  doc.text("Empties", marginX + 107, tableY + 4.2, { align: "center" });
  doc.text("Price Inc", marginX + 130, tableY + 4.2, { align: "right" });
  doc.text("Value", marginX + 154, tableY + 4.2, { align: "right" });
  doc.text("Vat %", marginX + contentWidth - 2, tableY + 4.2, { align: "right" });

  let rowY = tableY + 6;
  inv.items.forEach((it) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(it.productCode, marginX + 2, rowY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(it.description, marginX + 22, rowY + 4.5);
    doc.text(String(it.quantity), marginX + 92, rowY + 4.5, { align: "center" });
    doc.text(it.empties ? String(it.empties) : "—", marginX + 107, rowY + 4.5, { align: "center" });
    doc.text(it.unitPriceIncVat.toFixed(4), marginX + 130, rowY + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(it.totalValue.toFixed(2), marginX + 154, rowY + 4.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(it.vatPercentStr, marginX + contentWidth - 2, rowY + 4.5, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, rowY + 6.5, marginX + contentWidth, rowY + 6.5);
    rowY += 7;
  });

  // Page indicator
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Page 1 of 1", marginX + contentWidth, rowY + 4, { align: "right" });

  // 4. Totals & BACS / Hazard Notes
  const totalsY = rowY + 8;

  // Left: Hazard notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  let hazardY = totalsY;
  (inv.hazardNotes || []).forEach((note) => {
    doc.text(note, marginX, hazardY);
    hazardY += 4.5;
  });

  // Right: Totals Box & BACS
  const totBoxW = 68;
  const totBoxX = marginX + contentWidth - totBoxW;
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Bacs Details : Sort Code ${cfg.bacsSortCode}\nAccount Number ${cfg.bacsAccountNumber}`,
    totBoxX,
    totalsY - 2
  );

  const hasDelivery = inv.deliveryCharges > 0;
  const totBoxH = hasDelivery ? 26 : 22;
  doc.setDrawColor(15, 23, 42);
  doc.rect(totBoxX, totalsY + 6, totBoxW, totBoxH);

  let totRowY = totalsY + 10.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Total Net", totBoxX + 3, totRowY);
  doc.text(inv.totalNet.toFixed(2), totBoxX + totBoxW - 3, totRowY, { align: "right" });
  totRowY += 4.5;

  doc.text("Total VAT", totBoxX + 3, totRowY);
  doc.text(inv.totalVat.toFixed(2), totBoxX + totBoxW - 3, totRowY, { align: "right" });
  totRowY += 4.5;

  if (hasDelivery) {
    doc.text("Delivery Charges", totBoxX + 3, totRowY);
    doc.text(inv.deliveryCharges.toFixed(2), totBoxX + totBoxW - 3, totRowY, { align: "right" });
    totRowY += 4.5;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(totBoxX + 2, totRowY - 1, totBoxX + totBoxW - 2, totRowY - 1);

  doc.setFontSize(9.5);
  doc.text("Total Gross", totBoxX + 3, totRowY + 3.5);
  doc.text(inv.totalGross.toFixed(2), totBoxX + totBoxW - 3, totRowY + 3.5, { align: "right" });

  // 5. VAT Registration Line
  const vatY = Math.max(hazardY, totalsY + totBoxH + 8) + 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`VAT No. ${cfg.vatNumber}`, marginX, vatY);

  // 6. Payment Terms Notice (Centered red notice)
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  const splitTerms = doc.splitTextToSize(cfg.paymentTermsNotice, contentWidth);
  doc.text(splitTerms, 105, vatY + 6, { align: "center" });

  // 7. Statutory Footer (Companies Act 2006 compliance)
  const footerLegal = `${(cfg.legalName || cfg.tradingAs || "Niza Forecourt Ltd").replace(/\s+T\/A$/, "")} · Registered in England & Wales No. ${cfg.companyNumber || "09859890"} · Registered Office: ${cfg.registeredOffice || "15 The Gallop, Sutton, England, SM2 5RU"}`;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(footerLegal, 105, vatY + 16, { align: "center" });

  return doc;
}

/**
 * Returns a genuine application/pdf Blob of the official tax invoice.
 */
export function generateTaxInvoicePdfBlob(
  order: any,
  options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }
): Blob {
  const doc = generateTaxInvoicePdfDoc(order, options);
  const arrayBuffer = doc.output("arraybuffer");
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

/**
 * Downloads a genuine .pdf Tax Invoice file directly to the user's browser,
 * automatically fetching the latest saved company identity and VAT details from Supabase.
 */
export async function downloadTaxInvoice(
  order: any,
  options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }
): Promise<void> {
  let effectiveConfig = options?.config;
  if (!effectiveConfig) {
    try {
      effectiveConfig = await fetchInvoiceCompanyConfig();
    } catch {
      effectiveConfig = getEffectiveInvoiceCompanyConfig();
    }
  }

  const inv = prepareInvoiceData(order, { accountNumber: options?.accountNumber });
  const doc = generateTaxInvoicePdfDoc(order, { ...options, config: effectiveConfig });

  if (typeof window !== "undefined") {
    // Generate true binary PDF blob and trigger browser download
    const blob = new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tax_Invoice_${inv.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Optional utility to download the raw HTML version of the invoice.
 */
export function downloadTaxInvoiceHtml(
  order: any,
  options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }
): void {
  const inv = prepareInvoiceData(order, { accountNumber: options?.accountNumber });
  const html = generateTaxInvoiceHtml(order, options);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tax_Invoice_${inv.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens the invoice in a new printable window or triggers print.
 */
export function printTaxInvoice(order: any, options?: { accountNumber?: string | null; config?: Partial<InvoiceCompanyConfig> }): void {
  const html = generateTaxInvoiceHtml(order, options);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-focus window
    printWindow.focus();
  }
}
