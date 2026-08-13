import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Truck,
  PackageCheck,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  Calendar,
  ChevronRight,
  HelpCircle,
  Activity,
  PlusCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerDashboardView() {
  const { user } = useStore();
  const [dateRange, setDateRange] = useState("today");
  const [loading, setLoading] = useState(true);

  // Live Supabase State
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const [
        { data: dbOrders },
        { data: dbInventory },
        { data: dbDeliveries },
        { data: dbTickets },
      ] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
        supabase.from("inventory").select("*, products(*)"),
        supabase.from("delivery_assignments").select("*"),
        supabase.from("support_tickets").select("*"),
      ]);

      setOrders(dbOrders || []);
      setInventory(dbInventory || []);
      setDeliveries(dbDeliveries || []);
      setTickets(dbTickets || []);
    } catch (err) {
      console.error("Failed to load manager dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, []);

  // Compute live calculations
  const ordersAssignedCount = orders.length;
  const pendingApprovalCount = orders.filter((o) => o.status === "Pending").length;
  const processingCount = orders.filter((o) => o.status === "Approved" || o.status === "Packed").length;
  const outForDeliveryCount = deliveries.filter((d) => d.status === "Out for Delivery").length;
  const deliveredTodayCount = orders.filter((o) => o.status === "Delivered").length;
  const delayedDeliveriesCount = deliveries.filter((d) => d.status === "Delayed").length;
  const lowStockCount = inventory.filter((i) => i.current_stock < i.reorder_threshold).length;
  const openEnquiriesCount = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;

  const handleApprove = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "Approved", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Order approved in Supabase!");
      await loadManagerData();
    } catch (err: any) {
      toast.error("Failed to approve order: " + err.message);
    }
  };

  const handleExportReport = () => {
    if (orders.length === 0) {
      return toast.error("No manager dispatch data available to export.");
    }
    const headers = "Order Number,Customer Name,Customer Email,Status,Total,Date\n";
    const rows = orders.map((o) => `"${o.order_number || o.id}","${o.customer_name || ''}","${o.customer_email || ''}","${o.status}",${o.total},"${new Date(o.created_at).toLocaleDateString('en-GB')}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manager_Dispatch_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Manager report CSV downloaded!");
  };

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">Manager</Link>
            <span>/</span>
            <span className="text-foreground">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Good morning, {user?.name || "Manager"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Operational overview for Gloucestershire depot dispatch routes in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full p-1 shadow-2xs">
            <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-bold focus:ring-0 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl font-medium text-xs">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExportReport} variant="outline" className="h-10 rounded-full text-xs font-bold gap-2 bg-white shadow-2xs border-slate-200 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* 2. TODAY'S OPERATIONAL SUMMARY KPIS */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { label: "Orders Assigned", val: ordersAssignedCount, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Pending Approval", val: pendingApprovalCount, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Processing", val: processingCount, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { label: "Out for Delivery", val: outForDeliveryCount, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Delivered Today", val: deliveredTodayCount, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Delayed Deliveries", val: delayedDeliveriesCount, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Low Stock Items", val: lowStockCount, color: "text-red-600 bg-red-50 border-red-100" },
          { label: "Open Enquiries", val: openEnquiriesCount, color: "text-slate-700 bg-slate-100 border-slate-200" },
        ].map((kpi) => (
          <div key={kpi.label} className={`surface-card p-3 rounded-2xl border ${kpi.color} space-y-1`}>
            <p className="text-[10px] font-extrabold uppercase tracking-tight text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-black text-foreground">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* 3. DISPATCH & ORDERS QUEUE */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Today's Orders Queue */}
        <div className="lg:col-span-2 surface-card p-6 rounded-3xl border bg-white space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Today's Dispatch & Orders Queue</h2>
              <p className="text-xs text-muted-foreground">Real orders assigned to depot dispatch</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-xs font-bold gap-1 text-primary hover:bg-primary/10">
              <Link to="/manager/orders">
                View All Orders ({orders.length}) <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-bold">
                Loading orders from Supabase...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center space-y-2 bg-slate-50/50">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs font-bold text-foreground">No orders found</p>
                <p className="text-[11px] text-muted-foreground">No assigned orders are in the dispatch queue.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Order ID</TableHead>
                    <TableHead className="font-bold text-xs">Customer</TableHead>
                    <TableHead className="font-bold text-xs">Total</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map((o) => (
                    <TableRow
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <TableCell className="font-extrabold text-xs text-foreground">
                        #{o.order_number || o.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-bold text-foreground">{o.customer_name}</p>
                        <p className="text-[11px] text-muted-foreground">{o.customer_email}</p>
                      </TableCell>
                      <TableCell className="font-extrabold text-xs text-foreground">{gbp(Number(o.total))}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-bold text-[10px] ${
                            o.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : o.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {o.status === "Pending" ? (
                          <Button
                            size="sm"
                            onClick={(e) => handleApprove(o.id, e)}
                            className="rounded-full text-[11px] font-bold h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="rounded-full text-[11px] font-bold h-7 px-3 text-muted-foreground">
                            Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Right Col: Quick Manager Actions & Inventory Alerts */}
        <div className="space-y-6">
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-4">
            <h2 className="text-base font-black text-foreground">Manager Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Orders Queue", href: "/manager/orders", icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
                { label: "Truck Dispatch", href: "/manager/deliveries", icon: Truck, color: "text-purple-600 bg-purple-50" },
                { label: "Stock Control", href: "/manager/inventory", icon: PackageCheck, color: "text-amber-600 bg-amber-50" },
                { label: "Customer List", href: "/manager/customers", icon: Users, color: "text-emerald-600 bg-emerald-50" },
                { label: "Support Tickets", href: "/manager/enquiries", icon: MessageSquare, color: "text-rose-600 bg-rose-50" },
                { label: "Performance", href: "/manager/performance", icon: Activity, color: "text-slate-600 bg-slate-100" },
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

          <div className="surface-card p-6 rounded-3xl border bg-white space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-black text-foreground">Inventory Alerts ({lowStockCount})</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary">
                <Link to="/manager/inventory">Manage</Link>
              </Button>
            </div>

            {lowStockCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No low stock alerts in inventory.</p>
            ) : (
              <div className="space-y-2">
                {inventory.filter((i) => i.current_stock < i.reorder_threshold).slice(0, 3).map((inv) => (
                  <div key={inv.id} className="p-3 rounded-xl border bg-red-50/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{inv.products?.name || "Product"}</p>
                      <p className="text-[10px] text-muted-foreground">Stock: {inv.current_stock} (Min: {inv.reorder_threshold})</p>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">
                      Reorder
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ORDER DETAILS SHEET */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6 text-xs">
              <div className="border-b pb-4">
                <h3 className="font-black text-lg">
                  Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                </h3>
                <p className="text-muted-foreground">Placed on {new Date(selectedOrder.created_at).toLocaleString("en-GB")}</p>
              </div>

              <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                <p className="font-bold text-foreground">Customer</p>
                <p className="text-muted-foreground">{selectedOrder.customer_name}</p>
                <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-foreground">Items</p>
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product_name} x {item.quantity}</span>
                    <span className="font-bold">{gbp(Number(item.total_price))}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-black text-foreground">
                  <span>Total Amount</span>
                  <span>{gbp(Number(selectedOrder.total))}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
