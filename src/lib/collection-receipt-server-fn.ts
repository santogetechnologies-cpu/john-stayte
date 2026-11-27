import fs from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getCollectionReceiptSenderAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) {
    if (configured.includes("<") && configured.includes(">")) {
      return configured;
    }
    return `John Stayte Services <${configured}>`;
  }
  return "John Stayte Services <noreply@johnstayteservices.co.uk>";
}

/**
 * Loads the official John Stayte Services logo (public/image-5.png) as a PNG Data URL
 * on the server, returning null gracefully if unavailable.
 */
export function loadServerJssLogoDataUrl(logoPath?: string): string | null {
  try {
    const resolvedPath = logoPath || path.resolve(process.cwd(), "public", "image-5.png");
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }
    const buf = fs.readFileSync(resolvedPath);
    if (!buf || buf.length === 0) {
      return null;
    }
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export interface CollectionReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CollectionReceiptCylinderReturn {
  cylinderName: string;
  expectedQuantity: number;
  returnedQuantity: number;
}

export interface CollectionReceiptShortReturnAssessment {
  unmatchedQuantity: number;
  assessedFee: number;
  status: string;
}

export interface CollectionReceiptPdfInput {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  collectionBranch: string;
  collectedAtIso: string;
  staffName?: string | null;
  items: CollectionReceiptItem[];
  cylinderReturns: CollectionReceiptCylinderReturn[];
  shortReturnAssessment?: CollectionReceiptShortReturnAssessment | null;
  originalOrderTotal: number;
  paymentStatus: string;
  paymentMethod: string;
  logoDataUrl?: string | null;
}

export interface GeneratedCollectionReceiptPdf {
  filename: string;
  base64: string;
  byteLength: number;
}

function sanitizeFilenameOrderNumber(orderNumber: string): string {
  return (orderNumber || "ORDER").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatGbp(amount: number): string {
  return `£${(Number(amount) || 0).toFixed(2)}`;
}

function formatCollectionTimestamp(iso: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  });
}

function formatAssessmentStatusLabel(status: string): string {
  const norm = String(status || "").toLowerCase();
  if (norm === "paid") return "Paid";
  if (norm === "waived") return "Waived";
  if (norm === "payment_required") return "Assessed — Payment Required (Unpaid)";
  if (norm === "assessed") return "Assessed (Unpaid)";
  return "None";
}

/**
 * Generates a branded John Stayte Services Click & Collect Receipt PDF using jsPDF.
 */
