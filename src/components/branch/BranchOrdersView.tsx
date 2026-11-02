import { useState, useEffect, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ChevronRight,
  User,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  fetchRealBranchOrders,
  isPendingBranchAssignment,
  resolveBranchInfo,
  updateBranchOrderStatus,
  type BranchOrderRecord,
} from "@/lib/branch-service";
import { toast } from "sonner";

const STATUS_TABS = [
  { label: "All Orders", value: "all" },
  { label: "New", value: "new", icon: Clock },
  { label: "Preparing", value: "preparing", icon: PackageCheck },
  { label: "Ready for Collection", value: "ready", icon: CheckCircle2 },
  { label: "Awaiting Customer", value: "awaiting", icon: AlertCircle },
  { label: "On Hold", value: "on_hold", icon: PauseCircle },
  { label: "Completed", value: "completed", icon: CheckCircle2 },
];

export function BranchOrdersView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);
  const branchInfo = resolveBranchInfo(assignedBranch, user?.assignedBranchId);

  const routerState = useRouterState();
  const currentSearchStr =
    typeof window !== "undefined" ? window.location.search : routerState.location.searchStr || "";
  const currentParams = new URLSearchParams(currentSearchStr);
  const activeStatusFromUrl = currentParams.get("status")?.toLowerCase() || "all";

  const [activeTab, setActiveTab] = useState(activeStatusFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<BranchOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(activeStatusFromUrl);
  }, [activeStatusFromUrl]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (isPending) {
        setOrders([]);
        return;
      }
      const data = await fetchRealBranchOrders(assignedBranch, activeTab, user?.assignedBranchId);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load real branch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [assignedBranch, activeTab, isPending]);

  useEffect(() => {
    loadOrders();

    if (!isPending) {
      const channel = supabase
        .channel("branch_orders_realtime_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadOrders();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadOrders, isPending]);

  const filteredOrders = orders.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.itemsSummary.toLowerCase().includes(q) ||
      ord.customerPhone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Click &amp; Collect Orders</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Branch Orders
            </h1>
            <Badge
              variant="outline"
              className={`font-bold text-xs ${
                isPending
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}
            >
              📍 {assignedBranch}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real database Click &amp; Collect orders assigned to this forecourt location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* PENDING NOTICE */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold">Awaiting Branch Assignment</p>
            <p className="text-amber-800/90 leading-relaxed">
              Staff account must be assigned to an active branch before order records can be accessed.
            </p>
          </div>
        </div>
      )}

      {/* STATUS TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              to="/branch/orders"
              search={tab.value === "all" ? {} : { status: tab.value }}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Order ID (JSS-...), customer name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs shadow-2xs"
          />
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
            <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="font-bold text-sm text-slate-800">No orders yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When customers place Click &amp; Collect orders assigned to this branch, they will appear here.
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const s = (ord.status || "").toLowerCase();
            const badgeColor =
              s === "ready"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : s === "approved" || s === "packed" || s === "preparing"
                  ? "bg-purple-50 text-purple-800 border-purple-300"
                  : s === "awaiting"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : s === "on_hold"
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : s === "delivered" || s === "completed"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-blue-50 text-blue-800 border-blue-300";

            return (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">{ord.orderNumber}</span>
                    <Badge variant="outline" className={`text-[10px] font-black uppercase ${badgeColor}`}>
                      {ord.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 ml-auto md:ml-0">
                      £{ord.total.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 flex items-center gap-2 pt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ord.customerName}</span>
                    <span className="text-slate-400 font-normal">·</span>
                    <span className="text-slate-500 font-medium">{ord.customerPhone}</span>
                  </p>

                  <p className="text-xs text-slate-600 font-semibold">{ord.itemsSummary}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Slot: {ord.collectionSlot}</span>
                    </span>
                    {ord.notes && (
                      <span className="text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md font-medium">
                        📌 {ord.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {(() => {
                    const s = ord.status.toLowerCase();
                    if (s === "delivered" || s === "completed") {
                      return (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-bold">
                          Completed
                        </Badge>
                      );
                    }
                    if (s === "cancelled") {
                      return (
                        <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200 font-bold">
                          Cancelled
                        </Badge>
                      );
                    }

                    const getAction = () => {
                      if (s === "pending" || s === "new") {
                        return {
                          label: "Approve",
                          nextStatus: "Approved" as const,
                          nextFulfillment: "Pending",
                          className: "bg-blue-600 hover:bg-blue-700 text-white",
                        };
                      }
                      if (s === "approved") {
                        return {
                          label: "Mark Packed",
                          nextStatus: "Packed" as const,
                          nextFulfillment: "Ready",
                          className: "bg-indigo-600 hover:bg-indigo-700 text-white",
                        };
                      }
                      if (s === "packed") {
                        return {
                          label: "Mark Ready",
                          nextStatus: "Ready" as const,
                          nextFulfillment: "Ready",
                          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
                        };
                      }
                      if (s === "ready") {
                        return {
                          label: "Handover",
                          nextStatus: "Delivered" as const,
                          nextFulfillment: "Completed",
                          className: "bg-amber-600 hover:bg-amber-700 text-white",
                        };
                      }
                      return null;
                    };

                    const action = getAction();
                    if (!action) return null;

                    return (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const res = await updateBranchOrderStatus({
                            orderId: ord.id,
                            status: action.nextStatus,
                            fulfillmentStatus: action.nextFulfillment,
                            notes:
                              action.nextStatus === "Delivered"
                                ? `Collected at ${assignedBranch} on ${new Date().toLocaleDateString()}`
                                : undefined,
                          });
                          if (res.success) {
                            toast.success(`Order ${ord.orderNumber} updated to ${action.nextStatus}.`);
                            loadOrders();
                          } else {
                            toast.error(res.error || `Could not update order ${ord.orderNumber}.`);
                          }
                        }}
                        className={`rounded-xl font-bold text-xs ${action.className}`}
                      >
                        {action.label}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
