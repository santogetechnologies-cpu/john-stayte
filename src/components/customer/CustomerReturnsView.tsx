import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  RotateCcw,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Loader2,
  Flame,
  Search,
  ArrowRight,
  ShieldCheck,
  Truck,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  getCustomerReturnRequests,
  isOrderEligibleForCylinderReturn,
  CylinderReturnRecord,
  parseReturnMetadata,
} from "@/lib/cylinder-returns-service";
import { CylinderReturnModal } from "./CylinderReturnModal";
import { CustomerReturnTrackingCard } from "./CustomerReturnTrackingCard";

export function CustomerReturnsView() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<CylinderReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "eligible" | "history">("active");

  // Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id;
      const currentEmail = authUser?.user?.email || user?.email;

      if (!currentUserId && !currentEmail) {
        setOrders([]);
        setReturns([]);
        setLoading(false);
        return;
      }

      // 1. Fetch customer's orders strictly filtered by customer_id or email
      let ordersQuery = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (currentUserId && currentEmail) {
        ordersQuery = ordersQuery.or(
          `customer_id.eq.${currentUserId},customer_email.eq.${currentEmail}`,
        );
      } else if (currentUserId) {
        ordersQuery = ordersQuery.eq("customer_id", currentUserId);
      } else if (currentEmail) {
        ordersQuery = ordersQuery.eq("customer_email", currentEmail);
      }

      const { data: customerOrders, error: ordersErr } = await ordersQuery;
      if (ordersErr) throw ordersErr;
      setOrders(customerOrders || []);

      // 2. Fetch customer's return requests
      if (currentUserId) {
        const returnRecords = await getCustomerReturnRequests(currentUserId);
        setReturns(returnRecords || []);
      }
    } catch (err: any) {
      console.error("Failed to load customer returns data:", err);
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization with unique channel name
    const channelName = `customer_returns_sync_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications" },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Compute eligible delivered orders
  const eligibleDeliveredOrders = useMemo(() => {
    return orders.filter((order) => {
      const eligibility = isOrderEligibleForCylinderReturn(order);
      return eligibility.eligible;
    });
  }, [orders]);

  // Existing return requests mapped by order_id
  const returnByOrderId = useMemo(() => {
    const map: Record<string, CylinderReturnRecord> = {};
    returns.forEach((r) => {
      if (r.order_id) {
        map[r.order_id] = r;
      }
    });
    return map;
  }, [returns]);

  // Active returns vs Completed returns
  const activeReturns = useMemo(() => {
    return returns.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s !== "completed" && s !== "verified" && s !== "closed" && s !== "rejected";
    });
  }, [returns]);

  const historyReturns = useMemo(() => {
    return returns.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s === "completed" || s === "verified" || s === "closed" || s === "rejected";
    });
  }, [returns]);

  const openReturnModalForOrder = (order: any) => {
    setSelectedOrderForReturn(order);
    setReturnModalOpen(true);
  };

  // Filtered lists by search query
  const filteredActiveReturns = useMemo(() => {
    if (!searchQuery.trim()) return activeReturns;
    const q = searchQuery.toLowerCase();
    return activeReturns.filter((r) => {
      const meta = r.metadata || parseReturnMetadata(r);
      const code = (meta?.return_code || r.id).toLowerCase();
      const orderNum = (meta?.order_number || "").toLowerCase();
      const cyl = (meta?.cylinder_name || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      return code.includes(q) || orderNum.includes(q) || cyl.includes(q) || status.includes(q);
    });
  }, [activeReturns, searchQuery]);

  const filteredEligibleOrders = useMemo(() => {
    if (!searchQuery.trim()) return eligibleDeliveredOrders;
    const q = searchQuery.toLowerCase();
    return eligibleDeliveredOrders.filter((o) => {
      const num = (o.order_number || o.id).toLowerCase();
      const items = (o.order_items || [])
        .map((i: any) => (i.product_name || i.name || "").toLowerCase())
        .join(" ");
      return num.includes(q) || items.includes(q);
    });
  }, [eligibleDeliveredOrders, searchQuery]);

  const filteredHistoryReturns = useMemo(() => {
    if (!searchQuery.trim()) return historyReturns;
    const q = searchQuery.toLowerCase();
    return historyReturns.filter((r) => {
      const meta = r.metadata || parseReturnMetadata(r);
      const code = (meta?.return_code || r.id).toLowerCase();
      const orderNum = (meta?.order_number || "").toLowerCase();
      const cyl = (meta?.cylinder_name || "").toLowerCase();
      return code.includes(q) || orderNum.includes(q) || cyl.includes(q);
    });
  }, [historyReturns, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shrink-0">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Return / Cylinder Pickup
              </h1>
              <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] font-extrabold uppercase">
                Customer Services
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Request empty cylinder collection for your delivered orders & track pickup progress in
              real-time.
            </p>
          </div>
        </div>

        {/* Quick Request Button */}
        {eligibleDeliveredOrders.length > 0 && (
          <Button
            onClick={() => {
              setActiveTab("eligible");
            }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs px-4 h-10 gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Request Cylinder Pickup
          </Button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Active Pickups
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {activeReturns.length}
            </span>
            <span className="text-[11px] font-bold text-amber-600">In Progress</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Eligible Delivered Orders
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {eligibleDeliveredOrders.length}
            </span>
            <span className="text-[11px] font-bold text-slate-500">Ready for pickup</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Completed & Verified
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-display">
              {historyReturns.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">Returns Closed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Service Policy
          </span>
          <p className="text-xs font-bold text-slate-800 leading-snug flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="h-4 w-4 text-red-600 shrink-0" /> Free Doorstep Collection
          </p>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "active"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>Active Pickups</span>
            {activeReturns.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "active" ? "bg-white text-red-600" : "bg-red-100 text-red-700"
                }`}
              >
                {activeReturns.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("eligible")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "eligible"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>Eligible Orders</span>
            {eligibleDeliveredOrders.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "eligible" ? "bg-white text-red-600" : "bg-slate-200 text-slate-800"
                }`}
              >
                {eligibleDeliveredOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>Return History</span>
            {historyReturns.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "history" ? "bg-white text-red-600" : "bg-slate-200 text-slate-800"
                }`}
              >
                {historyReturns.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search return code, order..."
            className="pl-8 text-xs bg-slate-50 border-slate-200 h-9 rounded-xl"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <Loader2 className="mx-auto h-8 w-8 text-red-600 animate-spin" />
          <p className="text-xs font-bold text-slate-600">
            Loading your return and pickup requests...
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: ACTIVE PICKUP REQUESTS & REAL-TIME TRACKING */}
          {/* ========================================================================= */}
          {activeTab === "active" && (
            <div className="space-y-4">
              {filteredActiveReturns.length === 0 ? (
                <div className="py-14 text-center space-y-4 bg-white rounded-3xl border border-slate-200/90 p-8">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <RotateCcw className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 font-display">
                      No active cylinder return pickups
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      You do not have any pending cylinder return requests. You can request a pickup
                      for any delivered gas cylinder order below.
                    </p>
                  </div>
                  {eligibleDeliveredOrders.length > 0 && (
                    <Button
                      onClick={() => setActiveTab("eligible")}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs px-5 h-9.5 gap-2"
                    >
                      <Plus className="h-4 w-4" /> View Eligible Delivered Orders (
                      {eligibleDeliveredOrders.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActiveReturns.map((ret) => (
                    <CustomerReturnTrackingCard key={ret.id} returnRecord={ret} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ELIGIBLE DELIVERED ORDERS FOR CYLINDER RETURN */}
          {/* ========================================================================= */}
          {activeTab === "eligible" && (
            <div className="space-y-4">
              {filteredEligibleOrders.length === 0 ? (
                <div className="py-14 text-center space-y-4 bg-white rounded-3xl border border-slate-200/90 p-8">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <Package className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 font-display">
                      No delivered cylinder orders eligible for return
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Only completed or delivered gas bottle and LPG cylinder orders can be selected
                      for pickup.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 h-9"
                  >
                    <Link to="/order-gas">Order Gas Cylinders</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEligibleOrders.map((order) => {
                    const eligibility = isOrderEligibleForCylinderReturn(order);
                    const existingReturn = returnByOrderId[order.id];
                    const existingMeta = existingReturn
                      ? existingReturn.metadata || parseReturnMetadata(existingReturn)
                      : null;
                    const deliveryAddress =
                      typeof order.delivery_address === "object" ? order.delivery_address : {};

                    const firstCyl = eligibility.cylinders[0] || {
                      name: "LPG Gas Cylinder",
                      quantity: 1,
                    };

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="space-y-3">
                          {/* Top Badge & Order Number */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                Order Reference
                              </span>
                              <span className="font-mono font-black text-sm text-slate-900">
                                #{order.order_number || order.id.slice(0, 8)}
                              </span>
                            </div>

                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Delivered
                            </Badge>
                          </div>

                          {/* Product Details */}
                          <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                            <div className="flex items-start gap-2">
                              <Flame className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 block truncate">
                                  {firstCyl.name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Delivered Quantity:{" "}
                                  <strong className="text-slate-900">
                                    {firstCyl.quantity} Cylinder{firstCyl.quantity > 1 ? "s" : ""}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {order.updated_at
                                    ? new Date(order.updated_at).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "Recent Delivery"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {deliveryAddress.street || "Address on file"},{" "}
                                  {deliveryAddress.postcode || ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Return Eligibility info */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-600">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>
                              Eligible for free doorstep empty collection & deposit credit
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100">
                          {existingReturn ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                  Pickup: {existingReturn.status} (#
                                  {existingMeta?.return_code || "RET"})
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab("active")}
                                className="rounded-xl text-xs font-bold h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                              >
                                View Status →
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => openReturnModalForOrder(order)}
                              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs h-9 gap-1.5"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Request Cylinder Pickup
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: COMPLETED & CLOSED RETURNS HISTORY */}
          {/* ========================================================================= */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {filteredHistoryReturns.length === 0 ? (
                <div className="py-14 text-center space-y-4 bg-white rounded-3xl border border-slate-200/90 p-8">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 font-display">
                      No completed return history
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Completed and verified cylinder return records will be archived here for your
                      records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistoryReturns.map((ret) => (
                    <CustomerReturnTrackingCard key={ret.id} returnRecord={ret} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Return Request Modal */}
      {selectedOrderForReturn && (
        <CylinderReturnModal
          isOpen={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false);
            setSelectedOrderForReturn(null);
          }}
          order={selectedOrderForReturn}
          eligibleCylinders={isOrderEligibleForCylinderReturn(selectedOrderForReturn).cylinders}
          onReturnSubmitted={() => {
            loadData();
            setActiveTab("active");
          }}
        />
      )}
    </div>
  );
}