export function generateCollectionReceiptPdf(
  input: CollectionReceiptPdfInput,
): GeneratedCollectionReceiptPdf {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const safeOrderRef = sanitizeFilenameOrderNumber(input.orderNumber);
  const filename = `JSS_Collection_Receipt_${safeOrderRef}.pdf`;

  // 1. Header with official JSS branding & logo
  const logoDataUrl =
    input.logoDataUrl !== undefined ? input.logoDataUrl : loadServerJssLogoDataUrl();
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, 11, 20, 20);
    } catch {
      /* continue cleanly if image decode fails */
    }
  }

  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Niza Forecourt Ltd T/A", 105, 14, { align: "center" });

  doc.setTextColor(227, 27, 35);
  doc.setFontSize(20);
  doc.text("John Stayte Services", 105, 22, { align: "center" });

  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Eastington, Stonehouse, Gloucestershire, GL10 3AH", 105, 27, { align: "center" });
  doc.text("Tel: 01452 741234   Email: admin@jss.com   VAT No. 232 837 507", 105, 31.5, {
    align: "center",
  });

  // Title banner
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, 37, contentWidth, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLICK & COLLECT RECEIPT", marginX + 4, 43);
  doc.setFontSize(9);
  doc.text(`Order Ref: ${input.orderNumber}`, pageWidth - marginX - 4, 43, { align: "right" });

  // 2. Customer & Collection Details Box
  let y = 52;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, contentWidth, 28, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Customer Details", marginX + 4, y + 6);
  doc.text("Collection Details", marginX + 94, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Name: ${input.customerName || "Customer"}`, marginX + 4, y + 12);
  doc.text(`Email: ${input.customerEmail || "N/A"}`, marginX + 4, y + 17.5);
  doc.text(`Order Ref: ${input.orderNumber}`, marginX + 4, y + 23);

  doc.text(`Branch: ${input.collectionBranch || "Forecourt Branch"}`, marginX + 94, y + 12);
  doc.text(`Collected: ${formatCollectionTimestamp(input.collectedAtIso)}`, marginX + 94, y + 17.5);
  doc.text(`Staff: ${input.staffName || "Branch Staff"}`, marginX + 94, y + 23);

  // 3. Collected Products Table
  y += 35;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Collected Products", marginX, y);
  y += 3;

  doc.setFillColor(226, 232, 240);
  doc.rect(marginX, y, contentWidth, 7, "F");
  doc.setFontSize(8);
  doc.text("Product", marginX + 3, y + 4.8);
  doc.text("Qty", marginX + 115, y + 4.8, { align: "right" });
  doc.text("Unit Price", marginX + 145, y + 4.8, { align: "right" });
  doc.text("Line Total", pageWidth - marginX - 3, y + 4.8, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  const safeItems = input.items.length > 0 ? input.items : [];
  for (const item of safeItems) {
    doc.text(String(item.productName || "Gas Cylinder").slice(0, 58), marginX + 3, y + 5);
    doc.text(String(item.quantity), marginX + 115, y + 5, { align: "right" });
    doc.text(formatGbp(item.unitPrice), marginX + 145, y + 5, { align: "right" });
    doc.text(formatGbp(item.totalPrice), pageWidth - marginX - 3, y + 5, { align: "right" });
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y + 7, pageWidth - marginX, y + 7);
    y += 7;
  }

  // 4. Empty Cylinders Returned Table
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Empty Cylinders Returned", marginX, y);
  y += 3;

  doc.setFillColor(226, 232, 240);
  doc.rect(marginX, y, contentWidth, 7, "F");
  doc.setFontSize(8);
  doc.text("Cylinder Type", marginX + 3, y + 4.8);
  doc.text("Expected Qty", marginX + 135, y + 4.8, { align: "right" });
  doc.text("Actual Returned", pageWidth - marginX - 3, y + 4.8, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  if (input.cylinderReturns.length === 0) {
    doc.text("No empty cylinder exchange required for this order.", marginX + 3, y + 5);
    y += 7;
  } else {
    for (const ret of input.cylinderReturns) {
      doc.text(String(ret.cylinderName || "Gas Cylinder").slice(0, 62), marginX + 3, y + 5);
      doc.text(String(ret.expectedQuantity), marginX + 135, y + 5, { align: "right" });
      doc.text(String(ret.returnedQuantity), pageWidth - marginX - 3, y + 5, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y + 7, pageWidth - marginX, y + 7);
      y += 7;
    }
  }

  // 5. Short-Return Assessment (if present)
  if (input.shortReturnAssessment && input.shortReturnAssessment.unmatchedQuantity > 0) {
    y += 7;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(252, 211, 77);
    doc.rect(marginX, y, contentWidth, 20, "FD");
    doc.setTextColor(120, 53, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Short-Return Assessment (Separate from Original Order Payment)", marginX + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Unmatched Cylinders: ${input.shortReturnAssessment.unmatchedQuantity}   |   Assessed Fee: ${formatGbp(input.shortReturnAssessment.assessedFee)}`,
      marginX + 4,
      y + 12,
    );
    doc.text(
      `Assessment Status: ${formatAssessmentStatusLabel(input.shortReturnAssessment.status)}`,
      marginX + 4,
      y + 17.5,
    );
    y += 23;
  }

  // 6. Verified Payment Summary
  y += 7;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, contentWidth, 20, "FD");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Verified Order Payment Summary", marginX + 4, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Original Order Total: ${formatGbp(input.originalOrderTotal)}   |   Payment Status: ${input.paymentStatus || "Pending"}`,
    marginX + 4,
    y + 12.5,
  );
  doc.text(`Payment Method: ${input.paymentMethod || "Verified Order Payment"}`, marginX + 4, y + 17.5);

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(
    "Thank you for collecting with John Stayte Services. Please retain this receipt for your records.",
    105,
    282,
    { align: "center" },
  );

  const arrayBuffer = doc.output("arraybuffer");
  const buf = Buffer.from(arrayBuffer);
  return {
    filename,
    base64: buf.toString("base64"),
    byteLength: buf.length,
  };
}

