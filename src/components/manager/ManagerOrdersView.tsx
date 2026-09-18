import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Eye,
  Filter,
  X,
  Clock,
  PackageCheck,
  Truck,
  ArrowRight,
  Calendar,
  Edit2,
  Loader2,
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

  // Delivery Schedule Management State
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedSlot, setSchedSlot] = useState("Morning (08:00 - 12:00)");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      setSchedDate(selectedOrder.delivery_date || "");
      setSchedSlot(selectedOrder.delivery_slot || "Morning (08:00 - 12:00)");
      setEditingSchedule(false);
    }
  }, [selectedOrder]);

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

  const handleSaveSchedule = async () => {
    if (!selectedOrder) return;
    if (!schedDate) {
      return toast.error("Please select a delivery date.");
    }
    setSavingSchedule(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();

      // 1. Update orders table in Supabase
      const { error: orderErr } = await (supabase.from("orders") as any)
        .update({
          delivery_date: schedDate,
          delivery_slot: schedSlot,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (orderErr) throw orderErr;

      // 2. Synchronize delivery_assignments table
      try {
        await (supabase.from("delivery_assignments") as any)
          .update({
            scheduled_date: schedDate,
            time_slot: schedSlot,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", selectedOrder.id);
      } catch (delErr) {
        console.warn("delivery_assignments schedule sync notice:", delErr);
      }

      // 3. Log into order_status_history
      try {
        await supabase.from("order_status_history").insert([
          {
            order_id: selectedOrder.id,
            status: selectedOrder.status || "Pending",
            actor_id: authUser?.user?.id || null,
            created_by: authUser?.user?.id || null,
            notes: `Delivery schedule set to ${new Date(schedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (${schedSlot}) by Manager`,
          },
        ]);
      } catch (histErr) {
        console.warn("Status history notice:", histErr);
      }

      // 4. Send customer notification if schedule assigned/changed
      if (selectedOrder.customer_id) {
        try {
          await (supabase.from("notifications") as any).insert([
            {
              user_id: selectedOrder.customer_id,
              title: "Delivery Schedule Updated",
              message: `Your order #${selectedOrder.order_number || selectedOrder.id.slice(0, 8)} is scheduled for delivery on ${new Date(schedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (${schedSlot}).`,
              type: "delivery_update",
            },
          ]);
        } catch (notifErr) {
          console.warn("Notification insert notice:", notifErr);
        }
      }

      toast.success(`Delivery schedule saved for order #${selectedOrder.order_number || selectedOrder.id.slice(0, 8)}`);
      setSelectedOrder((prev: any) =>
        prev ? { ...prev, delivery_date: schedDate, delivery_slot: schedSlot } : null,
      );
      setEditingSchedule(false);
      await loadOrders();
    } catch (err: any) {
      toast.error("Failed to save delivery schedule: " + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/manager" className="hover:text-red-600 transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Orders</span>
            {statusFilter !== "all" && (
              <>
                <span>/</span>
                <span className="text-red-600 font-bold capitalize">{statusFilter}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Manager Orders Operations ({filteredOrders.length}
            {statusFilter !== "all" ? ` of ${orders.length}` : ""})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Approve, schedule, and track cylinder orders assigned to your depot.
          </p>
        </div>

        {/* Quick status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("all")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              statusFilter === "all"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            All Orders ({orders.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter.toLowerCase() === "pending" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("Pending")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              statusFilter.toLowerCase() === "pending"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            Pending Approval ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter.toLowerCase() === "processing" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("Processing")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              statusFilter.toLowerCase() === "processing"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            Processing ({processingCount})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="surface-card p-4 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assigned orders by ID or customer..."
            className="pl-9.5 h-9 rounded-full bg-white/90 border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-48 h-9 rounded-full text-xs font-bold bg-white/90 border-slate-200/80 text-slate-700 shadow-2xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 font-medium text-xs">
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
              className="rounded-full text-xs h-9 px-3 text-slate-500 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            Loading manager orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="font-black text-sm text-slate-900">No manager orders found</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Customer orders assigned to this depot will display here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-slate-100">
                <TableRow>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Order ID</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Customer</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Total</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Fulfillment Status</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-mono font-black text-xs text-slate-900">
                      #{o.order_number || o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">{o.customer_name}</TableCell>
                    <TableCell className="font-bold text-xs text-slate-900">
                      {gbp(Number(o.total))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-2xs ${
                          o.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : o.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200/80"
                              : o.status === "Cancelled"
                                ? "bg-rose-50 text-rose-700 border-rose-200/80"
                                : "bg-blue-50 text-blue-700 border-blue-200/80"
                        }`}
                      >
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={o.status}
                          onValueChange={(val) => handleUpdateStatus(o, val as OrderStatus)}
                        >
                          <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl bg-white border-slate-200/80 w-[130px] shadow-2xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80">
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
                          className="h-8 w-8 rounded-full hover:bg-red-50/50 hover:text-red-600"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Order Details Sheet */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 bg-white/95 backdrop-blur-2xl border-l border-white/80 overflow-y-auto text-slate-900">
          {selectedOrder && (
            <div className="space-y-6 text-xs">
              <SheetHeader className="border-b border-slate-100 pb-4">
                <SheetTitle className="font-black text-xl text-slate-900">
                  Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                </SheetTitle>
                <p className="text-slate-500 font-medium text-[11px] mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString("en-GB")}
                </p>
              </SheetHeader>

              {/* DELIVERY ASSIGNMENT SECTION */}
              <div className="p-4 rounded-2xl border border-white/80 bg-white/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-red-600" /> Delivery Assignment
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-2xs ${
                      selectedOrder.assigned_driver &&
                      selectedOrder.assigned_driver.toLowerCase() !== "unassigned"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-amber-50 text-amber-700 border-amber-200/80"
                    }`}
                  >
                    {selectedOrder.assigned_driver &&
                    selectedOrder.assigned_driver.toLowerCase() !== "unassigned"
                      ? "Assigned"
                      : "Unassigned"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <p className="text-slate-500 text-[11px] font-medium">Assigned Driver / Agent</p>
                    <p className="font-black text-slate-900 text-sm mt-0.5">
                      {selectedOrder.assigned_driver &&
                      selectedOrder.assigned_driver.toLowerCase() !== "unassigned"
                        ? selectedOrder.assigned_driver
                        : "No Driver Assigned"}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full text-xs font-black gap-1 shadow-md shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer"
                  >
                    <Link to="/manager/delivery-assignment">
                      {selectedOrder.assigned_driver &&
                      selectedOrder.assigned_driver.toLowerCase() !== "unassigned"
                        ? "Reassign"
                        : "Assign Agent"}{" "}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/80 bg-white/60 space-y-1">
                <p className="font-bold text-slate-900">Customer Details</p>
                <p className="text-slate-700 font-medium">{selectedOrder.customer_name || "Guest Customer"}</p>
                {selectedOrder.customer_email && (
                  <p className="text-slate-500">{selectedOrder.customer_email}</p>
                )}
                <p className="text-slate-500 mt-1">
                  {typeof selectedOrder.shipping_address === "string"
                    ? selectedOrder.shipping_address
                    : typeof selectedOrder.delivery_address === "string"
                    ? selectedOrder.delivery_address
                    : typeof selectedOrder.delivery_address === "object" && selectedOrder.delivery_address !== null
                    ? [selectedOrder.delivery_address.street, selectedOrder.delivery_address.city, selectedOrder.delivery_address.postcode].filter(Boolean).join(", ")
                    : "Gloucestershire Address"}
                </p>
              </div>

              {/* Delivery Schedule Management Section */}
              <div className="p-4 rounded-2xl border border-white/80 bg-white/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Calendar className="h-4 w-4 text-red-600" /> Delivery Schedule
                  </span>
                  {!editingSchedule && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSchedule(true)}
                      className="h-7 text-[11px] font-bold rounded-full border-slate-200 gap-1 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                    >
                      <Edit2 className="h-3 w-3 text-slate-400" /> Edit Schedule
                    </Button>
                  )}
                </div>

                {editingSchedule ? (
                  <div className="space-y-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Delivery Date
                      </label>
                      <Input
                        type="date"
                        value={schedDate}
                        onChange={(e) => setSchedDate(e.target.value)}
                        className="h-8 rounded-xl text-xs bg-white border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Delivery Slot
                      </label>
                      <Select value={schedSlot} onValueChange={setSchedSlot}>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-white border-slate-200 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80">
                          <SelectItem value="Morning (08:00 - 12:00)">Morning (08:00 - 12:00)</SelectItem>
                          <SelectItem value="Afternoon (12:00 - 16:00)">Afternoon (12:00 - 16:00)</SelectItem>
                          <SelectItem value="Evening (16:00 - 20:00)">Evening (16:00 - 20:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveSchedule}
                        disabled={savingSchedule}
                        className="h-7.5 rounded-full text-[11px] font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/20 cursor-pointer"
                      >
                        {savingSchedule ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
                          </>
                        ) : (
                          "Save Delivery Schedule"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSchedule(false);
                          setSchedDate(selectedOrder.delivery_date || "");
                          setSchedSlot(selectedOrder.delivery_slot || "Morning (08:00 - 12:00)");
                        }}
                        className="h-7.5 rounded-full text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">
                        Date
                      </span>
                      <span className="font-black text-slate-900 mt-0.5 block">
                        {selectedOrder.delivery_date
                          ? new Date(selectedOrder.delivery_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Not scheduled"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block">
                        Time Slot
                      </span>
                      <span className="font-black text-slate-900 mt-0.5 block">
                        {selectedOrder.delivery_slot || "Not scheduled"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-900">Order Items</p>
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium">
                      {item.product_name} x {item.quantity}
                    </span>
                    <span className="font-bold text-slate-900">{gbp(Number(item.total_price))}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-slate-900 text-sm">
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
