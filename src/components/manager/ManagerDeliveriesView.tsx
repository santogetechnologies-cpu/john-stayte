import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Truck, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const routerLocation = useRouterState({ select: (s) => s.location });

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("status");
      if (p) return p;
    }
    return "all";
  });

  // Keep statusFilter synchronized with live router location changes
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const paramStatus = (routerLocation.search as any)?.status || params.get("status") || "all";
    setStatusFilter(paramStatus);
  }, [routerLocation]);

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

    const channel = supabase
      .channel("manager_deliveries_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    navigate({
      to: "/manager/deliveries",
      search: (val === "all" ? {} : { status: val }) as never,
    });
  };

  const filtered = deliveries.filter((d) => {
    const matchesSearch =
      (d.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.route_area || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.vehicle_identifier || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;

    const s = (d.status || "").toLowerCase();
    const filterKey = statusFilter.toLowerCase().replace(/_/g, " ");

    if (filterKey === "out for delivery") {
      return s === "out for delivery";
    }
    if (filterKey === "delivered" || filterKey === "delivered today") {
      return s === "delivered";
    }
    if (filterKey === "delayed") {
      return s === "delayed";
    }
    if (filterKey === "pending") {
      return s === "pending";
    }

    return s === filterKey;
  });

  // Calculate live counts for filter tabs/badges
  const outCount = deliveries.filter(
    (d) => (d.status || "").toLowerCase() === "out for delivery",
  ).length;
  const deliveredCount = deliveries.filter(
    (d) => (d.status || "").toLowerCase() === "delivered",
  ).length;
  const delayedCount = deliveries.filter(
    (d) => (d.status || "").toLowerCase() === "delayed",
  ).length;

  const getSelectValue = () => {
    const s = statusFilter.toLowerCase().replace(/_/g, " ");
    if (s === "out for delivery") return "out_for_delivery";
    if (s === "delivered" || s === "delivered today") return "delivered";
    if (s === "delayed") return "delayed";
    if (s === "pending") return "pending";
    return "all";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Deliveries</span>
            {statusFilter !== "all" && (
              <>
                <span>/</span>
                <span className="text-primary font-bold capitalize">
                  {statusFilter.replace(/_/g, " ")}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Truck Logistics & Route Dispatch ({filtered.length}
            {statusFilter !== "all" ? ` of ${deliveries.length}` : ""})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dispatch trucks, route assignments, and driver tracking.
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
            All ({deliveries.length})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "out_for_delivery" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("out_for_delivery")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Out for Delivery ({outCount})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "delivered" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("delivered")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Delivered Today ({deliveredCount})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "delayed" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("delayed")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Delayed ({delayedCount})
          </Button>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver or route area..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={getSelectValue()} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-52 rounded-full text-xs font-bold bg-slate-50 border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl font-medium text-xs">
              <SelectItem value="all">All Dispatches ({deliveries.length})</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery ({outCount})</SelectItem>
              <SelectItem value="delivered">Delivered Today ({deliveredCount})</SelectItem>
              <SelectItem value="delayed">Delayed Deliveries ({delayedCount})</SelectItem>
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

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading delivery dispatches...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Truck className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">
              {statusFilter !== "all"
                ? `No deliveries matching "${statusFilter.replace(/_/g, " ")}"`
                : "No active delivery assignments"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {statusFilter !== "all"
                ? "Try clearing the status filter or searching for another route or driver."
                : "Real delivery truck assignments will render here."}
            </p>
            {statusFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusFilterChange("all")}
                className="rounded-full text-xs font-bold mt-2"
              >
                Show All Deliveries
              </Button>
            )}
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
                  <TableCell className="font-bold text-xs text-foreground">
                    {d.driver_name}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    {d.vehicle_identifier || "Truck"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.route_area}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        d.status === "Delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : d.status === "Delayed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : d.status === "Out for Delivery"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
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
