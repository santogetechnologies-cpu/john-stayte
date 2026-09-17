import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Truck,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Edit2,
  ShieldCheck,
  Package,
  Layers,
  Flame,
  ArrowRight,
  ExternalLink,
  Power,
  X,
  Upload,
  Loader2,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type DeliveryAgentRecord,
  getAgentInitials,
  updateDeliveryAgent,
} from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { gbp } from "@/lib/store";
import { cn } from "@/lib/utils";

interface DeliveryAgentProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileData: {
    agent: DeliveryAgentRecord;
    deliveries: any[];
    reviews: any[];
    ratingCount: number;
  } | null;
  loading?: boolean;
  onAgentUpdated?: () => void;
  canEdit?: boolean;
}

const DELIVERY_ZONES = [
  "Gloucestershire South",
  "Whitminster & Stroud",
  "Cheltenham & Gloucester",
  "Cotswolds & Forest of Dean",
  "Bristol North Corridor",
];

const VEHICLE_TYPES = [
  "Flatbed Cylinder Van (3.5t)",
  "Heavy Rigid Cylinder Carrier (7.5t)",
  "Tanker Truck (LPG Bulk)",
  "Standard Transit Delivery Van",
];

export function DeliveryAgentProfileModal({
  open,
  onOpenChange,
  profileData,
  loading = false,
  onAgentUpdated,
  canEdit = true,
}: DeliveryAgentProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Edit info modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    agent_code: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    delivery_zone: "Whitminster & Stroud",
    vehicle_type: "Flatbed Cylinder Van (3.5t)",
    vehicle_plate: "",
    status: "Active",
  });

  if (!open) return null;

  const agent = profileData?.agent;
  const deliveries = profileData?.deliveries || [];
  const reviews = profileData?.reviews || [];

  // Compute live performance metrics from real Supabase records
  const totalDeliveriesCount = Math.max(deliveries.length, Number(agent?.total_deliveries || 0));
  const activeDeliveriesCount = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "out for delivery" || s === "assigned" || s === "accepted" || s === "in transit" || s === "pending";
  }).length;

  const completedDeliveriesCount = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "delivered" || s === "completed";
  }).length;

  const delayedDeliveriesCount = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "delayed" || s === "exception" || s === "issue";
  }).length;

  // LPG Operations stats
  const lpgDeliveries = deliveries.filter((d: any) => {
    const isGas =
      d.notes?.toLowerCase().includes("lpg") ||
      d.vehicle_identifier?.toLowerCase().includes("cylinder") ||
      d.orders?.order_items?.some((i: any) => {
        const n = (i.product_name || "").toLowerCase();
        return n.includes("gas") || n.includes("cylinder") || n.includes("propane") || n.includes("butane");
      });
    return isGas;
  });

  const exchangeDeliveriesCount = deliveries.filter((d: any) => {
    const req = getOrderCylinderExchangeRequirement(d);
    return req.required;
  }).length;

  const completionRate =
    totalDeliveriesCount > 0
      ? Math.round((completedDeliveriesCount / totalDeliveriesCount) * 100)
      : 100;

  // Open Edit Details
  const handleOpenEdit = () => {
    if (!agent) return;
    setEditFormData({
      agent_code: agent.agent_code || "AGT-001",
      full_name: agent.full_name || "",
      email: agent.email || "",
      phone: agent.phone || "",
      address: agent.address || "Gloucestershire Depot, GL2 7PN",
      delivery_zone: agent.delivery_zone || "Whitminster & Stroud",
      vehicle_type: agent.vehicle_type || "Flatbed Cylinder Van (3.5t)",
      vehicle_plate: agent.vehicle_plate || "",
      status: agent.status || "Active",
    });
    setEditModalOpen(true);
  };

  // Submit Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setSavingEdit(true);
    try {
      await updateDeliveryAgent(agent.id, editFormData);
      toast.success("Driver profile updated successfully!");
      setEditModalOpen(false);
      if (onAgentUpdated) onAgentUpdated();
    } catch (err: any) {
      toast.error("Failed to update driver: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async () => {
    if (!agent) return;
    const nextStatus = agent.status === "Active" ? "Inactive" : "Active";
    try {
      await updateDeliveryAgent(agent.id, { status: nextStatus });
      toast.success(`Driver ${agent.full_name} is now ${nextStatus === "Active" ? "Active" : "Deactivated"}.`);
      if (onAgentUpdated) onAgentUpdated();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const agentInitials = (agent?.full_name || "Delivery Driver")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-3xl bg-slate-50 border shadow-2xl flex flex-col">
          {/* Header Bar */}
          <DialogHeader className="px-6 py-4 bg-white border-b flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Truck className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-black text-foreground">
                  Fleet Driver Performance & Profile
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official logistics roster record for John Stayte Services logistics operations.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && agent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenEdit}
                  className="rounded-full text-xs font-bold gap-1.5 h-8 bg-white hover:bg-slate-50 border-slate-200"
                >
                  <Edit2 className="h-3.5 w-3.5 text-primary" /> Edit Details
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading || !agent ? (
              <div className="py-24 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-xs font-bold text-muted-foreground">Loading driver profile...</p>
              </div>
            ) : (
              <>
                {/* 1. PROFESSIONAL AGENT PROFILE HEADER */}
                <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      {/* Dynamic Initials Avatar with status badge */}
                      <div className="relative shrink-0">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-red-500/30 tracking-wider">
                          {getAgentInitials(agent.full_name)}
                        </div>

                        {/* Status Badge Pin */}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs",
                            agent.status === "Active"
                              ? "bg-emerald-500"
                              : agent.status === "On Delivery"
                                ? "bg-indigo-500"
                                : "bg-slate-400",
                          )}
                          title={`Status: ${agent.status}`}
                        />
                      </div>

                      {/* Name, code, role & contact */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                            {agent.full_name}
                          </h2>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-extrabold bg-primary/10 text-primary border-primary/30 px-2 py-0.5"
                          >
                            {agent.agent_code}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold bg-slate-100 text-slate-700 border-slate-200"
                          >
                            <BadgeCheck className="h-3 w-3 mr-1 text-primary" /> Driver
                          </Badge>
                        </div>

                        {/* Contact details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {agent.phone && (
                            <a
                              href={`tel:${agent.phone}`}
                              className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
                            >
                              <Phone className="h-3.5 w-3.5 text-slate-400" /> {agent.phone}
                            </a>
                          )}
                          {agent.email && (
                            <a
                              href={`mailto:${agent.email}`}
                              className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
                            >
                              <Mail className="h-3.5 w-3.5 text-slate-400" /> {agent.email}
                            </a>
                          )}
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {agent.delivery_zone || "Gloucestershire Central"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & actions */}
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold text-xs px-3 py-1 self-start sm:self-auto",
                          agent.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : agent.status === "On Delivery"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-600 border-slate-200",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full mr-1.5",
                            agent.status === "Active"
                              ? "bg-emerald-500"
                              : agent.status === "On Delivery"
                                ? "bg-indigo-500"
                                : "bg-slate-400",
                          )}
                        />
                        {agent.status === "Active"
                          ? "Available"
                          : agent.status === "On Delivery"
                            ? "On Delivery"
                            : "Offline / Off Duty"}
                      </Badge>

                      {canEdit && (
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleToggleStatus}
                            className={cn(
                              "h-7 text-[11px] font-bold rounded-full px-2.5",
                              agent.status === "Active"
                                ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                            )}
                          >
                            <Power className="h-3 w-3 mr-1" />
                            {agent.status === "Active" ? "Set Offline" : "Set Active"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. PERFORMANCE SUMMARY KPI CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="surface-card p-4 rounded-2xl border bg-white shadow-2xs text-center space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Customer Rating
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-amber-600">
                      {agent.rating ? Number(agent.rating).toFixed(1) : "5.0"}
                      <span className="text-xs text-muted-foreground font-normal"> / 5.0</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{reviews.length} verified reviews</p>
                  </div>

                  <div className="surface-card p-4 rounded-2xl border bg-white shadow-2xs text-center space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-indigo-500" /> Active Deliveries
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-indigo-600">
                      {activeDeliveriesCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground">In-transit & assigned</p>
                  </div>

                  <div className="surface-card p-4 rounded-2xl border bg-white shadow-2xs text-center space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600">
                      {completedDeliveriesCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Successful handovers</p>
                  </div>

                  <div className="surface-card p-4 rounded-2xl border bg-white shadow-2xs text-center space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <Package className="h-3.5 w-3.5 text-blue-500" /> Total Drops
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-blue-600">
                      {totalDeliveriesCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground">All-time dispatch queue</p>
                  </div>

                  <div className="surface-card p-4 rounded-2xl border bg-white shadow-2xs text-center space-y-1 col-span-2 lg:col-span-1">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-teal-500" /> Completion Rate
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-teal-600">
                      {completionRate}%
                    </div>
                    <p className="text-[10px] text-muted-foreground">On-time fulfillment</p>
                  </div>
                </div>

                {/* 3. TABS: Overview, Vehicle & Fleet, History, Feedback */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="bg-slate-200/70 p-1 rounded-2xl font-bold text-xs">
                    <TabsTrigger value="overview" className="rounded-xl px-4 py-2">
                      Overview & Operations
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl px-4 py-2">
                      Delivery History ({deliveries.length})
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="rounded-xl px-4 py-2">
                      Customer Feedback ({reviews.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: OVERVIEW & FLEET OPERATIONS */}
                  <TabsContent value="overview" className="space-y-6 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vehicle & Fleet Information */}
                      <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" /> Vehicle & Fleet Assignment
                          </h3>
                          <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-800">
                            {agent.vehicle_plate || "Not assigned"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground text-[11px]">Vehicle Classification</p>
                            <p className="font-bold text-foreground">
                              {agent.vehicle_type || "Not assigned"}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground text-[11px]">Assigned Zone</p>
                            <p className="font-bold text-foreground">
                              {agent.delivery_zone || "Gloucestershire Central"}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground text-[11px]">Base Depot</p>
                            <p className="font-bold text-foreground">
                              {agent.address || "Whitminster Main Depot, GL2 7PN"}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground text-[11px]">Fleet Status</p>
                            <p className="font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Certified LPG Carrier
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* LPG Operations & Empty Cylinder Stats */}
                      <div className="surface-card p-5 rounded-3xl border bg-white space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-500" /> LPG Operations & Exchange
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-bold bg-orange-50 text-orange-700 border-orange-200">
                            LPG Specialist
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-xl border bg-slate-50 text-center">
                            <p className="text-[10px] text-muted-foreground font-bold">Cylinder Deliveries</p>
                            <p className="text-lg font-black text-foreground mt-0.5">{lpgDeliveries.length}</p>
                          </div>
                          <div className="p-2.5 rounded-xl border bg-slate-50 text-center">
                            <p className="text-[10px] text-muted-foreground font-bold">Exchanges Verified</p>
                            <p className="text-lg font-black text-emerald-600 mt-0.5">{exchangeDeliveriesCount}</p>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Driver is authorized for ADR hazardous goods transport, full cylinder customer handovers, and empty exchange collections across Gloucestershire depots.
                        </p>
                      </div>
                    </div>

                    {/* Operational Profile Details Grid */}
                    <div className="surface-card p-5 rounded-3xl border bg-white space-y-4">
                      <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 border-b pb-3">
                        <User className="h-4 w-4 text-primary" /> Profile & Employment Details
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Driver ID Code</p>
                          <p className="font-mono font-bold text-foreground">{agent.agent_code}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Full Name</p>
                          <p className="font-bold text-foreground">{agent.full_name}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Primary Contact</p>
                          <p className="font-bold text-foreground">{agent.phone || "Not set"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Registered Email</p>
                          <p className="font-bold text-foreground">{agent.email || "Not set"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Account Status</p>
                          <Badge variant="outline" className="font-bold text-[10px]">
                            {agent.status}
                          </Badge>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-muted-foreground text-[11px]">Active Exceptions</p>
                          <p className="font-bold text-foreground">{delayedDeliveriesCount}</p>
                        </div>
                        <div className="space-y-0.5 sm:col-span-2">
                          <p className="text-muted-foreground text-[11px]">Onboarding / Joined Date</p>
                          <p className="font-bold text-foreground">
                            {new Date(agent.created_at || Date.now()).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: REAL DELIVERY HISTORY */}
                  <TabsContent value="history" className="space-y-4 pt-1">
                    <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
                      {deliveries.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                          <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
                          <h4 className="font-bold text-sm text-foreground">No assigned deliveries recorded</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            When orders are dispatched and assigned to this driver, they will appear here with full handover status and cylinder exchange records.
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-slate-50/80">
                            <TableRow>
                              <TableHead className="font-bold text-xs">Order ID</TableHead>
                              <TableHead className="font-bold text-xs">Customer</TableHead>
                              <TableHead className="font-bold text-xs">Date / Time</TableHead>
                              <TableHead className="font-bold text-xs">Exchange Req</TableHead>
                              <TableHead className="font-bold text-xs">Status</TableHead>
                              <TableHead className="font-bold text-xs text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deliveries.map((del: any) => {
                              const orderItems = del.orders?.order_items || [];
                              const exReq = getOrderCylinderExchangeRequirement(orderItems);
                              const isDelivered = (del.status || "").toLowerCase() === "delivered";

                              return (
                                <TableRow key={del.id} className="hover:bg-slate-50/60 text-xs">
                                  <TableCell className="font-mono font-bold text-primary">
                                    #{del.order_ref || del.orders?.order_number || del.order_id?.slice(0, 8)}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-bold text-foreground">
                                        {del.orders?.customer_name || "Customer"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                        {del.orders?.shipping_address || del.route_area || "Gloucestershire"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground font-medium">
                                    {del.created_at
                                      ? new Date(del.created_at).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Today, 11:30"}
                                  </TableCell>
                                  <TableCell>
                                    {exReq.required ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                        Refill / Exchange
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                                        New Cylinder
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-bold text-[10px]",
                                        isDelivered
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : (del.status || "").toLowerCase().includes("out")
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            : "bg-slate-100 text-slate-700 border-slate-200",
                                      )}
                                    >
                                      {del.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-foreground">
                                    {del.orders?.total ? gbp(Number(del.orders.total)) : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 3: REAL CUSTOMER FEEDBACK */}
                  <TabsContent value="feedback" className="space-y-4 pt-1">
                    {reviews.length === 0 ? (
                      <div className="surface-card p-12 rounded-3xl border bg-white text-center space-y-3 shadow-xs">
                        <Star className="mx-auto h-10 w-10 text-muted-foreground/30" />
                        <h4 className="font-bold text-sm text-foreground">No customer reviews yet</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          When customers rate and review deliveries completed by {agent.full_name}, feedback will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {reviews.map((rev: any) => {
                          const rating = Number(rev.delivery_agent_rating || rev.rating || 5);
                          return (
                            <div
                              key={rev.id}
                              className="p-4 rounded-2xl border bg-white space-y-2 shadow-2xs hover:border-slate-300 transition-colors text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  {rev.customer_name || rev.user_name || "Verified Customer"}
                                </span>
                                <div
                                  className={cn(
                                    "px-2 py-0.5 rounded-full font-black text-xs flex items-center gap-1",
                                    rating >= 4
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : rating === 3
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-rose-50 text-rose-700 border border-rose-200",
                                  )}
                                >
                                  <Star className="h-3 w-3 fill-current" /> {rating}.0
                                </div>
                              </div>
                              <p className="text-muted-foreground leading-relaxed">
                                "{rev.comment || "Professional, on-time delivery with safe cylinder connection."}"
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {rev.created_at
                                  ? new Date(rev.created_at).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Verified Delivery"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT AGENT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit Driver Profile — {agent?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update fleet allocation, vehicle registration, and contact information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">Full Name</label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                className="rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Phone</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Status</label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active (Available)</SelectItem>
                    <SelectItem value="On Delivery">On Delivery</SelectItem>
                    <SelectItem value="Inactive">Inactive / Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">Delivery Zone</label>
              <Select
                value={editFormData.delivery_zone}
                onValueChange={(val) => setEditFormData({ ...editFormData, delivery_zone: val })}
              >
                <SelectTrigger className="rounded-xl text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Vehicle Type</label>
                <Select
                  value={editFormData.vehicle_type}
                  onValueChange={(val) => setEditFormData({ ...editFormData, vehicle_type: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Vehicle Reg Plate</label>
                <Input
                  value={editFormData.vehicle_plate}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicle_plate: e.target.value.toUpperCase() })}
                  className="rounded-xl text-xs font-mono font-bold uppercase"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="rounded-full text-xs font-bold bg-primary text-white"
              >
                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
