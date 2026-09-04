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
  ShieldCheck,
  Calendar,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface FlipkartDeliveryTrackerProps {
  order: any;
  deliveryAssignment?: any;
  onBack?: () => void;
  isModal?: boolean;
}

export function FlipkartDeliveryTracker({
  order: initialOrder,
  deliveryAssignment: initialAssignment,
  onBack,
  isModal = false,
}: FlipkartDeliveryTrackerProps) {
  const [order, setOrder] = useState<any>(initialOrder);
  const [assignment, setAssignment] = useState<any>(initialAssignment);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state with incoming props
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    setAssignment(initialAssignment);
  }, [initialAssignment]);

  // Real-time Supabase subscription on this customer's order & delivery assignment
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
      .channel(`customer_order_tracking_${order.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        () => reloadOrderData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_assignments",
          filter: `order_id=eq.${order.id}`,
        },
        () => reloadOrderData(),
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

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold text-xs">
        No delivery record selected.
      </div>
    );
  }

  // Parse delivery address
  const deliveryAddress =
    typeof order.delivery_address === "string"
      ? (() => {
          try {
            return JSON.parse(order.delivery_address);
          } catch {
            return { street: order.delivery_address };
          }
        })()
      : order.delivery_address || {};

  const orderStatus = (order.status || "Pending").toLowerCase();
  const assignmentStatus = (assignment?.status || "").toLowerCase();
  const isCancelled = orderStatus === "cancelled";
  const isDelayed = assignmentStatus === "delayed";

  // Calculate current stage index (0 to 4)
  // Stages:
  // 0: Order Placed
  // 1: Order Confirmed / Approved
  // 2: Processing / Packed
  // 3: Out for Delivery
  // 4: Delivered
  const getStageIndex = () => {
    if (isCancelled) return -1;
    if (orderStatus === "delivered" || assignmentStatus === "delivered") return 4;
    if (orderStatus === "out for delivery" || assignmentStatus === "out for delivery") return 3;
    if (orderStatus === "packed" || orderStatus === "processing") return 2;
    if (orderStatus === "approved") return 1;
    return 0; // Pending / Placed
  };

  const currentStageIndex = getStageIndex();

  // Helper date formatters
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const orderPlacedDate = order.created_at
    ? `${formatDate(order.created_at)}, ${formatTime(order.created_at)}`
    : "";
  const orderApprovedDate = order.approved_at
    ? `${formatDate(order.approved_at)}, ${formatTime(order.approved_at)}`
    : currentStageIndex >= 1
      ? "Confirmed by depot"
      : "";

  const orderPackedDate = order.packed_at
    ? `${formatDate(order.packed_at)}, ${formatTime(order.packed_at)}`
    : currentStageIndex >= 2
      ? "Inspected & packed at Whitminster Depot"
      : "";

  const dispatchedDate = assignment?.dispatched_at
    ? `${formatDate(assignment.dispatched_at)}, ${formatTime(assignment.dispatched_at)}`
    : currentStageIndex >= 3
      ? "En-route on vehicle"
      : "";

  const deliveredDate =
    order.delivered_at || assignment?.delivered_at
      ? `${formatDate(order.delivered_at || assignment?.delivered_at)}, ${formatTime(order.delivered_at || assignment?.delivered_at)}`
      : "";

  // Estimated delivery banner date
  const expectedDateText = assignment?.dispatched_at
    ? formatDate(assignment.dispatched_at)
    : formatDate(
        new Date(new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      );

  const timeSlotText = assignment?.time_slot || "Morning (08:00 - 12:00)";

  // The 5 Flipkart-style stages definition
  const stages = [
    {
      title: "Order Placed",
      sub: "Your order has been placed and received by our depot.",
      date: orderPlacedDate,
      activeMessage: "We have received your order details.",
    },
    {
      title: "Order Confirmed / Approved",
      sub: "Order verified and approved by Gloucestershire depot operations.",
      date: orderApprovedDate,
      activeMessage: "Depot management has approved order fulfillment.",
    },
    {
      title: "Processing / Packed",
      sub: "Gas cylinders safety-inspected, valve-checked, and palletized.",
      date: orderPackedDate,
      activeMessage: "Cylinders are packed and staged for vehicle loading.",
    },
    {
      title: "Out for Delivery",
      sub: assignment?.driver_name
        ? `Driver ${assignment.driver_name} (${assignment.vehicle_plate || "GL72 JSS"}) has departed Whitminster depot.`
        : "Loaded on distribution truck and en-route to your address.",
      date: dispatchedDate,
      activeMessage: "Your delivery vehicle is en-route to your address.",
    },
    {
      title: "Delivered",
      sub: `Package delivered to ${order.customer_name || deliveryAddress.name || "recipient"}.`,
      date: deliveredDate,
      activeMessage: "Order delivered safely. Thank you for choosing John Stayte Services.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button and Live Realtime Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="rounded-full text-xs font-bold gap-1 text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Tracking Order
              </span>
              <span className="text-xs font-black text-slate-900 font-mono">
                #{order.order_number || order.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Updates
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 rounded-full text-xs font-bold gap-1 border-slate-200 bg-white"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Status Header Card (Flipkart / Amazon style hero banner) */}
      {isCancelled ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2.5">
            <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <h3 className="text-lg font-black text-rose-950">Order Cancelled</h3>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed max-w-xl">
            This order was cancelled. If an online payment was collected, a refund has been
            initiated to your original payment method.
          </p>
        </div>
      ) : isDelayed ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-950">
                Delivery Reschedule Notice
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {assignment?.delay_reason || "Weather or route delay hold"}. Our depot fleet manager
                is coordinating expedited delivery.
              </p>
            </div>
          </div>
        </div>
      ) : currentStageIndex === 4 ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-emerald-950">
                Delivered Successfully
              </h3>
              <p className="text-xs text-emerald-800 font-medium">
                Package delivered on {deliveredDate || "schedule"}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                Estimated Delivery
              </p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {currentStageIndex === 3 ? "Arriving Today" : `Expected by ${expectedDateText}`}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> Time Slot:{" "}
                <strong>{timeSlotText}</strong>
              </p>
            </div>

            <div className="self-start sm:self-center">
              <Badge className="bg-primary/90 hover:bg-primary text-white border-transparent text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                {order.status || "Pending Fulfillment"}
              </Badge>
            </div>
          </div>

          {currentStageIndex === 3 && assignment?.driver_name && (
            <div className="pt-2 border-t border-slate-700/80 flex items-center gap-3 text-xs text-slate-200">
              <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-white">Driver: {assignment.driver_name}</p>
                <p className="text-[11px] text-slate-400">
                  Vehicle Plate: {assignment.vehicle_plate || "GL72 JSS"} • Direct Fleet
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Left Flipkart Vertical Stepper Timeline | Right Delivery Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: The Flipkart-Style Vertical Stepper */}
        <div className="lg:col-span-2 surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Delivery Progress
            </h4>
            <span className="text-xs text-slate-400 font-bold">
              {isCancelled ? "Order Cancelled" : `Stage ${Math.min(5, currentStageIndex + 1)} of 5`}
            </span>
          </div>

          {isCancelled ? (
            <div className="py-8 text-center space-y-3">
              <XCircle className="mx-auto h-12 w-12 text-rose-500" />
              <p className="font-extrabold text-sm text-slate-900">
                Normal delivery timeline cancelled
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This shipment was stopped per customer request or order cancellation.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 py-2">
              {/* Continuous vertical connecting line */}
              <div className="absolute left-[27px] sm:left-[35px] top-6 bottom-6 w-0.5 bg-slate-200 z-0" />

              {/* Steps */}
              <div className="space-y-8 relative z-10">
                {stages.map((stage, idx) => {
                  const isCompleted = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx;
                  const isPending = currentStageIndex < idx;

                  return (
                    <div key={stage.title} className="flex items-start gap-4 sm:gap-5 group">
                      {/* Node Icon */}
                      <div className="relative -ml-4 sm:-ml-4 shrink-0">
                        <div
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                            isCompleted
                              ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50"
                              : isCurrent
                                ? "bg-primary text-white shadow-md ring-4 ring-primary/20 scale-110"
                                : "bg-white text-slate-300 border-2 border-slate-200"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : isCurrent ? (
                            stage.title === "Out for Delivery" ? (
                              <Truck className="h-4 w-4 animate-bounce" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                            )
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-200" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h5
                            className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                              isCurrent
                                ? "text-primary"
                                : isCompleted
                                  ? "text-slate-900"
                                  : "text-slate-400"
                            }`}
                          >
                            {stage.title}
                          </h5>

                          {stage.date && (
                            <span
                              className={`text-[11px] font-semibold font-mono ${
                                isCurrent
                                  ? "text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10"
                                  : "text-slate-400"
                              }`}
                            >
                              {stage.date}
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs leading-relaxed ${
                            isCurrent
                              ? "text-slate-700 font-medium"
                              : isCompleted
                                ? "text-slate-500"
                                : "text-slate-400"
                          }`}
                        >
                          {stage.sub}
                        </p>

                        {isCurrent && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            {stage.activeMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Delivery Address, Driver Details, and Order Summary */}
        <div className="space-y-6">
          {/* Delivery Address Card */}
          <div className="surface-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Delivery Address
              </h4>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-black text-slate-900 text-sm">
                {deliveryAddress.name || order.customer_name || "Valued Customer"}
              </p>
              <p className="text-slate-600 leading-relaxed font-medium">
                {deliveryAddress.street ||
                  order.customer_address ||
                  "Gloucestershire Delivery Address"}
              </p>
              {deliveryAddress.city && <p className="text-slate-600">{deliveryAddress.city}</p>}
              <p className="font-extrabold text-slate-900 tracking-wider">
                {deliveryAddress.postcode || ""}
              </p>
              {(deliveryAddress.phone || order.customer_phone) && (
                <p className="text-slate-500 pt-2 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {deliveryAddress.phone || order.customer_phone}
                </p>
              )}
            </div>
          </div>

          {/* Assigned Driver / Vehicle Card */}
          {assignment && (
            <div className="surface-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Fleet Assignment
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Driver</span>
                  <span className="font-black text-slate-900">
                    {assignment.driver_name || "Depot Driver"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Vehicle</span>
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {assignment.vehicle_plate || "GL72 JSS"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Dispatch Depot</span>
                  <span className="font-bold text-slate-700">Whitminster (GL2)</span>
                </div>
                {assignment.time_slot && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Slot</span>
                    <span className="font-bold text-slate-700">{assignment.time_slot}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Summary & Items Card */}
          <div className="surface-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Items ({order.order_items?.length || 1})
                </h4>
              </div>
              <span className="font-black text-sm text-slate-900">{gbp(order.total || 0)}</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {(order.order_items || []).map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{item.product_name}</p>
                    <p className="text-[11px] text-slate-400">
                      Qty: {item.quantity} • {gbp(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-extrabold text-slate-800 shrink-0">
                    {gbp(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full text-xs font-bold h-9"
              >
                <Link to={`/account/orders/${order.id}` as never}>
                  View Full Invoice & Order Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
