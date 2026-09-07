import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  CalendarDays,
  CheckCircle2,
  Clock,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Phone,
  Flame,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getAgentAssignedDeliveries } from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { DeliveryWorkflowModal } from "./DeliveryWorkflowModal";
import { cn } from "@/lib/utils";

export function DeliveryDashboardView() {
  const { user } = useStore();
  const agentName = user?.name || "Dave Jenkins";

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentAssignedDeliveries({
        email: user?.email,
        name: user?.name,
        id: user?.id,
      });
      setDeliveries(data || []);
    } catch (err: any) {
      console.error("Failed to load delivery agent dashboard data:", err);
      toast.error("Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();

    const channelName = `delivery_dashboard_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDashboardData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        loadDashboardData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Metrics computed from real Supabase data
  const totalToday = deliveries.length;
  const pendingCount = deliveries.filter((d) => {
    const s = (d.status || "").toLowerCase();
    return s === "assigned" || s === "accepted" || s === "pending";
  }).length;
  const outForDeliveryCount = deliveries.filter((d) => {
    const s = (d.status || "").toLowerCase();
    return (
      s === "out for delivery" ||
      s === "arrived" ||
      s === "customer verified" ||
      s === "cylinder handed over"
    );
  }).length;
  const completedTodayCount = deliveries.filter((d) => {
    const s = (d.status || "").toLowerCase();
    return s === "delivered" || s === "completed";
  }).length;
  const exchangeVerificationCount = deliveries.filter((d) => {
    const s = (d.status || "").toLowerCase();
    const req = getOrderCylinderExchangeRequirement(d);
    return req.required && s !== "delivered" && s !== "completed";
  }).length;
  const issuesCount = deliveries.filter((d) => {
    const s = (d.status || "").toLowerCase();
    return s === "exception" || (d.notes && d.notes.includes("[Exception:"));
  }).length;

  const statCards = [
    {
      label: "TODAY'S DELIVERIES",
      value: loading ? null : totalToday,
      sub: `${totalToday} routes assigned`,
      icon: CalendarDays,
      bgCls: "bg-blue-50 text-blue-700 border-blue-200/80",
      accent: "text-slate-900",
      href: "/delivery/today",
    },
    {
      label: "PENDING",
      value: loading ? null : pendingCount,
      sub: "Awaiting dispatch / start",
      icon: Clock,
      bgCls: "bg-slate-100 text-slate-700 border-slate-200/80",
      accent: "text-slate-900",
      href: "/delivery/deliveries",
    },
    {
      label: "OUT FOR DELIVERY",
      value: loading ? null : outForDeliveryCount,
      sub: "Active transit routes",
      icon: Truck,
      bgCls: "bg-orange-50 text-orange-700 border-orange-200/80",
      accent: "text-orange-600",
      href: "/delivery/deliveries",
    },
    {
      label: "COMPLETED",
      value: loading ? null : completedTodayCount,
      sub: "Successfully delivered",
      icon: CheckCircle2,
      bgCls: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      accent: "text-emerald-600",
      href: "/delivery/completed",
    },
    {
      label: "EMPTY CYLINDER VERIFICATION",
      value: loading ? null : exchangeVerificationCount,
      sub: "Exchange deliveries requiring empty-cylinder verification",
      icon: PackageCheck,
      bgCls: "bg-amber-50 text-amber-700 border-amber-200/80",
      accent: "text-amber-700",
      href: "/delivery/returns",
    },
    {
      label: "ISSUES & EXCEPTIONS",
      value: loading ? null : issuesCount,
      sub: "Delivery exceptions logged",
      icon: AlertTriangle,
      bgCls: "bg-rose-50 text-rose-700 border-rose-200/80",
      accent: issuesCount > 0 ? "text-rose-600" : "text-slate-900",
      href: "/delivery/issues",
    },
  ];

  const handleOpenWorkflow = (delivery: any) => {
    setSelectedDelivery(delivery);
    setWorkflowOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. WELCOME HERO CARD */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-red-600/10 via-red-600/3 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200">
                <Sparkles className="h-3 w-3" /> Driver Control Console
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Whitminster & Stroud Zone
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
              {getGreeting()}, {agentName.split(" ")[0]}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Verify customer deliveries, complete cylinder exchanges, and report delivery exceptions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="rounded-xl font-extrabold text-xs shadow-sm bg-red-600 hover:bg-red-700 text-white h-10 px-5 gap-2 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Link to="/delivery/deliveries">
                <Truck className="h-4 w-4" /> View My Deliveries
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={loadDashboardData}
              className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-3 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS (6 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.href as never}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1.5 mb-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg border shrink-0 ${card.bgCls}`}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </div>

            {loading ? (
              <div className="py-2">
                <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <p
                  className={`text-xl sm:text-2xl font-display font-black tracking-tight leading-none ${card.accent}`}
                >
                  {card.value}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{card.sub}</p>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* 3. TODAY'S DELIVERY SCHEDULE TIMELINE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 tracking-tight">
              Today's Delivery Schedule
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Assigned customer drop-offs and cylinder verifications
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl gap-1.5 h-8 px-3 cursor-pointer self-start sm:self-auto"
          >
            <Link to="/delivery/today">
              View Complete Schedule <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 animate-pulse shadow-xs"
              >
                <div className="h-4 bg-slate-100 rounded-md w-1/3" />
                <div className="h-5 bg-slate-100 rounded-md w-2/3" />
                <div className="h-4 bg-slate-100 rounded-md w-full" />
                <div className="h-10 bg-slate-100 rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 w-fit mx-auto">
              <Truck className="h-8 w-8 text-slate-400" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                No deliveries assigned for today
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                You do not have any active delivery dispatches assigned. New dispatches will appear
                in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveries.map((d) => {
              const o = d.orders || {};
              const items = o.order_items || [];
              const status = d.status || "Assigned";

              // Format address
              let address = "Gloucestershire";
              if (o.delivery_address) {
                if (typeof o.delivery_address === "string") address = o.delivery_address;
                else {
                  const a = o.delivery_address;
                  address = [a.line1 || a.street, a.city, a.postcode || a.postal_code]
                    .filter(Boolean)
                    .join(", ");
                }
              }

              const statusColor =
                status === "Delivered"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : status === "Exception"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : status === "Out for Delivery"
                      ? "bg-orange-100 text-orange-800 border-orange-300"
                      : status === "Arrived"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-blue-100 text-blue-800 border-blue-300";

              return (
                <div
                  key={d.id}
                  className="group bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Order # and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900">
                          #{o.order_number || d.id.slice(0, 8)}
                        </span>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {d.time_slot || "Morning Slot"}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-none",
                          statusColor,
                        )}
                      >
                        {status}
                      </Badge>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-1">
                      <h3 className="font-display font-extrabold text-sm text-slate-900 group-hover:text-red-600 transition-colors">
                        {o.customer_name || "Customer"}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium flex items-start gap-1.5 leading-snug">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{address}</span>
                      </p>
                    </div>

                    {/* Products / Cylinders */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Flame className="h-4 w-4 text-red-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">
                            {items.length > 0
                              ? `${items[0].product_name} ${items.length > 1 ? `+${items.length - 1} more` : ""}`
                              : "LPG Gas Cylinder 47kg"}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 shrink-0 ml-2">
                          {gbp(o.total || 75.99)}
                        </span>
                      </div>

                      {(() => {
                        const req = getOrderCylinderExchangeRequirement(d);
                        return (
                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Empty Cylinder:</span>
                            {req.required ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Required ({req.expectedQuantity})
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {req.orderType === "NEW_CYLINDER" ? "No (New Purchase)" : "Not Required"}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action Button */}
                  {(() => {
                    const req = getOrderCylinderExchangeRequirement(d);
                    return (
                      <div className="pt-1">
                        <Button
                          onClick={() => handleOpenWorkflow(d)}
                          className={cn(
                            "w-full rounded-full font-bold text-xs h-9 gap-1.5 shadow-xs transition-all cursor-pointer",
                            status === "Delivered"
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10 hover:shadow-md",
                          )}
                        >
                          {status === "Assigned" && "Accept & Start Delivery →"}
                          {status === "Accepted" && "Start Delivery Route →"}
                          {status === "Out for Delivery" && "Mark Arrived & Handover →"}
                          {status === "Arrived" && "Customer Verification →"}
                          {status === "Customer Verified" && "Handover Cylinder →"}
                          {status === "Cylinder Handed Over" &&
                            (req.required ? "Verify Empty Cylinder →" : "Confirm Delivery →")}
                          {status === "Empty Cylinder Verified" && "Confirm Delivery →"}
                          {status === "Delivered" && (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> View Delivery
                              Details
                            </>
                          )}
                          {status === "Exception" && "Review Delivery Exception →"}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. WORKFLOW MODAL */}
      <DeliveryWorkflowModal
        delivery={selectedDelivery}
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        onWorkflowComplete={loadDashboardData}
      />
    </div>
  );
}
