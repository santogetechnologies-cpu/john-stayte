import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Truck, Search } from "lucide-react";
import { toast } from "sonner";
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
import { supabase } from "@/lib/supabase";

export function ManagerDeliveriesView() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.error("Failed to load manager deliveries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

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
      toast.error("Failed to update delivery status: " + err.message);
    }
  };

  const filtered = deliveries.filter((d) => {
    return (
      (d.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.route_area || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">Manager</Link>
            <span>/</span>
            <span className="text-foreground">Deliveries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Truck Logistics & Route Dispatch ({deliveries.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dispatch trucks, route assignments, and driver tracking from Supabase.
          </p>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver or route area..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading delivery dispatches from Supabase...
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
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs text-foreground">{d.driver_name}</TableCell>
                  <TableCell className="text-xs font-semibold">{d.vehicle_identifier || "Truck"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.route_area}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px]">
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={d.status} onValueChange={(val) => handleUpdateStatus(d.id, val)}>
                      <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl border-slate-200 w-[140px] ml-auto">
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
    </div>
  );
}
