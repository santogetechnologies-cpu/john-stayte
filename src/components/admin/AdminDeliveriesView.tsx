import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Truck, Search, Plus, Save } from "lucide-react";
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

export function AdminDeliveriesView() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [routeArea, setRouteArea] = useState("Gloucestershire South");
  const [timeSlot, setTimeSlot] = useState("Morning Drop (08:00 - 12:00)");
  const [creating, setCreating] = useState(false);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("delivery_assignments")
        .select("*, orders(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (err: any) {
      toast.error("Failed to load deliveries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const filtered = deliveries.filter((d) => {
    return (
      (d.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.route_area || "").toLowerCase().includes(searchQuery.toLowerCase())
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
      toast.success("Delivery assignment created in Supabase!");
      setModalOpen(false);
      setDriverName("");
      setVehicleId("");
      await loadDeliveries();
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
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Delivery status updated to ${newStatus}`);
      await loadDeliveries();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Deliveries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Truck Logistics & Delivery Operations ({deliveries.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dispatch trucks, route assignments, and driver tracking from Supabase.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} className="rounded-full font-bold text-xs gap-1.5 shadow-md shrink-0">
          <Plus className="h-4 w-4" /> Add Delivery Route Assignment
        </Button>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver name or route area..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading delivery matrix from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Truck className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No active delivery assignments</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real delivery truck assignments will render here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Driver</TableHead>
                <TableHead className="font-bold text-xs">Vehicle</TableHead>
                <TableHead className="font-bold text-xs">Route Area</TableHead>
                <TableHead className="font-bold text-xs">Time Slot</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs text-foreground">{d.driver_name}</TableCell>
                  <TableCell className="text-xs font-semibold">{d.vehicle_identifier || "Truck"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.route_area}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.time_slot || "Morning"}</TableCell>
                  <TableCell>
                    <Select value={d.status || "Out for Delivery"} onValueChange={(val) => handleUpdateStatus(d.id, val)}>
                      <SelectTrigger className="h-7 text-[10px] font-bold rounded-xl border-slate-200 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CREATE DELIVERY ASSIGNMENT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Add Delivery Route Assignment</DialogTitle>
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
