import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  FileText,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  Receipt,
  Search,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function AdminInvoicesView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewOrder, setPreviewOrder] = useState<any | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: ordersData, error: ordersErr }, { data: invData, error: invErr }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false }),
          supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
        ]);

      if (ordersErr) throw ordersErr;
      if (invErr) throw invErr;

      setOrders(ordersData || []);
      setInvoices(invData || []);
    } catch (err: any) {
      console.error("Failed to load invoices data:", err);
      toast.error("Failed to load invoices: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combined invoice records
  const invoiceRecords = useMemo(() => {
    return orders.map((order) => {
      const matchingInv = invoices.find((inv) => inv.order_id === order.id);
      const invoiceNumber =
        matchingInv?.invoice_number || `INV-${order.order_number.replace("JSS-", "")}`;
      const status = matchingInv?.status || (order.status === "Cancelled" ? "Cancelled" : "Paid");
      return {
        ...order,
        invoiceNumber,
        invoiceStatus: status,
      };
    });
  }, [orders, invoices]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return invoiceRecords.filter((rec) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.invoiceNumber.toLowerCase().includes(q) ||
        rec.order_number.toLowerCase().includes(q) ||
        (rec.customer_name || "").toLowerCase().includes(q) ||
        (rec.customer_email || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && rec.invoiceStatus === "Paid") ||
        (statusFilter === "pending" && rec.invoiceStatus === "Pending") ||
        (statusFilter === "cancelled" && rec.invoiceStatus === "Cancelled");

      return matchesSearch && matchesStatus;
    });
  }, [invoiceRecords, searchQuery, statusFilter]);

  // Metrics
  const totalBilled = useMemo(() => {
    return invoiceRecords
      .filter((r) => r.invoiceStatus !== "Cancelled")
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
  }, [invoiceRecords]);

  const paidCount = useMemo(() => {
    return invoiceRecords.filter((r) => r.invoiceStatus === "Paid").length;
  }, [invoiceRecords]);

  const handleDownloadInvoice = (order: any) => {
    try {
      const grandTotal = Number(order.total || 0);
      const shippingFee = Number(order.shipping_fee || 0);
      const subtotalNet = Number(order.subtotal || (grandTotal - shippingFee) / 1.2);
      const vatAmount = grandTotal - subtotalNet - shippingFee;

      const itemsHtml = (order.order_items || [])
        .map(
          (it: any) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${it.product_name || "LPG Product"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${it.quantity || 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">${gbp(Number(it.unit_price || 0))}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 700;">${gbp(Number(it.total_price || it.unit_price * it.quantity || 0))}</td>
          </tr>
        `,
        )
        .join("");

      const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VAT Invoice ${order.invoiceNumber || order.order_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .company-info { font-size: 12px; color: #475569; }
    .invoice-title { font-size: 24px; font-weight: 900; color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; background: #f8fafc; padding: 10px; font-size: 12px; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
    .totals { margin-top: 20px; width: 300px; margin-left: auto; }
    .grand-total { font-size: 16px; font-weight: 900; border-top: 2px solid #0f172a; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="invoice-title">JOHN STAYTE SERVICES</div>
      <div class="company-info" style="margin-top: 6px;">
        Eastington Depot, Springhill, Stonehouse, GL10 3SX<br>
        VAT Reg No: GB 275 8841 02 &bull; Phone: 01452 741234
      </div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 20px;">TAX INVOICE</h2>
      <div style="font-size: 13px; margin-top: 6px; font-weight: 700;">#${order.invoiceNumber}</div>
      <div style="font-size: 12px; color: #64748b;">Order: #${order.order_number}</div>
      <div style="font-size: 12px; color: #64748b;">Date: ${new Date(order.created_at).toLocaleDateString("en-GB")}</div>
    </div>
  </div>

  <div style="margin-top: 20px; font-size: 13px;">
    <strong>Billed To:</strong><br>
    ${order.customer_name || "Customer"}<br>
    ${order.customer_email || ""}<br>
    ${order.delivery_address?.street || ""}, ${order.delivery_address?.postcode || ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price (Inc VAT)</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="4" style="padding:10px;">LPG Supply and Services</td></tr>'}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td style="color: #64748b; font-size: 12px;">Subtotal (Ex VAT):</td>
      <td style="text-align: right; font-weight: 700; font-size: 12px;">${gbp(subtotalNet)}</td>
    </tr>
    <tr>
      <td style="color: #64748b; font-size: 12px;">VAT (Standard 20%):</td>
      <td style="text-align: right; font-weight: 700; font-size: 12px;">${gbp(vatAmount)}</td>
    </tr>
    <tr>
      <td style="color: #64748b; font-size: 12px;">Delivery:</td>
      <td style="text-align: right; font-weight: 700; font-size: 12px;">${shippingFee === 0 ? "FREE" : gbp(shippingFee)}</td>
    </tr>
    <tr class="grand-total">
      <td>Total Paid:</td>
      <td style="text-align: right;">${gbp(grandTotal)}</td>
    </tr>
  </table>

  <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center;">
    John Stayte Services Ltd &bull; Registered in England & Wales &bull; Thank you for your business!
  </div>
</body>
</html>
      `.trim();

      const blob = new Blob([invoiceHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VAT_Invoice_${order.invoiceNumber}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Invoice #${order.invoiceNumber} downloaded!`);
    } catch (err: any) {
      toast.error("Download failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-primary shrink-0" />
            Company Invoices & VAT Billing
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Enterprise overview of all customer order tax invoices, VAT amounts, and payment
            settlements.
          </p>
        </div>
        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          className="rounded-xl gap-2 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Revenue Billed
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{gbp(totalBilled)}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Across all confirmed customer orders
          </p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Invoices Issued
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{invoiceRecords.length}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {paidCount} paid and verified
          </p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Average Invoice Value
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 grid place-items-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {gbp(invoiceRecords.length > 0 ? totalBilled / invoiceRecords.length : 0)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Standard VAT rate of 20% applied
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search invoice, order, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["all", "paid", "pending", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">Loading invoice records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No invoice records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="text-xs font-extrabold text-slate-700">
                  Invoice Number
                </TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Order Ref</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Customer</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Date Issued</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">
                  Amount (Inc VAT)
                </TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Status</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-extrabold text-xs text-slate-900">
                    <span className="font-mono">{r.invoiceNumber}</span>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-600">
                    <Link
                      to={`/account/orders/${r.id}` as any}
                      className="hover:text-primary underline"
                    >
                      #{r.order_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-bold text-slate-900">{r.customer_name || "Customer"}</div>
                    <div className="text-[11px] text-slate-400">{r.customer_email}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-xs font-extrabold text-slate-900">
                    {gbp(Number(r.total || 0))}
                  </TableCell>
                  <TableCell>
                    {r.invoiceStatus === "Cancelled" ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold"
                      >
                        Cancelled
                      </Badge>
                    ) : r.invoiceStatus === "Pending" ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold"
                      >
                        Pending
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
                      >
                        Paid & Issued
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewOrder(r);
                          setPreviewModalOpen(true);
                        }}
                        className="h-8 w-8 p-0 rounded-lg"
                        title="View invoice details"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(r)}
                        className="h-8 w-8 p-0 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                        title="Download official VAT Invoice"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-lg">
              <Receipt className="h-5 w-5 text-primary" /> Invoice #{previewOrder?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {previewOrder && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">
                    Order Number
                  </span>
                  <span className="font-extrabold text-slate-900">
                    #{previewOrder.order_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">
                    Date Issued
                  </span>
                  <span className="font-semibold text-slate-700">
                    {new Date(previewOrder.created_at).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">
                    Customer
                  </span>
                  <span className="font-semibold text-slate-700">{previewOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">
                    Total Paid
                  </span>
                  <span className="font-black text-primary text-sm">{gbp(previewOrder.total)}</span>
                </div>
              </div>

              <div>
                <p className="font-extrabold text-slate-800 mb-2">Order Line Items</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {(previewOrder.order_items || []).map((it: any) => (
                    <div key={it.id} className="p-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">{it.product_name}</span>
                        <span className="text-slate-400 ml-2">× {it.quantity}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {gbp(it.total_price || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalOpen(false)}
                  className="rounded-xl"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownloadInvoice(previewOrder)}
                  className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-white font-bold"
                >
                  <Download className="h-3.5 w-3.5" /> Download Tax Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
