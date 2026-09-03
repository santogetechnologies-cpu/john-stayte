import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Search, Eye, Filter, X, Clock, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerOrdersView() {
  const navigate = useNavigate();
  const routerLocation = useRouterState({ select: (s) => s.location });

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("status") || "all";
    }
    return "all";
  });
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Keep statusFilter synchronized with live router location changes
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const paramStatus = (routerLocation.search as any)?.status || params.get("status") || "all";
    setStatusFilter(paramStatus);
  }, [routerLocation]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      toast.error("Failed to load manager orders: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("manager_orders_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    navigate({
      to: "/manager/orders",
      search: (val === "all" ? {} : { status: val }) as never,
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.order_number || o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;

    const sf = statusFilter.toLowerCase();
    const os = (o.status || "").toLowerCase();

    if (sf === "processing") {
      return os === "approved" || os === "packed" || os === "processing";
    }
    if (sf === "pending") {
      return os === "pending";
    }

    return os === sf;
  });

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const processingCount = orders.filter(
    (o) => o.status === "Approved" || o.status === "Packed" || o.status === "Processing",
  ).length;

  const handleUpdateStatus = async (order: any, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;

    try {
      const { data: authUser } = await supabase.auth.getUser();

      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      // Log status history
      await supabase.from("order_status_history").insert([
        {
          order_id: order.id,
          status: newStatus,
          actor_id: authUser?.user?.id || null,
          created_by: authUser?.user?.id || null,
          notes: `Status changed to ${newStatus} by Manager`,
        },
      ]);

      // Stock restoration if cancelled
      if (newStatus === "Cancelled" && order.order_items) {
        for (const item of order.order_items) {
          if (item.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (prod) {
              await supabase
                .from("products")
                .update({ stock: (prod.stock || 0) + item.quantity })
                .eq("id", item.product_id);
            }
          }
        }
      }

      // Customer notification
      if (order.customer_id) {
        await supabase.from("customer_notifications").insert([
          {
            user_id: order.customer_id,
            title: `Order Status Updated: ${newStatus}`,
            message: `Your order #${order.order_number || order.id.slice(0, 8)} status is now ${newStatus}.`,
            is_read: false,
          },
        ]);
      }

      toast.success(`Order #${order.order_number} updated to ${newStatus}`);
      await loadOrders();
    } catch (err: any) {
      toast.error("Failed to update order status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Orders</span>
            {statusFilter !== "all" && (
              <>
                <span>/</span>
                <span className="text-primary font-bold capitalize">{statusFilter}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Manager Orders Operations ({filteredOrders.length}
            {statusFilter !== "all" ? ` of ${orders.length}` : ""})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Approve, schedule, and track cylinder orders assigned to your depot.
          </p>
        </div>

        {/* Quick status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("all")}
            className="rounded-full text-xs h-8 font-bold"
          >
            All Orders ({orders.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter.toLowerCase() === "pending" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("Pending")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Pending Approval ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter.toLowerCase() === "processing" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("Processing")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Processing ({processingCount})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assigned orders by ID or customer..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-48 rounded-full text-xs font-bold bg-slate-50 border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl font-medium text-xs">
              <SelectItem value="all">All Orders ({orders.length})</SelectItem>
              <SelectItem value="Pending">Pending Approval ({pendingCount})</SelectItem>
              <SelectItem value="Processing">Processing ({processingCount})</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Packed">Packed</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusFilterChange("all")}
              className="rounded-full text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading manager orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No manager orders found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Customer orders assigned to this depot will display here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Order ID</TableHead>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Total</TableHead>
                <TableHead className="font-bold text-xs">Fulfillment Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((o) => (
                <TableRow key={o.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-extrabold text-xs text-foreground">
                    #{o.order_number || o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{o.customer_name}</TableCell>
                  <TableCell className="font-extrabold text-xs text-foreground">
                    {gbp(Number(o.total))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        o.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : o.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : o.status === "Cancelled"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={o.status}
                        onValueChange={(val) => handleUpdateStatus(o, val as OrderStatus)}
                      >
                        <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl border-slate-200 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Packed">Packed</SelectItem>
                          <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedOrder(o)}
                        className="h-8 w-8 rounded-full hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Order Details Sheet */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6 text-xs">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="font-black text-lg">
                  Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                <p className="font-bold text-foreground">Customer</p>
                <p className="text-muted-foreground">{selectedOrder.customer_name}</p>
                <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
