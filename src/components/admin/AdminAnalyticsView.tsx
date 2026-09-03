import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  Activity,
  ShoppingBag,
  Package,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar as CalendarIcon,
  PieChart as PieChartIcon,
  BarChart2,
  Boxes,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function AdminAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"today" | "7days" | "30days" | "90days" | "year" | "custom">("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Compute date range for query
  const getDateRangeBounds = () => {
    const now = new Date();
    let start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default
    let end = new Date();

    if (dateFilter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === "7days") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === "30days") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === "90days") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (dateFilter === "custom" && startDate) {
      start = new Date(startDate);
      if (endDate) end = new Date(endDate + "T23:59:59");
    }

    return { start, end };
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRangeBounds();

      const [
        { data: orderData },
        { data: itemData },
        { data: prodData },
        { data: custData },
        { data: catData },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("order_items").select("*"),
        supabase.from("products").select("*").order("stock", { ascending: false }),
        supabase.from("profiles").select("*").eq("role", "customer"),
        supabase.from("categories").select("*"),
      ]);

      setOrders(orderData || []);
      setOrderItems(itemData || []);
      setProducts(prodData || []);
      setCustomers(custData || []);
      setCategories(catData || []);
    } catch (err: any) {
      toast.error("Failed to load live analytics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();

    const channel = supabase
      .channel("admin_analytics_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadAnalyticsData())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => loadAnalyticsData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadAnalyticsData())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAnalyticsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter, startDate, endDate]);

  // Aggregate daily revenue & order counts for charts
  const revenueChartData = orders.reduce((acc: any[], order) => {
    const dateStr = new Date(order.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    const existing = acc.find((d) => d.date === dateStr);
    if (existing) {
      existing.revenue += Number(order.total || 0);
      existing.orders += 1;
    } else {
      acc.push({
        date: dateStr,
        revenue: Number(order.total || 0),
        orders: 1,
      });
    }
    return acc;
  }, []);

  // Compute dynamic performance trend (Current window vs Previous window)
  let trend: "growing" | "declining" | "stable" = "stable";
  if (revenueChartData.length >= 2) {
    const mid = Math.floor(revenueChartData.length / 2);
    const firstHalfAvg = revenueChartData.slice(0, mid).reduce((sum, d) => sum + d.revenue, 0) / (mid || 1);
    const secondHalfAvg = revenueChartData.slice(mid).reduce((sum, d) => sum + d.revenue, 0) / ((revenueChartData.length - mid) || 1);

    if (secondHalfAvg > firstHalfAvg * 1.01) trend = "growing";
    else if (secondHalfAvg < firstHalfAvg * 0.99) trend = "declining";
    else trend = "stable";
  } else if (revenueChartData.length === 1 && revenueChartData[0].revenue > 0) {
    trend = "growing";
  }

  const themeColors = {
    growing: { stroke: "#10b981", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Growing Trend 🟢", Icon: ArrowUpRight },
    declining: { stroke: "#ef4444", badgeBg: "bg-red-50 text-red-700 border-red-200", label: "Declining Trend 🔴", Icon: ArrowDownRight },
    stable: { stroke: "#3b82f6", badgeBg: "bg-blue-50 text-blue-700 border-blue-200", label: "Stable Trend ⚪", Icon: Activity },
  };

  const currentTheme = themeColors[trend];

  // Aggregate Order Status Distribution
  const statusCounts = {
    Pending: orders.filter((o) => o.status === "Pending").length,
    Approved: orders.filter((o) => o.status === "Approved").length,
    Packed: orders.filter((o) => o.status === "Packed").length,
    "Out for Delivery": orders.filter((o) => o.status === "Out for Delivery").length,
    Delivered: orders.filter((o) => o.status === "Delivered").length,
    Cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Aggregate Category Stock Distribution
  const categoryStockData = categories.map((cat) => {
    const catProds = products.filter((p) => p.category_slug === cat.slug);
    const totalStock = catProds.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    return {
      category: cat.name,
      stock: totalStock,
      productsCount: catProds.length,
    };
  });

  // Calculate Overview KPIs from real Supabase data
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalOrdersCount = orders.length;
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const totalCustomersCount = customers.length;
  const totalProductsCount = products.length;
  const totalUnitsSold = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" /> Live Business Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Interactive BI charts, order distribution, category performance, and dynamic growth trends.
          </p>
        </div>

        {/* DATE RANGE FILTER TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border shadow-2xs">
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-700">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" /> Period:
          </div>
          <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
            <SelectTrigger className="w-36 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl text-xs font-semibold h-9 w-32 border-slate-200"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl text-xs font-semibold h-9 w-32 border-slate-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* OVERVIEW KPIS GRID (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link to="/admin/orders" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{gbp(totalRevenue)}</p>
          <p className="text-[10px] text-muted-foreground truncate">Real orders in window</p>
        </Link>

        <Link to="/admin/orders" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{totalOrdersCount}</p>
          <p className="text-[10px] text-muted-foreground">Period order count</p>
        </Link>

        <Link to="/admin/orders" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Avg Order Value</span>
            <Activity className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{gbp(aov)}</p>
          <p className="text-[10px] text-muted-foreground">Calculated AOV</p>
        </Link>

        <Link to="/admin/customers" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Customers</span>
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{totalCustomersCount}</p>
          <p className="text-[10px] text-muted-foreground">Registered profiles</p>
        </Link>

        <Link to="/admin/products" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Products</span>
            <Package className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{totalProductsCount}</p>
          <p className="text-[10px] text-muted-foreground">Active catalog items</p>
        </Link>

        <Link to="/admin/inventory" className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs block cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase">Units Sold</span>
            <Boxes className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-lg font-black tracking-tight text-foreground">{totalUnitsSold}</p>
          <p className="text-[10px] text-muted-foreground">Order line items</p>
        </Link>
      </div>

      {/* CHARTS GRID (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: REVENUE TREND OVER TIME */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-extrabold text-base text-foreground">Revenue Analytics over Time</h3>
              <p className="text-xs text-muted-foreground">Daily gross sales graph calculated from recent orders.</p>
            </div>
            <Badge className={currentTheme.badgeBg + " text-xs font-extrabold px-2.5 py-1"}>
              <currentTheme.Icon className="h-3.5 w-3.5 mr-1" /> {currentTheme.label}
            </Badge>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground font-bold gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading revenue graph...
            </div>
          ) : revenueChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
              <Activity className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-bold text-muted-foreground">No revenue transactions in this period.</p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentTheme.stroke} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentTheme.stroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <RechartsTooltip
                    formatter={(val: any) => [`£${Number(val).toLocaleString()}`, "Revenue"]}
                    contentStyle={{ borderRadius: "1rem", border: `1px solid ${currentTheme.stroke}40`, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={currentTheme.stroke}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 2: ORDER STATUS DISTRIBUTION */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-extrabold text-base text-foreground">Order Status Distribution</h3>
            <p className="text-xs text-muted-foreground">Live breakdown of order fulfillment progression.</p>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground font-bold gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading status breakdown...
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <RechartsTooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #cbd5e1" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {statusChartData.map((entry, index) => {
                      const colors: Record<string, string> = {
                        Pending: "#f59e0b",
                        Approved: "#3b82f6",
                        Packed: "#8b5cf6",
                        "Out for Delivery": "#06b6d4",
                        Delivered: "#10b981",
                        Cancelled: "#ef4444",
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry.status] || "#94a3b8"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* LOWER SECTION: TOP PRODUCTS & CATEGORY STOCK MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP PRODUCTS INVENTORY MATRIX */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-foreground">Catalog Product Stock Levels</h3>
              <p className="text-xs text-muted-foreground">Real-time inventory levels across active products.</p>
            </div>
            <Link to="/admin/products" className="text-xs font-bold text-primary hover:underline">
              Manage Products &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {products.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-white border flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground truncate max-w-[200px]">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.brand || "Calor"} &bull; {gbp(p.price)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    p.stock === 0
                      ? "bg-red-100 text-red-700"
                      : p.stock <= 5
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {p.stock === 0 ? "Out of Stock" : `${p.stock} units`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CATEGORY STOCK DISTRIBUTION CHART */}
        <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-extrabold text-base text-foreground">Category Stock Distribution</h3>
            <p className="text-xs text-muted-foreground">Total inventory units grouped by category.</p>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground font-bold gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading category breakdown...
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <RechartsTooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #cbd5e1" }} />
                  <Bar dataKey="stock" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
