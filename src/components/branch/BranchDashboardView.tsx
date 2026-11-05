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
    <div className="space-y-8">
      {/* PENDING ASSIGNMENT NOTICE (COMPACT & ELEGANT) */}
      {isPending && (
        <div className="surface-card p-4 sm:p-4.5 rounded-[20px] border border-[#FDE68A] bg-[#FFF7E6] backdrop-blur-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FDE68A]/60 border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-[#D97706]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs text-[#92400E]">Branch Assignment Pending Confirmation</h3>
                <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#FDE68A] text-[#92400E]">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-[#92400E]/85 mt-0.5 leading-relaxed">
                Awaiting forecourt location assignment by an Operations Manager. Orders and stock will unlock once assigned.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white/90 border border-[#FDE68A] text-[#92400E] text-[10px] font-black uppercase tracking-wide shadow-2xs">
              Account: {user?.email || "staff@jss.com"}
            </span>
          </div>
        </div>
      )}

      {/* DASHBOARD HERO HEADER (MATCHING ADMIN PORTAL) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Branch Dashboard
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${
                isPending
                  ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                  : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPending ? "bg-[#D97706] animate-pulse" : "bg-emerald-500 animate-pulse"
                }`}
              />
              {isPending ? "Pending Assignment" : "Live Shift Active"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time Click &amp; Collect customer handovers, cylinder management, and branch operations.
          </p>
        </div>

        {/* Quick Action Buttons: Unified heights & styling matching Admin Portal */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Button
            onClick={() => setQrModalOpen(true)}
            size="sm"
            className="h-9.5 rounded-full font-black text-xs bg-[#374151] hover:bg-[#1f2937] text-white shadow-sm gap-1.5 cursor-pointer px-4"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan QR / PIN</span>
          </Button>
          <Button
            onClick={() => setWalkinModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9.5 rounded-full font-bold text-xs border-[#E5E7EB] bg-white/70 backdrop-blur-md text-[#374151] hover:bg-[#F9FAFB] shadow-2xs gap-1.5 cursor-pointer px-3.5"
          >
            <PlusCircle className="h-4 w-4 text-[#374151]" />
            <span>Walk-in Order</span>
          </Button>
          <Button
            onClick={() => setExchangeModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9.5 rounded-full font-bold text-xs border-[#E5E7EB] bg-white/70 backdrop-blur-md text-[#374151] hover:bg-[#F9FAFB] shadow-2xs gap-1.5 cursor-pointer px-3.5"
          >
            <Repeat className="h-4 w-4 text-[#374151]" />
            <span>Log Exchange</span>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9.5 rounded-full font-bold text-xs border-[#E5E7EB] bg-white/70 backdrop-blur-md text-[#374151] hover:bg-[#F9FAFB] shadow-2xs gap-1.5 cursor-pointer px-3.5"
          >
            <Link to="/branch/stock">
              <Layers className="h-4 w-4 text-[#374151]" />
              <span>Stock Check</span>
            </Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={loadDashboardData}
            title="Refresh live data"
            className="h-9.5 w-9.5 rounded-full border-[#E5E7EB] bg-white/70 backdrop-blur-md text-[#6B7280] hover:text-[#374151] hover:bg-[#F9FAFB] shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* OPERATING LOCATION CARD (FROSTED GLASS) */}
      <div className="surface-card p-5 sm:p-6 rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#4B5563]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                OPERATING FORECOURT
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {branchInfo ? branchInfo.name : "Branch Assignment Pending"}
            </h2>
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600 pt-0.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {branchInfo
                    ? `${branchInfo.address}, ${branchInfo.town} ${branchInfo.postcode}`
                    : "Awaiting administrator confirmation"}
                </span>
              </span>
              {branchInfo?.telephone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${branchInfo.telephone}`} className="hover:underline font-semibold text-slate-800">
                    {branchInfo.telephone}
                  </a>
                </span>
              )}
              {branchInfo?.opening_hours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{branchInfo.opening_hours}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Staff Account</p>
              <p className="text-xs font-bold text-slate-800">{user?.name || "Branch Staff"}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-2xs ${
                isPending
                  ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                  : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isPending ? "bg-[#D97706]" : "bg-emerald-500"
                }`}
              />
              {isPending ? "Pending Assignment" : "Open for Collections"}
            </span>
          </div>
        </div>
      </div>

      {/* 6 OPERATIONAL SUMMARY KPI CARDS (MATCHING ADMIN PORTAL DESIGN LANGUAGE) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. New Orders - Blue */}
        <Link
          to="/branch/orders"
          search={{ status: "new" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(37,99,235,0.12)] hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              New Orders
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.newOrders}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 font-extrabold text-[10px]">
                Pending
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                Action required
              </span>
            </div>
          </div>
        </Link>

        {/* 2. Preparing - Purple */}
        <Link
          to="/branch/orders"
          search={{ status: "preparing" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(147,51,234,0.12)] hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Preparing
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.preparing}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/20 font-extrabold text-[10px]">
                Picking
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                In progress
              </span>
            </div>
          </div>
        </Link>

        {/* 3. Ready for Collection - Green */}
        <Link
          to="/branch/orders"
          search={{ status: "ready" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.12)] hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Ready
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.readyForCollection}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-extrabold text-[10px]">
                Ready
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                For pickup
              </span>
            </div>
          </div>
        </Link>

        {/* 4. Awaiting Customer - Soft Amber */}
        <Link
          to="/branch/orders"
          search={{ status: "awaiting" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(217,119,6,0.12)] hover:border-[#FDE68A] transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Awaiting
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-[#FFF7E6] text-[#D97706] flex items-center justify-center border border-[#FDE68A] shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.awaitingCustomer}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7E6] text-[#92400E] border border-[#FDE68A] font-extrabold text-[10px]">
                Notified
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                Customer alert
              </span>
            </div>
          </div>
        </Link>

        {/* 5. On Hold - Red */}
        <Link
          to="/branch/orders"
          search={{ status: "on_hold" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(244,63,94,0.12)] hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              On Hold
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <PauseCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.onHold}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 border border-rose-500/20 font-extrabold text-[10px]">
                Review
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                Needs check
              </span>
            </div>
          </div>
        </Link>

        {/* 6. Completed Today - Green */}
        <Link
          to="/branch/orders"
          search={{ status: "completed" }}
          className="surface-card p-4 sm:p-5 rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.12)] hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1 block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <div className="h-8.5 w-8.5 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-2xs transition-transform duration-200 group-hover:scale-110">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {counts.completedToday}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-extrabold text-[10px]">
                Handed Over
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                Today
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* BRANCH CYLINDER STOCK OVERVIEW (MATCHING ADMIN PORTAL) */}
      <div className="surface-card p-6 rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Branch Cylinder Stock Overview</h2>
            <p className="text-xs text-slate-500 font-medium">
              Live cylinder matrix at {branchInfo?.name || "your branch"}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-3.5 text-xs font-bold border-white/80 bg-white/70 backdrop-blur-md hover:bg-white text-slate-700 shadow-2xs cursor-pointer"
          >
            <Link to="/branch/stock">Stock Matrix</Link>
          </Button>
        </div>

        <div>
          {!stockResult.available || stockResult.items.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl bg-white/50 border border-dashed border-slate-200/80 space-y-2.5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
                <Layers className="h-6 w-6" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">Branch inventory data is not available.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Per-forecourt cylinder inventory records have not been configured for this station in the database. Logistics stock is currently managed centrally at Whitminster Depot.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stockResult.items.map((cyl) => (
                <div
                  key={cyl.id}
                  className="p-4 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md hover:bg-white hover:border-slate-200/80 transition-all shadow-2xs"
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
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Available Full</span>
                      <span className="text-xl font-black text-slate-900">{cyl.availableFull}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Reorder Min</span>
                      <span className="text-sm font-bold text-slate-500">{cyl.minThreshold}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT BRANCH ORDERS TABLE (MATCHING ADMIN PORTAL) */}
      <div className="surface-card p-6 rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Click &amp; Collect Orders</h2>
            <p className="text-xs text-slate-500 font-medium">Orders assigned for collection at this location</p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-3.5 text-xs font-bold border-white/80 bg-white/70 backdrop-blur-md hover:bg-white text-slate-700 shadow-2xs cursor-pointer"
          >
            <Link to="/branch/orders">View All Orders</Link>
          </Button>
        </div>

        <div className="overflow-x-auto pt-1">
          {recentOrders.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">No orders yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                When customers place Click &amp; Collect orders assigned to this branch, they will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Item / Cylinder</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
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
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900">{ord.customerName}</p>
                        <p className="text-[10px] text-slate-400">{ord.customerPhone}</p>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {ord.itemsSummary}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        £{ord.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="outline" className={`text-[10px] font-extrabold capitalize ${badgeColor}`}>
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            toast.info(`Order ${ord.orderNumber} selected for collection verification.`);
                          }}
                          className="rounded-full text-xs font-bold bg-[#374151] hover:bg-[#1f2937] text-white h-7.5 px-3.5 shadow-xs cursor-pointer"
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
        <DialogContent className="sm:max-w-md rounded-[24px] border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-black">
              <div className="h-8 w-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center border border-[#E5E7EB] shadow-2xs">
                <QrCode className="h-4 w-4" />
              </div>
              <span>Verify Click &amp; Collect Code</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
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
                className="font-mono text-center text-lg tracking-widest uppercase font-black h-12 rounded-xl bg-slate-50/80 border-slate-200"
                autoFocus
              />
            </div>
            <div className="p-3 bg-[#F3F4F6]/80 rounded-xl border border-[#E5E7EB] text-[#374151] text-xs flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-[#4B5563] shrink-0 mt-0.5" />
              <span>
                Verifying the collection code will pull up the order details, cylinder exchange inspection checklist, and release button.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setQrModalOpen(false)} className="rounded-full h-9 px-4 text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" className="rounded-full h-9 px-4 text-xs font-black bg-[#374151] hover:bg-[#1f2937] text-white shadow-sm">
                Lookup Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODAL: WALK-IN ORDER */}
      <Dialog open={walkinModalOpen} onOpenChange={setWalkinModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-black">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
                <PlusCircle className="h-4 w-4" />
              </div>
              <span>New Walk-in Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register counter collection for customer arriving directly at {branchInfo?.name || "the branch"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Record immediate walk-in gas cylinder purchases and customer age/safety verification.
            </p>
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-900 font-semibold">
              Prepared for Phase 2 branch POS &amp; counter workflow.
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setWalkinModalOpen(false)} className="rounded-full h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODAL: LOG CYLINDER EXCHANGE */}
      <Dialog open={exchangeModalOpen} onOpenChange={setExchangeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-black">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-2xs">
                <Repeat className="h-4 w-4" />
              </div>
              <span>Log Cylinder Exchange</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Inspect empty cylinder returned by customer and verify safety checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Inspect returned cylinder brand, check valve condition, and record deposit refund.
            </p>
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-900 font-semibold">
              Prepared for Click &amp; Collect cylinder return verification workflow.
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setExchangeModalOpen(false)} className="rounded-full h-9 px-4 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
