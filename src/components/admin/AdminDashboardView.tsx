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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

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
    ? orders.slice(0, 12).reverse().map((o, idx) => ({
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

  // Dynamic trend calculation based on actual Supabase revenue / metric values
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

  // Dynamic Theme palette based on trend
  const chartTheme = {
    positive: {
      stroke: "#10b981", // Emerald Green
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeText: "Positive Trend",
      Icon: TrendingUp,
    },
    negative: {
      stroke: "#ef4444", // Red
      badgeBg: "bg-red-50 text-red-700 border-red-200",
      badgeText: "Declining Trend",
      Icon: TrendingDown,
    },
    neutral: {
      stroke: "#3b82f6", // Blue/Slate Neutral
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      badgeText: "Stable Trend",
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
    a.download = `Admin_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dashboard report CSV downloaded!");
  };

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Good morning, {user?.name || "Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Live enterprise metrics, fulfillment queues, inventory alerts, and system health.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-9 rounded-full border-slate-200 text-xs font-bold bg-white">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last Quarter</SelectItem>
              <SelectItem value="1y">Full Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExportReport} variant="outline" size="sm" className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white">
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export Report
          </Button>

          <Button asChild size="sm" className="rounded-full text-xs font-bold gap-1.5 shadow-md">
            <Link to="/admin/products">
              <PlusCircle className="h-3.5 w-3.5" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. PRIMARY METRICS GRID */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-black text-foreground">{gbp(totalRevenue)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-0.5">
                <TrendingUp className="h-3 w-3" /> Live
              </Badge>
              <span className="text-[11px] text-muted-foreground">Real order total</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Orders</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-black text-foreground">{totalOrdersCount}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px]">
                {pendingOrdersCount} Pending
              </Badge>
              <span className="text-[11px] text-muted-foreground">Orders placed</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customers</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-black text-foreground">{customers.length}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[10px]">
                {customers.length} Accounts
              </Badge>
              <span className="text-[11px] text-muted-foreground">Registered DB profiles</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Products</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-black text-foreground">{products.length}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">
                {lowStockCount} Low Stock
              </Badge>
              <span className="text-[11px] text-muted-foreground">Catalog products</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY METRICS BAR */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4 rounded-2xl border bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Orders</p>
            <p className="text-xl font-black text-foreground mt-0.5">{pendingOrdersCount}</p>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs">
            Queue
          </Badge>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock Items</p>
            <p className="text-xl font-black text-foreground mt-0.5">{lowStockCount}</p>
          </div>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold text-xs">
            Threshold
          </Badge>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Deliveries</p>
            <p className="text-xl font-black text-foreground mt-0.5">{activeDeliveriesCount}</p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs">
            En Route
          </Badge>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Average Order Value</p>
            <p className="text-xl font-black text-foreground mt-0.5">{gbp(averageOrderValue)}</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
            AOV
          </Badge>
        </div>
      </div>

      {/* 4. MAIN ANALYTICS SECTION */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Revenue & Performance Chart */}
        <div className="lg:col-span-2 surface-card p-6 rounded-3xl border bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Revenue Analytics</h2>
                <Badge variant="outline" className={`text-[10px] font-bold gap-1 rounded-full ${chartTheme.badgeBg}`}>
                  <chartTheme.Icon className="h-3 w-3" />
                  {chartTheme.badgeText}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Real order totals from Supabase database</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <Button
                size="sm"
                variant={analyticsMetric === "revenue" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("revenue")}
                className="h-7 text-[11px] font-bold rounded-lg px-3"
              >
                Revenue
              </Button>
              <Button
                size="sm"
                variant={analyticsMetric === "orders" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("orders")}
                className="h-7 text-[11px] font-bold rounded-lg px-3"
              >
                Orders
              </Button>
              <Button
                size="sm"
                variant={analyticsMetric === "aov" ? "default" : "ghost"}
                onClick={() => setAnalyticsMetric("aov")}
                className="h-7 text-[11px] font-bold rounded-lg px-3"
              >
                AOV
              </Button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed rounded-2xl bg-slate-50/50">
                <BarChart2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-bold text-foreground">No order data yet</p>
                <p className="text-[11px] text-muted-foreground">Revenue analytics will update when orders are created.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartTheme.stroke} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={chartTheme.stroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      border: `1px solid ${chartTheme.stroke}40`,
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                    }}
                    formatter={(val: any) => [analyticsMetric === "orders" ? val : gbp(val), analyticsMetric.toUpperCase()]}
                  />
                  <Area type="monotone" dataKey={analyticsMetric} stroke={chartTheme.stroke} strokeWidth={3} fillOpacity={1} fill="url(#colorMetric)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Col: Category Breakdown */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Category Performance</h2>
              <p className="text-xs text-muted-foreground">Database product distribution</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCategoryMetric("revenue")}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${categoryMetric === "revenue" ? "bg-white text-foreground shadow-2xs" : "text-muted-foreground"}`}
              >
                Price
              </button>
              <button
                onClick={() => setCategoryMetric("units")}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${categoryMetric === "units" ? "bg-white text-foreground shadow-2xs" : "text-muted-foreground"}`}
              >
                Stock
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed rounded-2xl bg-slate-50/50">
                <Layers className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-bold text-foreground">No categories yet</p>
                <p className="text-[11px] text-muted-foreground">Product breakdown will render here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#475569" }} width={80} />
                  <Tooltip formatter={(val: any) => [categoryMetric === "revenue" ? gbp(val) : val, categoryMetric.toUpperCase()]} />
                  <Bar dataKey={categoryMetric} fill="var(--color-primary, #dc2626)" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. ATTENTION REQUIRED QUEUE & QUICK ACTIONS */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attention Required Cards */}
        <div className="lg:col-span-2 surface-card p-6 rounded-3xl border bg-white space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-black text-foreground">Attention Required</h2>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs">
              {pendingOrdersCount + lowStockCount} Actions Needed
            </Badge>
          </div>

          {pendingOrdersCount === 0 && lowStockCount === 0 ? (
            <div className="p-8 text-center space-y-2 border-2 border-dashed rounded-2xl bg-slate-50/50">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="text-xs font-bold text-foreground">No attention items</p>
              <p className="text-[11px] text-muted-foreground">All orders and inventory levels are healthy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.filter((o) => o.status === "Pending").slice(0, 3).map((o) => (
                <div key={o.id} className="p-4 rounded-2xl border bg-slate-50/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Order #{o.order_number || o.id.slice(0, 8)} awaiting fulfillment</p>
                      <p className="text-muted-foreground">{o.customer_name} · Total {gbp(o.total)}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-bold shrink-0">
                    <Link to="/admin/orders">Review</Link>
                  </Button>
                </div>
              ))}

              {inventoryAlerts.slice(0, 2).map((inv) => (
                <div key={inv.id} className="p-4 rounded-2xl border bg-red-50/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-100 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Low Stock Alert: {inv.products?.name || "Product"}</p>
                      <p className="text-muted-foreground">Stock: {inv.current_stock} (Reorder threshold: {inv.reorder_threshold})</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-bold shrink-0 border-red-200 text-red-700 hover:bg-red-50">
                    <Link to="/admin/inventory">Reorder</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Admin Actions */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-4">
          <h2 className="text-base font-black text-foreground">Admin Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Products", href: "/admin/products", icon: Package, color: "text-blue-600 bg-blue-50" },
              { label: "Orders", href: "/admin/orders", icon: ShoppingBag, color: "text-emerald-600 bg-emerald-50" },
              { label: "Customers", href: "/admin/customers", icon: Users, color: "text-purple-600 bg-purple-50" },
              { label: "Inventory", href: "/admin/inventory", icon: Layers, color: "text-amber-600 bg-amber-50" },
              { label: "Deliveries", href: "/admin/deliveries", icon: Truck, color: "text-red-600 bg-red-50" },
              { label: "Audit Logs", href: "/admin/audit", icon: Activity, color: "text-slate-600 bg-slate-100" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.href as never}
                className="p-3.5 rounded-2xl border bg-background hover:bg-slate-50 hover:border-primary/40 transition-all flex flex-col items-center justify-center text-center group"
              >
                <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-110 transition-transform mb-1.5`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
