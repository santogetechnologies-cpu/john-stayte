import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  FileText,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Building,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Receipt,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerInvoicesView() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Viewing Full Invoice Document
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);

  const loadCustomerInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const userId = authUser?.user?.id || user?.id;
      const userEmail = authUser?.user?.email || user?.email;

      if (!userId && !userEmail) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Query real orders from Supabase for this specific customer
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (userId && userEmail) {
        query = query.or(`customer_id.eq.${userId},customer_email.eq.${userEmail}`);
      } else if (userId) {
        query = query.eq("customer_id", userId);
      } else if (userEmail) {
        query = query.eq("customer_email", userEmail);
      }

      const { data: dbOrders, error: ordErr } = await query;
      if (ordErr) throw ordErr;

      // Filter out test/verification orders (AUDIT, TEST, VERIFY, STALE, MOCK, DEMO, SEED)
      const realOrders = (dbOrders || []).filter((o) => {
        const num = (o.order_number || "").toUpperCase();
        return (
          !num.includes("AUDIT") &&
          !num.includes("TEST") &&
          !num.includes("VERIFY") &&
          !num.includes("STALE") &&
          !num.includes("MOCK") &&
          !num.includes("DEMO") &&
          !num.includes("SEED")
        );
      });

      setOrders(realOrders);
    } catch (err: any) {
      console.error("Invoices query error:", err);
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerInvoices();
  }, [user]);

  // Compute summary metrics from real orders
  const totalInvoices = orders.length;

  const totalBilled = useMemo(() => {
    return orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [orders]);

  const latestInvoice = useMemo(() => {
    return orders.length > 0 ? orders[0] : null;
  }, [orders]);

  const handleOpenViewInvoice = (order: any) => {
    setSelectedInvoiceOrder(order);
    setViewInvoiceModalOpen(true);
  };

  // Generate & Download Real HTML/Printable VAT Invoice
  const handleDownloadVATInvoice = (order: any) => {
    try {
      const invoiceNo = `INV-${order.order_number}`;
      const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      let addressObj: any = {};
      if (typeof order.delivery_address === "object" && order.delivery_address !== null) {
        addressObj = order.delivery_address;
      }

      const itemsList = order.order_items || [];

      const subtotal = Number(order.subtotal || order.total || 0);
      const shippingFee = Number(order.shipping_fee || 0);
      const vatAmount = subtotal * 0.2;
      const grandTotal = Number(order.total || subtotal + vatAmount + shippingFee);

      const itemsHtml = itemsList
        .map(
          (item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${item.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${gbp(item.unit_price)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${gbp(item.unit_price * 0.2 * item.quantity)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${gbp(item.total_price)}</td>
        </tr>
      `
        )
        .join("");

      const invoiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VAT Tax Invoice #${invoiceNo}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px; color: #0f172a; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
    .company-title { font-size: 24px; font-weight: 900; color: #dc2626; margin: 0; }
    .inv-title { font-size: 28px; font-weight: 900; text-align: right; color: #0f172a; margin: 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; }
    .totals-table { width: 300px; margin-left: auto; border: none; }
    .totals-table td { padding: 6px 10px; }
    .grand-total { font-size: 18px; font-weight: 900; color: #dc2626; border-top: 2px solid #e2e8f0; }
    .footer-note { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-flex">
      <div>
        <h1 class="company-title">JOHN STAYTE SERVICES</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; font-weight: 600;">Whitminster Depot, Gloucestershire, GL2 7NY</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">VAT Reg No: <strong>GB 123 4567 89</strong> | Tel: 01452 740326</p>
      </div>
      <div>
        <h2 class="inv-title">VAT TAX INVOICE</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; text-align: right; color: #475569;">${invoiceNo}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; text-align: right; color: #64748b;">Order Ref: #${order.order_number}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; text-align: right; color: #64748b;">Date: ${orderDate}</p>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="section-title">Billed & Delivered To</div>
        <p style="margin: 0; font-weight: 800; font-size: 14px;">${order.customer_name || user?.name || "Valued Customer"}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">${addressObj.street || "Delivery Address On File"}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">${addressObj.postcode || ""}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Email: ${order.customer_email || user?.email || ""}</p>
      </div>
      <div style="text-align: right;">
        <div class="section-title">Payment & Status</div>
        <p style="margin: 0; font-weight: 800; font-size: 13px; color: #059669;">Status: Paid & Issued</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Fulfillment: ${order.status}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Currency: GBP (£)</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price (ex. VAT)</th>
          <th style="text-align: right;">VAT (20%)</th>
          <th style="text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td style="color: #64748b; font-size: 12px;">Subtotal (excl. VAT):</td>
        <td style="text-align: right; font-weight: 700; font-size: 12px;">${gbp(subtotal)}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px;">VAT (Standard 20%):</td>
        <td style="text-align: right; font-weight: 700; font-size: 12px;">${gbp(vatAmount)}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px;">Delivery Charge:</td>
        <td style="text-align: right; font-weight: 700; font-size: 12px;">${shippingFee === 0 ? "FREE" : gbp(shippingFee)}</td>
      </tr>
      <tr class="grand-total">
        <td>Total Paid:</td>
        <td style="text-align: right;">${gbp(grandTotal)}</td>
      </tr>
    </table>

    <div class="footer-note">
      <p style="margin: 0;">John Stayte Services Ltd &bull; Registered in England & Wales &bull; Thank you for your business!</p>
    </div>
  </div>
</body>
</html>
      `.trim();

      const blob = new Blob([invoiceHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VAT_Invoice_${order.order_number}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`VAT Invoice #${order.order_number} downloaded successfully!`);
    } catch (err: any) {
      toast.error("Failed to generate VAT invoice: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          Cancelled
        </span>
      );
    }
    if (status === "Pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        Paid & Issued
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ============================================================ */}
      {/* 1. HEADER SECTION                                            */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">Invoices</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight flex items-center gap-2.5">
              <Receipt className="h-7 w-7 text-primary shrink-0" />
              VAT Invoices & Billing
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              View and download official VAT tax invoices for your commercial and domestic orders with John Stayte Services.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 gap-1.5"
            >
              <Link to="/account/orders">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" /> View Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. COMPACT SUMMARY CARDS                                     */}
      {/* ============================================================ */}
      <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Invoices
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-slate-900 leading-none">
            {loading ? "..." : totalInvoices}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {totalInvoices === 1 ? "1 VAT invoice on file" : `${totalInvoices} invoices on file`}
          </p>
        </div>

        {/* Total Billed */}
        <div className="bg-white rounded-2xl border border-primary/30 shadow-[0_4px_16px_rgba(227,27,35,0.06)] p-4 sm:p-5 transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Billed
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-primary leading-none">
            {loading ? "..." : gbp(totalBilled)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Cumulative spend including VAT
          </p>
        </div>

        {/* Latest Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Latest Invoice
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-black text-slate-900 leading-none truncate">
            {loading
              ? "..."
              : latestInvoice
              ? `INV-${latestInvoice.order_number}`
              : "None"}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {latestInvoice
              ? new Date(latestInvoice.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "No issued invoices"}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. INVOICE LIST / TABLE                                      */}
      {/* ============================================================ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold">
            Loading your VAT invoices...
          </p>
        </div>
      ) : error ? (
        <div className="p-10 text-center space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <AlertTriangle className="mx-auto h-9 w-9 text-rose-500" />
          <h3 className="font-bold text-sm text-slate-900">Notice</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
          <Button
            onClick={loadCustomerInvoices}
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-bold gap-1.5 mt-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry Query
          </Button>
        </div>
      ) : orders.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-4 max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="font-display font-extrabold text-lg text-slate-900">
              No invoices yet
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Official VAT tax invoices will appear here automatically when you place orders with John Stayte Services.
            </p>
          </div>
          <div className="pt-2">
            <Button
              asChild
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-9 px-5 gap-2"
            >
              <Link to="/account/orders">
                <ShoppingBag className="h-3.5 w-3.5" /> View My Orders
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* DESKTOP & TABLET: REFINED TABLE LAYOUT */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5 pl-6">
                    Invoice
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5">
                    Order Ref
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5">
                    Date Issued
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5 text-right">
                    Subtotal
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5 text-right">
                    VAT (20%)
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5 text-right">
                    Total
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 py-3.5 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const invoiceNo = `INV-${order.order_number}`;
                  const subtotal = Number(order.subtotal || order.total || 0);
                  const shippingFee = Number(order.shipping_fee || 0);
                  const vatAmount = subtotal * 0.2;
                  const grandTotal = Number(order.total || subtotal + vatAmount + shippingFee);
                  const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Invoice # */}
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {invoiceNo}
                          </span>
                        </div>
                      </TableCell>

                      {/* Order Ref */}
                      <TableCell className="py-4">
                        <Link
                          to="/account/orders/$orderId"
                          params={{ orderId: order.id }}
                          className="font-mono text-xs font-semibold text-slate-700 hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          #{order.order_number}
                        </Link>
                      </TableCell>

                      {/* Date Issued */}
                      <TableCell className="py-4 text-xs font-medium text-slate-500">
                        {orderDate}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        {getStatusBadge(order.status)}
                      </TableCell>

                      {/* Subtotal */}
                      <TableCell className="py-4 text-right text-xs font-medium text-slate-600">
                        {gbp(subtotal)}
                      </TableCell>

                      {/* VAT (20%) */}
                      <TableCell className="py-4 text-right text-xs font-medium text-slate-500">
                        {gbp(vatAmount)}
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-4 text-right font-display font-black text-sm text-slate-900">
                        {gbp(grandTotal)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            onClick={() => handleOpenViewInvoice(order)}
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs font-bold gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 h-8 px-3 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" /> View
                          </Button>

                          <Button
                            onClick={() => handleDownloadVATInvoice(order)}
                            size="sm"
                            className="rounded-xl text-xs font-extrabold gap-1 shadow-xs bg-primary hover:bg-primary/90 text-white h-8 px-3 transition-all"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE: COMPACT RESPONSIVE CARDS */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const invoiceNo = `INV-${order.order_number}`;
              const subtotal = Number(order.subtotal || order.total || 0);
              const shippingFee = Number(order.shipping_fee || 0);
              const vatAmount = subtotal * 0.2;
              const grandTotal = Number(order.total || subtotal + vatAmount + shippingFee);
              const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
                >
                  {/* Top: Invoice # & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {invoiceNo}
                      </span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Middle: Order Ref & Date */}
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2 border-t border-slate-100 pt-2.5">
                    <span>Order #{order.order_number}</span>
                    <span className="text-slate-300">·</span>
                    <span>{orderDate}</span>
                  </div>

                  {/* Financials Grid */}
                  <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Subtotal
                      </span>
                      <span className="font-semibold text-slate-700">
                        {gbp(subtotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        VAT (20%)
                      </span>
                      <span className="font-semibold text-slate-700">
                        {gbp(vatAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total
                      </span>
                      <span className="font-black text-slate-900 font-display">
                        {gbp(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      onClick={() => handleOpenViewInvoice(order)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 h-9"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" /> View
                    </Button>

                    <Button
                      onClick={() => handleDownloadVATInvoice(order)}
                      size="sm"
                      className="rounded-xl text-xs font-extrabold gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-white h-9"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. VIEW INVOICE DOCUMENT MODAL                               */}
      {/* ============================================================ */}
      <Dialog open={viewInvoiceModalOpen} onOpenChange={setViewInvoiceModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl text-slate-900 flex items-center justify-between">
              <span>VAT Tax Invoice: INV-{selectedInvoiceOrder?.order_number}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoiceOrder && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Document Header */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-base text-primary">JOHN STAYTE SERVICES</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Whitminster Depot, Gloucestershire, GL2 7NY</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">VAT Reg No: GB 123 4567 89</p>
                </div>

                <div className="sm:text-right">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold mb-1">
                    Official Tax Invoice
                  </Badge>
                  <p className="font-mono font-black text-sm text-slate-900">Ref: #{selectedInvoiceOrder.order_number}</p>
                  <p className="text-[11px] text-slate-500">
                    Date: {new Date(selectedInvoiceOrder.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Billed To Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Customer Information</p>
                  <p className="font-black text-sm text-slate-900 mt-1">{selectedInvoiceOrder.customer_name || user?.name}</p>
                  <p className="text-slate-500">{selectedInvoiceOrder.customer_email || user?.email}</p>
                  <p className="text-slate-500">{selectedInvoiceOrder.customer_phone || "Phone on file"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Delivery & Billing Address</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {typeof selectedInvoiceOrder.delivery_address === "object" && selectedInvoiceOrder.delivery_address !== null
                      ? `${selectedInvoiceOrder.delivery_address.street || ""}, ${selectedInvoiceOrder.delivery_address.postcode || ""}`
                      : selectedInvoiceOrder.delivery_address || "Gloucestershire Delivery Address"}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">Payment Status: Paid in Full</p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Description</TableHead>
                      <TableHead className="font-bold text-xs text-center">Qty</TableHead>
                      <TableHead className="font-bold text-xs text-right">Unit Price</TableHead>
                      <TableHead className="font-bold text-xs text-right">VAT (20%)</TableHead>
                      <TableHead className="font-bold text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedInvoiceOrder.order_items || []).map((item: any) => {
                      const uPrice = Number(item.unit_price || 0);
                      const qty = Number(item.quantity || 1);
                      const itemVat = uPrice * 0.2 * qty;
                      const itemTotal = Number(item.total_price || uPrice * qty);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-xs text-slate-900">{item.product_name}</TableCell>
                          <TableCell className="text-center font-bold">{qty}</TableCell>
                          <TableCell className="text-right">{gbp(uPrice)}</TableCell>
                          <TableCell className="text-right text-slate-500">{gbp(itemVat)}</TableCell>
                          <TableCell className="text-right font-black text-slate-900">{gbp(itemTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 max-w-xs ml-auto text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Subtotal (excl. VAT):</span>
                  <span className="font-bold text-slate-900">{gbp(Number(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">VAT (Standard 20%):</span>
                  <span className="font-bold text-slate-900">{gbp(Number(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total) * 0.2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Carriage / Delivery:</span>
                  <span className="font-bold text-slate-900">{selectedInvoiceOrder.shipping_fee === 0 ? "FREE" : gbp(Number(selectedInvoiceOrder.shipping_fee || 0))}</span>
                </div>
                <div className="flex justify-between text-base font-black text-primary border-t border-slate-200 pt-1.5 mt-1">
                  <span>Total Paid:</span>
                  <span>{gbp(Number(selectedInvoiceOrder.total))}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setViewInvoiceModalOpen(false)} className="rounded-xl text-xs font-bold">
                  Close
                </Button>
                <Button
                  onClick={() => handleDownloadVATInvoice(selectedInvoiceOrder)}
                  className="rounded-xl text-xs font-extrabold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-white h-9 px-4"
                >
                  <Download className="h-4 w-4" /> Download VAT Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
