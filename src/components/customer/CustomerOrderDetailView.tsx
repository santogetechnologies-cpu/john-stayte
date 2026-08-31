import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Download,
  HelpCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Building,
  Phone,
  Mail,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Flame,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";

const TRACKING_STEPS = [
  { key: "Pending", label: "Order Placed", desc: "Order submitted via website" },
  { key: "Approved", label: "Order Confirmed", desc: "Verified by Whitminster depot" },
  { key: "Packed", label: "Packed", desc: "Prepared & loaded for route" },
  { key: "Out for Delivery", label: "Out for Delivery", desc: "With our delivery fleet" },
  { key: "Delivered", label: "Delivered", desc: "Successfully completed" },
];

const CANCELLATION_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery taking too long",
  "Product no longer needed",
  "Other",
];

export function CustomerOrderDetailView() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string };
  const { user, addToCart } = useStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Recommendations
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [customReasonText, setCustomReasonText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Load Order Details & verify customer authorization
  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id;
      const currentEmail = authUser?.user?.email || user?.email;

      // Query order by UUID id or order_number
      let query = supabase
        .from("orders")
        .select("*, order_items(*), order_status_history(*)");

      if (orderId.includes("-") && orderId.length === 36) {
        query = query.eq("id", orderId);
      } else {
        query = query.or(`id.eq.${orderId},order_number.eq.${orderId}`);
      }

      const { data: orderData, error: fetchErr } = await query.maybeSingle();

      if (fetchErr) throw fetchErr;

      if (!orderData) {
        setError("Order not found. Please check your order history.");
        setLoading(false);
        return;
      }

      // Security check: verify this order belongs to the logged-in customer
      const orderCustomerId = orderData.customer_id;
      const orderCustomerEmail = (orderData.customer_email || "").toLowerCase();

      const isAuthorized =
        (currentUserId && orderCustomerId === currentUserId) ||
        (currentEmail && orderCustomerEmail === currentEmail.toLowerCase());

      if (!isAuthorized && currentUserId) {
        setError("You are not authorized to view this order.");
        setLoading(false);
        return;
      }

      // Enhance order items with product images and slugs
      const productIds = (orderData.order_items || [])
        .map((i: any) => i.product_id)
        .filter(Boolean);

      let productMap = new Map<string, any>();
      if (productIds.length > 0) {
        const { data: prodData } = await supabase
          .from("products")
          .select("id, name, slug, image_url, price, stock, category_slug")
          .in("id", productIds);

        if (prodData) {
          prodData.forEach((p) => productMap.set(p.id, p));
        }
      }

      const enhancedOrder = {
        ...orderData,
        order_items: (orderData.order_items || []).map((i: any) => ({
          ...i,
          product_info: productMap.get(i.product_id) || null,
        })),
      };

      setOrder(enhancedOrder);

      // Load recommended products
      loadRecommendations(productMap);
    } catch (err: any) {
      console.error("Failed to load order details:", err);
      setError(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  const loadRecommendations = async (purchasedProductsMap: Map<string, any>) => {
    try {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, slug, image_url, price, stock, category_slug")
        .gt("stock", 0)
        .limit(8);

      if (prods && prods.length > 0) {
        // Filter out items already purchased in this order
        const purchasedIds = new Set(purchasedProductsMap.keys());
        const filtered = prods.filter((p) => !purchasedIds.has(p.id)).slice(0, 4);
        setRecommendedProducts(filtered.length > 0 ? filtered : prods.slice(0, 4));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Realtime subscription for this specific order
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`customer_order_realtime_${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        () => loadOrder()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, loadOrder]);

  // Determine current active status step index
  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const status = order.status || "Pending";
    if (status === "Cancelled") return -1;
    const idx = TRACKING_STEPS.findIndex(
      (s) => s.key.toLowerCase() === status.toLowerCase()
    );
    return idx >= 0 ? idx : 0;
  }, [order]);

  // Handle Reorder
  const handleReorder = async () => {
    if (!order?.order_items || order.order_items.length === 0) {
      return toast.error("No items available to reorder.");
    }

    setReordering(true);
    try {
      let addedCount = 0;
      for (const item of order.order_items) {
        const slug = item.product_info?.slug || item.product_id;
        if (slug) {
          addToCart(slug, item.quantity || 1);
          addedCount += item.quantity || 1;
        }
      }

      toast.success(`Added ${addedCount} item(s) to your basket!`);
      navigate({ to: "/cart" });
    } catch (err: any) {
      toast.error("Reorder failed: " + err.message);
    } finally {
      setReordering(false);
    }
  };

  // Handle Download VAT Invoice
  const handleDownloadVATInvoice = () => {
    if (!order) return;

    try {
      const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const invoiceNo = `INV-${(order.order_number || order.id).replace("JSS-", "")}`;
      const addressObj =
        typeof order.delivery_address === "string"
          ? JSON.parse(order.delivery_address)
          : order.delivery_address || {};

      const subtotal = Number(order.subtotal || 0);
      const shippingFee = Number(order.shipping_fee || 0);
      const vatAmount = subtotal * 0.2;
      const grandTotal = Number(order.total || subtotal + vatAmount + shippingFee);

      const itemsHtml = (order.order_items || [])
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
    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e31b23; padding-bottom: 20px; margin-bottom: 30px; }
    .company-title { font-size: 24px; font-weight: 900; color: #e31b23; margin: 0; }
    .inv-title { font-size: 28px; font-weight: 900; text-align: right; color: #0f172a; margin: 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; }
    .totals-table { width: 300px; margin-left: auto; border: none; }
    .totals-table td { padding: 6px 10px; }
    .grand-total { font-size: 18px; font-weight: 900; color: #e31b23; border-top: 2px solid #e2e8f0; }
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
      `;

      const blob = new Blob([invoiceHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VAT_Invoice_${invoiceNo}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`VAT Tax Invoice #${invoiceNo} downloaded!`);
    } catch (err: any) {
      toast.error("Failed to generate invoice: " + err.message);
    }
  };

  // Handle Order Cancellation
  const confirmCancelOrder = async () => {
    if (!order || !cancellationReason) {
      return toast.error("Please select a reason for cancellation.");
    }

    setCancelling(true);
    try {
      const finalReason =
        cancellationReason === "Other" && customReasonText.trim()
          ? `Other: ${customReasonText.trim()}`
          : cancellationReason;

      // 1. Update order status to Cancelled in Supabase
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "Cancelled",
          notes: `Cancelled by customer. Reason: ${finalReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updErr) throw updErr;

      // 2. Record status history
      const { data: authUser } = await supabase.auth.getUser();
      await supabase.from("order_status_history").insert([
        {
          order_id: order.id,
          status: "Cancelled",
          actor_id: authUser?.user?.id || null,
          actor_name: user?.name || "Customer",
          notes: `Order cancelled by customer. Reason: ${finalReason}`,
        },
      ]);

      // 3. Release product inventory back to database
      for (const item of order.order_items || []) {
        if (item.product_id) {
          try {
            const { data: prod } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (prod) {
              await supabase
                .from("products")
                .update({ stock: prod.stock + (item.quantity || 1) })
                .eq("id", item.product_id);
            }
          } catch {
            /* ignore inventory rollback warning */
          }
        }
      }

      toast.success(`Order #${order.order_number} cancelled successfully.`);
      setCancelModalOpen(false);
      await loadOrder();
    } catch (err: any) {
      toast.error("Failed to cancel order: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const isCancellable = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === "pending" || s === "approved";
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered")
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-xs px-3 py-1 gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Delivered
        </Badge>
      );
    if (s === "out for delivery" || s === "in transit")
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-extrabold text-xs px-3 py-1 gap-1.5 animate-pulse">
          <Truck className="h-3.5 w-3.5 text-blue-600" /> Out for Delivery
        </Badge>
      );
    if (s === "packed")
      return (
        <Badge className="bg-rose-50 text-primary border-rose-200 font-extrabold text-xs px-3 py-1 gap-1.5">
          <Package className="h-3.5 w-3.5 text-primary" /> Packed
        </Badge>
      );
    if (s === "approved")
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-extrabold text-xs px-3 py-1 gap-1.5">
          <Check className="h-3.5 w-3.5 text-amber-600" /> Confirmed
        </Badge>
      );
    if (s === "cancelled")
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-extrabold text-xs px-3 py-1 gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-slate-500" /> Cancelled
        </Badge>
      );
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-extrabold text-xs px-3 py-1 gap-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-600" /> Order Placed
      </Badge>
    );
  };

  const deliveryAddress = useMemo(() => {
    if (!order) return {};
    if (typeof order.delivery_address === "string") {
      try {
        return JSON.parse(order.delivery_address);
      } catch {
        return { street: order.delivery_address };
      }
    }
    return order.delivery_address || {};
  }, [order]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl border p-8 space-y-6 shadow-xs animate-pulse">
          <div className="h-6 w-1/3 bg-slate-100 rounded-md" />
          <div className="h-32 bg-slate-50 rounded-xl" />
          <div className="h-48 bg-slate-50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4 max-w-md mx-auto my-8">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display font-extrabold text-xl text-slate-900">
            Order Not Found
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {error || "We couldn't locate this order in your customer account."}
          </p>
        </div>
        <div className="pt-3 flex justify-center gap-2">
          <Button
            asChild
            className="rounded-xl font-extrabold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-10 px-5 gap-2"
          >
            <Link to="/account/orders">
              <ArrowLeft className="h-4 w-4" /> Back to My Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "Cancelled";

  return (
    <div className="space-y-6 sm:space-y-7 max-w-5xl">
      {/* ============================================================ */}
      {/* 1. TOP BAR & ORDER HEADER                                    */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to My Orders
            </Link>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
                Order #{order.order_number || order.id.slice(0, 8)}
              </h1>
              {getStatusBadge(order.status)}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Placed on{" "}
              <span className="font-semibold text-slate-700">
                {new Date(order.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>{" "}
              at{" "}
              <span className="font-semibold text-slate-700">
                {new Date(order.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>

          {/* Header Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadVATInvoice}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 h-9 px-3.5 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> VAT Invoice
            </Button>

            {!isCancelled && (
              <Button
                size="sm"
                onClick={handleReorder}
                disabled={reordering}
                className="rounded-xl font-extrabold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-9 px-4 gap-1.5"
              >
                {reordering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Reorder
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MODERN ANIMATED DELIVERY TRACKING SECTION                 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-extrabold text-slate-900 leading-snug">
                Delivery Progression & Live Tracking
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time fulfillment updates from John Stayte Services Whitminster depot
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </div>
        </div>

        {isCancelled ? (
          /* CANCELLED ORDER STATE */
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <XCircle className="h-5 w-5" />
            </div>
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Order Cancelled
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {order.notes || "This order was cancelled. No delivery will be made, and allocated inventory has been restored."}
            </p>
          </div>
        ) : (
          /* ACTIVE ANIMATED TRACKING TIMELINE */
          <div className="py-2 sm:py-4">
            {/* Desktop / Tablet Horizontal Timeline */}
            <div className="hidden sm:block relative">
              {/* Background connecting line */}
              <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 z-0" />
              {/* Progress active bar */}
              <div
                className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-500 via-primary to-primary transition-all duration-500 z-0"
                style={{
                  width: `${(Math.max(0, currentStepIndex) / (TRACKING_STEPS.length - 1)) * 90}%`,
                }}
              />

              <div className="grid grid-cols-5 relative z-10">
                {TRACKING_STEPS.map((step, idx) => {
                  const isCompleted = currentStepIndex > idx;
                  const isCurrent = currentStepIndex === idx;
                  const isUpcoming = currentStepIndex < idx;

                  const historyEntry = order.order_status_history?.find(
                    (h: any) => h.status?.toLowerCase() === step.key.toLowerCase()
                  );

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center px-1">
                      {/* Step Bubble with Animated Delivery Indicator */}
                      <div className="relative">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                            isCurrent
                              ? "bg-primary text-white ring-4 ring-primary/20 shadow-md scale-110"
                              : isCompleted
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-white text-slate-400 border-2 border-slate-200"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : isCurrent && step.key === "Out for Delivery" ? (
                            <Truck className="h-5 w-5 animate-bounce-subtle motion-safe:animate-pulse" />
                          ) : isCurrent ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {/* Animated vehicle glider on active step */}
                        {isCurrent && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs animate-pulse">
                            ACTIVE
                          </div>
                        )}
                      </div>

                      {/* Step Labels */}
                      <p
                        className={`text-xs font-extrabold mt-3 leading-tight ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>

                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                        {step.desc}
                      </p>

                      {historyEntry && (
                        <span className="text-[10px] text-slate-500 font-mono mt-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {new Date(historyEntry.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Vertical Timeline */}
            <div className="sm:hidden space-y-4 relative pl-7 border-l-2 border-slate-100 ml-3">
              {TRACKING_STEPS.map((step, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                const historyEntry = order.order_status_history?.find(
                  (h: any) => h.status?.toLowerCase() === step.key.toLowerCase()
                );

                return (
                  <div key={step.key} className="relative space-y-0.5">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[35px] top-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? "bg-primary text-white ring-4 ring-primary/20"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? "text-primary" : isCompleted ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>

                      {historyEntry && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(historyEntry.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. 2-COLUMN MAIN CONTENT (Items & Delivery | Summary)        */}
      {/* ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* LEFT COLUMN: ORDER ITEMS & DELIVERY DETAILS */}
        <div className="space-y-5">
          {/* ORDER ITEMS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-display font-extrabold text-slate-900">
                  Order Items ({order.order_items?.length || 0})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Gloucestershire Depot Direct
              </span>
            </div>

            <div className="p-5 divide-y divide-slate-100">
              {order.order_items?.map((item: any, idx: number) => {
                const slug = item.product_info?.slug;
                const ItemWrapper = slug ? Link : "div";
                const wrapperProps = slug
                  ? { to: "/products/$slug" as const, params: { slug } }
                  : {};

                return (
                  <div
                    key={idx}
                    className={`py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 ${
                      slug ? "group cursor-pointer" : ""
                    }`}
                  >
                    <ItemWrapper {...(wrapperProps as any)} className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0 group-hover:border-slate-300 transition-colors">
                        {item.product_info?.image_url ? (
                          <img
                            src={cleanImageUrl(item.product_info.image_url, item.product_info.slug)}
                            alt={item.product_name}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 text-primary/70" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-1">
                          {item.product_name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Qty: <span className="font-bold text-slate-800">{item.quantity}</span> × {gbp(Number(item.unit_price))}
                        </p>
                        {item.product_info?.category_slug && (
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {item.product_info.category_slug}
                          </span>
                        )}
                      </div>
                    </ItemWrapper>

                    <div className="text-right shrink-0">
                      <p className="font-display font-black text-sm text-slate-900">
                        {gbp(Number(item.total_price))}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        incl. VAT
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DELIVERY DETAILS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-display font-extrabold text-slate-900">
                Delivery Address & Instructions
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Recipient Name
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {deliveryAddress.name || order.customer_name || user?.name || "Customer"}
                </p>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {deliveryAddress.street || "Delivery address on file"}
                </p>
                <p className="font-mono font-bold text-slate-900">
                  {deliveryAddress.postcode || ""}
                </p>
                {deliveryAddress.phone && (
                  <p className="text-slate-500 flex items-center gap-1 pt-1">
                    <Phone className="h-3 w-3 text-slate-400" /> {deliveryAddress.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Fulfillment Fleet Details
                </span>
                <div className="space-y-1 text-slate-700 font-medium">
                  <p>
                    <span className="text-slate-500">Method:</span> Local Tanker / Cylinder Fleet
                  </p>
                  <p>
                    <span className="text-slate-500">Depot:</span>{" "}
                    {order.assigned_depot || "Whitminster Main Depot (GL2)"}
                  </p>
                  {order.assigned_driver && (
                    <p className="font-semibold text-primary">
                      <span className="text-slate-500 font-normal">Assigned Driver:</span>{" "}
                      {order.assigned_driver}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRICE SUMMARY & USEFUL ACTIONS */}
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* PRICE SUMMARY CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
              Payment & Order Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal (ex. VAT)</span>
                <span className="font-bold text-slate-900">{gbp(Number(order.subtotal || 0))}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery Charge</span>
                <span className="font-bold text-slate-900">
                  {Number(order.shipping_fee) === 0 ? "FREE" : gbp(Number(order.shipping_fee))}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 font-medium">
                <span>VAT (Standard 20%)</span>
                <span className="font-bold text-slate-900">
                  {gbp(Number(order.subtotal || 0) * 0.2)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-2.5 flex justify-between items-baseline">
                <span className="font-display font-black text-sm text-slate-900">Total Amount</span>
                <span className="font-display font-black text-lg text-primary">
                  {gbp(Number(order.total || 0))}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {!isCancelled && (
                <Button
                  onClick={handleReorder}
                  disabled={reordering}
                  className="w-full rounded-xl font-extrabold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-10 gap-2"
                >
                  {reordering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Reorder These Items
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleDownloadVATInvoice}
                className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Download VAT Invoice
              </Button>

              {isCancellable(order.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                  className="w-full rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel This Order
                </Button>
              )}
            </div>
          </div>

          {/* NEED HELP CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <HelpCircle className="h-4 w-4" /> Need Help With This Order?
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Have questions regarding delivery schedule, tank access, or bottle return?
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-primary hover:bg-primary/5 h-8.5"
            >
              <Link to="/account/support">
                Contact Customer Support <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. "SHOP MORE PRODUCTS" / "YOU MAY ALSO LIKE" SECTION        */}
      {/* ============================================================ */}
      {recommendedProducts.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 tracking-tight">
                Shop More Products
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Frequently purchased fuels, heaters, and accessories
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-primary hover:text-primary"
            >
              <Link to="/products">
                View All Products <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <Link to="/products/$slug" params={{ slug: p.slug }} className="space-y-2.5 block group">
                  <div className="h-32 rounded-xl bg-slate-50 p-2 flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={cleanImageUrl(p.image_url, p.slug)}
                        alt={p.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <Flame className="h-8 w-8 text-primary/60" />
                    )}
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {p.name}
                  </h3>
                </Link>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="font-display font-black text-sm text-slate-900">
                      {gbp(p.price)}
                    </span>
                    <span className="block text-[10px] font-semibold text-emerald-600">
                      In Stock
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      addToCart(p.slug, 1);
                      toast.success(`Added ${p.name} to basket`);
                    }}
                    className="rounded-xl font-extrabold text-[11px] bg-primary hover:bg-primary/90 text-white h-8 px-3"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. CANCELLATION CONFIRMATION MODAL                           */}
      {/* ============================================================ */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Cancel Order #{order.order_number || order.id.slice(0, 8)}?
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-slate-600 space-y-3">
            <p>
              Are you sure you want to cancel this order? Allocated stock will be restored to inventory and the status will update in Supabase.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border font-bold text-slate-900">
              Total Order Amount: {gbp(Number(order.total))}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 block">
                Reason for cancellation <span className="text-rose-500">*</span>
              </label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger className="w-full rounded-xl bg-white border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cancellationReason === "Other" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Explain reason (optional):
                </label>
                <Input
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="Provide details..."
                  className="rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={cancelling}
              onClick={() => setCancelModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Keep Order
            </Button>

            <Button
              size="sm"
              disabled={cancelling || !cancellationReason}
              onClick={confirmCancelOrder}
              className="rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Confirm Cancellation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
