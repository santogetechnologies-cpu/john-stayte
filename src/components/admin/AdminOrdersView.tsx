import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle,
  Truck,
  RotateCcw,
  PackagePlus,
  ShieldCheck,
  Loader2,
  RefreshCw,
  UserCheck,
  Check,
  X,
  MapPin,
  Phone,
  User,
  ChevronDown,
  Calendar,
  Clock,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { gbp, getOrderPaymentMethod } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  getDeliveryAgents,
  assignDeliveryAgentToDelivery,
  getAgentInitials,
  type DeliveryAgentRecord,
} from "@/lib/delivery-agent-service";
import { deleteOrder } from "@/lib/order-service";
import { cn } from "@/lib/utils";

export function AdminOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<DeliveryAgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW_CYLINDER" | "REFILL" | "STANDARD">("ALL");
  const [usageFilter, setUsageFilter] = useState<"ALL" | "DOMESTIC" | "COMMERCIAL" | "BULK">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Scalable Delivery Agent Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentStatusFilter, setAgentStatusFilter] = useState<"ALL" | "AVAILABLE" | "ON_DELIVERY" | "OFFLINE">("ALL");

  // Delete Order Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setDeletingOrder(true);
    try {
      const res = await deleteOrder(orderToDelete.id);
      toast.success(
        res.message ||
          `Order #${orderToDelete.order_number || orderToDelete.id.slice(0, 8)} deleted successfully.`,
      );
      setDeleteModalOpen(false);
      setOrderToDelete(null);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      await loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order from database.");
    } finally {
      setDeletingOrder(false);
    }
  };

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const data = await getDeliveryAgents();
      setAgents(data || []);
    } catch (err: any) {
      console.warn("Notice loading delivery agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadOrders();
    loadAgents();

    const channel = supabase
      .channel("admin_orders_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history" }, () =>
        loadOrders(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadOrders(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_agents" }, () =>
        loadAgents(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders, loadAgents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // 1. Search Query Filter (name, code, phone, zone)
      if (agentSearchQuery.trim()) {
        const q = agentSearchQuery.toLowerCase().trim();
        const match =
          (agent.full_name || "").toLowerCase().includes(q) ||
          (agent.agent_code || "").toLowerCase().includes(q) ||
          (agent.phone || "").toLowerCase().includes(q) ||
          (agent.delivery_zone || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Status Filter
      if (agentStatusFilter !== "ALL") {
        const st = (agent.status || "").toLowerCase();
        if (agentStatusFilter === "AVAILABLE") {
          if (st !== "active" && st !== "available") return false;
        } else if (agentStatusFilter === "ON_DELIVERY") {
          if (!st.includes("delivery") && st !== "busy") return false;
        } else if (agentStatusFilter === "OFFLINE") {
          if (st !== "inactive" && st !== "offline") return false;
        }
      }

      return true;
    });
  }, [agents, agentSearchQuery, agentStatusFilter]);

  const getOrderType = (o: any): "NEW_CYLINDER" | "REFILL" | "STANDARD" => {
    if (o.notes?.includes("[NEW_CYLINDER]") || o.order_number?.startsWith("CYL-NEW")) {
      return "NEW_CYLINDER";
    }
    if (
      o.notes?.includes("[REFILL]") ||
      o.notes?.includes("[REFILL_EXCHANGE]") ||
      o.order_number?.startsWith("CYL-REF") ||
      o.status?.includes("Refill")
    ) {
      return "REFILL";
    }
    const hasCylinderItem = (o.order_items || []).some(
      (i: any) =>
        i.name?.toLowerCase().includes("cylinder") ||
        i.name?.toLowerCase().includes("propane") ||
        i.name?.toLowerCase().includes("butane"),
    );
    if (hasCylinderItem) return "NEW_CYLINDER";
    return "STANDARD";
  };

  const getOrderUsage = (o: any): "DOMESTIC" | "COMMERCIAL" | "BULK" => {
    if (o.notes?.includes("[COMMERCIAL]") || o.order_number?.includes("-COM-")) return "COMMERCIAL";
    if (o.notes?.includes("[BULK]") || o.order_number?.includes("-BLK-")) return "BULK";
    return "DOMESTIC";
  };

  const getCustomerName = (o: any): string => {
    if (!o) return "Guest Customer";
    if (typeof o.shipping_name === "string" && o.shipping_name.trim()) return o.shipping_name.trim();
    if (typeof o.customer_name === "string" && o.customer_name.trim()) return o.customer_name.trim();
    if (typeof o.guest_name === "string" && o.guest_name.trim()) return o.guest_name.trim();
    if (
      o.delivery_address &&
      typeof o.delivery_address === "object" &&
      typeof o.delivery_address.name === "string" &&
      o.delivery_address.name.trim()
    ) {
      return o.delivery_address.name.trim();
    }
    return "Guest Customer";
  };

  const getCustomerPhone = (o: any): string => {
    if (!o) return "—";
    if (typeof o.shipping_phone === "string" && o.shipping_phone.trim()) return o.shipping_phone.trim();
    if (typeof o.customer_phone === "string" && o.customer_phone.trim()) return o.customer_phone.trim();
    if (typeof o.guest_phone === "string" && o.guest_phone.trim()) return o.guest_phone.trim();
    if (
      o.delivery_address &&
      typeof o.delivery_address === "object" &&
      typeof o.delivery_address.phone === "string" &&
      o.delivery_address.phone.trim()
    ) {
      return o.delivery_address.phone.trim();
    }
    return "—";
  };

  const formatAddress = (o: any): string => {
    if (!o) return "No address provided";
    const addr = o.shipping_address || o.delivery_address;
    if (!addr) return "No address provided";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      const street = addr.street || addr.address || addr.line1 || "";
      const postcode = addr.postcode || addr.postal_code || addr.zip || "";
      const city = addr.city || addr.town || "";
      const parts = [street, city, postcode].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "Gloucestershire Address";
    }
    return String(addr);
  };

  const getAssignedDriverInfo = (o: any) => {
    const assignment = o.delivery_assignments?.[0];
    const driverName = assignment?.driver_name || o.assigned_driver;
    const isAssigned = Boolean(
      driverName &&
        driverName.toLowerCase() !== "unassigned" &&
        !driverName.toLowerCase().includes("unassigned"),
    );

    const agentId = assignment?.agent_id || assignment?.driver_id || null;
    return { isAssigned, driverName, agentId, assignment };
  };

  const isOrderDeliverable = (o: any): boolean => {
    if (!o) return false;
    const s = (o.status || "").trim().toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  };

  const handleOpenAssignModal = (order: any) => {
    if (!order || !isOrderDeliverable(order)) {
      toast.error(`Assignment is not available for ${order?.status || "inactive"} orders`);
      return;
    }

    setOrderToAssign(order);
    setAgentSearchQuery("");
    setAgentStatusFilter("ALL");

    const { agentId, driverName } = getAssignedDriverInfo(order);

    if (agentId && agents.some((a) => a.id === agentId)) {
      setSelectedAgentId(agentId);
    } else if (driverName && agents.some((a) => a.full_name.toLowerCase() === driverName.toLowerCase())) {
      const matched = agents.find((a) => a.full_name.toLowerCase() === driverName.toLowerCase());
      setSelectedAgentId(matched?.id || "");
    } else if (agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    } else {
      setSelectedAgentId("");
    }

    setAssignModalOpen(true);
  };

  const executeAssignment = async () => {
    if (!orderToAssign || !isOrderDeliverable(orderToAssign)) {
      toast.error(`Assignment is not available for ${orderToAssign?.status || "inactive"} orders`);
      setAssignModalOpen(false);
      return;
    }

    if (!selectedAgentId) {
      toast.error("Please select a driver first");
      return;
    }

    const selectedAgent = agents.find((a) => a.id === selectedAgentId);
    if (!selectedAgent) {
      toast.error("Selected driver record could not be found");
      return;
    }

    setAssigning(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const adminName =
        authUser?.user?.user_metadata?.full_name ||
        authUser?.user?.email?.split("@")[0] ||
        "John Stayte Admin";

      await assignDeliveryAgentToDelivery({
        orderId: orderToAssign.id,
        agentId: selectedAgent.id,
        agentName: selectedAgent.full_name,
        vehicleIdentifier: selectedAgent.vehicle_type || "Cylinder Delivery Van",
        vehiclePlate: selectedAgent.vehicle_plate || "GL72 AST",
        routeArea: selectedAgent.delivery_zone || "Gloucestershire Central",
        assignedBy: adminName,
      });

      toast.success(
        `Order ${orderToAssign.order_number || orderToAssign.id.slice(0, 8)} successfully assigned to ${selectedAgent.full_name}!`,
      );
      setAssignModalOpen(false);
      setOrderToAssign(null);
      setSelectedAgentId("");
      await loadOrders();
    } catch (err: any) {
      console.error("Assignment error:", err);
      toast.error("Failed to assign driver: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const type = getOrderType(o);
    const usage = getOrderUsage(o);

    const matchesTab = activeTab === "ALL" || type === activeTab;
    const matchesUsage = usageFilter === "ALL" || usage === usageFilter;

    const matchesSearch =
      (o.order_number || o.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerName(o).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerPhone(o).toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatAddress(o).toLowerCase().includes(searchQuery.toLowerCase());

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

  const formatDisplayDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "Not scheduled";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
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
            notes: `Delivery schedule set to ${formatDisplayDate(schedDate)} (${schedSlot}) by Admin`,
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
              message: `Your order #${selectedOrder.order_number || selectedOrder.id.slice(0, 8)} is scheduled for delivery on ${formatDisplayDate(schedDate)} (${schedSlot}).`,
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

  const orderToAssignDriverInfo = orderToAssign ? getAssignedDriverInfo(orderToAssign) : null;
  const isOrderAlreadyAssigned = Boolean(orderToAssignDriverInfo?.isAssigned);
  const currentAssignedDriver = orderToAssignDriverInfo?.driverName;

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
            <ShoppingBag className="h-7 w-7 text-primary" /> Live Orders & Refill Operations (
            {orders.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage new gas cylinder deliveries, refill/exchange orders, and general orders in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOrders();
              loadAgents();
            }}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white cursor-pointer"
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
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700",
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
                  const { isAssigned, driverName } = getAssignedDriverInfo(o);
                  const isDeliverable = isOrderDeliverable(o);

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
                          {getCustomerName(o)}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{getCustomerPhone(o)}</span>
                        </div>
                      </TableCell>

                      {/* Items / Cylinder */}
                      <TableCell className="text-xs max-w-xs">
                        <div className="font-bold text-foreground truncate">
                          {firstItem?.name || firstItem?.product_name || "Gas Supply Order"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {items.length > 1
                            ? `${items.length} items (${firstItem?.quantity || 1}x ${firstItem?.name})`
                            : `Qty: ${firstItem?.quantity || 1}`}
                        </div>
                      </TableCell>

                      {/* Amount & Payment */}
                      <TableCell className="text-xs">
                        <div className="font-black text-foreground">{gbp(Number(o.total))}</div>
                        <div className="text-[10px] font-bold flex items-center gap-1">
                          <span
                            className={cn(
                              o.payment_status === "Paid" ? "text-emerald-600" : "text-amber-600",
                            )}
                          >
                            {o.payment_status || "Pending"}
                          </span>
                          <span className="text-slate-400 font-medium">
                            • {getOrderPaymentMethod(o)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Live Status Selector */}
                      <TableCell>
                        <Select
                          value={o.status || "Pending"}
                          onValueChange={(val) => handleUpdateStatus(o, val)}
                        >
                          <SelectTrigger className="h-7 text-[10px] font-bold rounded-xl border-slate-200 w-32 bg-white">
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
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Assignment Action (Only for active, deliverable orders) */}
                          {isDeliverable && (
                            isAssigned ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                  <span className="max-w-[75px] sm:max-w-[100px] truncate">Assigned: {driverName}</span>
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAssignModal(o)}
                                  className="h-6 rounded-full text-[10px] font-bold px-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                                  title="Reassign agent"
                                >
                                  Reassign
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssignModal(o)}
                                className="h-6 rounded-full text-[10px] font-bold px-2.5 border-primary/40 text-primary bg-red-50/60 hover:bg-red-100/80 shadow-2xs cursor-pointer gap-1"
                              >
                                <Truck className="h-3 w-3" /> Assign Driver
                              </Button>
                            )
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(o)}
                            className="h-6 w-6 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="View order details"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setOrderToDelete(o);
                              setDeleteModalOpen(true);
                            }}
                            className="h-6 w-6 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* 4. SCALABLE DRIVER SELECTION MODAL (EXACT TARGET DESIGN) */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="w-[94vw] sm:w-[620px] sm:max-w-[620px] rounded-[28px] p-6 sm:p-7 bg-white border border-slate-200/90 shadow-2xl max-h-[92vh] flex flex-col gap-0 overflow-y-auto outline-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50/80 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                  {isOrderAlreadyAssigned ? "Reassign Driver" : "Assign Driver"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Select a driver to handle this order
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {orderToAssign && (
                <Badge variant="outline" className="font-mono text-xs font-black bg-slate-100/90 text-slate-900 border-slate-200/90 px-3 py-1.5 rounded-xl">
                  #{orderToAssign.order_number || orderToAssign.id?.slice(0, 8)}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 4-Column Order Summary Card */}
          {orderToAssign && (
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mt-5 mb-3.5 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
                <div className="sm:pr-4">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Customer</span>
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {orderToAssign.shipping_name || orderToAssign.customer_name || "Customer"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {orderToAssign.shipping_phone || orderToAssign.customer_phone || "No phone"}
                  </p>
                </div>

                <div className="sm:px-4 pt-3 sm:pt-0">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Location</span>
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {orderToAssign.shipping_city || "Gloucestershire"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono font-semibold uppercase truncate mt-0.5">
                    {orderToAssign.shipping_postcode || "GL2 7PN"}
                  </p>
                </div>

                <div className="sm:px-4 pt-3 sm:pt-0">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Schedule</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {orderToAssign.delivery_date
                      ? new Date(orderToAssign.delivery_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Standard"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {orderToAssign.delivery_time_slot || "Morning Window"}
                  </p>
                </div>

                <div className="sm:pl-4 pt-3 sm:pt-0">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Current Driver</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isOrderAlreadyAssigned ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {isOrderAlreadyAssigned
                        ? orderToAssign.assigned_driver
                        : "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cylinder Handover Exchange Alert */}
          {orderToAssign && getOrderType(orderToAssign) === "REFILL" && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 mb-4 flex items-start gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Empty Cylinder Handover
                  </span>
                  <Badge className="bg-amber-200/90 text-amber-950 font-black text-[9px] px-2 py-0.2 rounded-full">
                    Driver Verification
                  </Badge>
                </div>
                <p className="text-xs text-amber-900/90 font-medium mt-0.5 leading-relaxed">
                  The driver must collect an empty gas cylinder at delivery or record an exchange deposit exception in the driver app.
                </p>
              </div>
            </div>
          )}

          {/* Find a Driver (Search & Filter Section) */}
          <div className="mb-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-900" /> Find a Driver
              </span>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                Search by name, code, phone or area
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={agentSearchQuery}
                onChange={(e) => setAgentSearchQuery(e.target.value)}
                placeholder="Search drivers..."
                className="pl-10 h-11 rounded-xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
              />
              {agentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAgentSearchQuery("")}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "All Drivers", count: agents.length, dot: null },
                {
                  id: "AVAILABLE",
                  label: "Available",
                  count: agents.filter((a) => a.status === "Active" || a.status === "Available").length,
                  dot: "bg-emerald-500",
                },
                {
                  id: "ON_DELIVERY",
                  label: "On Delivery",
                  count: agents.filter((a) => a.status === "On Delivery" || a.status === "Busy").length,
                  dot: "bg-blue-500",
                },
                {
                  id: "OFFLINE",
                  label: "Offline",
                  count: agents.filter((a) => a.status === "Offline" || a.status === "Inactive").length,
                  dot: "bg-slate-400",
                },
              ].map((f) => {
                const isActive = agentStatusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAgentStatusFilter(f.id as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2",
                      isActive
                        ? "bg-[#0f172a] text-white shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80",
                    )}
                  >
                    {f.dot && <span className={cn("w-2 h-2 rounded-full", f.dot)} />}
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-600",
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Drivers List */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-sm font-bold text-slate-900">
                Available Drivers
              </span>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1 cursor-pointer">
                <span>Sort by</span>
                <span className="font-bold text-slate-900 flex items-center gap-0.5">
                  Name (A–Z) <ChevronDown className="h-3 w-3 text-slate-500" />
                </span>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
              {loadingAgents ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary mb-2" />
                  Loading drivers...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-medium">
                  No drivers match your search.
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  const initials = getAgentInitials(agent.full_name);

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 min-h-[82px]",
                        isSelected
                          ? "bg-red-50/20 border-[#c8102e] ring-1 ring-[#c8102e]/30 shadow-xs"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/40",
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Circular Avatar */}
                        <div
                          className={cn(
                            "w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-sm sm:text-base shrink-0 transition-colors",
                            isSelected
                              ? "bg-[#c8102e] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-900",
                          )}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 text-left space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-slate-900 truncate">
                              {agent.full_name}
                            </span>
                            <span className="font-mono text-xs text-slate-400 font-bold">
                              {agent.agent_code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{agent.delivery_zone || "Whitminster & Stroud"}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{agent.vehicle_type || "Flatbed Cylinder Van (3.5t)"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right flex flex-col items-end">
                          <Badge
                            className={cn(
                              "text-xs font-bold px-3 py-0.5 rounded-full border flex items-center gap-1.5",
                              agent.status === "Active" || agent.status === "Available"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : agent.status === "On Delivery"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200",
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                agent.status === "Active" || agent.status === "Available"
                                  ? "bg-emerald-500"
                                  : agent.status === "On Delivery"
                                    ? "bg-blue-500"
                                    : "bg-slate-400",
                              )}
                            />
                            <span>{agent.status === "Active" ? "Available" : agent.status}</span>
                          </Badge>

                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{agent.phone || "07412 345678"}</span>
                          </div>
                        </div>

                        {/* Selection Check Circle / Radio Circle */}
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                            isSelected
                              ? "bg-[#c8102e] text-white shadow-2xs"
                              : "border-2 border-slate-300 bg-white",
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-5 mt-3 flex items-center justify-between shrink-0 border-t border-slate-100/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
              className="h-11 px-7 rounded-full text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executeAssignment}
              disabled={assigning || !selectedAgentId || filteredAgents.length === 0}
              className="h-11 px-7 rounded-full font-bold text-sm gap-2 bg-[#c8102e] hover:bg-[#b00e28] text-white cursor-pointer shadow-sm transition-all"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              {isOrderAlreadyAssigned ? "Reassign Agent" : "Assign Agent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. DETAIL SHEET FOR ANY ORDER */}
      <Sheet open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto bg-white p-6 space-y-6">
          <SheetHeader>
            <SheetTitle className="font-black text-lg text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Order Details</span>
                {selectedOrder && getOrderType(selectedOrder) === "REFILL" && (
                  <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    REFILL REQUEST
                  </Badge>
                )}
              </div>
              <span className="font-mono text-xs text-primary font-bold">
                #{selectedOrder?.order_number || selectedOrder?.id?.slice(0, 8)}
              </span>
            </SheetTitle>
          </SheetHeader>

          {selectedOrder && (
            <div className="space-y-5 text-xs text-left">
              {getOrderType(selectedOrder) === "REFILL" && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Empty Cylinder Exchange at Delivery</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Empty cylinder collection and verification are handled by the assigned Driver during the delivery handover. No separate customer pickup is required.
                  </p>
                  {isOrderDeliverable(selectedOrder) && (
                    <div className="pt-1 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const target = selectedOrder;
                          setSelectedOrder(null);
                          handleOpenAssignModal(target);
                        }}
                        className="h-7 rounded-xl text-[10px] font-extrabold gap-1 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                      >
                        <Truck className="h-3 w-3" />
                        {selectedOrder.assigned_driver &&
                        selectedOrder.assigned_driver.toLowerCase() !== "unassigned" &&
                        !selectedOrder.assigned_driver.toLowerCase().includes("unassigned")
                          ? `Reassign Driver (${selectedOrder.assigned_driver})`
                          : "Assign Driver"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-400 block">Customer Information</span>
                <p className="text-sm font-extrabold text-slate-900">
                  {getCustomerName(selectedOrder)}
                </p>
                <p className="text-slate-600">
                  {getCustomerPhone(selectedOrder)}
                </p>
                <p className="text-slate-600">
                  {formatAddress(selectedOrder)}
                </p>
              </div>

              {/* Delivery Schedule Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Calendar className="h-4 w-4 text-primary" /> Delivery Schedule
                  </span>
                  {!editingSchedule && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSchedule(true)}
                      className="h-7 text-[11px] font-bold rounded-xl border-slate-300 gap-1 bg-white hover:bg-slate-100"
                    >
                      <Edit2 className="h-3 w-3" /> Edit Schedule
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
                        className="h-8 rounded-xl text-xs bg-white border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Delivery Slot
                      </label>
                      <Select value={schedSlot} onValueChange={setSchedSlot}>
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-white border-slate-300 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                        className="h-7 rounded-xl text-[11px] font-bold bg-primary hover:bg-primary/90 text-white"
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
                        className="h-7 rounded-xl text-[11px] font-medium"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Date
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {selectedOrder.delivery_date ? formatDisplayDate(selectedOrder.delivery_date) : "Not scheduled"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Time Slot
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {selectedOrder.delivery_slot || "Not scheduled"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider block">
                  Line Items
                </span>
                <div className="space-y-2">
                  {(selectedOrder.order_items || []).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 flex justify-between items-center bg-white"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {item.name || item.product_name}
                        </p>
                        <p className="text-[11px] text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-slate-900">
                        {gbp(Number(item.total || item.price * item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1 text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-black text-primary text-base">
                    {gbp(Number(selectedOrder.total))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payment:</span>
                  <span>
                    <span
                      className={cn(
                        "font-extrabold",
                        selectedOrder.payment_status === "Paid"
                          ? "text-emerald-600"
                          : "text-amber-600",
                      )}
                    >
                      {selectedOrder.payment_status || "Pending"}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {" "}
                      ({getOrderPaymentMethod(selectedOrder)})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Order Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => !deletingOrder && setDeleteModalOpen(open)}
      >
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="font-extrabold text-lg text-slate-900">
                  Delete this order?
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action will permanently delete the record from Supabase.
                </p>
              </div>
            </div>
          </DialogHeader>

          {orderToDelete && (
            <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Order ID:</span>
                <span className="font-bold text-slate-900 font-mono">
                  #{orderToDelete.order_number || orderToDelete.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900">
                  {orderToDelete.shipping_name || orderToDelete.customer_name || "Guest Customer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-extrabold text-primary">
                  {gbp(Number(orderToDelete.total || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-slate-700">
                  {orderToDelete.status || "Pending"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingOrder}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteOrder}
              disabled={deletingOrder}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingOrder ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

