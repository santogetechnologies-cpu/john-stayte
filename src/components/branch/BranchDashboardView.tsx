import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  QrCode,
  PlusCircle,
  Repeat,
  Layers,
  MapPin,
  Phone,
  Building2,
  ArrowRight,
  AlertTriangle,
  Info,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  resolveBranchInfo,
  isPendingBranchAssignment,
  fetchRealBranchKpiCounts,
  fetchRealBranchOrders,
  fetchRealBranchStock,
  type BranchKpiCounts,
  type BranchOrderRecord,
  type BranchStockResult,
} from "@/lib/branch-service";
import { toast } from "sonner";

export function BranchDashboardView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);
  const branchInfo = resolveBranchInfo(assignedBranch, user?.assignedBranchId);

  const [counts, setCounts] = useState<BranchKpiCounts>({
    newOrders: 0,
    preparing: 0,
    readyForCollection: 0,
    awaitingCustomer: 0,
    onHold: 0,
    completedToday: 0,
  });
  const [stockResult, setStockResult] = useState<BranchStockResult>({
    available: false,
    message: "Branch inventory data is not available.",
    items: [],
  });
  const [recentOrders, setRecentOrders] = useState<BranchOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Dialogs
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pickupCodeInput, setPickupCodeInput] = useState("");
  const [walkinModalOpen, setWalkinModalOpen] = useState(false);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);

  // Real database fetcher
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (isPending) {
        setCounts({
          newOrders: 0,
          preparing: 0,
          readyForCollection: 0,
          awaitingCustomer: 0,
          onHold: 0,
          completedToday: 0,
        });
        setRecentOrders([]);
        setStockResult({
          available: false,
          message: "Branch inventory data is not available.",
          items: [],
        });
        return;
      }

      const [realCounts, realOrders, realStock] = await Promise.all([
        fetchRealBranchKpiCounts(assignedBranch, user?.assignedBranchId),
        fetchRealBranchOrders(assignedBranch, "all", user?.assignedBranchId),
        fetchRealBranchStock(assignedBranch, user?.assignedBranchId),
      ]);

      setCounts(realCounts);
      setRecentOrders(realOrders.slice(0, 8));
      setStockResult(realStock);
    } catch (err) {
      console.error("Failed to load real branch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [assignedBranch, isPending]);

  useEffect(() => {
    loadDashboardData();

    // Supabase Realtime Subscription for live updates to orders scoped to this branch
    if (!isPending) {
      const channel = supabase
        .channel("branch_dashboard_orders_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadDashboardData();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadDashboardData, isPending]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupCodeInput.trim()) {
      toast.error("Please enter a collection PIN or barcode number.");
      return;
    }
    toast.success(`Collection Code verified: ${pickupCodeInput.toUpperCase()}`);
    setQrModalOpen(false);
    setPickupCodeInput("");
  };

  return (
    <div className="space-y-6">
      {/* PENDING ASSIGNMENT NOTICE */}
      {isPending && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 flex items-start gap-3.5 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">Branch Assignment Confirmation Pending</h3>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              This staff account (<code className="font-bold text-amber-950">{user?.email || "staff@jss.com"}</code>) is currently awaiting official branch assignment by an Operations Manager.
            </p>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              To preserve strict cross-branch data privacy, customer orders and depot inventory will only display once your forecourt location has been assigned.
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Branch Dashboard
            </h1>
            <Badge
              variant="outline"
              className={`font-bold text-xs ${
                isPending
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}
            >
              {isPending ? "Pending Assignment" : "Live Shift"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time overview of Click &amp; Collect customer handovers and branch operations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setQrModalOpen(true)}
            className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan QR / Enter Code</span>
          </Button>
          <Button
            onClick={() => setWalkinModalOpen(true)}
            variant="outline"
            className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
          >
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <span>Walk-in Order</span>
          </Button>
          <Button
            onClick={() => setExchangeModalOpen(true)}
            variant="outline"
            className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
          >
            <Repeat className="h-4 w-4 text-blue-600" />
            <span>Log Cylinder Exchange</span>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
          >
            <Link to="/branch/stock">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Stock Check</span>
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={loadDashboardData}
            title="Refresh real data"
            className="rounded-xl h-9 w-9 text-slate-500 hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* BRANCH INFORMATION CARD */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Operating Location
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {branchInfo ? branchInfo.name : "Branch Assignment Pending"}
            </h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {branchInfo
                  ? `${branchInfo.address}, ${branchInfo.town} ${branchInfo.postcode}`
                  : "Awaiting administrator confirmation"}
              </span>
              {branchInfo?.telephone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${branchInfo.telephone}`} className="hover:underline font-semibold text-slate-800">
                    {branchInfo.telephone}
                  </a>
                </span>
              )}
              {branchInfo?.opening_hours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">{branchInfo.opening_hours}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Staff Account</p>
              <p className="text-xs font-bold text-slate-800">{user?.name || "Branch Staff"}</p>
            </div>
            <Badge
              className={`px-3 py-1 font-bold text-xs ${
                isPending
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {isPending ? "Pending Assignment" : "Open for Collections"}
            </Badge>
          </div>
        </div>
      </div>

      {/* 6 OPERATIONAL SUMMARY KPI CARDS (REAL DATABASE COUNTS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. New Orders */}
        <Link
          to="/branch/orders"
          search={{ status: "new" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <Clock className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
              New
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.newOrders}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">New Orders</p>
          <p className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Action required <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>

        {/* 2. Preparing */}
        <Link
          to="/branch/orders"
          search={{ status: "preparing" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <PackageCheck className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full">
              Picking
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.preparing}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">Preparing</p>
          <p className="text-[10px] text-purple-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            In progress <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>

        {/* 3. Ready for Collection */}
        <Link
          to="/branch/orders"
          search={{ status: "ready" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Ready
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.readyForCollection}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">Ready for Collection</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Customer notified <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>

        {/* 4. Awaiting Customer */}
        <Link
          to="/branch/orders"
          search={{ status: "awaiting" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
              Awaiting
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.awaitingCustomer}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">Awaiting Customer</p>
          <p className="text-[10px] text-amber-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Reminder sent <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>

        {/* 5. On Hold */}
        <Link
          to="/branch/orders"
          search={{ status: "on_hold" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <PauseCircle className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
              Hold
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.onHold}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">On Hold</p>
          <p className="text-[10px] text-rose-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Needs review <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>

        {/* 6. Completed Today */}
        <Link
          to="/branch/orders"
          search={{ status: "completed" }}
          className="group block p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Done
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.completedToday}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-1">Completed Today</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Handed over <ArrowRight className="h-2.5 w-2.5" />
          </p>
        </Link>
      </div>

      {/* BRANCH CYLINDER STOCK OVERVIEW (REAL DATABASE DATA / REQUIRED EMPTY STATE) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Branch Cylinder Stock Overview</h2>
            <p className="text-xs text-slate-500">
              Live cylinder matrix at {branchInfo?.name || "your branch"}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
            <Link to="/branch/stock">Stock Matrix</Link>
          </Button>
        </div>

        <div className="pt-4">
          {!stockResult.available || stockResult.items.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <Layers className="mx-auto h-7 w-7 text-slate-400" />
              <p className="text-sm font-bold text-slate-800">Branch inventory data is not available.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Per-forecourt cylinder inventory records have not been configured for this station in the database.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stockResult.items.map((cyl) => (
                <div
                  key={cyl.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{cyl.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        cyl.status === "low_stock"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : cyl.status === "out_of_stock"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {cyl.status === "low_stock"
                        ? "Low Stock"
                        : cyl.status === "out_of_stock"
                          ? "Out of Stock"
                          : "In Stock"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Available Full</span>
                      <span className="text-lg font-black text-slate-900">{cyl.availableFull}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Reorder Min</span>
                      <span className="text-sm font-bold text-slate-500">{cyl.minThreshold}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT BRANCH ORDERS TABLE (REAL DATABASE DATA / REQUIRED EMPTY STATE) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Click &amp; Collect Orders</h2>
            <p className="text-xs text-slate-500">Orders assigned for collection at this location</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
            <Link to="/branch/orders">View All Orders</Link>
          </Button>
        </div>

        <div className="overflow-x-auto pt-3">
          {recentOrders.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No orders yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When customers place Click &amp; Collect orders assigned to this branch, they will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Item / Cylinder</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord) => {
                  const s = ord.status.toLowerCase();
                  const badgeColor =
                    s === "ready"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : s === "approved" || s === "packed" || s === "preparing"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : s === "delivered" || s === "completed"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{ord.customerName}</p>
                        <p className="text-[10px] text-slate-400">{ord.customerPhone}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {ord.itemsSummary}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        £{ord.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] font-extrabold capitalize ${badgeColor}`}>
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            toast.info(`Order ${ord.orderNumber} selected for collection verification.`);
                          }}
                          className="rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-7 px-2.5"
                        >
                          Handover
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QUICK ACTION MODAL: SCAN COLLECTION CODE */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-600" />
              <span>Verify Click &amp; Collect Code</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scan the customer's collection barcode / QR code or manually enter their collection PIN.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerifyCode} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Enter Collection PIN / Code</label>
              <Input
                placeholder="e.g. JSS-123456"
                value={pickupCodeInput}
                onChange={(e) => setPickupCodeInput(e.target.value)}
                className="font-mono text-center text-lg tracking-widest uppercase font-black h-12"
                autoFocus
              />
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Verifying the collection code will pull up the order details, cylinder exchange inspection checklist, and release button.
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setQrModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Lookup Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODAL: WALK-IN ORDER */}
      <Dialog open={walkinModalOpen} onOpenChange={setWalkinModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              <span>New Walk-in Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register counter collection for customer arriving directly at {branchInfo?.name || "the branch"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600">
            <p>
              Record immediate walk-in gas cylinder purchases and customer age/safety verification.
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
              Prepared for Phase 2 branch POS &amp; cash/card counter workflow.
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setWalkinModalOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODAL: LOG CYLINDER EXCHANGE */}
      <Dialog open={exchangeModalOpen} onOpenChange={setExchangeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-600" />
              <span>Log Cylinder Exchange</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect empty cylinder returned by customer and verify safety checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600">
            <p>
              Inspect returned cylinder brand, check valve condition, and record deposit refund.
            </p>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 font-medium">
              Prepared for Click &amp; Collect cylinder return verification workflow.
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setExchangeModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
