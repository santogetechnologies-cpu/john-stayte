import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Search,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Calendar,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Filter,
  ArrowRight,
  RefreshCw,
  Phone,
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
  DialogDescription,
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
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { gbp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ManagerDeliveryAssignmentView() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [agents, setAgents] = useState<DeliveryAgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unassigned" | "assigned" | "gas">(() => {
    if (typeof window !== "undefined") {
      const urlParam = new URLSearchParams(window.location.search).get("filter");
      if (urlParam === "unassigned" || urlParam === "assigned" || urlParam === "gas") {
        return urlParam;
      }
    }
    return "all";
  });

  // Assignment / Reassignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [confirmReassignOpen, setConfirmReassignOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: delData, error: delErr }, agentsData] = await Promise.all([
        supabase
          .from("delivery_assignments")
          .select("*, orders(*, order_items(*))")
          .order("created_at", { ascending: false }),
        getDeliveryAgents(),
      ]);

      if (delErr) throw delErr;
      setDeliveries(delData || []);
      setAgents(agentsData || []);
    } catch (err: any) {
      toast.error("Failed to load delivery assignment data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("manager_delivery_assignment_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Filter only active delivery agents for selection
  const activeAgents = useMemo(() => {
    return agents.filter((a) => a.status === "Active" || a.status === "On Delivery");
  }, [agents]);

  // Compute live counts
  const counts = useMemo(() => {
    let unassigned = 0;
    let assigned = 0;
    let gas = 0;

    deliveries.forEach((d) => {
      const driver = (d.driver_name || "").toLowerCase().trim();
      const isUnass =
        !driver ||
        driver === "unassigned" ||
        driver.includes("unassigned") ||
        (!d.agent_id && !d.driver_id && driver.includes("logistics team"));

      if (isUnass) unassigned++;
      else assigned++;

      const req = getOrderCylinderExchangeRequirement(d);
      if (req.orderType !== "NON_GAS") gas++;
    });

    return {
      all: deliveries.length,
      unassigned,
      assigned,
      gas,
    };
  }, [deliveries]);

  // Filtered deliveries list
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const o = d.orders || {};
      const driver = (d.driver_name || "").toLowerCase().trim();
      const isUnass =
        !driver ||
        driver === "unassigned" ||
        driver.includes("unassigned") ||
        (!d.agent_id && !d.driver_id && driver.includes("logistics team"));

      // Tab filter
      if (filterType === "unassigned" && !isUnass) return false;
      if (filterType === "assigned" && isUnass) return false;
      if (filterType === "gas") {
        const req = getOrderCylinderExchangeRequirement(d);
        if (req.orderType === "NON_GAS") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderNum = (o.order_number || d.id || "").toLowerCase();
        const custName = (o.customer_name || d.customer_name || "").toLowerCase();
        const addr = (
          typeof o.delivery_address === "string"
            ? o.delivery_address
            : `${o.delivery_address?.street || ""} ${o.delivery_address?.city || ""} ${o.delivery_address?.postcode || ""}`
        ).toLowerCase();
        const driverName = (d.driver_name || "").toLowerCase();

        return (
          orderNum.includes(q) || custName.includes(q) || addr.includes(q) || driverName.includes(q)
        );
      }

      return true;
    });
  }, [deliveries, filterType, searchQuery]);

  const handleOpenAssignModal = (delivery: any) => {
    setSelectedDelivery(delivery);
    // Pre-select current agent or first available active agent
    const currentAgentId = delivery.agent_id || delivery.driver_id;
    if (currentAgentId && activeAgents.some((a) => a.id === currentAgentId)) {
      setSelectedAgentId(currentAgentId);
    } else {
      setSelectedAgentId(activeAgents[0]?.id || "");
    }
    setAssignModalOpen(true);
  };

  const handleInitiateAssignment = () => {
    if (!selectedDelivery || !selectedAgentId) {
      toast.error("Please select an active delivery agent.");
      return;
    }

    const currentDriver = (selectedDelivery.driver_name || "").toLowerCase().trim();
    const isAlreadyAssigned =
      currentDriver &&
      currentDriver !== "unassigned" &&
      !currentDriver.includes("unassigned") &&
      (selectedDelivery.agent_id || selectedDelivery.driver_id);

    // If already assigned and changing to another agent, confirm reassignment
    if (isAlreadyAssigned && (selectedDelivery.agent_id || selectedDelivery.driver_id) !== selectedAgentId) {
      setConfirmReassignOpen(true);
    } else {
      executeAssignment();
    }
  };

  const executeAssignment = async () => {
    const agent = activeAgents.find((a) => a.id === selectedAgentId);
    if (!agent || !selectedDelivery) return;

    setAssigning(true);
    try {
      await assignDeliveryAgentToDelivery({
        assignmentId: selectedDelivery.id,
        orderId: selectedDelivery.order_id,
        agentId: agent.id,
        agentName: agent.full_name,
        vehicleIdentifier: agent.vehicle_type || "Cylinder Delivery Van",
        vehiclePlate: agent.vehicle_plate,
        routeArea: selectedDelivery.route_area || agent.delivery_zone || "Gloucestershire Central",
        timeSlot: selectedDelivery.time_slot || "Morning Window (08:00 - 12:00)",
        assignedBy: "Operations Manager",
      });

      toast.success(
        `Assigned ${agent.full_name} to #${selectedDelivery.orders?.order_number || selectedDelivery.id.slice(0, 8)}`,
      );
      setConfirmReassignOpen(false);
      setAssignModalOpen(false);
      setSelectedDelivery(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to assign delivery agent: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground">Orders & Dispatch</span>
            <span>/</span>
            <span className="text-foreground font-bold">Delivery Assignment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-primary" /> Delivery Agent Dispatch & Assignment
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Assign and reassign customer cylinder orders to active fleet delivery drivers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-primary" : "")} />
            <span>Sync Live Dispatches</span>
          </Button>
          <Button
            asChild
            size="sm"
            variant="default"
            className="rounded-full text-xs font-bold gap-1.5 shadow-md bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Link to="/manager/deliveries">
              <Truck className="h-3.5 w-3.5" /> All Deliveries Grid
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Operational Filter Tabs & Search Bar */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Orders", count: counts.all },
              {
                id: "unassigned",
                label: "Unassigned Orders",
                count: counts.unassigned,
                highlight: counts.unassigned > 0,
              },
              { id: "assigned", label: "Assigned Dispatches", count: counts.assigned },
              { id: "gas", label: "LPG Cylinder Orders", count: counts.gas },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                  filterType === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    filterType === tab.id
                      ? "bg-white/20 text-white"
                      : tab.highlight
                        ? "bg-red-500 text-white font-black"
                        : "bg-slate-200 text-slate-700",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, postcode, driver..."
              className="pl-8.5 rounded-full bg-slate-50 border-slate-200 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* 3. Dispatches Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-bold">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
            Loading delivery assignment matrix...
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Truck className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No dispatches matching filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              All active customer delivery assignments will be shown here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs">Order & Customer</TableHead>
                  <TableHead className="font-bold text-xs">Delivery Address</TableHead>
                  <TableHead className="font-bold text-xs">Cylinder Requirement</TableHead>
                  <TableHead className="font-bold text-xs">Slot & Schedule</TableHead>
                  <TableHead className="font-bold text-xs">Assigned Driver</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Dispatch Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((d) => {
                  const o = d.orders || {};
                  const driverName = d.driver_name || "";
                  const isUnassigned =
                    !driverName ||
                    driverName === "Unassigned" ||
                    driverName.includes("Unassigned") ||
                    (!d.agent_id && !d.driver_id && driverName.includes("Logistics Team"));

                  const req = getOrderCylinderExchangeRequirement(d);

                  let addressText = "Gloucestershire";
                  if (o.delivery_address) {
                    if (typeof o.delivery_address === "string") addressText = o.delivery_address;
                    else {
                      const a = o.delivery_address;
                      addressText = [a.line1 || a.street, a.city, a.postcode || a.postal_code]
                        .filter(Boolean)
                        .join(", ");
                    }
                  } else if (d.address) {
                    addressText = d.address;
                  }

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/60">
                      {/* Order & Customer */}
                      <TableCell className="text-xs">
                        <p className="font-mono font-black text-primary">
                          #{o.order_number || d.order_ref || d.id.slice(0, 8)}
                        </p>
                        <p className="font-extrabold text-slate-900 mt-0.5">
                          {o.customer_name || d.customer_name || "Customer"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Total: {gbp(Number(o.total || 0))} &bull;{" "}
                          {new Date(d.created_at || o.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </TableCell>

                      {/* Address */}
                      <TableCell className="text-xs max-w-xs">
                        <p className="text-slate-700 font-medium flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{addressText}</span>
                        </p>
                      </TableCell>

                      {/* Cylinder Requirement */}
                      <TableCell className="text-xs">
                        {req.required ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[10px]">
                              Empty Required: Yes ({req.expectedQuantity})
                            </Badge>
                            <p className="text-[10px] text-slate-500 font-medium">Refill Exchange</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-[10px]">
                              Empty Required: No
                            </Badge>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {req.orderType === "NEW_CYLINDER" ? "New Cylinder Purchase" : "Standard Goods"}
                            </p>
                          </div>
                        )}
                      </TableCell>

                      {/* Schedule & Slot */}
                      <TableCell className="text-xs">
                        <p className="font-semibold text-slate-800">
                          {d.time_slot || "Morning Window (08:00 - 12:00)"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.route_area || "Gloucestershire Central"}
                        </p>
                      </TableCell>

                      {/* Assigned Driver */}
                      <TableCell className="text-xs">
                        {isUnassigned ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[10px] flex items-center gap-1 w-fit">
                            <UserX className="h-3 w-3" /> Unassigned
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-900 flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              {driverName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {d.vehicle_identifier || "Delivery Van"}{" "}
                              {d.vehicle_plate ? `(${d.vehicle_plate})` : ""}
                            </p>
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-extrabold text-[10px] uppercase rounded-full px-2.5 py-0.5",
                            d.status === "Delivered"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : d.status === "Exception"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : d.status === "Out for Delivery"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : isUnassigned
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200",
                          )}
                        >
                          {d.status || "Pending"}
                        </Badge>
                      </TableCell>

                      {/* Dispatch Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAssignModal(d)}
                          className={cn(
                            "rounded-full text-xs font-extrabold h-8 px-3.5 shadow-xs cursor-pointer gap-1.5",
                            isUnassigned
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200",
                          )}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {isUnassigned ? "Assign Agent" : "Reassign"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 4. ASSIGN / REASSIGN MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              {selectedDelivery?.driver_name &&
              selectedDelivery?.driver_name !== "Unassigned" &&
              !selectedDelivery?.driver_name.includes("Unassigned")
                ? "Reassign Delivery Agent"
                : "Assign Delivery Agent"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Select an active fleet delivery agent to dispatch order #
              {selectedDelivery?.orders?.order_number || selectedDelivery?.id?.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Order Details Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">
                    #{selectedDelivery.orders?.order_number || selectedDelivery.id.slice(0, 8)}
                  </span>
                  <Badge className="bg-slate-200 text-slate-800 font-bold text-[10px]">
                    Current Status: {selectedDelivery.status || "Pending"}
                  </Badge>
                </div>

                <div className="space-y-0.5">
                  <p className="font-extrabold text-slate-900">
                    {selectedDelivery.orders?.customer_name || selectedDelivery.customer_name}
                  </p>
                  <p className="text-[11px] text-slate-600 flex items-start gap-1">
                    <MapPin className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      {typeof selectedDelivery.orders?.delivery_address === "string"
                        ? selectedDelivery.orders.delivery_address
                        : selectedDelivery.address || "Gloucestershire address on file"}
                    </span>
                  </p>
                </div>

                {/* Cylinder Exchange Info */}
                {(() => {
                  const req = getOrderCylinderExchangeRequirement(selectedDelivery);
                  return (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Cylinder Exchange:</span>
                      {req.required ? (
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                          Required ({req.expectedQuantity} Bottle{req.expectedQuantity > 1 ? "s" : ""})
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                          Not Required (New Purchase)
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Active Delivery Agents Selection List */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">
                  Select Active Delivery Agent ({activeAgents.length} Available)
                </label>

                {activeAgents.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
                    No active delivery agents found in system. Please activate an agent account.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeAgents.map((agent) => {
                      const isSelected = selectedAgentId === agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            isSelected
                              ? "bg-red-50/70 border-primary ring-1 ring-primary"
                              : "bg-white border-slate-200/90 hover:bg-slate-50",
                          )}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-xs text-slate-900">{agent.full_name}</p>
                              <Badge className="text-[9px] font-bold bg-slate-100 text-slate-700">
                                {agent.agent_code}
                              </Badge>
                              <Badge
                                className={cn(
                                  "text-[9px] font-bold",
                                  agent.status === "Active"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200",
                                )}
                              >
                                {agent.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Vehicle: {agent.vehicle_type} ({agent.vehicle_plate}) &bull; Zone:{" "}
                              {agent.delivery_zone}
                            </p>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            <p className="text-xs font-black text-slate-800">
                              {agent.active_deliveries || 0} active
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              {agent.completed_deliveries || 0} completed today
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignModalOpen(false)}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateAssignment}
                  disabled={assigning || !selectedAgentId || activeAgents.length === 0}
                  className="rounded-full font-bold text-xs gap-1.5 shadow-md bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  {selectedDelivery?.driver_name &&
                  selectedDelivery?.driver_name !== "Unassigned" &&
                  !selectedDelivery?.driver_name.includes("Unassigned")
                    ? "Confirm Reassignment"
                    : "Assign Delivery"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. CONFIRM REASSIGNMENT CONFIRMATION DIALOG */}
      <Dialog open={confirmReassignOpen} onOpenChange={setConfirmReassignOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Reassign Delivery Agent?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 font-medium pt-1">
              Are you sure you want to reassign order #
              {selectedDelivery?.orders?.order_number || selectedDelivery?.id?.slice(0, 8)} to{" "}
              <strong>
                {activeAgents.find((a) => a.id === selectedAgentId)?.full_name || "selected agent"}
              </strong>
              ? The newly assigned driver will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmReassignOpen(false)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={executeAssignment}
              disabled={assigning}
              className="rounded-full font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
