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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight flex items-center gap-2.5">
            <PackageCheck className="h-7 w-7 text-red-600" /> Cylinder Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Inspect and verify empty LPG cylinders during order drop-off and exchange.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadDeliveries}
          className="rounded-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-3.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refresh Records
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer name..."
            className="pl-10 rounded-2xl bg-slate-50 border-slate-200 text-xs h-10 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full text-xs font-bold h-8 px-3.5 cursor-pointer",
              statusFilter === "all" && "bg-slate-900 text-white",
            )}
          >
            All Exchange Orders ({counts.all})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "rounded-full text-xs font-bold h-8 px-3.5 cursor-pointer",
              statusFilter === "pending" && "bg-amber-600 text-white",
            )}
          >
            Pending Verification ({counts.pending})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "verified" ? "default" : "outline"}
            onClick={() => setStatusFilter("verified")}
            className={cn(
              "rounded-full text-xs font-bold h-8 px-3.5 cursor-pointer",
              statusFilter === "verified" && "bg-emerald-600 text-white",
            )}
          >
            Verified Cylinders ({counts.verified})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "exception" ? "default" : "outline"}
            onClick={() => setStatusFilter("exception")}
            className={cn(
              "rounded-full text-xs font-bold h-8 px-3.5 cursor-pointer",
              statusFilter === "exception" && "bg-rose-600 text-white",
            )}
          >
            Delivery Exceptions ({counts.exception})
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 animate-pulse shadow-xs"
            >
              <div className="h-4 bg-slate-100 rounded-md w-1/3" />
              <div className="h-5 bg-slate-100 rounded-md w-2/3" />
              <div className="h-8 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="font-display font-bold text-base text-slate-900">
            No delivery records matching this filter
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            All assigned deliveries requiring cylinder verification are tracked live in the depot
            dispatch network.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-extrabold uppercase">
                    Exception Reported
                  </Badge>
                );
              }
              if (isVerified) {
                return (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold uppercase">
                    Cylinder Verified
                  </Badge>
                );
              }
              return (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-extrabold uppercase">
                  Pending Verification
                </Badge>
              );
            };

            const firstItemName = items[0]?.product_name || "LPG Propane Gas Cylinder";

            return (
              <div
                key={d.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Order & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      #{o.order_number || d.id.slice(0, 8)}
                    </span>
                    {getStatusBadge()}
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-900 truncate">
                      {o.customer_name || "Valued Customer"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {deliveryAddress}
                    </p>
                  </div>

                  {/* Cylinder Info */}
                  {(() => {
                    const req = getOrderCylinderExchangeRequirement(d);
                    return (
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                          <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          {firstItemName}
                          {items.length > 1 && (
                            <span className="text-slate-400 font-normal">
                              +{items.length - 1} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">Empty Exchange:</span>
                          {req.required ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Yes ({req.expectedQuantity} Bottle{req.expectedQuantity > 1 ? "s" : ""})
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {req.orderType === "NEW_CYLINDER" ? "No (New Purchase)" : "No (Standard)"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes snippet if any */}
                  {notes && (
                    <p className="text-[11px] text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 font-medium leading-relaxed">
                      {notes}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${customerPhone}`}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3 text-slate-400" /> Call
                  </a>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDelivery(d);
                      setWorkflowOpen(true);
                    }}
                    className={cn(
                      "rounded-full text-xs font-bold h-8.5 px-4 shadow-2xs gap-1.5 cursor-pointer",
                      isVerified
                        ? "bg-slate-800 hover:bg-slate-900 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white",
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
