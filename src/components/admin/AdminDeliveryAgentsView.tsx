import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  Truck,
  Search,
  Plus,
  Star,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Power,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  Calendar,
  AlertTriangle,
  Loader2,
  X,
  Filter,
  Eye,
  Building,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDeliveryAgents,
  getDeliveryAgentProfile,
  getAgentInitials,
  createDeliveryAgent,
  updateDeliveryAgent,
  type DeliveryAgentRecord,
} from "@/lib/delivery-agent-service";
import { DeliveryAgentProfileModal } from "@/components/delivery/DeliveryAgentProfileModal";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const DELIVERY_ZONES = [
  "Gloucestershire South",
  "Whitminster & Stroud",
  "Cheltenham & Gloucester",
  "Cotswolds & Forest of Dean",
  "Bristol North Corridor",
];

const VEHICLE_TYPES = [
  "Tanker Truck (LPG Bulk)",
  "Flatbed Cylinder Van (3.5t)",
  "Heavy Rigid Cylinder Carrier (7.5t)",
  "Standard Transit Delivery Van",
];

export function AdminDeliveryAgentsView() {
  const [agents, setAgents] = useState<DeliveryAgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DeliveryAgentRecord | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    agent_code: "",
    full_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    delivery_zone: "Whitminster & Stroud",
    vehicle_type: "Flatbed Cylinder Van (3.5t)",
    vehicle_plate: "",
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryAgents();
      setAgents(data);
    } catch (err: any) {
      toast.error("Failed to load delivery agents: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();

    // Supabase Realtime synchronization on delivery_agents, profiles, reviews, and delivery_assignments
    const channel = supabase
      .channel("admin_delivery_agents_live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_agents" }, () =>
        loadAgents(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        loadAgents(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () =>
        loadAgents(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadAgents(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered Delivery Agents
  const filteredAgents = useMemo(() => {
    return (agents || []).filter((a) => {
      if (!a) return false;
      const q = searchQuery.toLowerCase().trim();
      const name = (a.full_name || "").toLowerCase();
      const code = (a.agent_code || "").toLowerCase();
      const phone = (a.phone || "").toLowerCase();
      const email = (a.email || "").toLowerCase();
      const plate = (a.vehicle_plate || "").toLowerCase();
      const zone = (a.delivery_zone || "").toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        plate.includes(q) ||
        zone.includes(q);

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = a.status === "Active";
      else if (statusFilter === "inactive") matchesStatus = a.status === "Inactive";
      else if (statusFilter === "on_delivery") matchesStatus = (a.active_deliveries || 0) > 0;
      else if (statusFilter === "available")
        matchesStatus = a.status === "Active" && (a.active_deliveries || 0) === 0;

      let matchesZone = true;
      if (zoneFilter !== "all") {
        matchesZone = zone === zoneFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [agents, searchQuery, statusFilter, zoneFilter]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const list = agents || [];
    const total = list.length;
    const active = list.filter((a) => a?.status === "Active").length;
    const inactive = list.filter((a) => a?.status === "Inactive").length;
    const onDelivery = list.filter((a) => (a?.active_deliveries || 0) > 0).length;
    const available = list.filter(
      (a) => a?.status === "Active" && (a?.active_deliveries || 0) === 0,
    ).length;
    return { total, active, inactive, onDelivery, available };
  }, [agents]);

  // Open Add Agent Modal
  const handleOpenAdd = () => {
    try {
      // Generate next default Agent Code
      const existingNums = (agents || [])
        .map((a) => {
          if (!a || !a.agent_code) return NaN;
          return parseInt(String(a.agent_code).replace(/\D/g, ""), 10);
        })
        .filter((n) => !isNaN(n));
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      const defaultCode = `AGT-${String(nextNum).padStart(3, "0")}`;

      setFormData({
        agent_code: defaultCode,
        full_name: "",
        email: "",
        password: "",
        phone: "",
        address: "Gloucestershire Depot, GL2 7PN",
        delivery_zone: "Whitminster & Stroud",
        vehicle_type: "Flatbed Cylinder Van (3.5t)",
        vehicle_plate: "WX21 JSS",
        status: "Active",
      });
      setEditingAgent(null);
      setAddModalOpen(true);
    } catch (err) {
      console.error("Notice opening add agent modal:", err);
      setFormData({
        agent_code: "AGT-001",
        full_name: "",
        email: "",
        password: "",
        phone: "",
        address: "Gloucestershire Depot, GL2 7PN",
        delivery_zone: "Whitminster & Stroud",
        vehicle_type: "Flatbed Cylinder Van (3.5t)",
        vehicle_plate: "WX21 JSS",
        status: "Active",
      });
      setEditingAgent(null);
      setAddModalOpen(true);
    }
  };

  // Open Edit Agent Modal
  const handleOpenEdit = (agent: DeliveryAgentRecord) => {
    try {
      setFormData({
        agent_code: agent.agent_code || "AGT-001",
        full_name: agent.full_name || "",
        email: agent.email || "",
        password: "",
        phone: agent.phone || "",
        address: agent.address || "",
        delivery_zone: agent.delivery_zone || "Whitminster & Stroud",
        vehicle_type: agent.vehicle_type || "Flatbed Cylinder Van (3.5t)",
        vehicle_plate: agent.vehicle_plate || "",
        status: agent.status || "Active",
      });
      setEditingAgent(agent);
      setAddModalOpen(true);
    } catch (err) {
      console.error("Notice opening edit agent modal:", err);
      setEditingAgent(agent);
      setAddModalOpen(true);
    }
  };

  // Submit Add / Edit Agent
  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agent_code.trim()) {
      return toast.error("Please provide an Agent ID code.");
    }
    if (!formData.full_name.trim()) {
      return toast.error("Please provide the agent's full name.");
    }
    if (!formData.phone.trim()) {
      return toast.error("Please provide a phone number.");
    }
    if (!formData.vehicle_plate.trim()) {
      return toast.error("Please provide the vehicle registration number.");
    }

    setSubmitting(true);
    try {
      if (editingAgent) {
        // Update existing agent
        await updateDeliveryAgent(editingAgent.id, formData);
        toast.success(`Delivery Agent ${formData.full_name} updated successfully.`);
      } else {
        // Create new agent
        await createDeliveryAgent(formData);
        toast.success(`Delivery Agent ${formData.full_name} added to fleet.`);
      }

      setAddModalOpen(false);
      setEditingAgent(null);
      await loadAgents();
    } catch (err: any) {
      console.error("Agent save error:", err);
      toast.error("Error saving delivery agent: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (agent: DeliveryAgentRecord) => {
    const nextStatus = agent.status === "Active" ? "Inactive" : "Active";
    try {
      await updateDeliveryAgent(agent.id, { status: nextStatus });
      toast.success(
        `Agent ${agent.full_name} is now ${nextStatus === "Active" ? "Active" : "Deactivated"}.`,
      );
      await loadAgents();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // View Agent Profile Drawer
  const handleViewProfile = async (agentId: string) => {
    setViewingProfileId(agentId);
    setLoadingProfile(true);
    try {
      const data = await getDeliveryAgentProfile(agentId);
      setProfileData(data);
    } catch (err: any) {
      toast.error("Failed to load agent profile: " + err.message);
      setViewingProfileId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Operations</span>
            <span>/</span>
            <span className="text-foreground font-bold">Delivery Agents</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-primary" /> Delivery Agents Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your Gloucestershire logistics drivers, fleet vehicle assignments, active routes,
            and real customer service ratings.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="rounded-full font-extrabold text-xs shadow-md bg-primary hover:bg-primary/90 text-white gap-2 self-start sm:self-auto h-10 px-5"
        >
          <Plus className="h-4 w-4" /> Add Delivery Agent
        </Button>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="surface-card p-4 sm:p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Fleet Agents
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[10px] text-muted-foreground">Registered drivers</p>
        </div>

        <div className="surface-card p-4 sm:p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Active Agents
          </p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.active}</p>
          <p className="text-[10px] text-muted-foreground">Ready for routing</p>
        </div>

        <div className="surface-card p-4 sm:p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Currently On Delivery
          </p>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600">{metrics.onDelivery}</p>
          <p className="text-[10px] text-muted-foreground">Active in-transit routes</p>
        </div>

        <div className="surface-card p-4 sm:p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Available Agents
          </p>
          <p className="text-2xl sm:text-3xl font-black text-blue-600">{metrics.available}</p>
          <p className="text-[10px] text-muted-foreground">Ready for assignment</p>
        </div>

        <div className="surface-card p-4 sm:p-5 rounded-3xl border bg-white shadow-2xs space-y-1 col-span-2 md:col-span-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Inactive / Off Duty
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-500">{metrics.inactive}</p>
          <p className="text-[10px] text-muted-foreground">Deactivated drivers</p>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by agent name, ID code, phone, vehicle, or zone..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-full text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="on_delivery">On Delivery</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-48 rounded-full text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery Zones</SelectItem>
              {DELIVERY_ZONES.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Delivery Agents Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-bold space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading delivery fleet from Supabase...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No delivery agents found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || zoneFilter !== "all"
                ? "No delivery agents match your search and filter criteria."
                : "Add your first delivery agent to begin managing order fulfillment routes."}
            </p>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="rounded-full text-xs font-bold bg-primary text-white mt-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Delivery Agent
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs">Agent</TableHead>
                  <TableHead className="font-bold text-xs">Agent ID</TableHead>
                  <TableHead className="font-bold text-xs">Contact & Zone</TableHead>
                  <TableHead className="font-bold text-xs">Vehicle Fleet</TableHead>
                  <TableHead className="font-bold text-xs">Current Status</TableHead>
                  <TableHead className="font-bold text-xs text-center">Active Routes</TableHead>
                  <TableHead className="font-bold text-xs text-center">Customer Rating</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow
                    key={agent.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => handleViewProfile(agent.id)}
                  >
                    <TableCell className="font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs border border-red-500/30 shrink-0">
                          {getAgentInitials(agent.full_name)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleViewProfile(agent.id)}
                            className="font-extrabold text-foreground hover:text-primary text-left transition-colors flex items-center gap-1.5 group"
                          >
                            <span>{agent.full_name}</span>
                            <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <p className="text-[10px] text-muted-foreground font-normal">
                            {agent.email || "No email assigned"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md border text-[11px]">
                        {agent.agent_code}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {agent.phone || "-"}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />{" "}
                          {agent.delivery_zone || "Gloucestershire"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          <Truck className="h-3 w-3 text-primary" /> {agent.vehicle_plate}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {agent.vehicle_type || "Commercial Delivery"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      {agent.status === "Inactive" ? (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold"
                        >
                          Inactive
                        </Badge>
                      ) : agent.active_deliveries > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-extrabold animate-pulse"
                        >
                          <Truck className="h-3 w-3 mr-1 text-indigo-600" /> On Delivery
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Available
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      <span
                        className={cn(
                          "inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded-full",
                          agent.active_deliveries > 0
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {agent.active_deliveries}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-amber-800 font-extrabold text-xs">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{agent.rating ? Number(agent.rating).toFixed(1) : "5.0"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProfile(agent.id)}
                          className="h-8 rounded-full text-xs font-bold text-slate-700 hover:text-primary gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(agent)}
                          className="h-8 w-8 p-0 rounded-full text-slate-700 hover:text-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(agent)}
                          className={cn(
                            "h-8 rounded-full text-[11px] font-bold px-2",
                            agent.status === "Active"
                              ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                          )}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          {agent.status === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT DELIVERY AGENT MODAL */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              <UserCheck className="h-5 w-5 text-primary" />
              {editingAgent
                ? `Edit Delivery Agent — ${editingAgent.full_name}`
                : "Add New Delivery Agent"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingAgent
                ? "Update vehicle assignment, contact information, and operational delivery zone."
                : "Register a professional driver to John Stayte Services Gloucestershire logistics fleet."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAgent} className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Agent ID Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.agent_code}
                  onChange={(e) => setFormData({ ...formData, agent_code: e.target.value })}
                  placeholder="e.g. AGT-004"
                  className="rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Status <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs font-semibold bg-white border-slate-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active (Ready for Routes)</SelectItem>
                    <SelectItem value="Inactive">Inactive / Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Tom Roberts"
                className="rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 07700 900821"
                  className="rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. tom.roberts@stayte.co.uk"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {!editingAgent && (
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Driver Login Password <span className="text-muted-foreground font-normal text-[11px]">(Defaults to Delivery2026!)</span>
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="rounded-xl text-xs font-semibold"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">Base Address / Depot</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Whitminster Main Depot, GL2 7PN"
                className="rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">
                Primary Delivery Zone <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.delivery_zone}
                onValueChange={(val) => setFormData({ ...formData, delivery_zone: val })}
              >
                <SelectTrigger className="rounded-xl text-xs font-semibold bg-white border-slate-200">
                  <SelectValue placeholder="Select Zone" />
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
                <label className="font-bold text-slate-800 block">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs font-semibold bg-white border-slate-200">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((vt) => (
                      <SelectItem key={vt} value={vt}>
                        {vt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Vehicle Reg Plate <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                  placeholder="e.g. WX21 JSS"
                  className="rounded-xl text-xs font-mono font-bold uppercase"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl font-extrabold text-xs bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {editingAgent ? "Update Agent" : "Add Agent to Fleet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. DETAILED DELIVERY AGENT PROFILE MODAL */}
      <DeliveryAgentProfileModal
        open={Boolean(viewingProfileId)}
        onOpenChange={(open) => !open && setViewingProfileId(null)}
        profileData={profileData}
        loading={loadingProfile}
        onAgentUpdated={() => {
          loadAgents();
          if (viewingProfileId) handleViewProfile(viewingProfileId);
        }}
        canEdit={true}
      />
    </div>
  );
}
