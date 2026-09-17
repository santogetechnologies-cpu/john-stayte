import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Search,
  Plus,
  Save,
  RotateCcw,
  PackagePlus,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Sliders,
  ShieldAlert,
  UserCheck,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  getDeliveryAgents,
  assignDeliveryAgentToDelivery,
  type DeliveryAgentRecord,
} from "@/lib/delivery-agent-service";
import { deleteDeliveryAssignment } from "@/lib/order-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { cn } from "@/lib/utils";
import { DEFAULT_SLOTS, SlotConfig } from "@/lib/cylinder-service";

export function AdminDeliveriesView() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PICKUPS" | "DELIVERIES" | "SLOTS">("ALL");

  // Route Assignment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [routeArea, setRouteArea] = useState("Gloucestershire South");
  const [timeSlot, setTimeSlot] = useState("Morning Window (08:00 - 12:00)");
  const [creating, setCreating] = useState(false);

  // Reassign / Direct Assign Delivery Agent Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeliveryToAssign, setSelectedDeliveryToAssign] = useState<any | null>(null);
  const [selectedAgentIdForAssign, setSelectedAgentIdForAssign] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Slots Configuration State
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>(DEFAULT_SLOTS);
  const [savingSlots, setSavingSlots] = useState(false);

  // Delete Delivery Assignment Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeletingAssignment(true);
    try {
      const res = await deleteDeliveryAssignment(assignmentToDelete.id);
      toast.success(res.message || "Delivery assignment deleted successfully.");
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      await loadDeliveriesAndSlots();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete delivery assignment.");
    } finally {
      setDeletingAssignment(false);
    }
  };

  const loadDeliveriesAndSlots = async () => {
    setLoading(true);
    try {
      const [{ data: delData, error: delErr }, { data: slotBlock }, agentsData] = await Promise.all(
        [
          supabase
            .from("delivery_assignments")
            .select("*, orders(*)")
            .order("created_at", { ascending: false }),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "delivery_pickup_slots_config")
            .maybeSingle(),
          getDeliveryAgents(),
        ],
      );

      if (delErr) throw delErr;
      setDeliveries(delData || []);
      setDeliveryAgents(agentsData || []);

      if (slotBlock?.content) {
        try {
          const parsed = JSON.parse(slotBlock.content);
          if (Array.isArray(parsed) && parsed.length > 0) setSlotConfigs(parsed);
        } catch (e) {
          // fallback
        }
      }
    } catch (err: any) {
      toast.error("Failed to load logistics matrix: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveriesAndSlots();

    const channelName = `admin_deliveries_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDeliveriesAndSlots(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isPickup = (d: any) => {
    const notes = d.orders?.notes || "";
    const num = d.orders?.order_number || "";
    return (
      notes.includes("[REFILL]") ||
      num.startsWith("CYL-REF") ||
      (d.status || "").toLowerCase().includes("pickup")
    );
  };

  const filtered = deliveries.filter((d) => {
    const pickupMatch = isPickup(d);
    if (activeTab === "PICKUPS" && !pickupMatch) return false;
    if (activeTab === "DELIVERIES" && pickupMatch) return false;

    return (
      (d.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.route_area || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.vehicle_identifier || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.orders?.order_number || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !vehicleId) return toast.error("Driver name and vehicle ID are required.");
    setCreating(true);

    try {
      const { error } = await supabase.from("delivery_assignments").insert([
        {
          agent_id: selectedAgentId || null,
          driver_name: driverName.trim(),
          vehicle_identifier: vehicleId.trim(),
          vehicle_plate: vehicleId.trim(),
          route_area: routeArea,
          time_slot: timeSlot,
          status: "Out for Delivery",
        },
      ]);

      if (error) throw error;
      toast.success("Delivery route assignment created!");
      setModalOpen(false);
      setSelectedAgentId("");
      setDriverName("");
      setVehicleId("");
      await loadDeliveriesAndSlots();
    } catch (err: any) {
      toast.error("Failed to create assignment: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedDeliveryToAssign || !selectedAgentIdForAssign) {
      toast.error("Please select an active driver.");
      return;
    }

    const agent = deliveryAgents.find((a) => a.id === selectedAgentIdForAssign);
    if (!agent) return;

    setAssigning(true);
    try {
      await assignDeliveryAgentToDelivery({
        assignmentId: selectedDeliveryToAssign.id,
        orderId: selectedDeliveryToAssign.order_id,
        agentId: agent.id,
        agentName: agent.full_name,
        vehicleIdentifier: agent.vehicle_type || "Cylinder Delivery Van",
        vehiclePlate: agent.vehicle_plate,
        assignedBy: "Admin Operations",
      });

      toast.success(
        `Assigned ${agent.full_name} to #${selectedDeliveryToAssign.orders?.order_number || selectedDeliveryToAssign.id.slice(0, 8)}!`,
      );
      setAssignModalOpen(false);
      setSelectedDeliveryToAssign(null);
      setSelectedAgentIdForAssign("");
      await loadDeliveriesAndSlots();
    } catch (err: any) {
      toast.error("Failed to assign agent: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("delivery_assignments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Delivery status updated to ${newStatus}`);
      await loadDeliveriesAndSlots();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleSaveSlotsConfig = async () => {
    setSavingSlots(true);
    try {
      const { error } = await supabase.from("cms_content_blocks").upsert(
        {
          section_key: "delivery_pickup_slots_config",
          title: "Delivery & Pickup Slot Capacity Configuration",
          content: JSON.stringify(slotConfigs),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section_key" },
      );

      if (error) throw error;
      toast.success("Slot capacity configuration updated!");
    } catch (err: any) {
      toast.error("Failed to save slots configuration: " + err.message);
    } finally {
      setSavingSlots(false);
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
            <span className="text-foreground">Forecourt Logistics & Scheduling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" /> Delivery Routes & Slot Capacity Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage truck drivers, vehicle assignments, empty bottle pickup routes, and live slot
            booking capacities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDeliveriesAndSlots}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-primary" : "")} />
            <span>Sync Live DB</span>
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Route Assignment
          </Button>
        </div>
      </div>

      {/* 2. Tabs & Toolbar */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: "All Routes", count: deliveries.length },
              {
                id: "PICKUPS",
                label: "Empty Pickups (Refills)",
                count: deliveries.filter((d) => isPickup(d)).length,
              },
              {
                id: "DELIVERIES",
                label: "Cylinder Drop-offs",
                count: deliveries.filter((d) => !isPickup(d)).length,
              },
              {
                id: "SLOTS",
                label: "⚙️ Slot & Capacity Rules",
                count: slotConfigs.length,
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

          {activeTab !== "SLOTS" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver, vehicle, or area..."
                className="pl-8.5 rounded-full bg-slate-50 border-slate-200 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Content based on active tab */}
      {activeTab === "SLOTS" ? (
        <div className="surface-card rounded-3xl border bg-white p-6 space-y-6 shadow-xs text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" /> Delivery & Pickup Slot Capacity
                Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set maximum booking caps per time window to prevent overbooking on Gloucestershire
                logistics routes.
              </p>
            </div>

            <Button
              disabled={savingSlots}
              onClick={handleSaveSlotsConfig}
              className="rounded-full font-bold text-xs gap-1.5 shadow-md self-start"
            >
              <Save className="h-4 w-4" /> {savingSlots ? "Saving..." : "Save Slot Rules"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {slotConfigs.map((slot, index) => (
              <div
                key={slot.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900">{slot.slot_name}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={slot.is_active}
                      onChange={(e) => {
                        const updated = [...slotConfigs];
                        updated[index].is_active = e.target.checked;
                        setSlotConfigs(updated);
                      }}
                      className="h-3.5 w-3.5 rounded text-primary"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Daily Max Capacity (Bookings Limit):
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={slot.capacity}
                    onChange={(e) => {
                      const updated = [...slotConfigs];
                      updated[index].capacity = parseInt(e.target.value) || 1;
                      setSlotConfigs(updated);
                    }}
                    className="rounded-xl h-9 text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Start Time</label>
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => {
                        const updated = [...slotConfigs];
                        updated[index].start_time = e.target.value;
                        setSlotConfigs(updated);
                      }}
                      className="rounded-xl h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">End Time</label>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => {
                        const updated = [...slotConfigs];
                        updated[index].end_time = e.target.value;
                        setSlotConfigs(updated);
                      }}
                      className="rounded-xl h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200">
                  <span>Slot Type:</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    {slot.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 text-center text-xs text-muted-foreground font-bold">
              <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
              Loading logistics matrix...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Truck className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="font-bold text-sm text-foreground">No active route assignments</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Assignments will appear here when drivers are dispatched for empty bottle
                collections or cylinder drop-offs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Route / Assignment</TableHead>
                    <TableHead className="font-bold text-xs">Driver & Vehicle</TableHead>
                    <TableHead className="font-bold text-xs">Cylinder Exchange</TableHead>
                    <TableHead className="font-bold text-xs">Area & Schedule</TableHead>
                    <TableHead className="font-bold text-xs">Associated Order</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const pickupType = isPickup(d);
                    const exchangeReq = getOrderCylinderExchangeRequirement(d);

                    return (
                      <TableRow key={d.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-bold text-xs text-foreground">
                          {pickupType ? (
                            <Badge className="bg-purple-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <RotateCcw className="h-3 w-3" /> EMPTY PICKUP
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <PackagePlus className="h-3 w-3" /> DROP-OFF
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          <p className="font-extrabold text-slate-900">
                            {d.driver_name || "Gloucestershire Driver"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.vehicle_identifier || "Fleet Van"}
                          </p>
                        </TableCell>

                        <TableCell className="text-xs">
                          {exchangeReq.required ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[10px]">
                                Empty Required: Yes ({exchangeReq.expectedQuantity})
                              </Badge>
                              <p className="text-[10px] text-slate-500">Refill Exchange</p>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-[10px]">
                                Empty Required: No
                              </Badge>
                              <p className="text-[10px] text-slate-500">
                                {exchangeReq.orderType === "NEW_CYLINDER" ? "New Cylinder" : "Standard"}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          <p className="font-semibold text-slate-800">
                            {d.route_area || "Gloucestershire"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.time_slot || "Morning Window"}
                          </p>
                        </TableCell>

                        <TableCell className="text-xs">
                          {d.orders ? (
                            <div className="space-y-0.5">
                              <p className="font-mono font-bold text-primary">
                                #{d.orders.order_number || d.orders.id.slice(0, 8)}
                              </p>
                              <p className="text-[11px] text-slate-600 truncate max-w-xs">
                                {d.orders.shipping_name || d.orders.guest_name}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">Standalone Route</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Select
                            value={d.status || "Confirmed"}
                            onValueChange={(val) => handleUpdateStatus(d.id, val)}
                          >
                            <SelectTrigger className="h-7 text-[10px] font-bold rounded-xl border-slate-200 w-32 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                              <SelectItem value="Pickup Scheduled">Pickup Scheduled</SelectItem>
                              <SelectItem value="Empty Cylinder Collected">
                                Empty Cylinder Collected
                              </SelectItem>
                              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                              <SelectItem value="Delayed">Delayed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDeliveryToAssign(d);
                                setSelectedAgentIdForAssign(
                                  d.agent_id || d.driver_id || (deliveryAgents[0]?.id || ""),
                                );
                                setAssignModalOpen(true);
                              }}
                              className="h-7 rounded-full text-[10px] font-bold px-2.5 border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer"
                            >
                              <UserCheck className="h-3 w-3 mr-1 text-primary" />
                              {d.driver_name &&
                              d.driver_name !== "Unassigned" &&
                              !d.driver_name.includes("Unassigned")
                                ? "Reassign"
                                : "Assign Driver"}
                            </Button>

                            {d.orders && (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-full text-[10px] font-bold text-slate-600"
                              >
                                <Link to="/admin/orders">View Order</Link>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAssignmentToDelete(d);
                                setDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Delete delivery assignment"
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
      )}

      {/* ASSIGN / REASSIGN DRIVER MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Assign Driver
            </DialogTitle>
          </DialogHeader>

          {selectedDeliveryToAssign && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Delivery / Order Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">
                    #{selectedDeliveryToAssign.orders?.order_number || selectedDeliveryToAssign.id.slice(0, 8)}
                  </span>
                  <Badge className="bg-slate-200 text-slate-800 font-bold text-[10px]">
                    Current: {selectedDeliveryToAssign.driver_name || "Unassigned"}
                  </Badge>
                </div>
                <p className="font-bold text-slate-900">
                  {selectedDeliveryToAssign.orders?.shipping_name ||
                    selectedDeliveryToAssign.orders?.customer_name ||
                    selectedDeliveryToAssign.customer_name ||
                    "Customer Delivery"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Area: {selectedDeliveryToAssign.route_area || "Gloucestershire"} &bull;{" "}
                  {selectedDeliveryToAssign.time_slot || "Morning Window"}
                </p>
              </div>

              {/* Cylinder Exchange Indicator */}
              {(() => {
                const req = getOrderCylinderExchangeRequirement(selectedDeliveryToAssign);
                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        CYLINDER EXCHANGE
                      </span>
                      <Badge
                        className={cn(
                          "text-[9px] font-extrabold",
                          req.required
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300",
                        )}
                      >
                        Empty Cylinder Required: {req.required ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">{req.reason}</p>
                  </div>
                );
              })()}

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Select Active Driver
                </label>
                <Select
                  value={selectedAgentIdForAssign}
                  onValueChange={setSelectedAgentIdForAssign}
                >
                  <SelectTrigger className="rounded-xl text-xs font-semibold bg-white border-slate-200">
                    <SelectValue placeholder="Choose a driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryAgents.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id}>
                        {ag.full_name} ({ag.agent_code}) &bull; {ag.vehicle_plate || "Van"} [
                        {ag.status || "Active"}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAgentIdForAssign && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                  {(() => {
                    const ag = deliveryAgents.find((a) => a.id === selectedAgentIdForAssign);
                    if (!ag) return null;
                    return (
                      <>
                        <p className="font-bold text-slate-800">{ag.full_name}</p>
                        <p className="text-slate-500">
                          Vehicle: {ag.vehicle_type} ({ag.vehicle_plate})
                        </p>
                        <p className="text-slate-500">
                          Zone: {ag.delivery_zone || "Gloucestershire"} &bull; Rating:{" "}
                          {ag.rating || 5.0}★
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignModalOpen(false)}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignAgent}
                  disabled={assigning || !selectedAgentIdForAssign}
                  className="rounded-full font-bold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Delivery / Pickup Route</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2 text-xs">
            {deliveryAgents.length > 0 && (
              <div>
                <label className="font-bold text-slate-800">Assign Registered Driver</label>
                <Select
                  value={selectedAgentId}
                  onValueChange={(agentId) => {
                    setSelectedAgentId(agentId);
                    const matched = deliveryAgents.find((a) => a.id === agentId);
                    if (matched) {
                      setDriverName(matched.full_name);
                      setVehicleId(matched.vehicle_plate || "");
                      if (matched.delivery_zone) setRouteArea(matched.delivery_zone);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Choose from registered agents..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryAgents.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id}>
                        {ag.full_name} ({ag.agent_code}) — {ag.vehicle_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="font-bold text-muted-foreground">Driver Name *</label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Tom Roberts"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Vehicle Reg / Identifier *</label>
              <Input
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="e.g. Truck #3 (WX21 JSS)"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Route Area</label>
              <Input
                value={routeArea}
                onChange={(e) => setRouteArea(e.target.value)}
                placeholder="e.g. Whitminster & Stroud"
                className="mt-1 rounded-xl text-xs font-semibold"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-full font-bold text-xs gap-1.5 shadow-md"
              >
                <Save className="h-4 w-4" /> {creating ? "Saving..." : "Create Assignment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Delivery Assignment Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => !deletingAssignment && setDeleteModalOpen(open)}
      >
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="font-extrabold text-lg text-slate-900">
                  Delete delivery assignment?
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will permanently remove the route assignment from Supabase.
                </p>
              </div>
            </div>
          </DialogHeader>

          {assignmentToDelete && (
            <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Route / Area:</span>
                <span className="font-bold text-slate-900">
                  {assignmentToDelete.route_area || "Gloucestershire"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Driver:</span>
                <span className="font-bold text-slate-900">
                  {assignmentToDelete.driver_name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Vehicle:</span>
                <span className="font-mono font-bold text-slate-700">
                  {assignmentToDelete.vehicle_identifier || "Fleet Van"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Associated Order:</span>
                <span className="font-mono font-extrabold text-primary">
                  {assignmentToDelete.orders?.order_number
                    ? `#${assignmentToDelete.orders.order_number}`
                    : "Standalone Route"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-slate-700">
                  {assignmentToDelete.status || "Pending"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingAssignment}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAssignment}
              disabled={deletingAssignment}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingAssignment ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Deleting...
                </>
              ) : (
                "Delete Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
