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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gbp, useStore, getOrderPaymentMethod } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CustomerAccountNumberBadge } from "@/components/customer/CustomerAccountNumberBadge";
import {
  downloadTaxInvoice,
  printTaxInvoice,
  prepareInvoiceData,
  INVOICE_COMPANY_CONFIG,
} from "@/lib/invoice-service";

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
  const handleDownloadVATInvoice = async (order: any) => {
    try {
      const accountNumber =
        order.customer_account_number ||
        (typeof order.delivery_address === "object" ? order.delivery_address?.account_number : undefined) ||
        user?.account_number ||
        user?.customer_code ||
        undefined;
      await downloadTaxInvoice(order, { accountNumber });
      toast.success(`Tax Invoice #${order.order_number} PDF downloaded successfully!`);
    } catch (err: any) {
      toast.error("Failed to generate VAT invoice: " + err.message);
    }
  };

  const handlePrintVATInvoice = (order: any) => {
    try {
      const accountNumber =
        order.customer_account_number ||
        (typeof order.delivery_address === "object" ? order.delivery_address?.account_number : undefined) ||
        user?.account_number ||
        user?.customer_code ||
        undefined;
      printTaxInvoice(order, { accountNumber });
    } catch (err: any) {
      toast.error("Failed to print invoice: " + err.message);
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
              View and download official VAT tax invoices for your commercial and domestic orders
              with John Stayte Services.
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
            {loading ? "..." : latestInvoice ? `INV-${latestInvoice.order_number}` : "None"}
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
          <p className="text-xs text-slate-500 font-bold">Loading your VAT invoices...</p>
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
            <h2 className="font-display font-extrabold text-lg text-slate-900">No invoices yet</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Official VAT tax invoices will appear here automatically when you place orders with
              John Stayte Services.
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
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
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
                      <TableCell className="py-4">{getStatusBadge(order.status)}</TableCell>

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
                            onClick={() => handlePrintVATInvoice(order)}
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs font-bold gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 h-8 px-2.5 transition-colors"
                            title="Print Tax Invoice"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-500" />
                          </Button>

                          <Button
                            onClick={() => handleDownloadVATInvoice(order)}
                            size="sm"
                            className="rounded-xl text-xs font-extrabold gap-1 shadow-xs bg-primary hover:bg-primary/90 text-white h-8 px-3 transition-all"
                            title="Download Tax Invoice"
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
                      <span className="font-semibold text-slate-700">{gbp(subtotal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        VAT (20%)
                      </span>
                      <span className="font-semibold text-slate-700">{gbp(vatAmount)}</span>
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

          {selectedInvoiceOrder && (() => {
            const modalInv = prepareInvoiceData(selectedInvoiceOrder, {
              accountNumber:
                selectedInvoiceOrder.customer_account_number ||
                selectedInvoiceOrder.delivery_address?.account_number ||
                user?.account_number ||
                user?.customer_code,
            });

            return (
              <div className="space-y-5 pt-2 text-xs">
                {/* Document Header */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50/70 via-white to-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-red-600">{INVOICE_COMPANY_CONFIG.tradingAs}</p>
                    <h2 className="font-serif font-black text-xl text-primary leading-tight">
                      {INVOICE_COMPANY_CONFIG.companyName}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {INVOICE_COMPANY_CONFIG.addressLine1}, {INVOICE_COMPANY_CONFIG.townCity}, {INVOICE_COMPANY_CONFIG.postcode}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Tel: {INVOICE_COMPANY_CONFIG.phone} • {INVOICE_COMPANY_CONFIG.email}
                    </p>
                    <p className="text-[11px] font-black text-slate-900 mt-1">
                      VAT No. {INVOICE_COMPANY_CONFIG.vatNumber}
                    </p>
                  </div>

                  <div className="sm:text-right bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="bg-slate-200/80 text-slate-900 text-xs font-black px-3 py-1 rounded text-center mb-1.5">
                      Invoice {modalInv.invoiceNumber}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-left sm:text-right text-[11px]">
                      <span className="text-slate-500 font-bold">Tax Point/Date:</span>
                      <span className="font-bold text-slate-900">{modalInv.taxPointDate}</span>
                      <span className="text-slate-500 font-bold">Our Order Ref:</span>
                      <span className="font-bold text-slate-900">{modalInv.customerOrderRef}</span>
                      <span className="text-slate-500 font-bold">Due Date:</span>
                      <span className="font-bold text-slate-900">{modalInv.dueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Information Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Invoice To : <span className="text-slate-900 font-mono font-black">{modalInv.customerAccountNumber}</span>
                    </p>
                    <p className="font-black text-sm text-slate-900 mt-1 uppercase">
                      {modalInv.customerName}
                    </p>
                    <div className="text-slate-600 mt-0.5 space-y-0.5 font-medium">
                      {modalInv.billingAddressLines.map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                    </div>
                    {modalInv.customerEmail && (
                      <p className="text-slate-500 text-[11px] mt-1.5">Email: {modalInv.customerEmail}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Supplied to : <span className="text-slate-900 font-mono font-black">{modalInv.customerAccountNumber}</span>
                    </p>
                    <p className="font-black text-sm text-slate-900 mt-1 uppercase">
                      {modalInv.customerName}
                    </p>
                    <div className="text-slate-600 mt-0.5 space-y-0.5 font-medium">
                      {modalInv.deliveryAddressLines.map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{modalInv.paymentStatus} ({modalInv.paymentMethod})</span>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-black text-[11px] text-slate-800">Product</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800">Description</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800 text-center">Qty</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800 text-center">Empties</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800 text-right">Price Inc</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800 text-right">Value</TableHead>
                        <TableHead className="font-black text-[11px] text-slate-800 text-right">Vat %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modalInv.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono font-bold text-xs text-slate-900">
                            {item.productCode}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-800">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-center text-xs">{item.empties || "—"}</TableCell>
                          <TableCell className="text-right text-xs">{item.unitPriceIncVat.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-black text-xs text-slate-900">
                            {item.totalValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">{item.vatPercentStr}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Bottom Row: BACS Payment Details & Reconciled Totals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <p className="font-black text-slate-900 uppercase tracking-wide text-[10px]">
                      BACS Payment Details
                    </p>
                    <p className="text-slate-700 font-mono text-xs">
                      Sort Code: <strong>{INVOICE_COMPANY_CONFIG.bacsSortCode}</strong><br />
                      Account Number: <strong>{INVOICE_COMPANY_CONFIG.bacsAccountNumber}</strong><br />
                      Bank: <strong>{INVOICE_COMPANY_CONFIG.bacsBankName}</strong> ({INVOICE_COMPANY_CONFIG.bacsAccountName})
                    </p>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Please quote customer account number <strong className="text-slate-800">{modalInv.customerAccountNumber}</strong> with BACS remittance.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-900 bg-white space-y-1.5 text-right">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Total Net:</span>
                      <span>{gbp(modalInv.totalNet)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Total VAT:</span>
                      <span>{gbp(modalInv.totalVat)}</span>
                    </div>
                    {modalInv.deliveryCharges > 0 && (
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Delivery Charges:</span>
                        <span>{gbp(modalInv.deliveryCharges)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-1.5 mt-1">
                      <span>Total Gross:</span>
                      <span>{gbp(modalInv.totalGross)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    onClick={() => setViewInvoiceModalOpen(false)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintVATInvoice(selectedInvoiceOrder)}
                    className="rounded-xl text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 h-9 px-4"
                  >
                    <Printer className="h-4 w-4" /> Print Invoice
                  </Button>
                  <Button
                    onClick={() => handleDownloadVATInvoice(selectedInvoiceOrder)}
                    className="rounded-xl text-xs font-extrabold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-white h-9 px-4"
                  >
                    <Download className="h-4 w-4" /> Download Official Tax Invoice
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
