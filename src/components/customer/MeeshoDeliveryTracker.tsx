import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  XCircle,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";

interface MeeshoDeliveryTrackerProps {
  order: any;
  deliveryAssignment?: any;
  productInfo?: any;
  onClose?: () => void;
}

export function MeeshoDeliveryTracker({
  order: initialOrder,
  deliveryAssignment: initialAssignment,
  productInfo: initialProductInfo,
  onClose,
}: MeeshoDeliveryTrackerProps) {
  const [order, setOrder] = useState<any>(initialOrder);
  const [assignment, setAssignment] = useState<any>(initialAssignment);
  const [productInfo, setProductInfo] = useState<any>(initialProductInfo);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    setAssignment(initialAssignment);
  }, [initialAssignment]);

  useEffect(() => {
    setProductInfo(initialProductInfo);
  }, [initialProductInfo]);

  // Load product info if missing
  useEffect(() => {
    async function loadProduct() {
      if (productInfo) return;
      const firstItem = (order?.order_items || [])[0];
      if (firstItem?.product_id) {
        const { data: p } = await supabase
          .from("products")
          .select("id, name, slug, image_url, price")
          .eq("id", firstItem.product_id)
          .maybeSingle();
        if (p) setProductInfo(p);
      }
    }
    loadProduct();
  }, [order, productInfo]);

  // Real-time Supabase subscription on this order & delivery assignment
  useEffect(() => {
    if (!order?.id) return;

    const reloadOrderData = async () => {
      try {
        const { data: updatedOrder } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", order.id)
          .single();

        if (updatedOrder) setOrder(updatedOrder);

        const { data: updatedAssignment } = await supabase
          .from("delivery_assignments")
          .select("*")
          .eq("order_id", order.id)
          .maybeSingle();

        if (updatedAssignment) setAssignment(updatedAssignment);
      } catch (e) {
        console.warn("Realtime order update error:", e);
      }
    };

    const channel = supabase
      .channel(`customer_meesho_tracking_${order.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        () => reloadOrderData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_assignments", filter: `order_id=eq.${order.id}` },
        () => reloadOrderData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order.id)
        .single();

      if (updatedOrder) setOrder(updatedOrder);

      const { data: updatedAssignment } = await supabase
        .from("delivery_assignments")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();

      if (updatedAssignment) setAssignment(updatedAssignment);
    } catch (e) {
      console.warn("Manual refresh failed:", e);
    } finally {
      setRefreshing(false);
    }
  };

  if (!order) return null;

  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  };

  const orderStatus = (order.status || "Pending").toLowerCase();
  const assignmentStatus = (assignment?.status || "").toLowerCase();
  const isCancelled = orderStatus === "cancelled";
  const isDelayed = assignmentStatus === "delayed";

  const isRefillOrder =
    Boolean(order.notes?.includes("[REFILL]")) ||
    Boolean(order.order_number?.startsWith("CYL-REF")) ||
    orderStatus.includes("refill") ||
    orderStatus.includes("pickup") ||
    orderStatus.includes("empty");

  // Refill Stages:
  // 0: Refill Requested
  // 1: Pickup Scheduled / Assigned
  // 2: Empty Cylinder Collected
  // 3: Empty Cylinder Verified
  // 4: Refill In Progress / Completed
  // 5: Out for Delivery
  // 6: Delivered
  const getRefillStageIndex = () => {
    if (isCancelled) return -1;
    if (orderStatus.includes("delivered") || assignmentStatus.includes("delivered") || orderStatus.includes("completed")) return 6;
    if (orderStatus.includes("out for delivery") || assignmentStatus.includes("out for delivery")) return 5;
    if (orderStatus.includes("refill completed") || orderStatus.includes("refill in progress") || orderStatus.includes("refilling")) return 4;
    if (orderStatus.includes("empty cylinder verified") || orderStatus.includes("empty_verified") || orderStatus.includes("verified")) return 3;
    if (orderStatus.includes("empty cylinder collected") || orderStatus.includes("empty_collected") || orderStatus.includes("collected")) return 2;
    if (orderStatus.includes("pickup scheduled") || orderStatus.includes("pickup assigned") || assignmentStatus.includes("pickup")) return 1;
    return 0; // Refill Requested
  };

  // Standard Stages:
  // 0: Order Placed
  // 1: Confirmed
  // 2: Packed
  // 3: Out for Delivery
  // 4: Delivered
  const getStandardStageIndex = () => {
    if (isCancelled) return -1;
    if (orderStatus === "delivered" || assignmentStatus === "delivered") return 4;
    if (orderStatus === "out for delivery" || assignmentStatus === "out for delivery") return 3;
    if (orderStatus === "packed" || orderStatus === "processing") return 2;
    if (orderStatus === "approved") return 1;
    return 0; // Order Placed
  };

  const currentStageIndex = isRefillOrder ? getRefillStageIndex() : getStandardStageIndex();

  // Primary ordered item
  const firstItem = (order.order_items || [])[0];
  const itemsCount = (order.order_items || []).reduce((acc: number, i: any) => acc + (i.quantity || 1), 0);
  const productName = firstItem?.name || firstItem?.product_name || "Gas Cylinder Supply";
  const productImage = cleanImageUrl(productInfo?.image_url, productInfo?.slug);

  // Address
  const deliveryAddress =
    typeof order.shipping_address === "string"
      ? order.shipping_address
      : typeof order.delivery_address === "string"
      ? order.delivery_address
      : order.shipping_address?.street || order.delivery_address?.street || "Gloucestershire";

  // Timestamps
  const placedTime = order.created_at ? formatDateTime(order.created_at) : "";
  const confirmedTime = order.approved_at
    ? formatDateTime(order.approved_at)
    : currentStageIndex >= 1
    ? "Confirmed"
    : "";
  const packedTime = order.packed_at
    ? formatDateTime(order.packed_at)
    : currentStageIndex >= 2
    ? "Packed at Depot"
    : "";
  const dispatchedTime = assignment?.dispatched_at
    ? formatDateTime(assignment.dispatched_at)
    : currentStageIndex >= 3
    ? "Out for Delivery"
    : "";
  const deliveredTime =
    order.delivered_at || assignment?.delivered_at
      ? formatDateTime(order.delivered_at || assignment?.delivered_at)
      : "";

  const expectedDate = assignment?.dispatched_at
    ? formatDate(assignment.dispatched_at)
    : formatDate(new Date(new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString());
  const timeSlot = assignment?.time_slot || "Morning (08:00 - 12:00)";

  // Dynamic Timeline Steps based on order type
  const refillTimelineSteps = [
    {
      title: "Refill Requested",
      time: placedTime,
      activeNote: "Refill request logged. Empty cylinder pickup queued.",
    },
    {
      title: "Pickup Scheduled",
      time: currentStageIndex >= 1 ? "Driver Scheduled" : "",
      activeNote: assignment?.driver_name
        ? `Driver: ${assignment.driver_name} (${assignment.vehicle_identifier || "JS-CYL-FLEET"})`
        : "Driver assigned for empty bottle collection.",
    },
    {
      title: "Empty Collected",
      time: currentStageIndex >= 2 ? "Collected" : "",
      activeNote: "Empty cylinder collected from customer premises.",
    },
    {
      title: "Empty Verified",
      time: currentStageIndex >= 3 ? "Safety Verified" : "",
      activeNote: "Cylinder inspected & passed safety checks.",
    },
    {
      title: "Refill In Progress",
      time: currentStageIndex >= 4 ? "Station Refilled" : "",
      activeNote: "Cylinder refilled, tested & sealed at depot.",
    },
    {
      title: "Out for Delivery",
      time: currentStageIndex >= 5 ? dispatchedTime || "Dispatched" : "",
      activeNote: "Refilled cylinder on vehicle for drop-off.",
    },
    {
      title: "Delivered",
      time: deliveredTime,
      activeNote: "Refilled cylinder delivered to customer.",
    },
  ];

  const standardTimelineSteps = [
    {
      title: "Order Placed",
      time: placedTime,
      activeNote: "Your order details have been received.",
    },
    {
      title: "Confirmed",
      time: confirmedTime,
      activeNote: "Order confirmed by Whitminster depot.",
    },
    {
      title: "Packed",
      time: packedTime,
      activeNote: "Cylinders inspected and loaded for transit.",
    },
    {
      title: "Out for Delivery",
      time: dispatchedTime,
      activeNote: assignment?.driver_name
        ? `Driver: ${assignment.driver_name} (${assignment.vehicle_identifier || "GL72 JSS"})`
        : "Vehicle en-route to your address.",
    },
    {
      title: "Delivered",
      time: deliveredTime,
      activeNote: "Delivered safely to your specified location.",
    },
  ];

  const timelineSteps = isRefillOrder ? refillTimelineSteps : standardTimelineSteps;

  return (
    <div className="space-y-5">
      {/* 1. Header with live status & refresh */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-black text-slate-900">Track Order</h2>
          <p className="text-xs text-slate-400 font-mono">
            #{order.order_number || order.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Meesho-Style Product Info Card */}
      <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
        <div className="h-16 w-16 rounded-xl border border-slate-200/80 bg-white overflow-hidden shrink-0 flex items-center justify-center p-1">
          <img
            src={productImage}
            alt={productName}
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
            {productName}
          </h3>
          <p className="text-xs text-slate-500">
            Qty: <strong className="text-slate-700 font-bold">{firstItem?.quantity || 1}</strong>
            {itemsCount > (firstItem?.quantity || 1) && (
              <span className="text-[11px] text-slate-400 ml-1">
                (+{itemsCount - (firstItem?.quantity || 1)} more item)
              </span>
            )}
            {" • "}Total: <strong className="text-slate-900 font-bold">{gbp(order.total || 0)}</strong>
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Ordered on {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      {/* 3. Current Status Highlight Banner */}
      {isCancelled ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold text-rose-950">Order Cancelled</p>
            <p className="text-[11px] text-rose-700">This order was cancelled and will not be delivered.</p>
          </div>
        </div>
      ) : isDelayed ? (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-amber-950">Delivery Update: Rescheduled</p>
            <p className="text-[11px] text-amber-700">
              {assignment?.delay_reason || "Route hold"}. Scheduled for: {expectedDate}
            </p>
          </div>
        </div>
      ) : currentStageIndex === 4 ? (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 stroke-[3] shrink-0" />
          <div>
            <p className="font-bold text-emerald-950">Delivered</p>
            <p className="text-[11px] text-emerald-700">
              Your order was delivered on {deliveredTime || "schedule"}.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estimated Delivery
            </span>
            <Badge className="bg-primary hover:bg-primary text-white border-transparent text-[10px] font-bold px-2 py-0.5 rounded-full">
              {order.status || "In Progress"}
            </Badge>
          </div>
          <p className="text-sm font-black text-white">
            {currentStageIndex === 3 ? "Arriving Today" : `Expected by ${expectedDate}`}
          </p>
          <p className="text-[11px] text-slate-300 flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-400" /> Slot: {timeSlot}
          </p>
        </div>
      )}

      {/* 4. The Simple Meesho Status Timeline */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-1">
          Delivery Status
        </h4>

        {isCancelled ? (
          <div className="py-6 text-center text-xs text-slate-400 space-y-1">
            <XCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <p className="font-bold text-slate-700">Timeline cancelled</p>
          </div>
        ) : (
          <div className="relative pl-6 py-1 space-y-6">
            {/* Thin slender connecting line (NOT huge line) */}
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200 z-0" />

            {timelineSteps.map((step, idx) => {
              const isCompleted = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              const isUpcoming = currentStageIndex < idx;

              return (
                <div key={step.title} className="relative flex items-start gap-3.5 z-10">
                  {/* Small clean status indicator/check */}
                  <div className="relative -ml-[21px] shrink-0">
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        isCompleted
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-100"
                          : isCurrent
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-100 scale-105"
                          : "bg-white text-slate-300 border border-slate-300"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : isCurrent ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                      )}
                    </div>
                  </div>

                  {/* Step Title & Timestamp */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? "text-emerald-700"
                            : isCompleted
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.time && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {step.time}
                        </span>
                      )}
                    </div>

                    {isCurrent && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        {step.activeNote}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Delivery Address & Fleet Assignment */}
      <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
          <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery Address
        </div>
        <p className="text-slate-800 font-medium leading-relaxed">
          {deliveryAddress.name || order.customer_name || "Customer"},{" "}
          {deliveryAddress.street || order.customer_address || "Gloucestershire"}, {deliveryAddress.postcode || ""}
        </p>
        {assignment?.driver_name && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
            <span>Driver: <strong className="text-slate-800">{assignment.driver_name}</strong></span>
            <span className="font-mono">Vehicle: {assignment.vehicle_plate || "GL72 JSS"}</span>
          </div>
        )}
      </div>

      {/* 6. Footer Details Link */}
      <div className="pt-1 flex items-center justify-between text-xs">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full rounded-full text-xs font-bold h-9 border-slate-200"
        >
          <Link to={`/account/orders/${order.id}` as never}>
            View Full Order Invoice & Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
