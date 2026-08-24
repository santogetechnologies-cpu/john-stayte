import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  Download,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  PlusCircle,
  Tag,
  UserPlus,
  Ticket,
  Image as ImageIcon,
  BarChart2,
  DollarSign,
  Activity,
  Layers,
  Building2,
  BarChart3,
  PackageCheck,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function AdminDashboardView() {
  const { user } = useStore();
  const [dateRange, setDateRange] = useState("30d");
  const [analyticsMetric, setAnalyticsMetric] = useState<"revenue" | "orders" | "aov">("revenue");
  const [categoryMetric, setCategoryMetric] = useState<"revenue" | "orders" | "units">("revenue");
  const [loading, setLoading] = useState(true);

  // Live Supabase DB state
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [
          { data: dbOrders },
          { data: dbProducts },
          { data: dbCustomers },
          { data: dbInventory },
          { data: dbDeliveries },
          { data: dbLogs },
        ] = await Promise.all([
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
          supabase.from("products").select("*"),
          supabase.from("profiles").select("*").eq("role", "customer"),
          supabase.from("inventory").select("*, products(*)"),
          supabase.from("delivery_assignments").select("*"),
          supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10),
        ]);

        setOrders(dbOrders || []);
        setProducts(dbProducts || []);
        setCustomers(dbCustomers || []);
        setInventoryAlerts(dbInventory?.filter((i: any) => i.current_stock < i.reorder_threshold) || []);
        setDeliveries(dbDeliveries || []);
        setAuditLogs(dbLogs || []);
      } catch (err) {
        console.error("Failed to load admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute live metric calculations
  const totalRevenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "Pending").length;
  const lowStockCount = inventoryAlerts.length;
  const activeDeliveriesCount = deliveries.filter((d) => d.status === "Out for Delivery" || d.status === "Pending").length;
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Chart data calculations from real orders
  const chartData = orders.length > 0
    ? orders.slice(0, 12).reverse().map((o) => ({
        month: new Date(o.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        revenue: Number(o.total || 0),
        orders: 1,
        aov: Number(o.total || 0),
      }))
    : [
        { month: "Jan", revenue: 0, orders: 0, aov: 0 },
        { month: "Feb", revenue: 0, orders: 0, aov: 0 },
        { month: "Mar", revenue: 0, orders: 0, aov: 0 },
        { month: "Apr", revenue: 0, orders: 0, aov: 0 },
        { month: "May", revenue: 0, orders: 0, aov: 0 },
        { month: "Jun", revenue: 0, orders: 0, aov: 0 },
      ];

  // Dynamic trend calculation based on actual Supabase values
  const metricValues = chartData.map((d) => Number(d[analyticsMetric] || 0));
  let trend: "positive" | "negative" | "neutral" = "neutral";

  if (metricValues.length >= 2) {
    const mid = Math.floor(metricValues.length / 2);
    const firstHalfAvg = metricValues.slice(0, mid).reduce((sum, v) => sum + v, 0) / (mid || 1);
    const secondHalfAvg = metricValues.slice(mid).reduce((sum, v) => sum + v, 0) / ((metricValues.length - mid) || 1);

    if (secondHalfAvg > firstHalfAvg * 1.01) {
      trend = "positive";
    } else if (secondHalfAvg < firstHalfAvg * 0.99) {
      trend = "negative";
    } else {
      trend = "neutral";
    }
  } else if (metricValues.length === 1 && metricValues[0] > 0) {
    trend = "positive";
  }

  // Dynamic Theme palette (JSS Red theme accent)
  const chartTheme = {
    positive: {
      stroke: "#dc2626", // JSS Red
      badgeBg: "bg-red-50 text-red-700 border-red-200",
      badgeText: "Positive Growth",
      Icon: TrendingUp,
    },
    negative: {
      stroke: "#ef4444", // Red
      badgeBg: "bg-red-50 text-red-700 border-red-200",
      badgeText: "Declining",
      Icon: TrendingDown,
    },
    neutral: {
      stroke: "#475569", // Slate Neutral
      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
      badgeText: "Stable",
      Icon: Activity,
    },
  }[trend];

  const categoryData = products.length > 0
    ? Array.from(new Set(products.map((p) => p.category_slug || "General"))).map((cat) => {
        const catProds = products.filter((p) => (p.category_slug || "General") === cat);
        return {
          name: cat.replace("-", " ").toUpperCase(),
          revenue: catProds.reduce((sum, p) => sum + Number(p.price || 0), 0),
          orders: catProds.length,
          units: catProds.reduce((sum, p) => sum + Number(p.stock || 0), 0),
        };
      })
    : [{ name: "No Categories", revenue: 0, orders: 0, units: 0 }];

  const handleExportReport = () => {
    if (orders.length === 0) {
      return toast.error("No order data available to export.");
    }
    const headers = "Order Number,Customer Name,Customer Email,Status,Total,Date\n";
    const rows = orders.map((o) => `"${o.order_number || o.id}","${o.customer_name || ''}","${o.customer_email || ''}","${o.status}",${o.total},"${new Date(o.created_at).toLocaleDateString('en-GB')}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JSS_Admin_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Enterprise report CSV downloaded!");
  };

  // Dynamic greeting based on current hour
  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  // Enterprise Modules for the NIZA-style 4-column module grid
  const MODULE_CARDS = [
    {
      title: "Orders",
      subtitle: "Fulfillment & Dispatch",
      href: "/admin/orders",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      title: "Inventory",
      subtitle: "Stock Matrix & Alerts",
      href: "/admin/inventory",
      icon: PackageCheck,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      title: "Products",
      subtitle: "Catalog & Pricing",
      href: "/admin/products",
      icon: Package,
    },
    {
      title: "Customers",
      subtitle: "Directory & Accounts",
      href: "/admin/customers",
      icon: Users,
    },
    {
      title: "Deliveries",
      subtitle: "Fleet & Drivers",
      href: "/admin/deliveries",
      icon: Truck,
      badge: activeDeliveriesCount > 0 ? activeDeliveriesCount : undefined,
    },
    {
      title: "Reports",
      subtitle: "Financial Exports & Sales",
      href: "/admin/reports",
      icon: BarChart3,
    },
    {
      title: "Analytics",
      subtitle: "Live Trends & KPI",
      href: "/admin/analytics",
      icon: TrendingUp,
    },
    {
      title: "Stations",
      subtitle: "Filling Stations Network",
      href: "/admin/stations",
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. DASHBOARD GREETING & ACTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {greetingTime}, {user?.name || "John Stayte Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Live enterprise metrics, fulfillment queues, inventory alerts, and system health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-9.5 rounded-full border-white/80 text-xs font-bold bg-white/70 backdrop-blur-md text-slate-700 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last Quarter</SelectItem>
              <SelectItem value="1y">Full Year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs cursor-pointer h-9.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export Report
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-full text-xs font-black gap-1.5 shadow-md shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer h-9.5"
          >
            <Link to="/admin/products">
              <PlusCircle className="h-4 w-4" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. TOP KPI METRICS GRID (FROSTED GLASS CARDS) */}
      <div className="space-y-4">
        {/* Row 1 Primary Metrics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Revenue</span>
              <div className="h-10 w-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20 shadow-2xs">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{gbp(totalRevenue)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 font-extrabold text-[10px]">
                  <TrendingUp className="h-3 w-3" /> Live
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Verified database total</span>
              </div>
            </div>
          </div>

          <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Orders</span>
              <div className="h-10 w-10 rounded-2xl bg-slate-100/80 text-slate-700 flex items-center justify-center border border-slate-200/60 shadow-2xs">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalOrdersCount}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                  {pendingOrdersCount} Pending
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Orders placed</span>
              </div>
            </div>
          </div>

          <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Customers</span>
              <div className="h-10 w-10 rounded-2xl bg-slate-100/80 text-slate-700 flex items-center justify-center border border-slate-200/60 shadow-2xs">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{customers.length}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                  {customers.length} Accounts
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Registered customers</span>
              </div>
            </div>
          </div>

          <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Live Products</span>
              <div className="h-10 w-10 rounded-2xl bg-slate-100/80 text-slate-700 flex items-center justify-center border border-slate-200/60 shadow-2xs">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{products.length}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 font-extrabold text-[10px]">
                  {lowStockCount} Low Stock
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Catalog items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 Secondary Operational KPIs */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md flex items-center justify-between shadow-2xs hover:border-white transition-all">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Orders</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{pendingOrdersCount}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-extrabold text-[11px]">
              Queue
            </span>
          </div>

          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md flex items-center justify-between shadow-2xs hover:border-white transition-all">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Low Stock Items</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{lowStockCount}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60 font-extrabold text-[11px]">
              Threshold
            </span>
          </div>

          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md flex items-center justify-between shadow-2xs hover:border-white transition-all">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Deliveries</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{activeDeliveriesCount}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px]">
              En Route
            </span>
          </div>

          <div className="surface-card p-4 sm:p-5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md flex items-center justify-between shadow-2xs hover:border-white transition-all">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Average Order Value</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{gbp(averageOrderValue)}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/60 font-extrabold text-[11px]">
              AOV
            </span>
          </div>
        </div>
      </div>

      {/* 3. MODULE / QUICK ACCESS GRID (NIZA CLOUD REFERENCE MATCH - LARGE GLASS CARDS) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Modules</h2>
            <p className="text-xs text-slate-500 font-semibold">Select a module to get started</p>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">8 Active Modules</span>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {MODULE_CARDS.map((module) => {
            const IconComponent = module.icon;
            return (
              <Link
                key={module.title}
                to={module.href as never}
                className="group relative surface-card bg-white/70 backdrop-blur-xl rounded-[28px] border border-white/80 p-8 min-h-[210px] flex flex-col items-center justify-center text-center space-y-4 hover:shadow-[0_14px_45px_rgba(225,29,72,0.12)] hover:border-red-500/40 hover:-translate-y-1.5 hover:bg-white/85 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
              >
                {/* Floating Notification Badge */}
                {module.badge !== undefined && (
                  <span className="absolute top-4.5 right-4.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md shadow-red-600/30 border border-white/60">
                    {module.badge}
                  </span>
                )}

                {/* Large Centered Circular Icon Container (Glass Treatment) */}
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500/15 via-rose-500/10 to-red-500/5 border border-red-500/20 text-red-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-red-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <IconComponent className="h-8 w-8" />
                </div>

                {/* Module Title & Subtitle */}
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-red-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {module.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. MAIN ANALYTICS CHARTS SECTION (FROSTED GLASS PANELS) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Revenue & Performance Chart */}
        <div className="lg:col-span-2 surface-card p-6 sm:p-8 rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Revenue Analytics</h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${chartTheme.badgeBg}`}>
                  {chartTheme.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Real order total history from Supabase database</p>
            </div>
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-white/80 backdrop-blur-md">
              <Button
                size="sm"
                variant={analyticsMetric === "revenue" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("revenue")}
                className={cn("h-7 text-[11px] font-bold rounded-lg px-3", analyticsMetric === "revenue" && "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs")}
              >
                Revenue
              </Button>
              <Button
                size="sm"
                variant={analyticsMetric === "orders" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("orders")}
                className={cn("h-7 text-[11px] font-bold rounded-lg px-3", analyticsMetric === "orders" && "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs")}
              >
                Orders
              </Button>
              <Button
                size="sm"
                variant={analyticsMetric === "aov" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("aov")}
                className={cn("h-7 text-[11px] font-bold rounded-lg px-3", analyticsMetric === "aov" && "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs")}
              >
                AOV
              </Button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed border-slate-200/80 rounded-2xl bg-white/40">
                <BarChart2 className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No order data yet</p>
                <p className="text-[11px] text-slate-500">Revenue analytics will update when orders are created.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetricRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #fee2e2",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                    }}
                    formatter={(val: any) => [analyticsMetric === "orders" ? val : gbp(val), analyticsMetric.toUpperCase()]}
                  />
                  <Area type="monotone" dataKey={analyticsMetric} stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorMetricRed)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Col: Category Breakdown */}
        <div className="surface-card p-6 sm:p-8 rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Category Performance</h2>
              <p className="text-xs text-slate-500 font-medium">Product distribution matrix</p>
            </div>
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-white/80 backdrop-blur-md">
              <button
                onClick={() => setCategoryMetric("revenue")}
                className={cn("text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer", categoryMetric === "revenue" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-500")}
              >
                Price
              </button>
              <button
                onClick={() => setCategoryMetric("units")}
                className={cn("text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer", categoryMetric === "units" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-500")}
              >
                Stock
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed border-slate-200/80 rounded-2xl bg-white/40">
                <Layers className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No categories yet</p>
                <p className="text-[11px] text-slate-500">Product breakdown will render here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#475569" }} width={80} />
                  <Tooltip formatter={(val: any) => [categoryMetric === "revenue" ? gbp(val) : val, categoryMetric.toUpperCase()]} />
                  <Bar dataKey={categoryMetric} fill="#dc2626" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. ATTENTION REQUIRED QUEUE & QUICK ACTIONS (FROSTED GLASS PANELS) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attention Required Queue */}
        <div className="lg:col-span-2 surface-card p-6 sm:p-8 rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-black text-slate-900">Attention Required</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 font-extrabold text-xs">
              {pendingOrdersCount + lowStockCount} Actions Needed
            </span>
          </div>

          {pendingOrdersCount === 0 && lowStockCount === 0 ? (
            <div className="p-8 text-center space-y-2 border-2 border-dashed border-slate-200/80 rounded-2xl bg-white/40">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="text-xs font-bold text-slate-900">No attention items</p>
              <p className="text-[11px] text-slate-500">All orders and inventory levels are healthy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.filter((o) => o.status === "Pending").slice(0, 3).map((o) => (
                <div key={o.id} className="p-4 rounded-2xl border border-white/80 bg-white/80 flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 font-bold">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-extrabold text-slate-900">Order #{o.order_number || o.id.slice(0, 8)} awaiting fulfillment</p>
                      <p className="text-slate-500 font-medium">{o.customer_name} · Total {gbp(o.total)}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-bold shrink-0 border-white/80 bg-white hover:bg-slate-50 shadow-2xs">
                    <Link to="/admin/orders">Review</Link>
                  </Button>
                </div>
              ))}

              {inventoryAlerts.slice(0, 2).map((inv) => (
                <div key={inv.id} className="p-4 rounded-2xl border border-red-200/70 bg-red-50/40 flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-100 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-extrabold text-slate-900">Low Stock Alert: {inv.products?.name || "Product"}</p>
                      <p className="text-slate-500 font-medium">Current Stock: {inv.current_stock} (Reorder threshold: {inv.reorder_threshold})</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-bold shrink-0 border-red-200 text-red-700 bg-white hover:bg-red-50 shadow-2xs">
                    <Link to="/admin/inventory">Reorder</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Activity Feed */}
        <div className="surface-card p-6 sm:p-8 rounded-[28px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
            <h2 className="text-base font-black text-slate-900">Recent Audit Logs</h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-bold text-red-600 hover:text-red-700 p-0">
              <Link to="/admin/audit">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No recent audit log activity.</p>
            ) : (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-slate-900 truncate max-w-[140px]">{log.action || "System Action"}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{log.details || log.target_table || "Logged action"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
