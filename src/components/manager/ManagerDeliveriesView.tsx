import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Truck,
  Search,
  Filter,
  X,
  UserCheck,
  Loader2,
  RotateCcw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  getDeliveryAgents,
  assignDeliveryAgentToDelivery,
} from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import {
  parseReturnMetadata,
  approveAndScheduleReturnRequest,
  rejectReturnRequest,
  getAllReturnRequests,
} from "@/lib/cylinder-returns-service";

export function ManagerDeliveriesView() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const routerLocation = routerState.location;

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState("all");

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeliveryToAssign, setSelectedDeliveryToAssign] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Return Schedule / Review Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedReturnToReview, setSelectedReturnToReview] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState("Morning (08:00 - 12:00)");
  const [scheduleAgentId, setScheduleAgentId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Read URL query params
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const paramStatus = (routerLocation.search as any)?.status || params.get("status") || "all";
    setStatusFilter(paramStatus);
  }, [routerLocation]);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const [{ data, error }, agentsData, returnsData] = await Promise.all([
        supabase
          .from("delivery_assignments")
          .select("*, orders(*)")
          .order("created_at", { ascending: false }),
        getDeliveryAgents(),
        getAllReturnRequests(),
      ]);

      if (error) throw error;

      const mergedMap = new Map<string, any>();
      (data || []).forEach((d) => mergedMap.set(d.id, d));
      (returnsData || []).forEach((r) => mergedMap.set(r.id, r));

      setDeliveries(Array.from(mergedMap.values()));
      setAgents(agentsData || []);
    } catch (err: any) {
      toast.error("Failed to load manager deliveries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();

    const channelName = `manager_deliveries_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadDeliveries(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssignAgent = async () => {
    if (!selectedDeliveryToAssign || !selectedAgentId) {
      toast.error("Please select a delivery agent.");
      return;
    }

    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;

    setAssigning(true);
    try {
      const isReturn =
        selectedDeliveryToAssign.route_area === "Cylinder Return Pickup" ||
        (selectedDeliveryToAssign.notes &&
          selectedDeliveryToAssign.notes.includes('"type":"cylinder_return"'));

      if (isReturn) {
        await approveAndScheduleReturnRequest({
          returnAssignmentId: selectedDeliveryToAssign.id,
          agentId: agent.id,
          agentName: agent.full_name,
          vehiclePlate: agent.vehicle_plate,
        });
      } else {
        await assignDeliveryAgentToDelivery({
          assignmentId: selectedDeliveryToAssign.id,
          orderId: selectedDeliveryToAssign.order_id,
          agentId: agent.id,
          agentName: agent.full_name,
          vehicleIdentifier: agent.vehicle_type || "Cylinder Delivery Van",
          vehiclePlate: agent.vehicle_plate,
          assignedBy: "Operations Manager",
        });
      }

      toast.success(
        `Assigned ${agent.full_name} to #${selectedDeliveryToAssign.orders?.order_number || selectedDeliveryToAssign.id.slice(0, 8)}`,
      );
      setAssignModalOpen(false);
      setSelectedDeliveryToAssign(null);
      await loadDeliveries();
    } catch (err: any) {
      toast.error("Failed to assign agent: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleApproveAndSchedule = async () => {
    if (!selectedReturnToReview) return;
    setApproving(true);
    try {
      const selectedAgent = agents.find((a) => a.id === scheduleAgentId);
      await approveAndScheduleReturnRequest({
        returnAssignmentId: selectedReturnToReview.id,
        scheduledDate: scheduleDate || new Date().toISOString().split("T")[0],
        timeSlot: scheduleTimeSlot,
        agentId: selectedAgent?.id,
        agentName: selectedAgent?.full_name,
        vehiclePlate: selectedAgent?.vehicle_plate,
      });

      toast.success("Cylinder return scheduled and assigned successfully!");
      setScheduleModalOpen(false);
      setSelectedReturnToReview(null);
      await loadDeliveries();
    } catch (err: any) {
      toast.error("Failed to schedule return: " + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectReturn = async () => {
    if (!selectedReturnToReview || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting the return request.");
      return;
    }
    setRejecting(true);
    try {
      await rejectReturnRequest({
        returnAssignmentId: selectedReturnToReview.id,
        reason: rejectionReason.trim(),
      });

      toast.success("Return request rejected with explanation.");
      setScheduleModalOpen(false);
      setSelectedReturnToReview(null);
      setRejectionReason("");
      await loadDeliveries();
    } catch (err: any) {
      toast.error("Failed to reject return: " + err.message);
    } finally {
      setRejecting(false);
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
    const meta = parseReturnMetadata(d);
    const isReturn =
      d.route_area === "Cylinder Return Pickup" ||
      (d.notes && d.notes.includes('"type":"cylinder_return"')) ||
      meta !== null;

    const matchesSearch =
      (d.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.route_area || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.vehicle_identifier || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta?.return_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta?.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta?.cylinder_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.orders?.order_number || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;

    if (statusFilter === "returns") {
      return isReturn;
    }

    const s = (d.status || "").toLowerCase();
    const filterKey = statusFilter.toLowerCase().replace(/_/g, " ");

    if (filterKey === "out for delivery") {
      return s === "out for delivery" && !isReturn;
    }
    if (filterKey === "delivered" || filterKey === "delivered today") {
      return s === "delivered" && !isReturn;
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
    (d) =>
      (d.status || "").toLowerCase() === "out for delivery" &&
      d.route_area !== "Cylinder Return Pickup",
  ).length;
  const deliveredCount = deliveries.filter(
    (d) =>
      (d.status || "").toLowerCase() === "delivered" && d.route_area !== "Cylinder Return Pickup",
  ).length;
  const returnsCount = deliveries.filter(
    (d) =>
      d.route_area === "Cylinder Return Pickup" ||
      (d.notes && d.notes.includes('"type":"cylinder_return"')),
  ).length;
  const delayedCount = deliveries.filter(
    (d) => (d.status || "").toLowerCase() === "delayed",
  ).length;

  const getSelectValue = () => {
    const s = statusFilter.toLowerCase().replace(/_/g, " ");
    if (s === "returns") return "returns";
    if (s === "out for delivery") return "out_for_delivery";
    if (s === "delivered" || s === "delivered today") return "delivered";
    if (s === "delayed") return "delayed";
    if (s === "pending") return "pending";
    return "all";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/manager" className="hover:text-red-600 transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Deliveries & Returns</span>
            {statusFilter !== "all" && (
              <>
                <span>/</span>
                <span className="text-red-600 font-bold capitalize">
                  {statusFilter.replace(/_/g, " ")}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Truck Logistics & Cylinder Returns ({filtered.length}
            {statusFilter !== "all" ? ` of ${deliveries.length}` : ""})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Dispatch routes, assign drivers, and manage customer cylinder return verification.
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
            All ({deliveries.length})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "returns" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("returns")}
            className={`rounded-full text-xs h-8.5 font-bold flex items-center gap-1 transition-all ${
              getSelectValue() === "returns"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            Cylinder Returns ({returnsCount})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "out_for_delivery" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("out_for_delivery")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              getSelectValue() === "out_for_delivery"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            Out for Delivery ({outCount})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "delivered" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("delivered")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              getSelectValue() === "delivered"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            Delivered ({deliveredCount})
          </Button>
          <Button
            size="sm"
            variant={getSelectValue() === "delayed" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("delayed")}
            className={`rounded-full text-xs h-8.5 font-bold transition-all ${
              getSelectValue() === "delayed"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black"
                : "border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs"
            }`}
          >
            Delayed ({delayedCount})
          </Button>
        </div>
      </div>

      <div className="surface-card p-4 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, return code, customer, order #..."
            className="pl-9.5 h-9 rounded-full bg-white/90 border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={getSelectValue()} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-52 h-9 rounded-full text-xs font-bold bg-white/90 border-slate-200/80 text-slate-700 shadow-2xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 font-medium text-xs">
              <SelectItem value="all">All Dispatches ({deliveries.length})</SelectItem>
              <SelectItem value="returns">Cylinder Returns ({returnsCount})</SelectItem>
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
              className="rounded-full text-xs h-9 px-3 text-slate-500 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-bold">
            Loading logistics and return records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="font-black text-sm text-slate-900">
              {statusFilter !== "all"
                ? `No records matching "${statusFilter.replace(/_/g, " ")}"`
                : "No active delivery assignments"}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              {statusFilter !== "all"
                ? "Try clearing the status filter or searching for another route or driver."
                : "Real delivery truck and cylinder return records will render here."}
            </p>
            {statusFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusFilterChange("all")}
                className="rounded-full text-xs font-bold mt-2 border-slate-200"
              >
                Show All Records
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-slate-100">
                <TableRow>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Type / Reference</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Driver & Vehicle</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Route / Details</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 text-right">Quick Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const meta = parseReturnMetadata(d);
                  const isReturn =
                    d.route_area === "Cylinder Return Pickup" ||
                    (d.notes && d.notes.includes('"type":"cylinder_return"')) ||
                    meta !== null;

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-bold text-xs text-slate-900">
                        {isReturn ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 font-black text-[10px] shadow-2xs">
                              <RotateCcw className="h-2.5 w-2.5 mr-1" /> Return Pickup
                            </span>
                            <p className="font-mono text-[11px] font-black text-slate-900">
                              {meta?.return_code || d.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Order #{d.orders?.order_number || meta?.order_number || "ORDER"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 font-black text-[10px]">
                              Delivery
                            </span>
                            <p className="font-mono text-[11px] font-black text-slate-900">
                              #{d.orders?.order_number || d.id.slice(0, 8)}
                            </p>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <p className="font-black text-slate-900">
                          {d.driver_name && !d.driver_name.includes("Unassigned")
                            ? d.driver_name
                            : "Unassigned"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {d.vehicle_identifier || "Cylinder Van"}{" "}
                          {d.vehicle_plate ? `(${d.vehicle_plate})` : ""}
                        </p>
                      </TableCell>

                      <TableCell className="text-xs">
                        {isReturn ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 flex items-center gap-1">
                              <Flame className="h-3 w-3 text-red-600 shrink-0" />
                              {meta?.quantity || 1}x {meta?.cylinder_name || "LPG Cylinder"}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {meta?.customer_name || d.orders?.customer_name || "Customer"} &bull;{" "}
                              {meta?.reason || "Empty Return"}
                            </p>
                            {meta?.scheduled_date && (
                              <p className="text-[10px] text-sky-700 font-bold">
                                Pickup: {meta.scheduled_date} ({meta.time_slot || "Morning"})
                              </p>
                            )}
                            {meta?.condition && (
                              <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Verified: {meta.condition}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-slate-800 font-bold">{d.route_area}</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {d.time_slot || "Standard Slot"}
                            </p>
                            {(() => {
                              const req = getOrderCylinderExchangeRequirement(d);
                              return req.required ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-black text-[9px] shadow-2xs">
                                  Empty Required: Yes ({req.expectedQuantity})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-black text-[9px] shadow-2xs">
                                  Empty Required: No
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-2xs ${
                            d.status === "Delivered" ||
                            d.status === "Completed" ||
                            d.status === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : d.status === "Delayed" ||
                                  d.status === "Rejected" ||
                                  d.status === "Issue Reported"
                                ? "bg-rose-50 text-rose-700 border-rose-200/80"
                                : d.status === "Out for Delivery" || d.status === "Out for Pickup"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                                  : d.status === "Requested"
                                    ? "bg-amber-50 text-amber-700 border-amber-200/80"
                                    : "bg-blue-50 text-blue-700 border-blue-200/80"
                          }`}
                        >
                          {d.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {isReturn &&
                        (d.status === "Requested" ||
                          d.status === "Under Review" ||
                          d.status === "Approved") ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedReturnToReview(d);
                                setScheduleDate(
                                  meta?.scheduled_date || new Date().toISOString().split("T")[0],
                                );
                                setScheduleTimeSlot(meta?.time_slot || "Morning (08:00 - 12:00)");
                                setScheduleAgentId(d.agent_id || agents[0]?.id || "");
                                setScheduleModalOpen(true);
                              }}
                              className="h-8 text-[11px] font-black rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white gap-1 shadow-md shadow-red-600/20 cursor-pointer"
                            >
                              <Calendar className="h-3 w-3" /> Review & Assign
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDeliveryToAssign(d);
                              setSelectedAgentId(d.agent_id || agents[0]?.id || "");
                              setAssignModalOpen(true);
                            }}
                            className="h-8 text-[11px] font-bold rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                            {d.agent_id ? "Reassign" : "Assign Agent"}
                          </Button>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Select
                          value={d.status}
                          onValueChange={(val) => handleUpdateStatus(d.id, val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] font-bold rounded-xl bg-white border-slate-200/80 w-[140px] ml-auto shadow-2xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80">
                            {isReturn ? (
                              <>
                                <SelectItem value="Requested">Requested</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Pickup Scheduled">Pickup Scheduled</SelectItem>
                                <SelectItem value="Agent Assigned">Agent Assigned</SelectItem>
                                <SelectItem value="Out for Pickup">Out for Pickup</SelectItem>
                                <SelectItem value="Picked Up">Picked Up</SelectItem>
                                <SelectItem value="Verified">Verified</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Issue Reported">Issue Reported</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Assigned">Assigned</SelectItem>
                                <SelectItem value="Accepted">Accepted</SelectItem>
                                <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                                <SelectItem value="Delayed">Delayed</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ASSIGN DELIVERY AGENT MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-2xl border border-white/80 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl text-slate-900">
              Assign Delivery Agent
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium pt-1">
              Select an active delivery agent for #
              {selectedDeliveryToAssign?.orders?.order_number ||
                selectedDeliveryToAssign?.id?.slice(0, 8)}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            {selectedDeliveryToAssign && (() => {
              const req = getOrderCylinderExchangeRequirement(selectedDeliveryToAssign);
              return (
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      CYLINDER EXCHANGE
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border shadow-2xs",
                        req.required
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border-emerald-300",
                      )}
                    >
                      Empty Cylinder Required: {req.required ? "Yes" : "No"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">{req.reason}</p>
                </div>
              );
            })()}

            <div>
              <label className="font-bold text-slate-800 block mb-1">Select Delivery Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-xl bg-white border border-slate-200 p-2.5 text-xs font-bold text-slate-800 shadow-2xs"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.full_name} ({ag.agent_code || "DA"}) &bull; {ag.vehicle_plate || "Van"}
                  </option>
                ))}
              </select>
            </div>

            {selectedAgentId && (
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-[11px] space-y-1">
                {(() => {
                  const ag = agents.find((a) => a.id === selectedAgentId);
                  if (!ag) return null;
                  return (
                    <>
                      <p className="font-black text-slate-900">{ag.full_name}</p>
                      <p className="text-slate-500 font-medium">
                        Vehicle: {ag.vehicle_type} ({ag.vehicle_plate})
                      </p>
                      <p className="text-slate-500 font-medium">
                        Rating: {ag.rating || 5.0}★ · {ag.completed_deliveries || 0} completed
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              className="rounded-full text-xs font-bold border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              disabled={assigning}
              onClick={handleAssignAgent}
              className="rounded-full text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              {assigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE & REVIEW RETURN REQUEST MODAL */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-2xl border border-white/80 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 font-black text-[10px]">
                <RotateCcw className="h-3 w-3 mr-1" /> Cylinder Return
              </span>
              <span className="font-mono text-xs font-black text-slate-900">
                #
                {selectedReturnToReview?.metadata?.return_code ||
                  selectedReturnToReview?.id?.slice(0, 8)}
              </span>
            </div>
            <DialogTitle className="font-display font-black text-xl text-slate-900 pt-1">
              Review & Assign Cylinder Pickup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Schedule pickup date, time window, and assign an active delivery agent.
            </DialogDescription>
          </DialogHeader>

          {selectedReturnToReview && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Return info box */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-black text-slate-900">
                    {selectedReturnToReview.metadata?.customer_name ||
                      selectedReturnToReview.orders?.customer_name ||
                      "Customer"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Cylinder:</span>
                  <span className="font-black text-slate-900">
                    {selectedReturnToReview.metadata?.quantity || 1}x{" "}
                    {selectedReturnToReview.metadata?.cylinder_name || "LPG Cylinder"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Reason:</span>
                  <span className="font-bold text-slate-800">
                    {selectedReturnToReview.metadata?.reason || "Empty Cylinder Return"}
                  </span>
                </div>
              </div>

              {/* Schedule Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Scheduled Pickup Date</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-xl bg-white text-xs h-9 border-slate-200/80 shadow-2xs"
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Pickup Time Slot</label>
                <select
                  value={scheduleTimeSlot}
                  onChange={(e) => setScheduleTimeSlot(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-slate-800 h-9 shadow-2xs"
                >
                  <option value="Morning (08:00 - 12:00)">Morning Window (08:00 - 12:00)</option>
                  <option value="Afternoon (12:00 - 16:00)">
                    Afternoon Window (12:00 - 16:00)
                  </option>
                  <option value="Late Afternoon (16:00 - 19:00)">
                    Late Afternoon (16:00 - 19:00)
                  </option>
                  <option value="All Day Flexible">All Day Flexible</option>
                </select>
              </div>

              {/* Assign Agent */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Assign Active Delivery Agent
                </label>
                <select
                  value={scheduleAgentId}
                  onChange={(e) => setScheduleAgentId(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-slate-800 h-9 shadow-2xs"
                >
                  <option value="">-- Select Delivery Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name} ({ag.agent_code || "DA"}) &bull; {ag.vehicle_plate || "Van"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rejection input */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="font-bold text-rose-700 block text-[11px]">
                  Reject Request (Optional)
                </label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason if rejecting request (e.g. invalid order)..."
                  className="rounded-xl bg-white border-rose-200 text-xs h-8 shadow-2xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-3 flex items-center justify-between gap-2">
            {rejectionReason.trim() ? (
              <Button
                variant="outline"
                disabled={rejecting}
                onClick={handleRejectReturn}
                className="rounded-full text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm Rejection
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setScheduleModalOpen(false)}
                className="rounded-full text-xs font-bold border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
            )}

            <Button
              disabled={approving || !scheduleAgentId}
              onClick={handleApproveAndSchedule}
              className="rounded-full text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              Approve & Assign Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
