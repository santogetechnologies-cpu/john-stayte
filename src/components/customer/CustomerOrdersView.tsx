import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  RotateCcw,
  ChevronRight,
  MapPin,
  Filter,
  ArrowUpDown,
  XCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const STATUS_STEPS = ["Pending", "Approved", "Packed", "Out for Delivery", "Delivered"];

const CANCELLATION_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery taking too long",
  "Product no longer needed",
  "Other",
];

export function CustomerOrdersView() {
  const { user, addToCart } = useStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Cancellation Confirmation State & Reason Selection
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [customReasonText, setCustomReasonText] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Load real customer orders from Supabase with items and product images
  const loadCustomerOrders = async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentEmail = authUser?.user?.email || user?.email;

      if (!currentEmail) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_status_history(*)")
        .or(`customer_email.eq.${currentEmail},customer_id.eq.${authUser?.user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (orderData && orderData.length > 0) {
        const productIds = Array.from(
          new Set(
            orderData
              .flatMap((o) => o.order_items || [])
              .map((i: any) => i.product_id)
              .filter(Boolean),
          ),
        );

        let productMap = new Map<string, any>();
        if (productIds.length > 0) {
          const { data: prodData } = await supabase
            .from("products")
            .select("id, name, slug, image_url, price, stock")
            .in("id", productIds);

          if (prodData) {
            prodData.forEach((p) => productMap.set(p.id, p));
          }
        }

        const enhancedOrders = orderData.map((o) => ({
          ...o,
          order_items: (o.order_items || []).map((i: any) => ({
            ...i,
            product_info: productMap.get(i.product_id) || null,
          })),
        }));

        setOrders(enhancedOrders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("Failed to load customer orders:", err);
      toast.error("Failed to load order history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerOrders();
  }, [user]);

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    let result = orders.slice();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const orderNum = (o.order_number || o.id).toLowerCase();
        const statusStr = (o.status || "").toLowerCase();
        const hasItemMatch = o.order_items?.some((i: any) =>
          (i.product_name || "").toLowerCase().includes(q),
        );
        return orderNum.includes(q) || statusStr.includes(q) || hasItemMatch;
      });
    }

    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Reorder Handler: verifies live products in database
  const handleReorder = async (order: any) => {
    if (!order.order_items || order.order_items.length === 0) {
      return toast.error("No items found in this order.");
    }

    setReorderingId(order.id);
    try {
      let readdedCount = 0;

      for (const item of order.order_items) {
        let query = supabase.from("products").select("id, slug, name, price, stock");
        if (item.product_id) {
          query = query.eq("id", item.product_id);
        } else {
          query = query.ilike("name", item.product_name);
        }

        const { data: liveProd } = await query.single();

        if (liveProd && liveProd.stock > 0) {
          addToCart(liveProd.slug, Math.min(item.quantity || 1, liveProd.stock));
          readdedCount += Math.min(item.quantity || 1, liveProd.stock);
        }
      }

      if (readdedCount > 0) {
        toast.success(`Readded ${readdedCount} available item(s) to your basket!`);
        navigate({ to: "/cart" });
      } else {
        toast.error("Items from this order are currently out of stock.");
      }
    } catch (err: any) {
      toast.error("Reorder failed: " + err.message);
    } finally {
      setReorderingId(null);
    }
  };

  // Real Order Cancellation Handler with Reason
  const confirmCancelOrder = async () => {
    if (!orderToCancel || !cancellationReason) return;

    const finalReason =
      cancellationReason === "Other"
        ? customReasonText.trim() || "Other reason"
        : cancellationReason;

    setCancelling(true);
    try {
      // Call atomic RPC function cancel_customer_order with reason parameter
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("cancel_customer_order", {
        target_order_id: orderToCancel.id,
        reason_text: finalReason,
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        const errorMsg = rpcErr?.message || rpcRes?.error || "Order cancellation failed.";
        toast.error(errorMsg);
        return;
      }

      toast.success(
        `Order #${orderToCancel.order_number || orderToCancel.id.slice(0, 8)} cancelled successfully.`,
      );
      setOrderToCancel(null);
      setCancellationReason("");
      setCustomReasonText("");
      await loadCustomerOrders();
    } catch (err: any) {
      console.error("Cancellation error:", err);
      toast.error("Cancellation error: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Helper to check if order can be cancelled
  const isCancellable = (status: string) => {
    return status === "Pending" || status === "Approved";
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">My Orders</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          My Orders ({orders.length})
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Track your orders, delivery status and purchase history.
        </p>
      </div>

      {/* 2. TOOLBAR (SEARCH + FILTER + SORT) */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, product name, or status..."
              className="pl-10 rounded-full bg-slate-50/80 border-slate-200 text-xs font-medium focus-visible:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Packed">Packed</SelectItem>
                <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-40 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Packed", value: "Packed" },
            { label: "Out for Delivery", value: "Out for Delivery" },
            { label: "Delivered", value: "Delivered" },
            { label: "Cancelled", value: "Cancelled" },
          ].map((st) => (
            <button
              key={st.value}
              onClick={() => setStatusFilter(st.value)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                statusFilter === st.value
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. ORDER CARDS LIST */}
      {loading ? (
        <div className="surface-card p-12 text-center text-xs text-muted-foreground font-bold rounded-3xl border bg-white shadow-xs">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading your order history from Supabase...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">
              {searchQuery || statusFilter !== "ALL" ? "No matching orders" : "No orders yet"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {searchQuery || statusFilter !== "ALL"
                ? "No purchases match your search or status filter."
                : "Your completed purchases will appear here."}
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="rounded-full font-bold text-xs gap-2 shadow-md">
              <Link to="/products">
                Start Shopping <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((o) => {
            const items = o.order_items || [];
            const firstItem = items[0] || null;
            const remainingCount = Math.max(0, items.length - 1);
            const isCancelled = o.status === "Cancelled";
            const canCancel = isCancellable(o.status);

            const imageUrl =
              firstItem?.product_info?.image_url || "/placeholder.svg";

            const streetAddress = o.delivery_address?.street || o.delivery_address?.name || "";
            const postcode = o.delivery_address?.postcode || "";
            const formattedDate = new Date(o.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={o.id}
                className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* CARD HEADER */}
                <div className="bg-slate-50/80 px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-extrabold text-foreground">
                      ORDER #{o.order_number || o.id.slice(0, 8)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-muted-foreground font-medium">Placed {formattedDate}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-black text-foreground">{gbp(Number(o.total))}</span>
                  </div>

                  {streetAddress && (
                    <span className="text-[11px] text-muted-foreground font-medium truncate max-w-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      Delivered to: {streetAddress} {postcode ? `(${postcode})` : ""}
                    </span>
                  )}
                </div>

                {/* CARD BODY */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-16 w-16 rounded-2xl bg-slate-50 border p-1.5 grid place-items-center shrink-0">
                      {imageUrl && imageUrl !== "/placeholder.svg" ? (
                        <img
                          src={imageUrl}
                          alt={firstItem?.product_name || "Product"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Package className="h-7 w-7 text-primary/70" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {firstItem?.product_name || "John Stayte Services Order"}
                      </p>

                      {firstItem && (
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                          Quantity: {firstItem.quantity} × {gbp(Number(firstItem.unit_price))}
                        </p>
                      )}

                      {remainingCount > 0 && (
                        <Link
                          to="/account/orders/$orderId"
                          params={{ orderId: o.id }}
                          className="text-[11px] font-bold text-primary hover:underline block mt-1"
                        >
                          + {remainingCount} more item(s) in this order
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2">
                      {isCancelled ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold text-[11px] px-3 py-1">
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Cancelled
                        </Badge>
                      ) : o.status === "Delivered" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px] px-3 py-1">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Delivered
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`font-bold text-[11px] px-3 py-1 ${
                            o.status === "Out for Delivery"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : o.status === "Packed"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : o.status === "Approved"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Clock className="mr-1 h-3.5 w-3.5" /> {o.status}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Real Cancel Order Button for eligible orders */}
                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOrderToCancel(o);
                            setCancellationReason("");
                            setCustomReasonText("");
                          }}
                          className="rounded-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel Order
                        </Button>
                      )}

                      {!isCancelled && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={reorderingId === o.id}
                          onClick={() => handleReorder(o)}
                          className="rounded-full text-xs font-bold gap-1.5"
                        >
                          {reorderingId === o.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Reorder
                        </Button>
                      )}

                      <Button
                        size="sm"
                        asChild
                        className="rounded-full text-xs font-bold gap-1 shadow-2xs"
                      >
                        <Link to="/account/orders/$orderId" params={{ orderId: o.id }}>
                          View Details <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CANCELLATION CONFIRMATION DIALOG WITH REASON SELECTION */}
      {orderToCancel && (
        <Dialog open={Boolean(orderToCancel)} onOpenChange={() => setOrderToCancel(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Cancel Order #{orderToCancel.order_number || orderToCancel.id.slice(0, 8)}?
              </DialogTitle>
            </DialogHeader>

            <div className="text-xs text-muted-foreground space-y-3">
              <p>
                Are you sure you want to cancel this order? Stock will be released and the status updated to Cancelled in Supabase.
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border text-foreground font-bold">
                Total Amount: {gbp(Number(orderToCancel.total))}
              </div>

              {/* Reason Dropdown Required */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-foreground block">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <Select value={cancellationReason} onValueChange={setCancellationReason}>
                  <SelectTrigger className="w-full rounded-2xl bg-white border-slate-200 text-xs font-semibold">
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

              {/* Optional Custom Reason Input if 'Other' selected */}
              {cancellationReason === "Other" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    Explain reason (optional):
                  </label>
                  <Input
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Provide details..."
                    className="rounded-2xl text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={cancelling}
                onClick={() => setOrderToCancel(null)}
                className="rounded-full text-xs font-bold"
              >
                Keep Order
              </Button>

              <Button
                size="sm"
                disabled={cancelling || !cancellationReason}
                onClick={confirmCancelOrder}
                className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-sm disabled:opacity-50"
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
      )}
    </div>
  );
}
