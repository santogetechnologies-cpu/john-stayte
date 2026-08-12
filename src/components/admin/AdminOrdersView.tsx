import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle,
  Truck,
  Clock,
  Printer,
  FileText,
  User,
  MapPin,
  Calendar,
  XCircle,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function AdminOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

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
      toast.error("Failed to load orders: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.order_number || o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_email || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (order: any, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;

    try {
      const { data: authUser } = await supabase.auth.getUser();

      // 1. Update Order status
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      // 2. Insert into order_status_history
      await supabase.from("order_status_history").insert([
        {
          order_id: order.id,
          status: newStatus,
          actor_id: authUser?.user?.id || null,
          created_by: authUser?.user?.id || null,
          notes: `Status changed to ${newStatus} by Admin`,
        },
      ]);

      // 3. Handle stock restoration if order is cancelled
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

      // 4. Send Customer Notification
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

      toast.success(`Order #${order.order_number} status updated to ${newStatus}`);
      await loadOrders();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Orders</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Order Operations Management ({orders.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real order queue and status dispatch connected to Supabase.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order number, customer name, email..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 rounded-full border-slate-200 text-xs font-semibold">
              <SelectValue placeholder="Fulfillment Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Packed">Packed</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading orders from Supabase...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No orders in database</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real customer orders will display here automatically when created in Supabase.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Order ID</TableHead>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Total</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((o) => (
                <TableRow key={o.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-extrabold text-xs text-foreground">
                    #{o.order_number || o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-bold text-foreground">{o.customer_name}</p>
                    <p className="text-[11px] text-muted-foreground">{o.customer_email}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {new Date(o.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell className="font-extrabold text-xs text-foreground">{gbp(Number(o.total))}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        o.status === "Delivered"
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
                      <Select value={o.status} onValueChange={(val) => handleUpdateStatus(o, val as OrderStatus)}>
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

      {/* ORDER DETAILS SHEET */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="font-black text-lg">
                  Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Placed on {new Date(selectedOrder.created_at).toLocaleString("en-GB")}</p>
              </SheetHeader>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                  <p className="font-bold text-foreground">Customer Information</p>
                  <p className="text-muted-foreground">{selectedOrder.customer_name}</p>
                  <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
                  <p className="text-muted-foreground">{selectedOrder.customer_phone || "No phone provided"}</p>
                </div>

                <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                  <p className="font-bold text-foreground">Delivery Address</p>
                  <p className="text-muted-foreground">
                    {typeof selectedOrder.delivery_address === "string"
                      ? selectedOrder.delivery_address
                      : JSON.stringify(selectedOrder.delivery_address)}
                  </p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="font-bold text-foreground">Order Items</p>
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span className="font-bold">{gbp(Number(item.total_price))}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-black text-sm text-foreground">
                    <span>Total Amount</span>
                    <span>{gbp(Number(selectedOrder.total))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
