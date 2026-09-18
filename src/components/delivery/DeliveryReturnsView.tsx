import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  PackageCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Flame,
  Calendar,
  User,
  MapPin,
  ShieldCheck,
  Clock,
  Phone,
  Truck,
  ArrowRight,
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

export function DeliveryReturnsView() {
  const { user } = useStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "exception">(
    "all",
  );

  // Selected delivery for verification modal
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const agentDeliveries = await getAgentAssignedDeliveries({
        email: user?.email,
        name: user?.name,
        id: user?.id,
      });

      setDeliveries(agentDeliveries || []);
    } catch (err: any) {
      console.error("Failed to load deliveries for verification:", err);
      toast.error("Failed to load cylinder verification matrix");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeliveries();

    const channelName = `cylinder_verification_sync_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDeliveries]);

  // Only exchange deliveries require empty cylinder verification
  const exchangeDeliveries = useMemo(() => {
    return deliveries.filter((d) => getOrderCylinderExchangeRequirement(d).required);
  }, [deliveries]);

  // Tab counts
  const counts = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let exception = 0;

    exchangeDeliveries.forEach((d) => {
      const s = (d.status || "").toLowerCase();
      const notes = (d.notes || "").toLowerCase();

      const isExc = s === "exception" || s === "issue reported" || notes.includes("[exception:");

      const isVer =
        s === "verified" ||
        s === "empty cylinder verified" ||
        s === "delivered" ||
        notes.includes("[empty return:");

      const isPend =
        !isExc &&
        !isVer &&
        (s === "arrived" ||
          s === "customer verified" ||
          s === "cylinder handed over" ||
          s === "out for delivery" ||
          s === "accepted" ||
          s === "assigned");

      if (isExc) exception++;
      else if (isVer) verified++;
      else if (isPend) pending++;
    });

    return {
      all: exchangeDeliveries.length,
      pending,
      verified,
      exception,
    };
  }, [exchangeDeliveries]);

  const filtered = useMemo(() => {
    return exchangeDeliveries.filter((d) => {
      const o = d.orders || {};
      const s = (d.status || "").toLowerCase();
      const notes = (d.notes || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.order_number || d.id).toLowerCase().includes(q) ||
        (d.driver_name || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isExc = s === "exception" || s === "issue reported" || notes.includes("[exception:");

      const isVer =
        s === "verified" ||
        s === "empty cylinder verified" ||
        s === "delivered" ||
        notes.includes("[empty return:");

      const isPend =
        !isExc &&
        !isVer &&
        (s === "arrived" ||
          s === "customer verified" ||
          s === "cylinder handed over" ||
          s === "out for delivery" ||
          s === "accepted" ||
          s === "assigned");

      if (statusFilter === "pending") return isPend;
      if (statusFilter === "verified") return isVer;
      if (statusFilter === "exception") return isExc;

      return true;
    });
  }, [exchangeDeliveries, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            Cylinder Verification Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Exchange bottle returns, serial checks, and safety inspection logs for active routes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadDeliveries}
          className="rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs cursor-pointer h-9.5 px-4 self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-400" /> Refresh Records
        </Button>
      </div>

      {/* Filter Tabs & Search (Frosted Glass Panel) */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer name..."
            className="pl-11 pr-4 rounded-full bg-white/80 border border-white/80 text-xs h-10 font-bold text-slate-700 shadow-2xs focus-visible:ring-red-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full text-xs font-extrabold h-8 px-4 shrink-0 transition-all cursor-pointer shadow-2xs",
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                : "border border-white/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white",
            )}
          >
            All Exchange Orders ({counts.all})
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "rounded-full text-xs font-extrabold h-8 px-4 shrink-0 transition-all cursor-pointer shadow-2xs",
              statusFilter === "pending"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20"
                : "border border-white/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white",
            )}
          >
            Pending Verification ({counts.pending})
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("verified")}
            className={cn(
              "rounded-full text-xs font-extrabold h-8 px-4 shrink-0 transition-all cursor-pointer shadow-2xs",
              statusFilter === "verified"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/20"
                : "border border-white/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white",
            )}
          >
            Verified Cylinders ({counts.verified})
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("exception")}
            className={cn(
              "rounded-full text-xs font-extrabold h-8 px-4 shrink-0 transition-all cursor-pointer shadow-2xs",
              statusFilter === "exception"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                : "border border-white/80 bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white",
            )}
          >
            Delivery Exceptions ({counts.exception})
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 space-y-4 animate-pulse shadow-[0_8px_30px_rgba(0,0,0,0.03)] h-[220px]"
            >
              <div className="h-4 bg-slate-200/70 rounded-md w-1/3" />
              <div className="h-5 bg-slate-200/70 rounded-md w-2/3" />
              <div className="h-9 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
            <PackageCheck className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-black text-base text-slate-900">
            No delivery records matching this filter
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            All assigned deliveries requiring cylinder verification are tracked live in the depot
            dispatch network.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => {
            const o = d.orders || {};
            const items = o.order_items || [];
            const notes = d.notes || "";
            const statusStr = (d.status || "").toLowerCase();

            const isVerified =
              statusStr === "verified" ||
              statusStr === "empty cylinder verified" ||
              statusStr === "delivered" ||
              notes.includes("[Empty Return:");

            const isException =
              statusStr === "exception" ||
              statusStr === "issue reported" ||
              notes.includes("[Exception:");

            const deliveryAddress =
              typeof o.delivery_address === "object" && o.delivery_address
                ? `${o.delivery_address.street || o.delivery_address.line1 || ""}, ${o.delivery_address.city || ""} ${o.delivery_address.postcode || ""}`.trim()
                : typeof o.delivery_address === "string"
                  ? o.delivery_address
                  : "Gloucestershire address on file";

            const customerPhone = o.customer_phone || "07700 900123";

            // Status label & badge
            const getStatusBadge = () => {
              if (isException) {
                return (
                  <Badge className="bg-red-50 text-red-700 border-red-200/80 text-[10px] font-black uppercase tracking-wider rounded-full shadow-2xs">
                    Exception Reported
                  </Badge>
                );
              }
              if (isVerified) {
                return (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 text-[10px] font-black uppercase tracking-wider rounded-full shadow-2xs">
                    Cylinder Verified
                  </Badge>
                );
              }
              return (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 text-[10px] font-black uppercase tracking-wider rounded-full shadow-2xs">
                  Pending Verification
                </Badge>
              );
            };

            const firstItemName = items[0]?.product_name || "LPG Propane Gas Cylinder";

            return (
              <div
                key={d.id}
                className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.08)] hover:border-red-300/80 hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Order & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs text-slate-900 bg-white/80 border border-slate-200/60 px-2.5 py-1 rounded-full shadow-2xs">
                      #{o.order_number || d.id.slice(0, 8)}
                    </span>
                    {getStatusBadge()}
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="font-black text-base text-slate-900 truncate">
                      {o.customer_name || "Valued Customer"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {deliveryAddress}
                    </p>
                  </div>

                  {/* Cylinder Info */}
                  {(() => {
                    const req = getOrderCylinderExchangeRequirement(d);
                    return (
                      <div className="bg-white/80 rounded-2xl p-3 border border-white/80 backdrop-blur-md space-y-1.5 text-xs shadow-2xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-800 truncate">
                          <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          {firstItemName}
                          {items.length > 1 && (
                            <span className="text-slate-400 font-normal">
                              +{items.length - 1} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/50">
                          <span className="text-slate-400 font-semibold">Empty Exchange:</span>
                          {req.required ? (
                            <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 text-[10px] shadow-2xs">
                              Yes ({req.expectedQuantity} Bottle{req.expectedQuantity > 1 ? "s" : ""})
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 text-[10px] shadow-2xs">
                              {req.orderType === "NEW_CYLINDER" ? "No (New Purchase)" : "No (Standard)"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes snippet if any */}
                  {notes && (
                    <p className="text-[11px] text-slate-600 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70 font-medium leading-relaxed">
                      {notes}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${customerPhone}`}
                    className="p-2.5 rounded-full border border-white/80 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> Call
                  </a>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDelivery(d);
                      setWorkflowOpen(true);
                    }}
                    className={cn(
                      "rounded-full text-xs font-black h-9 px-5 shadow-md gap-1.5 cursor-pointer transition-all",
                      isVerified
                        ? "border border-white/80 bg-white/80 text-slate-700 hover:bg-white shadow-2xs"
                        : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-600/25 hover:-translate-y-0.5",
                    )}
                  >
                    {isVerified ? "View Verification" : "Workflow & Verify"}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standard Delivery & Cylinder Verification Workflow Modal */}
      {selectedDelivery && (
        <DeliveryWorkflowModal
          delivery={selectedDelivery}
          open={workflowOpen}
          onOpenChange={(v) => {
            setWorkflowOpen(v);
            if (!v) setSelectedDelivery(null);
          }}
          onWorkflowComplete={() => {
            loadDeliveries();
          }}
        />
      )}
    </div>
  );
}
