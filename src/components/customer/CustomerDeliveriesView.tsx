import { useState, useEffect, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Truck,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";
import { products as catalogProducts } from "@/data/catalog";
import { MeeshoDeliveryTracker } from "./MeeshoDeliveryTracker";

export function CustomerDeliveriesView() {
  const { user } = useStore();
  const routerState = useRouterState();
  const [orders, setOrders] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  // Selected delivery for Meesho-style Track Order modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadCustomerDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id;

      if (!currentUserId) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // 1. Fetch customer's orders from Supabase (strictly filtered by customer_id)
      const { data: customerOrders, error: ordersErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("customer_id", currentUserId)
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      const loadedOrders = customerOrders || [];
      setOrders(loadedOrders);

      if (loadedOrders.length > 0) {
        // 2. Fetch matching delivery assignments
        const orderIds = loadedOrders.map((o) => o.id);
        const { data: assignmentsData } = await supabase
          .from("delivery_assignments")
          .select("*")
          .in("order_id", orderIds);

        const assignmentMap: Record<string, any> = {};
        (assignmentsData || []).forEach((a) => {
          if (a.order_id) assignmentMap[a.order_id] = a;
        });
        setAssignments(assignmentMap);

        // 3. Fetch product records for authentic product images
        const productIds = Array.from(
          new Set(
            loadedOrders
              .flatMap((o) => (o.order_items || []).map((i: any) => i.product_id))
              .filter(Boolean),
          ),
        );

        if (productIds.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select("id, name, slug, image_url, price")
            .in("id", productIds);

          const pMap: Record<string, any> = {};
          (prods || []).forEach((p) => {
            pMap[p.id] = p;
          });
          setProductsMap(pMap);
        }
      }

      // Check if URL specifies an orderId parameter
      const params = new URLSearchParams(window.location.search);
      const targetOrderId = params.get("orderId");
      if (targetOrderId && loadedOrders.length > 0) {
        const match = loadedOrders.find(
          (o) => o.id === targetOrderId || o.order_number === targetOrderId,
        );
        if (match) setSelectedOrder(match);
      }
    } catch (err: any) {
      console.error("Failed to load deliveries:", err);
      toast.error("Failed to load deliveries: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCustomerDeliveries();

    // Supabase Realtime synchronization
    const ordersChannel = supabase
      .channel("customer_deliveries_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        loadCustomerDeliveries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadCustomerDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [loadCustomerDeliveries]);

  // Active / Non-completed deliveries: status not Delivered or Cancelled
  const activeDeliveries = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  const displayedOrders = (activeTab === "active" ? activeDeliveries : orders).filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesNum = (o.order_number || o.id).toLowerCase().includes(q);
    const matchesItems = (o.order_items || []).some((item: any) =>
      (item.product_name || "").toLowerCase().includes(q),
    );
    return matchesNum || matchesItems;
  });

  const getStatusBadge = (status: string, assignment?: any) => {
    const s = (status || "").toLowerCase();
    const aStatus = (assignment?.status || "").toLowerCase();

    if (aStatus === "delayed") {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Delayed
        </Badge>
      );
    }

    if (s === "out for delivery" || aStatus === "out for delivery") {
      return (
        <Badge className="bg-emerald-600 text-white border-transparent text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Truck className="h-3 w-3" /> Out for Delivery
        </Badge>
      );
    }

    if (s === "packed" || s === "processing") {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Packed
        </Badge>
      );
    }

    if (s === "approved") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Confirmed
        </Badge>
      );
    }

    if (s === "delivered") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Delivered
        </Badge>
      );
    }

    if (s === "cancelled") {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Cancelled
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
        Order Placed
      </Badge>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with Tab & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-0.5">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-bold">Active Deliveries</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Active Deliveries
              <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {activeDeliveries.length}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCustomerDeliveries}
              className="h-8 rounded-full text-xs font-bold gap-1 border-slate-200 bg-white"
            >
              <RotateCcw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "active"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Active ({activeDeliveries.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Orders ({orders.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order or item..."
              className="pl-8.5 h-8.5 rounded-full text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* 2. Deliveries List (Meesho-Style Compact Cards) */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-2">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold">Loading active deliveries...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-xs space-y-3 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <Truck className="h-6 w-6 text-slate-300" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">
            {activeTab === "active" ? "No Active Deliveries" : "No Orders Found"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {activeTab === "active"
              ? "All your gas cylinder orders have been delivered or you haven't placed a new order yet."
              : "No orders found in your account."}
          </p>
          <div className="pt-2">
            <Button
              asChild
              size="sm"
              className="rounded-full text-xs font-bold bg-primary text-white"
            >
              <Link to="/products">Browse Gas Cylinders</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const assignment = assignments[order.id];
            const firstItem = (order.order_items || [])[0];
            const totalQty = (order.order_items || []).reduce(
              (acc: number, i: any) => acc + (i.quantity || 1),
              0,
            );

            // Resolve real product image from products table or catalog
            const prod = firstItem?.product_id ? productsMap[firstItem.product_id] : null;
            const catalogMatch = catalogProducts.find(
              (p) =>
                p.name.toLowerCase() === (firstItem?.product_name || "").toLowerCase() ||
                p.slug === prod?.slug,
            );
            const productImage = cleanImageUrl(
              prod?.image_url || catalogMatch?.image,
              prod?.slug || catalogMatch?.slug,
            );

            const productName = firstItem?.product_name || "Gas Cylinder Supply";

            const expectedDate = assignment?.dispatched_at
              ? formatDate(assignment.dispatched_at)
              : formatDate(
                  new Date(
                    new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000,
                  ).toISOString(),
                );
            const timeSlot = assignment?.time_slot || "Morning (08:00 - 12:00)";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Product Image & Order Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Product Image */}
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    <img
                      src={productImage}
                      alt={productName}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDate(order.created_at)}
                      </span>
                      <span className="ml-auto sm:ml-0">
                        {getStatusBadge(order.status, assignment)}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-snug">
                      {productName}
                      {order.order_items?.length > 1 && (
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          +{order.order_items.length - 1} more
                        </span>
                      )}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>
                        Qty: <strong className="text-slate-800 font-bold">{totalQty}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Total:{" "}
                        <strong className="text-slate-900 font-extrabold">
                          {gbp(order.total || 0)}
                        </strong>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                      <Clock className="h-3 w-3 text-amber-500" />
                      Expected: <strong className="text-slate-700">{expectedDate}</strong>
                      {timeSlot && <span className="text-slate-400">({timeSlot})</span>}
                    </p>
                  </div>
                </div>

                {/* Right: Clean "Track Order" Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <Button
                    onClick={() => setSelectedOrder(order)}
                    className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-white h-9 px-5 shadow-xs gap-1.5 cursor-pointer"
                  >
                    Track Order
                  </Button>
                  <Link
                    to={`/account/orders/${order.id}` as never}
                    className="text-[11px] text-slate-500 hover:text-primary font-semibold transition-colors flex items-center gap-0.5"
                  >
                    Order Details <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Clean Meesho-Style Track Order Dialog Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md p-5 sm:p-6 bg-white rounded-3xl overflow-y-auto max-h-[90vh]">
          {selectedOrder && (
            <MeeshoDeliveryTracker
              order={selectedOrder}
              deliveryAssignment={assignments[selectedOrder.id]}
              productInfo={
                selectedOrder.order_items?.[0]?.product_id
                  ? productsMap[selectedOrder.order_items[0].product_id]
                  : null
              }
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
