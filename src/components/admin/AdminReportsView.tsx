import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  ShoppingBag,
  Package,
  Users,
  Truck,
  Tag,
  DollarSign,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function AdminReportsView() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"today" | "7days" | "30days" | "month" | "custom">("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data states queried from Supabase
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  // Calculate start/end JS dates based on selection
  const getDateBounds = () => {
    const now = new Date();
    let start = new Date(0); // epoch start default
    let end = new Date();

    if (dateRange === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "7days") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30days") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === "custom" && startDate) {
      start = new Date(startDate);
      if (endDate) end = new Date(endDate + "T23:59:59");
    }

    return { start, end };
  };

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateBounds();

      const [
        { data: orderData },
        { data: prodData },
        { data: custData },
        { data: offerData },
        { data: couponData },
      ] = await Promise.all([
        supabase.from("orders").select("*").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: false }),
        supabase.from("products").select("*"),
        supabase.from("profiles").select("*").eq("role", "customer"),
        supabase.from("offers").select("*"),
        supabase.from("coupons").select("*"),
      ]);

      setOrders(orderData || []);
      setProducts(prodData || []);
      setCustomers(custData || []);
      setOffers(offerData || []);
      setCoupons(couponData || []);

      toast.success(`Report generated for ${orders.length} orders.`);
    } catch (err: any) {
      toast.error("Failed to query report data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [dateRange, startDate, endDate]);

  // Calculations from real Supabase data
  const totalOrders = orders.length;
  const grossSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const netSales = orders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const aov = totalOrders > 0 ? grossSales / totalOrders : 0;

  const completedOrders = orders.filter((o) => o.status === "Delivered").length;
  const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Approved" || o.status === "Packed").length;
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled").length;

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const lowStockCount = products.filter((p) => Number(p.stock || 0) <= 10 && Number(p.stock || 0) > 0).length;
  const outOfStockCount = products.filter((p) => Number(p.stock || 0) === 0).length;

  const totalCustomers = customers.length;
  const activeCustomers = new Set(orders.map((o) => o.customer_email)).size;

  const activeOffersCount = offers.filter((o) => o.is_active).length;
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;

  // CSV Generator Helper
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    if (rows.length === 0) {
      return toast.error("No data available to download in this date range.");
    }
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${filename}`);
  };

  // Export Specific Reports to CSV
  const handleExportSalesReport = () => {
    const headers = ["Order Number", "Date", "Customer Name", "Email", "Status", "Subtotal (£)", "Shipping (£)", "Total (£)"];
    const rows = orders.map((o) => [
      o.order_number || o.id,
      new Date(o.created_at).toLocaleDateString("en-GB"),
      o.customer_name || "N/A",
      o.customer_email || "N/A",
      o.status || "Pending",
      o.subtotal || 0,
      o.shipping_fee || 0,
      o.total || 0,
    ]);
    downloadCsv(`sales_report_${dateRange}.csv`, headers, rows);
  };

  const handleExportInventoryReport = () => {
    const headers = ["Product Name", "Brand", "Category Slug", "Price (£)", "Stock", "Status"];
    const rows = products.map((p) => [
      p.name,
      p.brand || "Calor",
      p.category_slug || "gas",
      p.price,
      p.stock,
      p.stock === 0 ? "Out of Stock" : p.stock <= 10 ? "Low Stock" : "In Stock",
    ]);
    downloadCsv("inventory_report.csv", headers, rows);
  };

  const handleExportCustomerReport = () => {
    const headers = ["Customer ID", "Full Name", "Email", "Role", "Created At"];
    const rows = customers.map((c) => [
      c.id,
      c.full_name || "N/A",
      c.email,
      c.role,
      new Date(c.created_at).toLocaleDateString("en-GB"),
    ]);
    downloadCsv("customer_report.csv", headers, rows);
  };

  const handleExportPromotionsReport = () => {
    const headers = ["Type", "Title/Code", "Discount", "Status", "Created At"];
    const offerRows = offers.map((o) => [
      "Special Offer",
      o.title,
      `${o.discount_percentage || 0}%`,
      o.is_active ? "Active" : "Disabled",
      new Date(o.created_at).toLocaleDateString("en-GB"),
    ]);
    const couponRows = coupons.map((c) => [
      "Coupon Code",
      c.code,
      c.discount_type === "percentage" ? `${c.discount_value}%` : `£${c.discount_value}`,
      c.is_active ? "Active" : "Disabled",
      new Date(c.created_at).toLocaleDateString("en-GB"),
    ]);
    downloadCsv("promotions_report.csv", headers, [...offerRows, ...couponRows]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Reports & Export Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate and export custom business reports calculated from latest business records.
          </p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold text-slate-700">Date Range:</span>
          </div>
          <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
            <SelectTrigger className="w-44 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl text-xs font-semibold h-9 border-slate-200"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl text-xs font-semibold h-9 border-slate-200"
              />
            </div>
          )}
        </div>

        <Button
          onClick={loadReportsData}
          disabled={loading}
          className="rounded-full text-xs font-extrabold gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Generate Report
        </Button>
      </div>

      {/* REPORT MODULE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. SALES REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Real DB Data
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Sales & Revenue Report</h3>
              <p className="text-xs text-muted-foreground">Order volume, gross sales, net sales, and AOV.</p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Gross Sales</p>
                <p className="text-sm font-extrabold text-foreground">{gbp(grossSales)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Orders</p>
                <p className="text-sm font-extrabold text-foreground">{totalOrders}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">AOV</p>
                <p className="text-sm font-extrabold text-foreground">{gbp(aov)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Completed</p>
                <p className="text-sm font-extrabold text-emerald-700">{completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportSalesReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Sales CSV
            </Button>
          </div>
        </div>

        {/* 2. VAT / FINANCIAL REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <DollarSign className="h-6 w-6" />
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                Tax Calculated
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">VAT / Financial Report</h3>
              <p className="text-xs text-muted-foreground">Standard 20% VAT and reduced domestic fuel VAT breakdown.</p>
            </div>

            <div className="pt-2 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border flex justify-between items-center">
                <span className="font-medium text-slate-600">Est. 20% Standard VAT:</span>
                <span className="font-bold text-foreground">{gbp(grossSales * 0.2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border flex justify-between items-center">
                <span className="font-medium text-slate-600">Est. 5% Fuel VAT:</span>
                <span className="font-bold text-foreground">{gbp(grossSales * 0.05)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportSalesReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Financial CSV
            </Button>
          </div>
        </div>

        {/* 3. INVENTORY REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Package className="h-6 w-6" />
              </div>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                Live Stock
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Inventory & Stock Report</h3>
              <p className="text-xs text-muted-foreground">Product catalog levels, low stock alerts, and out of stock items.</p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Products</p>
                <p className="text-sm font-extrabold text-foreground">{totalProducts}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Stock Units</p>
                <p className="text-sm font-extrabold text-foreground">{totalStock}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Low Stock (≤10)</p>
                <p className="text-sm font-extrabold text-amber-600">{lowStockCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Out of Stock</p>
                <p className="text-sm font-extrabold text-red-600">{outOfStockCount}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportInventoryReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Inventory CSV
            </Button>
          </div>
        </div>

        {/* 4. CUSTOMER REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <Users className="h-6 w-6" />
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                Profiles
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Customer Accounts Report</h3>
              <p className="text-xs text-muted-foreground">Registered customer profiles, active purchasers, and order frequency.</p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Registered</p>
                <p className="text-sm font-extrabold text-foreground">{totalCustomers}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Buyers</p>
                <p className="text-sm font-extrabold text-emerald-700">{activeCustomers}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportCustomerReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Customer CSV
            </Button>
          </div>
        </div>

        {/* 5. DELIVERY REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <Truck className="h-6 w-6" />
              </div>
              <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] font-bold">
                Fulfillment
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Delivery & Logistics Report</h3>
              <p className="text-xs text-muted-foreground">Fulfillment status breakdown for regional Whitminster deliveries.</p>
            </div>

            <div className="pt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Pending</p>
                <p className="text-xs font-extrabold text-amber-700">{pendingOrders}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Delivered</p>
                <p className="text-xs font-extrabold text-emerald-700">{completedOrders}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Cancelled</p>
                <p className="text-xs font-extrabold text-red-600">{cancelledOrders}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportSalesReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Delivery CSV
            </Button>
          </div>
        </div>

        {/* 6. PROMOTIONS REPORT */}
        <div className="surface-card p-6 rounded-3xl border bg-white flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Tag className="h-6 w-6" />
              </div>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                Promotions
              </Badge>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Promotions & Offers Report</h3>
              <p className="text-xs text-muted-foreground">Active special deals, promotional banners, and coupon codes.</p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Deals</p>
                <p className="text-sm font-extrabold text-foreground">{activeOffersCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Coupons</p>
                <p className="text-sm font-extrabold text-foreground">{activeCouponsCount}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2 border-t">
            <Button
              onClick={handleExportPromotionsReport}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-1.5 border-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download Promotions CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
