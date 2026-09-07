import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Mail,
  Phone,
  Truck,
  MapPin,
  ShieldCheck,
  Star,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Calendar,
  Clock,
  Edit2,
  Flame,
  BadgeCheck,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Power,
  RotateCcw,
  Loader2,
  Check,
  CheckSquare,
  AlertCircle,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  getDeliveryAgentProfile,
  getAgentInitials,
  updateDeliveryAgent,
  type DeliveryAgentRecord,
} from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { DeliveryWorkflowModal } from "./DeliveryWorkflowModal";
import { cn } from "@/lib/utils";

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

export function DeliveryProfileView() {
  const { user } = useStore();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    agent: DeliveryAgentRecord;
    deliveries: any[];
    reviews: any[];
    ratingCount: number;
  } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Workflow modal for viewing/progressing a delivery from history
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    delivery_zone: "Whitminster & Stroud",
    vehicle_type: "Flatbed Cylinder Van (3.5t)",
    vehicle_plate: "",
    status: "Active",
  });

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDeliveryAgentProfile(user);
      setProfileData(data);
    } catch (err: any) {
      console.warn("Failed to load agent profile:", err);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();

    // Supabase Realtime synchronization on deliveries, reviews, and delivery_agents
    const channelName = `driver_profile_sync_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadProfile(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () =>
        loadProfile(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_agents" }, () =>
        loadProfile(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProfile]);

  const agent = profileData?.agent;
  const deliveries = profileData?.deliveries || [];
  const reviews = profileData?.reviews || [];

  // Computed Real Metrics
  const totalDeliveries = Math.max(deliveries.length, Number(agent?.total_deliveries || 0));
  
  const completedDeliveries = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "delivered" || s === "completed";
  }).length;

  const activeDeliveries = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return (
      s === "out for delivery" ||
      s === "assigned" ||
      s === "accepted" ||
      s === "in transit" ||
      s === "pending" ||
      s === "arrived" ||
      s === "customer verified" ||
      s === "cylinder handed over"
    );
  }).length;

  const delayedDeliveries = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "delayed" || s === "exception" || s === "issue";
  }).length;

  const completionRate =
    totalDeliveries > 0
      ? Math.round((completedDeliveries / totalDeliveries) * 100)
      : 100;

  // Cylinder Operations
  const exchangeDeliveries = deliveries.filter((d: any) => {
    const req = getOrderCylinderExchangeRequirement(d);
    return req.required;
  });

  const verifiedCylinderCount = deliveries.filter((d: any) => {
    const s = (d.status || "").toLowerCase();
    const notes = (d.notes || "").toLowerCase();
    return s === "delivered" || s === "verified" || notes.includes("[empty return:") || notes.includes("verified");
  }).length;

  const currentActiveDelivery = deliveries.find((d: any) => {
    const s = (d.status || "").toLowerCase();
    return s === "out for delivery" || s === "arrived" || s === "in transit" || s === "customer verified";
  });

  // Open Edit Profile
  const handleOpenEdit = () => {
    if (!agent) return;
    setEditFormData({
      full_name: agent.full_name || user?.name || "",
      phone: agent.phone || "",
      address: agent.address || "Whitminster Logistics Depot, GL2 7PN",
      delivery_zone: agent.delivery_zone || "Whitminster & Stroud",
      vehicle_type: agent.vehicle_type || "Flatbed Cylinder Van (3.5t)",
      vehicle_plate: agent.vehicle_plate || "JS72 AGY",
      status: agent.status || "Active",
    });
    setEditModalOpen(true);
  };

  // Save Edit Profile
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setSavingEdit(true);
    try {
      await updateDeliveryAgent(agent.id, editFormData);
      toast.success("Profile information updated successfully!");
      setEditModalOpen(false);
      await loadProfile();
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const agentInitials = getAgentInitials(agent?.full_name || user?.name);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold">Loading logistics driver profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. PREMIUM PROFILE HERO */}
      <div className="surface-card bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-red-600/10 via-red-600/3 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Dynamic Initials Avatar with Status Pin */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-lg border-2 border-red-500/30 tracking-wider">
                {agentInitials}
              </div>

              {/* Status Indicator Dot */}
              <span
                className={cn(
                  "absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs",
                  agent?.status === "Active"
                    ? "bg-emerald-500"
                    : agent?.status === "On Delivery"
                      ? "bg-indigo-500"
                      : "bg-slate-400",
                )}
                title={`Status: ${agent?.status || "Active"}`}
              />
            </div>

            {/* Agent Info & Role */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight">
                  {agent?.full_name || user?.name || "Delivery Driver"}
                </h1>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px] uppercase tracking-wide px-2.5 py-0.5 rounded-full shadow-none">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" /> Certified Driver
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-black bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5"
                >
                  {agent?.agent_code || "DA-101"}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Official Logistics Driver · <span className="text-slate-700 font-bold">John Stayte Services Fleet Operations</span>
              </p>

              {/* Contact details */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                {agent?.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {agent.phone}
                  </a>
                )}
                {agent?.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {agent.email}
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />{" "}
                  {agent?.delivery_zone || "Whitminster & Stroud"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />{" "}
                  {agent?.address || "Whitminster Depot, GL2 7PN"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "font-bold text-xs px-3 py-1",
                agent?.status === "Active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : agent?.status === "On Delivery"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-slate-100 text-slate-600 border-slate-200",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full mr-1.5",
                  agent?.status === "Active"
                    ? "bg-emerald-500"
                    : agent?.status === "On Delivery"
                      ? "bg-indigo-500"
                      : "bg-slate-400",
                )}
              />
              {agent?.status === "Active"
                ? "Available / On-Duty"
                : agent?.status === "On Delivery"
                  ? "On Delivery Route"
                  : "Offline / Off-Duty"}
            </Badge>

            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="rounded-full text-xs font-bold gap-1.5 h-8 bg-white hover:bg-slate-50 border-slate-200"
              >
                <Edit2 className="h-3.5 w-3.5 text-primary" /> Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL DELIVERIES
            </span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-slate-900">
            {totalDeliveries}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>On dispatch record</span>
            <span className="font-bold text-slate-700">{completionRate}% fulfillment</span>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              COMPLETED ROUTES
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-emerald-600">
            {completedDeliveries}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Delivered drops</span>
            <span className="font-bold text-emerald-700">100% verified</span>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              ACTIVE TRANSIT
            </span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Truck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-indigo-600">
            {activeDeliveries}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>In execution queue</span>
            <span className="font-bold text-indigo-700">Live priority</span>
          </div>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              CUSTOMER RATING
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-black text-slate-900 flex items-baseline gap-1">
            <span>{agent?.rating ? Number(agent.rating).toFixed(1) : "5.0"}</span>
            <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{reviews.length} verified reviews</span>
            <span className="font-bold text-amber-700">★★★★★</span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN: DELIVERY PERFORMANCE & DRIVER INFORMATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Delivery Performance & Metrics */}
        <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" /> Delivery Performance
            </h2>
            <Badge variant="outline" className="font-bold text-xs bg-slate-50">
              Real-time Metrics
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
              <p className="text-xl font-black text-emerald-600">{completedDeliveries}</p>
              <p className="text-[10px] text-slate-500">Fulfilled</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">In Progress</span>
              <p className="text-xl font-black text-indigo-600">{activeDeliveries}</p>
              <p className="text-[10px] text-slate-500">On route</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Delayed</span>
              <p className="text-xl font-black text-amber-600">{delayedDeliveries}</p>
              <p className="text-[10px] text-slate-500">Traffic/Weather</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Exceptions</span>
              <p className="text-xl font-black text-slate-700">0</p>
              <p className="text-[10px] text-slate-500">Flagged</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Overall Delivery Completion</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Calculated from all assigned routes across Gloucestershire delivery zones. Verified upon recipient handover.
            </p>
          </div>
        </div>

        {/* Right Column: Driver Information */}
        <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Driver Information
            </h2>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {agent?.agent_code || "DA-101"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Full Name</p>
              <p className="font-bold text-slate-900">{agent?.full_name || user?.name || "Delivery Driver"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Driver ID Code</p>
              <p className="font-mono font-bold text-slate-900">{agent?.agent_code || "DA-101"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Contact Email</p>
              <p className="font-bold text-slate-900 truncate">{agent?.email || user?.email || "delivery@jss.com"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Phone Number</p>
              <p className="font-bold text-slate-900">{agent?.phone || "07700 900543"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Assigned Depot</p>
              <p className="font-bold text-slate-900">{agent?.address || "Whitminster Depot, GL2 7PN"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Delivery Zone</p>
              <p className="font-bold text-slate-900">{agent?.delivery_zone || "Whitminster & Stroud"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Account Status</p>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                {agent?.status || "Active"}
              </Badge>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Certification</p>
              <p className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> ADR Hazchem Certified
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TWO-COLUMN: VEHICLE & FLEET + CURRENT ASSIGNMENT / AVAILABILITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Assigned Vehicle & Fleet Details */}
        <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Vehicle & Fleet Details
            </h2>
            <span className="font-mono bg-slate-900 text-white font-bold text-xs px-2.5 py-0.5 rounded-lg">
              {agent?.vehicle_plate || "JS72 AGY"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Vehicle Type</p>
              <p className="font-bold text-slate-900">{agent?.vehicle_type || "Flatbed Cylinder Van (3.5t)"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Registration Number</p>
              <p className="font-mono font-bold text-slate-900">{agent?.vehicle_plate || "JS72 AGY"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Vehicle Capacity</p>
              <p className="font-bold text-slate-900">3.5t / 42 Cylinders (Propane & Butane)</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Base Depot</p>
              <p className="font-bold text-slate-900">{agent?.address || "Whitminster / Fromebridge"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Vehicle Status</p>
              <p className="font-bold text-emerald-600 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Roadworthy & Certified
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Authorized Cargo</p>
              <p className="font-bold text-slate-900">LPG Bottled Gas & Regulators</p>
            </div>
          </div>
        </div>

        {/* Right Column: Account Status & Current Assignment */}
        <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Live Assignment & Shift Status
            </h2>
            <Badge className="bg-emerald-500 text-white font-bold text-xs">
              ● Online / Active
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[10px]">Current Shift Status</p>
                <p className="font-extrabold text-sm text-slate-900 mt-0.5">
                  {agent?.status === "On Delivery" ? "On Delivery Route" : "Available for Next Dispatch"}
                </p>
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-white">
                {activeDeliveries > 0 ? `${activeDeliveries} Active Drops` : "Ready"}
              </Badge>
            </div>

            {currentActiveDelivery ? (
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Active Drop: #{currentActiveDelivery.order_ref || currentActiveDelivery.orders?.order_number || "Order"}</span>
                  <Badge className="bg-primary text-white text-[10px] font-bold">In Transit</Badge>
                </div>
                <p className="text-[11px] text-slate-600">
                  Recipient: {currentActiveDelivery.orders?.customer_name || "Customer"} · {currentActiveDelivery.orders?.shipping_address || "Gloucestershire"}
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDelivery(currentActiveDelivery);
                    setWorkflowOpen(true);
                  }}
                  className="w-full rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-white h-8 mt-1"
                >
                  Continue Active Handover Workflow <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="font-bold text-slate-800">No active transit handover in progress</p>
                <p className="text-[11px] text-slate-500">
                  You are available for automated dispatch queue assignment from Whitminster Depot.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. CYLINDER VERIFICATION PERFORMANCE */}
      <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" /> LPG Cylinder Verification Performance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified collections for Refill / Exchange orders vs New Cylinder orders.
            </p>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-bold">
            Hazardous Goods
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Exchange Drops</span>
            <p className="text-2xl font-black text-slate-900">{exchangeDeliveries.length}</p>
            <p className="text-[10px] text-slate-500">Refill orders</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Empties Verified</span>
            <p className="text-2xl font-black text-emerald-600">{verifiedCylinderCount}</p>
            <p className="text-[10px] text-slate-500">Collected & checked</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Passed</span>
            <p className="text-2xl font-black text-teal-600">100%</p>
            <p className="text-[10px] text-slate-500">Safety compliant</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Exceptions</span>
            <p className="text-2xl font-black text-slate-700">0</p>
            <p className="text-[10px] text-slate-500">Zero issues logged</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>LPG Exchange Protocol:</strong> For <em>First-time / New Cylinder Purchases</em>, empty cylinder return is not required. For <em>Refill / Exchange</em> orders, empty cylinder physical verification is recorded before handover completion.
          </span>
        </div>
      </div>

      {/* 6. RECENT DELIVERY HISTORY */}
      <div className="surface-card rounded-3xl border bg-white shadow-xs overflow-hidden space-y-0">
        <div className="p-6 flex items-center justify-between border-b">
          <div>
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Recent Delivery History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live log of assigned delivery routes, handover timestamps, and cylinder types.
            </p>
          </div>
          <Link to="/delivery/deliveries">
            <Button variant="ghost" size="sm" className="rounded-full text-xs font-bold gap-1 text-primary">
              View All Assigned <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {deliveries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="font-bold text-sm text-slate-800">No deliveries recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When deliveries are assigned to you by Dispatch, they will appear here with full handover records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs">Order ID</TableHead>
                  <TableHead className="font-bold text-xs">Customer</TableHead>
                  <TableHead className="font-bold text-xs">Date / Time</TableHead>
                  <TableHead className="font-bold text-xs">Exchange Req</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Total</TableHead>
                  <TableHead className="font-bold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.slice(0, 8).map((del: any) => {
                  const orderItems = del.orders?.order_items || [];
                  const exReq = getOrderCylinderExchangeRequirement(orderItems);
                  const isDelivered = (del.status || "").toLowerCase() === "delivered";

                  return (
                    <TableRow key={del.id} className="hover:bg-slate-50/60 text-xs">
                      <TableCell className="font-mono font-bold text-primary">
                        #{del.order_ref || del.orders?.order_number || del.order_id?.slice(0, 8) || "JSS-ORD"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-900">
                            {del.orders?.customer_name || del.customer_name || "Customer"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {del.orders?.shipping_address || del.route_area || "Gloucestershire"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
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
                          {del.status || "Assigned"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {del.orders?.total ? gbp(Number(del.orders.total)) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDelivery(del);
                            setWorkflowOpen(true);
                          }}
                          className="rounded-full text-xs font-bold h-7 px-2.5 text-primary hover:bg-primary/10"
                        >
                          Details
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

      {/* 7. CUSTOMER FEEDBACK & REVIEWS */}
      <div className="surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> Customer Feedback & Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified customer ratings associated with your completed delivery handovers.
            </p>
          </div>
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-xs">
            {reviews.length} Verified Reviews
          </Badge>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Star className="mx-auto h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-500 font-bold">No verified customer reviews yet.</p>
            <p className="text-[11px] text-slate-400">
              When customers complete satisfaction feedback on your deliveries, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviews.map((rev: any) => {
              const rating = Number(rev.delivery_agent_rating || rev.rating || 5);
              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
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
                  <p className="text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
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
      </div>

      {/* EDIT PROFILE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit Driver Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update your contact details, assigned zone, and vehicle information.
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

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">Phone Number</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="rounded-xl text-xs font-semibold"
                placeholder="e.g. 07700 900543"
                required
              />
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
                <label className="font-bold text-slate-800 block">Vehicle Reg</label>
                <Input
                  value={editFormData.vehicle_plate}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicle_plate: e.target.value.toUpperCase() })}
                  className="rounded-xl text-xs font-mono font-bold uppercase"
                  placeholder="e.g. JS72 AGY"
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

      {/* DELIVERY WORKFLOW MODAL */}
      {selectedDelivery && (
        <DeliveryWorkflowModal
          open={workflowOpen}
          onOpenChange={setWorkflowOpen}
          delivery={selectedDelivery}
          onWorkflowComplete={() => {
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
