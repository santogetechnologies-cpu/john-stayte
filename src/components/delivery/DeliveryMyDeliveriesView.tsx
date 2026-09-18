import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Search,
  Filter,
  X,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  ExternalLink,
  Loader2,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getAgentAssignedDeliveries } from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { DeliveryWorkflowModal } from "./DeliveryWorkflowModal";
import { cn } from "@/lib/utils";

interface DeliveryMyDeliveriesViewProps {
  initialFilter?: string;
}

export function DeliveryMyDeliveriesView({ initialFilter = "all" }: DeliveryMyDeliveriesViewProps) {
  const { user } = useStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentAssignedDeliveries({
        email: user?.email,
        name: user?.name,
        id: user?.id,
      });
      setDeliveries(data || []);
    } catch (err: any) {
      console.error("Failed to load agent deliveries:", err);
      toast.error("Failed to load delivery list");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeliveries();

    const channelName = `delivery_my_deliveries_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDeliveries(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        loadDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDeliveries]);

  // Auto-focus and open workflow modal if orderId search param is provided
  useEffect(() => {
    if (typeof window === "undefined" || deliveries.length === 0) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetOrderId = urlParams.get("orderId");
      if (targetOrderId) {
        const found = deliveries.find((d) => {
          const ordId = (d.order_id || "").toLowerCase();
          const ordRef = (d.order_ref || "").toLowerCase();
          const pOrdId = (d.orders?.id || "").toLowerCase();
          const pOrdNum = (d.orders?.order_number || "").toLowerCase();
          const q = targetOrderId.toLowerCase();
          return (
            d.id === targetOrderId ||
            ordId === q ||
            ordRef === q ||
            pOrdId === q ||
            pOrdNum === q
          );
        });

        if (found) {
          setSelectedDelivery(found);
          setWorkflowOpen(true);
        }
      }
    } catch {}
  }, [deliveries]);

  // Filter and Search logic
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const o = d.orders || {};
      const status = (d.status || "").toLowerCase();
      const customerName = (o.customer_name || "").toLowerCase();
      const orderNum = (o.order_number || d.id).toLowerCase();
      const routeArea = (d.route_area || "").toLowerCase();

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || customerName.includes(q) || orderNum.includes(q) || routeArea.includes(q);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "all") return true;
      if (statusFilter === "assigned") return status === "assigned";
      if (statusFilter === "accepted") return status === "accepted";
      if (statusFilter === "out_for_delivery")
        return (
          status === "out for delivery" ||
          status === "arrived" ||
          status === "customer verified" ||
          status === "cylinder handed over"
        );
      if (statusFilter === "arrived") return status === "arrived";
      if (statusFilter === "verification_required")
        return status === "verification required" || (d.notes && d.notes.includes("Empty Return"));
      if (statusFilter === "delivered") return status === "delivered" || status === "completed";
      if (statusFilter === "exception")
        return status === "exception" || (d.notes && d.notes.includes("[Exception:"));

      return true;
    });
  }, [deliveries, searchQuery, statusFilter]);

  const filterTabs = [
    { id: "all", label: `All (${deliveries.length})` },
    {
      id: "assigned",
      label: `Assigned (${deliveries.filter((d) => (d.status || "").toLowerCase() === "assigned").length})`,
    },
    {
      id: "accepted",
      label: `Accepted (${deliveries.filter((d) => (d.status || "").toLowerCase() === "accepted").length})`,
    },
    {
      id: "out_for_delivery",
      label: `Out for Delivery (${deliveries.filter((d) => ["out for delivery", "arrived", "customer verified"].includes((d.status || "").toLowerCase())).length})`,
    },
    {
      id: "delivered",
      label: `Delivered (${deliveries.filter((d) => ["delivered", "completed"].includes((d.status || "").toLowerCase())).length})`,
    },
    {
      id: "exception",
      label: `Exceptions (${deliveries.filter((d) => (d.status || "").toLowerCase() === "exception" || (d.notes && d.notes.includes("[Exception:"))).length})`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            Assigned Delivery Routes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage your daily cylinder drops, customer verifications, and empty cylinder verifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDeliveries}
            className="rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs cursor-pointer h-9.5 px-4"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-400" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (Frosted Glass Panel) */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, customer name, or delivery location..."
            className="pl-11 pr-10 rounded-full bg-white/80 border border-white/80 text-xs h-10 font-bold text-slate-700 shadow-2xs focus-visible:ring-red-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {filterTabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant="ghost"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "rounded-full text-xs font-extrabold h-8 px-4 shrink-0 transition-all cursor-pointer shadow-2xs",
                statusFilter === tab.id
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                  : "border border-white/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white",
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Delivery Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 space-y-4 animate-pulse shadow-[0_8px_30px_rgba(0,0,0,0.03)] h-[240px]"
            >
              <div className="h-4 bg-slate-200/70 rounded-md w-1/3" />
              <div className="h-5 bg-slate-200/70 rounded-md w-2/3" />
              <div className="h-4 bg-slate-200/70 rounded-md w-full" />
              <div className="h-10 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="surface-card rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
            <Truck className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-black text-base text-slate-900">
            {searchQuery
              ? "No deliveries match your search"
              : statusFilter === "delivered"
                ? "No completed deliveries yet."
                : statusFilter !== "all"
                  ? "No deliveries match this filter"
                  : "No assigned deliveries"}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "Try resetting your search query or switching status filters."
              : "Your assigned delivery routes will be listed here."}
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="rounded-full text-xs font-bold mt-2 border-white/80 bg-white/80 shadow-2xs cursor-pointer"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDeliveries.map((d) => {
            const o = d.orders || {};
            const items = o.order_items || [];
            const status = d.status || "Assigned";

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
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                : status === "Exception"
                  ? "bg-red-50 text-red-700 border-red-200/80"
                  : status === "Out for Delivery"
                    ? "bg-orange-50 text-orange-700 border-orange-200/80"
                    : status === "Arrived"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                      : "bg-blue-50 text-blue-700 border-blue-200/80";

            return (
              <div
                key={d.id}
                className="group surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.08)] hover:border-red-300/80 hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs text-slate-900">
                      #{o.order_number || d.id.slice(0, 8)}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-2xs",
                        statusColor,
                      )}
                    >
                      {status}
                    </Badge>
                  </div>

                  {/* Customer and Contact */}
                  <div className="space-y-1">
                    <h3 className="font-black text-base text-slate-900 group-hover:text-red-600 transition-colors">
                      {o.customer_name || "Customer"}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />{" "}
                        {o.customer_phone || "07700 900123"}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-700 bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full shadow-2xs">
                        {(o.delivery_date || d.scheduled_date)
                          ? `${new Date(o.delivery_date || d.scheduled_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} • `
                          : ""}
                        {o.delivery_slot || d.time_slot || "Morning Slot"}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Drop-off Address */}
                  <div className="p-3 rounded-2xl bg-white/80 border border-white/80 backdrop-blur-md text-xs text-slate-600 font-medium flex items-start gap-2 leading-snug shadow-2xs">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{address}</span>
                  </div>

                  {/* Cylinder Items Details */}
                  {(() => {
                    const req = getOrderCylinderExchangeRequirement(d);
                    return (
                      <div className="space-y-1.5 text-xs pt-1">
                        <div className="flex items-center justify-between font-extrabold text-slate-800">
                          <span className="flex items-center gap-1.5 truncate">
                            <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            {items.length > 0 ? items[0].product_name : "LPG Cylinder 47kg"}
                          </span>
                          <span className="font-black text-slate-900 shrink-0">{gbp(o.total || 75.99)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/40">
                          <span>
                            Empty Cylinder:{" "}
                            {req.required ? (
                              <strong className="text-amber-700 font-extrabold">
                                Required ({req.expectedQuantity})
                              </strong>
                            ) : (
                              <strong className="text-emerald-700 font-extrabold">No (New Purchase)</strong>
                            )}
                          </span>
                          <span className="text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 shadow-2xs">
                            Paid Online
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Actions: Call, Navigate, Advance Workflow */}
                <div className="pt-3 border-t border-slate-200/50 flex items-center gap-2">
                  <a
                    href={`tel:${o.customer_phone || "07700900123"}`}
                    className="p-2.5 rounded-full border border-white/80 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs transition-all shrink-0 cursor-pointer"
                    title="Call Customer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-full border border-white/80 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs transition-all shrink-0 cursor-pointer"
                    title="Navigate in Google Maps"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </a>

                  {(() => {
                    const req = getOrderCylinderExchangeRequirement(d);
                    return (
                      <Button
                        onClick={() => {
                          setSelectedDelivery(d);
                          setWorkflowOpen(true);
                        }}
                        className={cn(
                          "flex-1 rounded-full font-black text-xs h-9 shadow-2xs transition-all cursor-pointer",
                          status === "Delivered"
                            ? "border border-white/80 bg-white/80 text-slate-700 hover:bg-white shadow-2xs"
                            : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25 hover:-translate-y-0.5",
                        )}
                      >
                        {status === "Assigned" && "Accept"}
                        {status === "Accepted" && "Start Delivery"}
                        {status === "Out for Delivery" && "Mark Arrived"}
                        {status === "Arrived" && "Verify Customer"}
                        {status === "Customer Verified" && "Handover"}
                        {status === "Cylinder Handed Over" &&
                          (req.required ? "Verify Return" : "Confirm")}
                        {status === "Empty Cylinder Verified" && "Confirm"}
                        {status === "Delivered" && "Details"}
                        {status === "Exception" && "Review Issue"}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Workflow Modal */}
      <DeliveryWorkflowModal
        delivery={selectedDelivery}
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        onWorkflowComplete={loadDeliveries}
      />
    </div>
  );
}
