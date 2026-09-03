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
  RotateCcw,
  PackagePlus,
  ShieldCheck,
  Flame,
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  REFILL_STATUS_STEPS,
  RefillStatusKey,
  advanceRefillStatus,
} from "@/lib/cylinder-service";

export function AdminOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW_CYLINDER" | "REFILL" | "STANDARD">("ALL");
  const [usageFilter, setUsageFilter] = useState<"ALL" | "DOMESTIC" | "COMMERCIAL" | "BULK">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Refill Management Modal
  const [refillModalOpen, setRefillModalOpen] = useState(false);
  const [managingRefillOrder, setManagingRefillOrder] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Scheduling inputs inside Refill Modal
  const [pickupDriver, setPickupDriver] = useState("Gloucestershire Logistics Driver");
  const [pickupVehicle, setPickupVehicle] = useState("Truck #2 (GL72 JSS)");
  const [actionNotes, setActionNotes] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_assignments(*)")
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

    const channel = supabase
      .channel("admin_orders_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getOrderType = (o: any): "NEW_CYLINDER" | "REFILL" | "STANDARD" => {
    if (o.notes?.includes("[NEW_CYLINDER]") || o.order_number?.startsWith("CYL-NEW")) {
      return "NEW_CYLINDER";
    }
    if (o.notes?.includes("[REFILL]") || o.notes?.includes("[REFILL_EXCHANGE]") || o.order_number?.startsWith("CYL-REF") || o.status?.includes("Refill")) {
      return "REFILL";
    }
    const hasCylinderItem = (o.order_items || []).some(
      (i: any) => i.name?.toLowerCase().includes("cylinder") || i.name?.toLowerCase().includes("propane") || i.name?.toLowerCase().includes("butane")
    );
    if (hasCylinderItem) return "NEW_CYLINDER";
    return "STANDARD";
  };

  const getOrderUsage = (o: any): "DOMESTIC" | "COMMERCIAL" | "BULK" => {
    if (o.notes?.includes("[COMMERCIAL]") || o.order_number?.includes("-COM-")) return "COMMERCIAL";
    if (o.notes?.includes("[BULK]") || o.order_number?.includes("-BLK-")) return "BULK";
    return "DOMESTIC";
  };

  const filteredOrders = orders.filter((o) => {
    const type = getOrderType(o);
    const usage = getOrderUsage(o);

    const matchesTab = activeTab === "ALL" || type === activeTab;
    const matchesUsage = usageFilter === "ALL" || usage === usageFilter;

    const matchesSearch =
      (o.order_number || o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shipping_name || o.customer_name || o.guest_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shipping_phone || o.guest_phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.shipping_address || o.delivery_address || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesTab && matchesUsage && matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    if (order.status === newStatus) return;

    try {
      const { data: authUser } = await supabase.auth.getUser();

      const { error: updateErr } = await (supabase.from("orders") as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      await supabase.from("order_status_history").insert([
        {
          order_id: order.id,
          status: newStatus,
          actor_id: authUser?.user?.id || null,
          created_by: authUser?.user?.id || null,
          notes: `Status changed to ${newStatus} by Admin`,
        },
      ]);

      toast.success(`Order ${order.order_number} marked as ${newStatus}`);
      await loadOrders();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleRefillAction = async (nextStatus: RefillStatusKey) => {
    if (!managingRefillOrder) return;
    setActionLoading(true);
    try {
      await advanceRefillStatus({
        orderId: managingRefillOrder.id,
        nextStatus,
        notes: actionNotes.trim() || undefined,
        verifiedBy: "Whitminster Logistics Hub",
      });

      toast.success(`Refill updated: ${nextStatus.replace(/_/g, " ")}`);
      setActionNotes("");
      await loadOrders();

      // Refresh managing order
      const { data: refreshed } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_assignments(*)")
        .eq("id", managingRefillOrder.id)
        .single();
      if (refreshed) setManagingRefillOrder(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Orders & Cylinder Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-primary" /> Live Orders & Refill Operations ({orders.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage new gas cylinder deliveries, empty cylinder pickup exchanges, and general orders in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-primary" : "")} />
            <span>Sync Live DB</span>
          </Button>

          <Button asChild className="rounded-full font-bold text-xs gap-1.5 shadow-md">
            <Link to="/order-gas">
              <PackagePlus className="h-4 w-4" /> New Cylinder / Refill
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Tabs & Filters */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          
          {/* Order Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1">
            {[
              { id: "ALL", label: "All Orders", count: orders.length },
              {
                id: "NEW_CYLINDER",
                label: "New Cylinders",
                count: orders.filter((o) => getOrderType(o) === "NEW_CYLINDER").length,
              },
              {
                id: "REFILL",
                label: "Refill Requests",
                count: orders.filter((o) => getOrderType(o) === "REFILL").length,
              },
              {
                id: "STANDARD",
                label: "Standard Items",
                count: orders.filter((o) => getOrderType(o) === "STANDARD").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Selectors */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            {/* Usage Filter Selector */}
            <Select value={usageFilter} onValueChange={(val: any) => setUsageFilter(val)}>
              <SelectTrigger className="w-36 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="Usage Type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">All Usages</SelectItem>
                <SelectItem value="DOMESTIC">🏠 Domestic</SelectItem>
                <SelectItem value="COMMERCIAL">🏨 Commercial</SelectItem>
                <SelectItem value="BULK">🏭 Bulk LPG</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, phone..."
                className="pl-8.5 rounded-full bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Refill Requested">Refill Requested</SelectItem>
                <SelectItem value="Pickup Scheduled">Pickup Scheduled</SelectItem>
                <SelectItem value="Empty Cylinder Collected">Empty Cylinder Collected</SelectItem>
                <SelectItem value="Empty Cylinder Verified">Empty Cylinder Verified</SelectItem>
                <SelectItem value="Refill In Progress">Refill In Progress</SelectItem>
                <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Orders Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-bold">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
            Loading live orders matrix from Supabase...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No matching orders found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real cylinder orders and refill requests will display here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs">Order / Refill ID</TableHead>
                  <TableHead className="font-bold text-xs">Type</TableHead>
                  <TableHead className="font-bold text-xs">Customer</TableHead>
                  <TableHead className="font-bold text-xs">Items & Cylinder</TableHead>
                  <TableHead className="font-bold text-xs">Amount</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => {
                  const type = getOrderType(o);
                  const isRefill = type === "REFILL";
                  const isNewCyl = type === "NEW_CYLINDER";
                  const items = o.order_items || [];
                  const firstItem = items[0];

                  return (
                    <TableRow key={o.id} className="hover:bg-slate-50/60">
                      {/* Order Number */}
                      <TableCell className="font-mono font-extrabold text-xs text-foreground">
                        <div className="space-y-0.5">
                          <p>{o.order_number || o.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground font-normal font-sans">
                            {new Date(o.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </TableCell>

                      {/* Order Type Badge */}
                      <TableCell>
                        {isNewCyl ? (
                          <Badge className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <PackagePlus className="h-3 w-3" /> NEW CYLINDER
                          </Badge>
                        ) : isRefill ? (
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <RotateCcw className="h-3 w-3" /> REFILL REQUEST
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-full w-fit">
                            STANDARD
                          </Badge>
                        )}
                      </TableCell>

                      {/* Customer Info */}
                      <TableCell className="text-xs">
                        <div className="font-bold text-foreground">
                          {o.shipping_name || o.guest_name || o.customer_name || "Guest Customer"}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{o.shipping_phone || o.guest_phone || "—"}</span>
                        </div>
                      </TableCell>

                      {/* Items / Cylinder */}
                      <TableCell className="text-xs max-w-xs">
                        <div className="font-bold text-foreground truncate">
                          {firstItem?.name || firstItem?.product_name || "Gas Supply Order"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {items.length > 1 ? `${items.length} items (${firstItem?.quantity || 1}x ${firstItem?.name})` : `Qty: ${firstItem?.quantity || 1}`}
                        </div>
                      </TableCell>

                      {/* Amount & Payment */}
                      <TableCell className="text-xs">
                        <div className="font-black text-foreground">{gbp(Number(o.total))}</div>
                        <div className="text-[10px] font-bold text-emerald-600">
                          {o.payment_status || "Paid"} ({o.payment_method || "Online"})
                        </div>
                      </TableCell>

                      {/* Live Status Selector */}
                      <TableCell>
                        {isRefill ? (
                          <Badge
                            onClick={() => {
                              setManagingRefillOrder(o);
                              setRefillModalOpen(true);
                            }}
                            className={cn(
                              "text-[10px] font-extrabold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-90 shadow-2xs flex items-center gap-1 w-fit",
                              o.status?.includes("Delivered") || o.status?.includes("Completed")
                                ? "bg-emerald-600 text-white"
                                : o.status?.includes("Empty Cylinder Verified")
                                ? "bg-blue-600 text-white"
                                : o.status?.includes("Collected")
                                ? "bg-purple-600 text-white"
                                : o.status?.includes("Pickup")
                                ? "bg-amber-500 text-white"
                                : "bg-slate-800 text-white"
                            )}
                          >
                            <span>{o.status || "Refill Requested"}</span>
                            <ChevronRight className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Select value={o.status || "Processing"} onValueChange={(val) => handleUpdateStatus(o, val)}>
                            <SelectTrigger className="h-7 text-[10px] font-bold rounded-xl border-slate-200 w-32 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="Processing">Processing</SelectItem>
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                              <SelectItem value="Packed">Packed</SelectItem>
                              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRefill && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setManagingRefillOrder(o);
                                setRefillModalOpen(true);
                              }}
                              className="h-7 rounded-full text-[10px] font-extrabold px-2.5 border-slate-200 text-primary bg-red-50/50 hover:bg-red-50"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Manage Refill
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(o)}
                            className="h-7 w-7 rounded-full hover:bg-slate-100"
                            title="View order details"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* REFILL LIFECYCLE MANAGEMENT MODAL */}
      <Dialog open={refillModalOpen} onOpenChange={setRefillModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-6 bg-white space-y-5">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <span>Refill Request Lifecycle Manager</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full">
                #{managingRefillOrder?.order_number || managingRefillOrder?.id?.slice(0, 8)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {managingRefillOrder && (
            <div className="space-y-5 text-xs text-left">
              {/* Order Info Bar */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 font-bold block">Customer:</span>
                  <p className="font-extrabold text-slate-900">{managingRefillOrder.shipping_name || managingRefillOrder.guest_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Phone:</span>
                  <p className="font-extrabold text-slate-900">{managingRefillOrder.shipping_phone || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Current Status:</span>
                  <p className="font-extrabold text-primary">{managingRefillOrder.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Total Amount:</span>
                  <p className="font-extrabold text-slate-900">{gbp(Number(managingRefillOrder.total))}</p>
                </div>
              </div>

              {/* Strict Operational Steps */}
              <div className="space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  Sequential Operational Controls (Empty Return & Refill Dispatch)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Action 1: Pickup Scheduled */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("PICKUP_SCHEDULED")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Pickup Scheduled" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <Truck className="h-3.5 w-3.5 text-primary" /> 1. Schedule Empty Pickup
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Assign pickup route & driver</p>
                    </div>
                  </Button>

                  {/* Action 2: Empty Cylinder Collected */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("EMPTY_COLLECTED")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Empty Cylinder Collected" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <CheckCircle className="h-3.5 w-3.5 text-purple-600" /> 2. Mark Empty Collected
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Driver collected empty bottle</p>
                    </div>
                  </Button>

                  {/* Action 3: Empty Cylinder Verified */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("EMPTY_VERIFIED")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Empty Cylinder Verified" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 3. Verify Empty Cylinder
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Depot safety inspection passed</p>
                    </div>
                  </Button>

                  {/* Action 4: Refill In Progress */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("REFILL_IN_PROGRESS")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Refill In Progress" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <Flame className="h-3.5 w-3.5 text-amber-600" /> 4. Start Refill Processing
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Bottle being refilled at plant</p>
                    </div>
                  </Button>

                  {/* Action 5: Refill Completed */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("REFILL_COMPLETED")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Refill Completed" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> 5. Mark Refill Completed
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Sealed & loaded for delivery</p>
                    </div>
                  </Button>

                  {/* Action 6: Out for Delivery */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("OUT_FOR_DELIVERY")}
                    className={cn(
                      "justify-start h-auto p-3 rounded-2xl border text-left font-extrabold text-xs transition-all",
                      managingRefillOrder.status === "Out for Delivery" ? "border-primary bg-red-50 text-primary ring-1 ring-primary" : "border-slate-200"
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-bold">
                        <Truck className="h-3.5 w-3.5 text-blue-600" /> 6. Out for Delivery
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal">Dispatched on delivery vehicle</p>
                    </div>
                  </Button>

                  {/* Action 7: Delivered / Completed */}
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleRefillAction("COMPLETED")}
                    className="sm:col-span-2 justify-center h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" /> 7. Mark Delivered & Complete Refill Order
                  </Button>
                </div>
              </div>

              {/* Note input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-700">Audit / Logistics Notes (Optional)</Label>
                <Input
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Empty 13kg Calor cylinder verified by Inspector #4"
                  className="rounded-xl h-10"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DETAIL SHEET FOR ANY ORDER */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto bg-white p-6 space-y-6">
          <SheetHeader>
            <SheetTitle className="font-black text-lg text-slate-900 flex items-center justify-between">
              <span>Order Details</span>
              <span className="font-mono text-xs text-primary font-bold">
                #{selectedOrder?.order_number || selectedOrder?.id?.slice(0, 8)}
              </span>
            </SheetTitle>
          </SheetHeader>

          {selectedOrder && (
            <div className="space-y-5 text-xs text-left">
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-400 block">Customer Information</span>
                <p className="text-sm font-extrabold text-slate-900">
                  {selectedOrder.shipping_name || selectedOrder.guest_name || selectedOrder.customer_name || "Guest Customer"}
                </p>
                <p className="text-slate-600">{selectedOrder.shipping_phone || selectedOrder.guest_phone || "No phone provided"}</p>
                <p className="text-slate-600">{selectedOrder.shipping_address || selectedOrder.delivery_address || "No address provided"}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider block">Line Items</span>
                <div className="space-y-2">
                  {(selectedOrder.order_items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-extrabold text-slate-900">{item.name || item.product_name}</p>
                        <p className="text-[11px] text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-slate-900">{gbp(Number(item.total || item.price * item.quantity))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-black text-primary text-base">{gbp(Number(selectedOrder.total))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payment:</span>
                  <span className="text-emerald-600">{selectedOrder.payment_status || "Paid"}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