export function buildCollectionReceiptEmailHtml(input: CollectionReceiptPdfInput): string {
  const itemsHtml = input.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${i.productName}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${i.quantity}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatGbp(i.totalPrice)}</td>
        </tr>`,
    )
    .join("");

  const returnsHtml =
    input.cylinderReturns.length > 0
      ? input.cylinderReturns
          .map(
            (r) =>
              `<tr>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${r.cylinderName}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${r.expectedQuantity}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${r.returnedQuantity}</td>
              </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="padding:8px 10px;color:#64748b;">No empty cylinder exchange required.</td></tr>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <div style="background:#b91c1c;color:#ffffff;padding:20px 24px;">
      <div style="font-size:12px;opacity:0.9;">Niza Forecourt Ltd T/A</div>
      <div style="font-size:22px;font-weight:bold;margin-top:2px;">John Stayte Services</div>
      <div style="font-size:13px;margin-top:6px;">Click &amp; Collect Handover Confirmation</div>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;">Dear ${input.customerName || "Customer"},</p>
      <p style="margin:0 0 16px;">Thank you for collecting your order with <strong>John Stayte Services</strong>. Your Click &amp; Collect order <strong>${input.orderNumber}</strong> has been handed over.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;">
        <div><strong>Order Reference:</strong> ${input.orderNumber}</div>
        <div><strong>Collection Branch:</strong> ${input.collectionBranch}</div>
        <div><strong>Collection Date &amp; Time:</strong> ${formatCollectionTimestamp(input.collectedAtIso)}</div>
      </div>

      <h3 style="font-size:14px;margin:0 0 8px;">Collected Cylinders &amp; Products</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:8px 10px;">Product</th>
            <th style="padding:8px 10px;text-align:right;">Qty</th>
            <th style="padding:8px 10px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <h3 style="font-size:14px;margin:0 0 8px;">Empty Cylinders Returned</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:8px 10px;">Cylinder Type</th>
            <th style="padding:8px 10px;text-align:right;">Expected</th>
            <th style="padding:8px 10px;text-align:right;">Returned</th>
          </tr>
        </thead>
        <tbody>${returnsHtml}</tbody>
      </table>

      <p style="margin:0 0 12px;font-size:13px;">Your official PDF collection receipt (<strong>JSS_Collection_Receipt_${sanitizeFilenameOrderNumber(input.orderNumber)}.pdf</strong>) is attached to this email.</p>
      <p style="margin:0;font-size:13px;color:#475569;">Thank you for choosing John Stayte Services.</p>
    </div>
  </div>`;
}

export function buildCollectionReceiptEmailText(input: CollectionReceiptPdfInput): string {
  const itemLines = input.items
    .map((i) => `- ${i.quantity}x ${i.productName} (${formatGbp(i.totalPrice)})`)
    .join("\n");
  const returnLines =
    input.cylinderReturns.length > 0
      ? input.cylinderReturns
          .map((r) => `- ${r.cylinderName}: returned ${r.returnedQuantity} of ${r.expectedQuantity} expected`)
          .join("\n")
      : "- No empty cylinder exchange required.";

  return [
    `Dear ${input.customerName || "Customer"},`,
    "",
    `Thank you for collecting your order with John Stayte Services.`,
    `Order Reference: ${input.orderNumber}`,
    `Collection Branch: ${input.collectionBranch}`,
    `Collection Date & Time: ${formatCollectionTimestamp(input.collectedAtIso)}`,
    "",
    "Collected Products:",
    itemLines || "- Gas Cylinder Order",
    "",
    "Empty Cylinders Returned:",
    returnLines,
    "",
    `Your official PDF collection receipt (JSS_Collection_Receipt_${sanitizeFilenameOrderNumber(input.orderNumber)}.pdf) is attached.`,
    "",
    "Thank you,",
    "John Stayte Services",
  ].join("\n");
}

export interface DispatchReceiptResult {
  ok: boolean;
  alreadySent?: boolean;
  skipped?: boolean;
  emailId?: string | null;
  error?: string;
}

/**
 * Atomically claims receipt dispatch for a Delivered order, generates the PDF receipt,
 * sends the Thank-you email via Resend with PDF attachment, and records outcome.
 * Never throws; email failure never rolls back handover.
 */
const RECEIPT_DISPATCH_LEASE_PREFIX = "__SENDING__:";
const RECEIPT_DISPATCH_LEASE_MS = 120_000;

function parseSendingLeaseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.startsWith(RECEIPT_DISPATCH_LEASE_PREFIX)) {
    return null;
  }
  const ts = Number(value.slice(RECEIPT_DISPATCH_LEASE_PREFIX.length));
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

export async function dispatchCollectionReceiptEmail(
  supabaseAdmin: any,
  params: {
    orderId: string;
    staffId?: string | null;
    fetchFn?: typeof fetch;
    resendApiKey?: string;
    logoDataUrl?: string | null;
    nowMs?: number;
  },
): Promise<DispatchReceiptResult> {
  const orderId = String(params.orderId || "").trim();
  if (!orderId) {
    return { ok: false, error: "Order ID is required." };
  }

  try {
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, total, payment_status, status, assigned_depot, delivery_address, updated_at, receipt_email_sent_at, receipt_email_id, receipt_email_error, receipt_email_attempts",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return { ok: false, error: orderErr?.message || "Order not found." };
    }

    if (String(orderRow.status || "").trim() !== "Delivered") {
      return {
        ok: false,
        skipped: true,
        error: "Receipt email can only be sent after order status is Delivered.",
      };
    }

    if (orderRow.receipt_email_sent_at) {
      return {
        ok: true,
        alreadySent: true,
        emailId: orderRow.receipt_email_id || null,
      };
    }

    const nowMs = typeof params.nowMs === "number" ? params.nowMs : Date.now();
    const existingError = orderRow.receipt_email_error;
    const activeLeaseTs = parseSendingLeaseTimestamp(existingError);
    if (activeLeaseTs !== null && nowMs - activeLeaseTs < RECEIPT_DISPATCH_LEASE_MS) {
      return {
        ok: true,
        skipped: true,
        error: "Receipt email dispatch already in progress.",
      };
    }

    // Atomically claim or reclaim stale dispatch lease via compare-and-set
    const nextAttempts = Number(orderRow.receipt_email_attempts || 0) + 1;
    const leaseToken = `${RECEIPT_DISPATCH_LEASE_PREFIX}${nowMs}`;
    let claimQuery = supabaseAdmin
      .from("orders")
      .update({
        receipt_email_attempts: nextAttempts,
        receipt_email_error: leaseToken,
      })
      .eq("id", orderId)
      .eq("status", "Delivered")
      .is("receipt_email_sent_at", null);

    if (existingError === null || existingError === undefined) {
      claimQuery = claimQuery.is("receipt_email_error", null);
    } else {
      claimQuery = claimQuery.eq("receipt_email_error", existingError);
    }

    const { data: claimedRow, error: claimErr } = await claimQuery
      .select("id")
      .maybeSingle();

    if (claimErr) {
      return { ok: false, error: `Failed to claim receipt email lock: ${claimErr.message}` };
    }

    if (!claimedRow) {
      return {
        ok: true,
        skipped: true,
        error: "Receipt email already sent or currently being dispatched by another request.",
      };
    }

    const recordFailure = async (message: string) => {
      await supabaseAdmin
        .from("orders")
        .update({
          receipt_email_error: message.slice(0, 500),
        })
        .eq("id", orderId)
        .is("receipt_email_sent_at", null);
      return { ok: false, error: message };
    };

    const customerEmail = String(
      orderRow.customer_email || orderRow.delivery_address?.email || "",
    )
      .trim()
      .toLowerCase();

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return recordFailure("Missing or invalid customer email address.");
    }

    const apiKey = (params.resendApiKey ?? process.env.RESEND_API_KEY)?.trim();
    if (!apiKey) {
      return recordFailure("RESEND_API_KEY is not configured.");
    }

    const [{ data: itemsRows }, { data: returnsRows }, { data: assessmentRow }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("product_name, quantity, unit_price, total_price")
        .eq("order_id", orderId),
      supabaseAdmin
        .from("order_cylinder_returns")
        .select("cylinder_name, expected_quantity, returned_quantity, recorded_by, recorded_at")
        .eq("order_id", orderId),
      supabaseAdmin
        .from("order_short_return_assessments")
        .select("unmatched_quantity, assessed_fee, status")
        .eq("order_id", orderId)
        .maybeSingle(),
    ]);

    const returnsList = Array.isArray(returnsRows) ? returnsRows : [];
    const staffUserId = params.staffId || returnsList[0]?.recorded_by || null;
    let staffName: string | null = null;
    if (staffUserId) {
      const { data: staffProf } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", staffUserId)
        .maybeSingle();
      staffName = staffProf?.full_name || null;
    }

    const orderNumber = String(orderRow.order_number || `JSS-${orderId.slice(0, 8).toUpperCase()}`);
    const pdfInput: CollectionReceiptPdfInput = {
      orderNumber,
      customerName: String(
        orderRow.customer_name || orderRow.delivery_address?.name || "Customer",
      ),
      customerEmail,
      collectionBranch: String(
        orderRow.assigned_depot ||
          orderRow.delivery_address?.collection_branch ||
          "John Stayte Services Branch",
      ),
      collectedAtIso: String(
        returnsList[0]?.recorded_at || orderRow.updated_at || new Date().toISOString(),
      ),
      staffName,
      items: (Array.isArray(itemsRows) ? itemsRows : []).map((i: any) => ({
        productName: String(i.product_name || "Gas Cylinder"),
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unit_price) || 0,
        totalPrice: Number(i.total_price) || 0,
      })),
      cylinderReturns: returnsList.map((r: any) => ({
        cylinderName: String(r.cylinder_name || "Gas Cylinder"),
        expectedQuantity: Number(r.expected_quantity) || 0,
        returnedQuantity: Number(r.returned_quantity) || 0,
      })),
      shortReturnAssessment: assessmentRow
        ? {
            unmatchedQuantity: Number(assessmentRow.unmatched_quantity) || 0,
            assessedFee: Number(assessmentRow.assessed_fee) || 0,
            status: String(assessmentRow.status || "none"),
          }
        : null,
      originalOrderTotal: Number(orderRow.total) || 0,
      paymentStatus: String(orderRow.payment_status || "Pending"),
      paymentMethod: String(
        orderRow.delivery_address?.payment_method || "Verified Order Payment",
      ),
      logoDataUrl: params.logoDataUrl,
    };

    const pdf = generateCollectionReceiptPdf(pdfInput);
    const html = buildCollectionReceiptEmailHtml(pdfInput);
    const text = buildCollectionReceiptEmailText(pdfInput);
    const sender = getCollectionReceiptSenderAddress();

    const fetchImpl = params.fetchFn || fetch;
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "JohnStayteServices-CollectionReceipt/1.0",
        "Idempotency-Key": `jss-collection-receipt-${orderId}`,
      },
      body: JSON.stringify({
        from: sender,
        to: [customerEmail],
        subject: `Collection Confirmed — Order ${orderNumber} | John Stayte Services`,
        html,
        text,
        attachments: [
          {
            filename: pdf.filename,
            content: pdf.base64,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { message?: string };
      return recordFailure(
        `Resend API HTTP ${response.status}: ${errBody?.message || "Failed to send receipt email"}`,
      );
    }

    const resJson = (await response.json().catch(() => ({}))) as { id?: string };
    const sentAtIso = new Date().toISOString();

    const { error: finalUpdateErr } = await supabaseAdmin
      .from("orders")
      .update({
        receipt_email_sent_at: sentAtIso,
        receipt_email_id: resJson?.id || null,
        receipt_email_error: null,
      })
      .eq("id", orderId);

    if (finalUpdateErr) {
      console.error("[CollectionReceipt] Failed to record sent timestamp:", finalUpdateErr.message);
      await supabaseAdmin
        .from("orders")
        .update({
          receipt_email_id: resJson?.id || null,
          receipt_email_error: `Resend accepted (${resJson?.id || "no-id"}) but DB update failed: ${finalUpdateErr.message}`.slice(0, 500),
        })
        .eq("id", orderId)
        .is("receipt_email_sent_at", null);

      return {
        ok: false,
        emailId: resJson?.id || null,
        error: `Email accepted by Resend but failed to record sent status: ${finalUpdateErr.message}`,
      };
    }

    return {
      ok: true,
      alreadySent: false,
      emailId: resJson?.id || null,
    };
  } catch (err: any) {
    try {
      await supabaseAdmin
        .from("orders")
        .update({
          receipt_email_error: String(err?.message || "Unexpected receipt email error").slice(0, 500),
        })
        .eq("id", orderId)
        .is("receipt_email_sent_at", null);
    } catch {
      /* never throw from receipt dispatch */
    }
    return {
      ok: false,
      error: err?.message || "Unexpected error dispatching collection receipt email.",
    };
  }
}

export interface RetryCollectionReceiptInput {
  orderId: string;
  authToken?: string;
}

/**
 * Pure/injectable handler to safely retry sending a failed Click & Collect receipt email.
 */
export async function handleRetryCollectionReceiptEmail(
  supabaseAdmin: any,
  data: RetryCollectionReceiptInput,
  deps?: {
    fetchFn?: typeof fetch;
    resendApiKey?: string;
    logoDataUrl?: string | null;
  },
): Promise<{ ok: boolean; message?: string; error?: string; data?: any }> {
  try {
    const orderId = String(data?.orderId || "").trim();
    const authToken = String(data?.authToken || "").trim();
    if (!orderId) return { ok: false, error: "Order ID is required." };
    if (!authToken) return { ok: false, error: "Authentication token is required." };

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(authToken);
    if (userErr || !userData?.user) {
      return { ok: false, error: "Invalid or expired user session." };
    }

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, status, assigned_branch, assigned_branch_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr || !callerProfile) {
      return { ok: false, error: "Unable to verify caller profile." };
    }

    const role = String(callerProfile.role || "").toLowerCase();
    if (role !== "admin" && role !== "manager" && role !== "branch_staff") {
      return { ok: false, error: "Forbidden: Branch Staff, Manager, or Admin access required." };
    }

    if (role === "branch_staff") {
      if (String(callerProfile.status || "").toLowerCase() === "inactive") {
        return { ok: false, error: "Inactive branch staff accounts cannot retry receipts." };
      }
      const { data: orderRow } = await supabaseAdmin
        .from("orders")
        .select("assigned_branch_id, assigned_depot, delivery_address")
        .eq("id", orderId)
        .maybeSingle();

      if (!orderRow) {
        return { ok: false, error: "Order not found." };
      }

      const staffBranchId = String(callerProfile.assigned_branch_id || "").trim().toLowerCase();
      const staffBranchName = String(callerProfile.assigned_branch || "").trim().toLowerCase();
      const orderBranchId = String(orderRow.assigned_branch_id || "").trim().toLowerCase();
      const orderDepot = String(orderRow.assigned_depot || "").trim().toLowerCase();
      const orderColBranch = String(orderRow.delivery_address?.collection_branch || "").trim().toLowerCase();

      const matchesBranch =
        Boolean(staffBranchId && orderBranchId && staffBranchId === orderBranchId) ||
        Boolean(
          staffBranchName &&
            ((orderDepot && orderDepot.includes(staffBranchName)) ||
              (orderColBranch && orderColBranch.includes(staffBranchName))),
        );

      if (!matchesBranch) {
        return { ok: false, error: "Forbidden: This order is not assigned to your branch." };
      }
    }

    const res = await dispatchCollectionReceiptEmail(supabaseAdmin, {
      orderId,
      staffId: callerProfile.id,
      fetchFn: deps?.fetchFn,
      resendApiKey: deps?.resendApiKey,
      logoDataUrl: deps?.logoDataUrl,
    });

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to retry collection receipt email." };
    }

    return {
      ok: true,
      message: res.alreadySent
        ? "Collection receipt email was already sent."
        : res.skipped
          ? "Receipt dispatch already in progress."
          : "Collection receipt email sent successfully.",
      data: res,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unexpected error retrying receipt email." };
  }
}

export const retryCollectionReceiptEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: RetryCollectionReceiptInput) => data)
  .handler(async ({ data }) => {
    return handleRetryCollectionReceiptEmail(getSupabaseAdmin(), data);
  });
