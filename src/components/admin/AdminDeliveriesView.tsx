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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DEFAULT_SLOTS, SlotConfig } from "@/lib/cylinder-service";

export function AdminDeliveriesView() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PICKUPS" | "DELIVERIES" | "SLOTS">("ALL");

  // Route Assignment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [routeArea, setRouteArea] = useState("Gloucestershire South");
  const [timeSlot, setTimeSlot] = useState("Morning Window (08:00 - 12:00)");
  const [creating, setCreating] = useState(false);

  // Slots Configuration State
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>(DEFAULT_SLOTS);
  const [savingSlots, setSavingSlots] = useState(false);

  const loadDeliveriesAndSlots = async () => {
    setLoading(true);
    try {
      const [{ data: delData, error: delErr }, { data: slotBlock }] = await Promise.all([
        supabase
          .from("delivery_assignments")
          .select("*, orders(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "delivery_pickup_slots_config")
          .maybeSingle(),
      ]);

      if (delErr) throw delErr;
      setDeliveries(delData || []);

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

    const channel = supabase
      .channel("admin_deliveries_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () => loadDeliveriesAndSlots())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isPickup = (d: any) => {
    const notes = d.orders?.notes || "";
    const num = d.orders?.order_number || "";
    return notes.includes("[REFILL]") || num.startsWith("CYL-REF") || (d.status || "").toLowerCase().includes("pickup");
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
          driver_name: driverName.trim(),
          vehicle_identifier: vehicleId.trim(),
          route_area: routeArea,
          time_slot: timeSlot,
          status: "Out for Delivery",
        },
      ]);

      if (error) throw error;
      toast.success("Delivery route assignment created!");
      setModalOpen(false);
      setDriverName("");
      setVehicleId("");
      await loadDeliveriesAndSlots();
    } catch (err: any) {
      toast.error("Failed to create assignment: " + err.message);
    } finally {
      setCreating(false);
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
        { onConflict: "section_key" }
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
            Manage truck drivers, vehicle assignments, empty bottle pickup routes, and live slot booking capacities.
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
                <Sliders className="h-5 w-5 text-primary" /> Delivery & Pickup Slot Capacity Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set maximum booking caps per time window to prevent overbooking on Gloucestershire logistics routes.
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
              <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5">
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
                  <label className="text-[11px] font-bold text-slate-600">Daily Max Capacity (Bookings Limit):</label>
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
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">{slot.type}</Badge>
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
                Assignments will appear here when drivers are dispatched for empty bottle collections or cylinder drop-offs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Route / Assignment</TableHead>
                    <TableHead className="font-bold text-xs">Driver & Vehicle</TableHead>
                    <TableHead className="font-bold text-xs">Area & Schedule</TableHead>
                    <TableHead className="font-bold text-xs">Associated Order</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const pickupType = isPickup(d);

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
                          <p className="font-extrabold text-slate-900">{d.driver_name || "Gloucestershire Driver"}</p>
                          <p className="text-[11px] text-muted-foreground">{d.vehicle_identifier || "Fleet Van"}</p>
                        </TableCell>

                        <TableCell className="text-xs">
                          <p className="font-semibold text-slate-800">{d.route_area || "Gloucestershire"}</p>
                          <p className="text-[11px] text-muted-foreground">{d.time_slot || "Morning Window"}</p>
                        </TableCell>

                        <TableCell className="text-xs">
                          {d.orders ? (
                            <div className="space-y-0.5">
                              <p className="font-mono font-bold text-primary">#{d.orders.order_number || d.orders.id.slice(0, 8)}</p>
                              <p className="text-[11px] text-slate-600 truncate max-w-xs">{d.orders.shipping_name || d.orders.guest_name}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">Standalone Route</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Select value={d.status || "Confirmed"} onValueChange={(val) => handleUpdateStatus(d.id, val)}>
                            <SelectTrigger className="h-7 text-[10px] font-bold rounded-xl border-slate-200 w-32 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                              <SelectItem value="Pickup Scheduled">Pickup Scheduled</SelectItem>
                              <SelectItem value="Empty Cylinder Collected">Empty Cylinder Collected</SelectItem>
                              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                              <SelectItem value="Delayed">Delayed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="text-right">
                          {d.orders && (
                            <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-[10px] font-bold">
                              <Link to="/admin/orders">View Order</Link>
                            </Button>
                          )}
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

      {/* CREATE MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Delivery / Pickup Route</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2 text-xs">
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
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="rounded-full font-bold text-xs gap-1.5 shadow-md">
                <Save className="h-4 w-4" /> {creating ? "Saving..." : "Create Assignment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
