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

      // Filter out test/verification orders (AUDIT, TEST, VERIFY, STALE)
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
      setError(err.message || "Failed to query invoices from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerInvoices();
  }, [user]);

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

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Invoices</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> VAT Invoices & Billing Statements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            View and download official VAT tax invoices for your commercial orders with John Stayte Services.
          </p>
        </div>
      </div>

      {/* 2. INVOICES CONTAINER */}
      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground shadow-xs flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-primary animate-spin" /> Querying your invoices from Supabase orders...
        </div>
      ) : error ? (
        <div className="p-12 text-center space-y-3 surface-card rounded-3xl border bg-white shadow-xs">
          <AlertTriangle className="mx-auto h-9 w-9 text-rose-500" />
          <h3 className="font-bold text-sm text-foreground">Database Query Error</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <Button onClick={loadCustomerInvoices} size="sm" variant="outline" className="rounded-full text-xs font-bold gap-1.5 mt-2">
            <RotateCcw className="h-3.5 w-3.5" /> Retry Query
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-card p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <FileText className="h-10 w-10 text-slate-400" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">No customer invoices found</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Official VAT tax invoices will appear here automatically when you place orders with John Stayte Services.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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

            const isCancelled = order.status === "Cancelled";

            return (
              <div
                key={order.id}
                className="surface-card p-6 rounded-3xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Left Invoice Info */}
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-base text-foreground">{invoiceNo}</h3>
                      <span className="text-xs text-muted-foreground font-semibold">
                        (Order #{order.order_number})
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-extrabold ${
                          isCancelled
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isCancelled ? "Order Cancelled" : "Paid & Issued"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">
                      Date Issued: <strong className="text-foreground">{orderDate}</strong> &bull; Billed to:{" "}
                      <strong className="text-foreground">{order.customer_name || user?.name}</strong>
                    </p>

                    {/* Financial Summary Line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
                      <span className="text-muted-foreground">
                        Subtotal: <strong className="text-foreground">{gbp(subtotal)}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        VAT (20%): <strong className="text-foreground">{gbp(vatAmount)}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Delivery: <strong className="text-foreground">{shippingFee === 0 ? "Free" : gbp(shippingFee)}</strong>
                      </span>
                      <span className="font-black text-primary text-sm">
                        Total: {gbp(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    onClick={() => handleOpenViewInvoice(order)}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-600" /> View Invoice
                  </Button>

                  <Button
                    onClick={() => handleDownloadVATInvoice(order)}
                    size="sm"
                    className="rounded-full text-xs font-extrabold gap-1.5 shadow-xs bg-primary text-white hover:bg-primary/90"
                  >
                    <Download className="h-3.5 w-3.5" /> Download VAT Invoice
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. VIEW INVOICE DOCUMENT MODAL */}
      <Dialog open={viewInvoiceModalOpen} onOpenChange={setViewInvoiceModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center justify-between">
              <span>VAT Tax Invoice: INV-{selectedInvoiceOrder?.order_number}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoiceOrder && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Document Header */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-base text-primary">JOHN STAYTE SERVICES</h2>
                  <p className="text-[11px] text-muted-foreground">Whitminster Depot, Gloucestershire, GL2 7NY</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">VAT Reg No: GB 123 4567 89</p>
                </div>

                <div className="sm:text-right">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold mb-1">
                    Official Tax Invoice
                  </Badge>
                  <p className="font-black text-sm text-foreground">Ref: #{selectedInvoiceOrder.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Date: {new Date(selectedInvoiceOrder.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Billed To Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border bg-white">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Customer Information</p>
                  <p className="font-black text-sm text-foreground mt-1">{selectedInvoiceOrder.customer_name || user?.name}</p>
                  <p className="text-muted-foreground">{selectedInvoiceOrder.customer_email || user?.email}</p>
                  <p className="text-muted-foreground">{selectedInvoiceOrder.customer_phone || "Phone on file"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Delivery & Billing Address</p>
                  <p className="font-semibold text-foreground mt-1">
                    {typeof selectedInvoiceOrder.delivery_address === "object" && selectedInvoiceOrder.delivery_address !== null
                      ? `${selectedInvoiceOrder.delivery_address.street || ""}, ${selectedInvoiceOrder.delivery_address.postcode || ""}`
                      : selectedInvoiceOrder.delivery_address || "Gloucestershire Delivery Address"}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">Payment Status: Paid in Full</p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-2xl border bg-white overflow-hidden">
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
                          <TableCell className="font-bold text-xs">{item.product_name}</TableCell>
                          <TableCell className="text-center font-bold">{qty}</TableCell>
                          <TableCell className="text-right">{gbp(uPrice)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{gbp(itemVat)}</TableCell>
                          <TableCell className="text-right font-black">{gbp(itemTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border space-y-1.5 max-w-xs ml-auto text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Subtotal (excl. VAT):</span>
                  <span className="font-bold text-foreground">{gbp(Number(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">VAT (Standard 20%):</span>
                  <span className="font-bold text-foreground">{gbp(Number(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total) * 0.2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Carriage / Delivery:</span>
                  <span className="font-bold text-foreground">{selectedInvoiceOrder.shipping_fee === 0 ? "FREE" : gbp(Number(selectedInvoiceOrder.shipping_fee || 0))}</span>
                </div>
                <div className="flex justify-between text-base font-black text-primary border-t pt-1.5 mt-1">
                  <span>Total Paid:</span>
                  <span>{gbp(Number(selectedInvoiceOrder.total))}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex justify-end gap-2 border-t">
                <Button variant="ghost" onClick={() => setViewInvoiceModalOpen(false)} className="rounded-full text-xs font-bold">
                  Close
                </Button>
                <Button
                  onClick={() => handleDownloadVATInvoice(selectedInvoiceOrder)}
                  className="rounded-full text-xs font-extrabold gap-1.5 shadow-md bg-primary text-white"
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
