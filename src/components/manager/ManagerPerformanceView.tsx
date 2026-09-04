import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Truck,
  MessageSquare,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export function ManagerPerformanceView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");

  const loadPerformanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: dbOrders, error: ordErr },
        { data: dbDelivs, error: delErr },
        { data: dbTickets, error: tickErr },
        { data: dbProds, error: prodErr },
      ] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: true }),
        supabase.from("delivery_assignments").select("*"),
        supabase.from("support_tickets").select("*"),
        supabase.from("products").select("*"),
      ]);

      if (ordErr) throw ordErr;
      if (delErr) throw delErr;
      if (tickErr) throw tickErr;
      if (prodErr) throw prodErr;

      setOrders(dbOrders || []);
      setDeliveries(dbDelivs || []);
      setTickets(dbTickets || []);
      setProducts(dbProds || []);
    } catch (err: any) {
      console.error("Failed to load performance data:", err);
      setError(err.message || "Unable to load performance metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();

    // Subscribe to realtime changes on orders & tickets
    const channel = supabase
      .channel("manager_performance_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        loadPerformanceData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () =>
        loadPerformanceData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter Data by Selected Date Range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30d default

    if (dateRange === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    return orders.filter((o) => new Date(o.created_at) >= startDate);
  }, [orders, dateRange]);

  // Real Metric Calculations from Unified Data Layer
  const totalOrdersCount = filteredOrders.length;
  const approvedOrdersCount = filteredOrders.filter(
    (o) =>
      o.status === "Approved" ||
      o.status === "Packed" ||
      o.status === "Out for Delivery" ||
      o.status === "Delivered",
  ).length;
  const completedDeliveriesCount = filteredOrders.filter((o) => o.status === "Delivered").length;
  const pendingOrdersCount = filteredOrders.filter((o) => o.status === "Pending").length;

  const resolvedTicketsCount = tickets.filter((t) => t.status === "Resolved").length;
  const totalTicketsCount = tickets.length;
  const slaPercentage =
    totalTicketsCount > 0 ? Math.round((resolvedTicketsCount / totalTicketsCount) * 100) : 100;

  const lowStockCount = products.filter((p) => Number(p.stock || 0) <= 5).length;

  // Overall Performance Score Calculation
  const performanceScore = useMemo(() => {
    if (totalOrdersCount === 0) return 0;
    const approvalRatio = approvedOrdersCount / totalOrdersCount;
    const completionRatio = completedDeliveriesCount / totalOrdersCount;
    const slaRatio = totalTicketsCount > 0 ? resolvedTicketsCount / totalTicketsCount : 1;
    return Math.round((approvalRatio * 0.4 + completionRatio * 0.4 + slaRatio * 0.2) * 100);
  }, [
    totalOrdersCount,
    approvedOrdersCount,
    completedDeliveriesCount,
    resolvedTicketsCount,
    totalTicketsCount,
  ]);

  // Semantic color for Performance Score Circle
  const scoreColor = useMemo(() => {
    if (performanceScore >= 80) return "border-emerald-500 text-emerald-700 bg-emerald-50/40";
    if (performanceScore >= 50) return "border-blue-500 text-blue-700 bg-blue-50/40";
    if (performanceScore >= 1) return "border-amber-500 text-amber-700 bg-amber-50/40";
    return "border-slate-200 text-slate-500 bg-slate-50/40";
  }, [performanceScore]);

  // DAILY AGGREGATION FOR CHART (Reconciles 100% with Orders Processed Total)
  const chartData = useMemo(() => {
    const now = new Date();
    let daysToCover = 30;
    if (dateRange === "today") daysToCover = 1;
    else if (dateRange === "7d") daysToCover = 7;
    else if (dateRange === "30d") daysToCover = 30;
    else if (dateRange === "90d") daysToCover = 90;

    const dateMap: Record<string, { date: string; handled: number; completed: number }> = {};

    // Populate all dates in range with 0 initially
    for (let i = daysToCover - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      dateMap[key] = { date: key, handled: 0, completed: 0 };
    }

    // Aggregate actual orders into dateMap
    filteredOrders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
      });
      if (!dateMap[key]) {
        dateMap[key] = { date: key, handled: 0, completed: 0 };
      }
      dateMap[key].handled += 1;
      if (o.status === "Delivered") {
        dateMap[key].completed += 1;
      }
    });

    return Object.values(dateMap);
  }, [filteredOrders, dateRange]);

  // Calculate Dynamic Growth Trend State & Matching Chart Colors
  const trendState = useMemo(() => {
    if (chartData.length < 2) {
      return {
        type: "stable",
        label: "Stable Trend ⚪",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        strokeColor: "#3b82f6", // Blue for neutral/stable
        fillColor: "#3b82f6",
        icon: Activity,
      };
    }

    const mid = Math.floor(chartData.length / 2);
    const firstHalfSum = chartData.slice(0, mid).reduce((sum, d) => sum + d.handled, 0);
    const secondHalfSum = chartData.slice(mid).reduce((sum, d) => sum + d.handled, 0);

    if (secondHalfSum > firstHalfSum) {
      return {
        type: "increasing",
        label: "Increasing Trend 🟢",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        strokeColor: "#10b981", // Emerald Green for Increasing
        fillColor: "#10b981",
        icon: TrendingUp,
      };
    }
    if (secondHalfSum < firstHalfSum) {
      return {
        type: "declining",
        label: "Declining Trend 🔴",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        strokeColor: "#ef4444", // Red for Declining
        fillColor: "#ef4444",
        icon: TrendingDown,
      };
    }
    return {
      type: "stable",
      label: "Stable Trend ⚪",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      strokeColor: "#3b82f6", // Blue for neutral/stable
      fillColor: "#3b82f6",
      icon: Activity,
    };
  }, [chartData]);

  // Reconciled check: Sum of graph points must equal totalOrdersCount
  const graphTotalHandled = chartData.reduce((sum, d) => sum + d.handled, 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">My Performance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" /> My Performance & Operational Metrics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track operational throughput, order fulfillment SLAs, and daily handled trends.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px] h-9 rounded-full border-slate-200 text-xs font-semibold bg-white shadow-2xs">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl text-xs font-medium">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="surface-card p-12 rounded-3xl border bg-white text-center space-y-3 shadow-xs">
          <Clock className="mx-auto h-6 w-6 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Loading performance data...</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center space-y-3 surface-card rounded-3xl border bg-white shadow-xs">
          <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
          <h3 className="font-bold text-sm text-foreground">Unable to load performance data</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <Button
            onClick={loadPerformanceData}
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-bold gap-1.5 mt-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. PERFORMANCE HERO SCORE & SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Performance Score Card */}
            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Performance Score
              </p>
              <div
                className={`relative flex items-center justify-center h-28 w-28 rounded-full border-4 transition-colors ${scoreColor}`}
              >
                <span className="text-4xl font-black">{performanceScore}</span>
                <span className="text-xs font-extrabold text-muted-foreground align-top mt-1">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                {totalOrdersCount === 0
                  ? "No operational activity recorded in date window"
                  : `${approvedOrdersCount} approved & ${completedDeliveriesCount} delivered out of ${totalOrdersCount} orders`}
              </p>
            </div>

            {/* Performance Overview KPI Grid */}
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div className="surface-card p-4 rounded-2xl border bg-white space-y-1 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Orders Processed
                </p>
                <p className="text-2xl font-black text-foreground">{totalOrdersCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pendingOrdersCount} pending approval
                </p>
              </div>

              <div className="surface-card p-4 rounded-2xl border bg-white space-y-1 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Orders Approved
                </p>
                <p className="text-2xl font-black text-blue-600">{approvedOrdersCount}</p>
                <p className="text-[11px] text-muted-foreground">Depot approved</p>
              </div>

              <div className="surface-card p-4 rounded-2xl border bg-white space-y-1 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Deliveries Completed
                </p>
                <p className="text-2xl font-black text-emerald-600">{completedDeliveriesCount}</p>
                <p className="text-[11px] text-muted-foreground">Dispatched & delivered</p>
              </div>

              <div className="surface-card p-4 rounded-2xl border bg-white space-y-1 shadow-2xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Support SLA Met
                </p>
                <p className="text-2xl font-black text-purple-600">{slaPercentage}%</p>
                <p className="text-[11px] text-muted-foreground">
                  {resolvedTicketsCount} of {totalTicketsCount} tickets resolved
                </p>
              </div>
            </div>
          </div>

          {/* 3. PERFORMANCE BREAKDOWN SECTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Order Processing",
                metric: `${approvedOrdersCount} Approved`,
                detail: `${totalOrdersCount} Total Handled`,
                color: "text-blue-700 bg-blue-50 border-blue-100",
                icon: ShoppingBag,
              },
              {
                title: "Delivery Fulfillment",
                metric: `${completedDeliveriesCount} Completed`,
                detail: `${deliveries.length} Route Dispatches`,
                color: "text-purple-700 bg-purple-50 border-purple-100",
                icon: Truck,
              },
              {
                title: "Customer Service",
                metric: `${resolvedTicketsCount} Resolved`,
                detail: `${totalTicketsCount} Enquiries Total`,
                color: "text-emerald-700 bg-emerald-50 border-emerald-100",
                icon: MessageSquare,
              },
              {
                title: "Inventory Health",
                metric: lowStockCount === 0 ? "Optimal Stock" : `${lowStockCount} Low Stock`,
                detail: `${products.length} Products Monitored`,
                color:
                  lowStockCount > 0
                    ? "text-amber-700 bg-amber-50 border-amber-100"
                    : "text-emerald-700 bg-emerald-50 border-emerald-100",
                icon: Package,
              },
            ].map((sec) => (
              <div
                key={sec.title}
                className={`surface-card p-4 rounded-2xl border ${sec.color} space-y-1 shadow-2xs`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-foreground">{sec.title}</p>
                  <sec.icon className="h-4 w-4 opacity-70" />
                </div>
                <p className="text-lg font-black text-foreground">{sec.metric}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{sec.detail}</p>
              </div>
            ))}
          </div>

          {/* 4. PERFORMANCE CHART — DYNAMIC TREND STYLED & RECONCILED */}
          <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-base font-black text-foreground">Orders Handled Trend</h2>
                <p className="text-xs text-muted-foreground">
                  Daily orders handled in selected window (Reconciled Total: {graphTotalHandled}{" "}
                  orders).
                </p>
              </div>

              <Badge className={`${trendState.badgeColor} text-xs font-extrabold px-3 py-1 border`}>
                <trendState.icon className="h-3.5 w-3.5 mr-1" /> {trendState.label}
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed rounded-2xl bg-slate-50/50">
                  <Activity className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs font-bold text-foreground">
                    No performance history in date window
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Daily performance trend graphs will render when orders are placed.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="handledDynamicGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendState.fillColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={trendState.fillColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} orders`, "Orders Handled"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "16px",
                        border: `1px solid ${trendState.strokeColor}40`,
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="handled"
                      stroke={trendState.strokeColor}
                      fillOpacity={1}
                      fill="url(#handledDynamicGrad)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 5. PERFORMANCE INSIGHTS */}
          <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
            <h2 className="text-base font-black text-foreground">Operational Insights</h2>
            {totalOrdersCount === 0 ? (
              <p className="text-xs text-muted-foreground font-medium">
                No performance insights available for this period. Insights generate automatically
                as order activity occurs.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl border bg-emerald-50/50 border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950">
                    Order throughput is active with {approvedOrdersCount} orders approved and{" "}
                    {completedDeliveriesCount} completed deliveries.
                  </span>
                </div>
                <div className="p-3 rounded-2xl border bg-blue-50/50 border-blue-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-blue-950">
                    Customer support SLA resolution rate is operating at {slaPercentage}% across{" "}
                    {totalTicketsCount} logged enquiries.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
