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
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
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

  // Resolve display name cleanly (never display raw email)
  const agentDisplayName = useMemo(() => {
    if (user?.name && !user.name.includes("@")) {
      return user.name.split(" ")[0];
    }
    if (user?.email) {
      const lower = user.email.toLowerCase();
      if (lower.includes("astin")) return "Astin";
      if (lower.includes("aswin")) return "Aswin";
      const prefix = user.email.split("@")[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "Delivery Driver";
  }, [user]);

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
      label: "Today's Deliveries",
      value: loading ? null : totalToday,
      sub: `${totalToday} routes assigned`,
      icon: CalendarDays,
      bgCls: "bg-blue-50 text-blue-700 border-blue-200/80",
      accent: "text-slate-900",
      href: "/delivery/today",
    },
    {
      label: "Pending",
      value: loading ? null : pendingCount,
      sub: "Awaiting dispatch",
      icon: Clock,
      bgCls: "bg-slate-100 text-slate-700 border-slate-200/80",
      accent: "text-slate-900",
      href: "/delivery/deliveries",
    },
    {
      label: "Out for Delivery",
      value: loading ? null : outForDeliveryCount,
      sub: "Active transit routes",
      icon: Truck,
      bgCls: "bg-orange-50 text-orange-700 border-orange-200/80",
      accent: "text-orange-600",
      href: "/delivery/deliveries",
    },
    {
      label: "Completed",
      value: loading ? null : completedTodayCount,
      sub: "Successfully delivered",
      icon: CheckCircle2,
      bgCls: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      accent: "text-emerald-600",
      href: "/delivery/completed",
    },
    {
      label: "Empty Cylinder Verification",
      value: loading ? null : exchangeVerificationCount,
      sub: `${exchangeVerificationCount} exchange returns`,
      icon: PackageCheck,
      bgCls: "bg-amber-50 text-amber-700 border-amber-200/80",
      accent: "text-amber-700",
      href: "/delivery/returns",
    },
    {
      label: "Issues & Exceptions",
      value: loading ? null : issuesCount,
      sub: `${issuesCount} exceptions logged`,
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/90";
      case "Exception":
        return "bg-rose-50 text-rose-700 border-rose-200/90";
      case "Out for Delivery":
        return "bg-orange-50 text-orange-700 border-orange-200/90";
      case "Arrived":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/90";
      case "Customer Verified":
      case "Cylinder Handed Over":
      case "Empty Cylinder Verified":
        return "bg-purple-50 text-purple-700 border-purple-200/90";
      case "Accepted":
        return "bg-blue-50 text-blue-700 border-blue-200/90";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/90";
    }
  };

  const getActionLabel = (status: string, required: boolean) => {
    switch (status) {
      case "Assigned":
        return "Accept & Start Delivery →";
      case "Accepted":
        return "Start Route →";
      case "Out for Delivery":
        return "Mark Arrived →";
      case "Arrived":
        return "Customer Verification →";
      case "Customer Verified":
        return "Handover Cylinder →";
      case "Cylinder Handed Over":
        return required ? "Verify Empty Cylinder →" : "Confirm Delivery →";
      case "Empty Cylinder Verified":
        return "Confirm Delivery →";
      case "Delivered":
        return "View Details →";
      case "Exception":
        return "Review Exception →";
      default:
        return "View Delivery →";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP GREETING & ACTION HEADER (Matches Admin Portal) */}
      <div className="surface-card p-6 sm:p-7 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                <Sparkles className="h-3 w-3" /> Live Dispatch
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                • Gloucestershire Delivery Unit
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {getGreeting()}, {agentDisplayName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Manage today's deliveries, verify cylinders, and complete customer handovers safely.
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
            <Button
              asChild
              size="sm"
              className="rounded-full text-xs font-black gap-1.5 shadow-md shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer h-9.5 px-5"
            >
              <Link to="/delivery/deliveries">
                <Truck className="h-3.5 w-3.5" /> View My Deliveries
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              className="rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs cursor-pointer h-9.5 px-4"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1 text-slate-400" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI STRIP (Frosted Glass KPI Cards matching Admin Portal) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.href as never}
            className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-2xs hover:border-white hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[96px] cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight line-clamp-2">
                {card.label}
              </span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 ${card.bgCls}`}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </div>

            {loading ? (
              <div className="py-1">
                <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
              </div>
            ) : (
              <div className="mt-2">
                <p
                  className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none"
                >
                  {card.value}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate block mt-1">{card.sub}</p>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* 3. TODAY'S DELIVERY SCHEDULE — MAIN FOCUS (Large Glass Cards) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Today's Delivery Schedule
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Assigned customer deliveries and cylinder verification tasks
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50/80 gap-1 h-8 px-3 cursor-pointer"
          >
            <Link to="/delivery/today">
              View Complete Schedule <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="surface-card p-6 rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 animate-pulse shadow-[0_8px_30px_rgba(0,0,0,0.03)] h-[175px]"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200/70 rounded-md w-1/3" />
                  <div className="h-5 bg-slate-200/70 rounded-full w-24" />
                </div>
                <div className="h-5 bg-slate-200/70 rounded-md w-1/2" />
                <div className="h-4 bg-slate-200/70 rounded-md w-3/4" />
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="surface-card rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
              <Truck className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-extrabold text-base text-slate-900">
                No deliveries assigned for today
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                You do not have any active delivery dispatches assigned. New dispatches will appear
                in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deliveries.map((d) => {
              const o = d.orders || {};
              const items = o.order_items || [];
              const status = d.status || "Assigned";
              const req = getOrderCylinderExchangeRequirement(d);

              // Format address cleanly
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

              const statusBadgeStyle = getStatusBadgeStyle(status);
              const actionLabel = getActionLabel(status, req.required);

              return (
                <div
                  key={d.id}
                  className="surface-card p-5 sm:p-6 rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.08)] hover:border-red-300/80 hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between gap-4"
                >
                  {/* Top Line: Order ID & Slot + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-xs text-slate-900 truncate">
                        #{o.order_number || d.order_ref || d.id.slice(0, 8)}
                      </span>
                      <span className="text-slate-300 text-xs">•</span>
                      <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                        {d.time_slot || "Morning Slot"}
                      </span>
                    </div>

                    <Badge
                      className={cn(
                        "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0",
                        statusBadgeStyle,
                      )}
                    >
                      {status}
                    </Badge>
                  </div>

                  {/* Customer Name & Address */}
                  <div className="space-y-1">
                    <h3 className="font-black text-base text-slate-900 leading-tight">
                      {o.customer_name || "Customer"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 leading-normal truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{address}</span>
                    </p>
                  </div>

                  {/* Items Summary & Empty Cylinder Box */}
                  <div className="p-3 rounded-2xl bg-white/80 border border-white/80 backdrop-blur-md space-y-2 text-xs shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span className="font-extrabold text-slate-800 truncate text-xs">
                          {items.length > 0
                            ? `${items[0].product_name} ${items.length > 1 ? `(+${items.length - 1} more)` : ""}`
                            : "LPG Gas Cylinder 47kg"}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        {gbp(o.total || 75.99)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/50">
                      <span className="text-slate-400 font-semibold text-[11px]">Empty Cylinder:</span>
                      {req.required ? (
                        <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] border border-amber-200/80 shadow-2xs">
                          Required • {req.expectedQuantity}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] border border-slate-200/60 shadow-2xs">
                          {req.orderType === "NEW_CYLINDER" ? "Not Required (New Bottle)" : "Not Required"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Button (Aligned to Right) */}
                  <div className="flex items-center justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleOpenWorkflow(d)}
                      className={cn(
                        "rounded-full font-black text-xs h-9 px-5 gap-1.5 shadow-2xs transition-all cursor-pointer",
                        status === "Delivered"
                          ? "border border-white/80 bg-white/80 text-slate-700 hover:bg-white shadow-2xs"
                          : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25 hover:-translate-y-0.5",
                      )}
                    >
                      {status === "Delivered" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> View Delivery Details
                        </>
                      ) : (
                        actionLabel
                      )}
                    </Button>
                  </div>
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
