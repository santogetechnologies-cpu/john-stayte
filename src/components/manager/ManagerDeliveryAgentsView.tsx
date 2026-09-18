import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  Truck,
  Search,
  Star,
  MapPin,
  Phone,
  Mail,
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
  type DeliveryAgentRecord,
} from "@/lib/delivery-agent-service";
import { DeliveryAgentProfileModal } from "@/components/delivery/DeliveryAgentProfileModal";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function ManagerDeliveryAgentsView() {
  const [agents, setAgents] = useState<DeliveryAgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  // Selected agent for viewing detailed performance & deliveries
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentProfile, setAgentProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryAgents();
      setAgents(data);
    } catch (err: any) {
      toast.error("Failed to load delivery agents: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();

    const channel = supabase
      .channel("manager_delivery_agents_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_agents" }, () =>
        loadAgents(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
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

  const handleOpenProfile = async (agentId: string) => {
    setSelectedAgentId(agentId);
    setProfileLoading(true);
    try {
      const profile = await getDeliveryAgentProfile(agentId);
      setAgentProfile(profile);
    } catch (err: any) {
      toast.error("Failed to load agent profile: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch =
        a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.agent_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.vehicle_plate && a.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.email && a.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "all" || a.status.toLowerCase() === statusFilter.toLowerCase();
      const matchZone = zoneFilter === "all" || a.delivery_zone === zoneFilter;

      return matchSearch && matchStatus && matchZone;
    });
  }, [agents, searchQuery, statusFilter, zoneFilter]);

  const activeCount = agents.filter((a) => a.status.toLowerCase() === "active").length;
  const onDeliveryCount = agents.filter(
    (a) => a.status.toLowerCase() === "on delivery" || a.active_deliveries > 0,
  ).length;

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/manager" className="hover:text-red-600 transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Delivery Agents</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Depot Delivery Drivers & Agents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time driver roster, vehicle allocations, active dispatch loads, and ratings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/manager/delivery-assignment">
            <Button className="rounded-full text-xs font-black gap-2 shadow-md shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white cursor-pointer h-9.5">
              <Truck className="h-4 w-4" /> Go to Delivery Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Drivers</span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{agents.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">Registered LPG drivers</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Active & Available</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{activeCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Ready for dispatch</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">On Route</span>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 shadow-2xs">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">{onDeliveryCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Currently executing drops</p>
        </div>

        <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Fleet Rating Avg</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {agents.length > 0
              ? (
                  agents.reduce((acc, a) => acc + (a.rating || 5), 0) / agents.length
                ).toFixed(1) + " / 5.0"
              : "5.0 / 5.0"}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Customer verified reviews</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="surface-card p-4 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, code, plate, or email..."
            className="pl-10 h-9 rounded-full text-xs bg-white/90 border-slate-200/80 font-medium text-slate-900 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 rounded-full text-xs font-bold bg-white/90 border-slate-200/80 text-slate-700 shadow-2xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 text-xs font-medium">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on delivery">On Delivery</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all" || zoneFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setZoneFilter("all");
              }}
              className="rounded-full text-xs h-9 px-3 text-slate-500 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* 4. AGENTS TABLE */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-600" />
            <p className="text-xs font-bold text-slate-400">Loading delivery drivers...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="font-black text-sm text-slate-900">No drivers found</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              No delivery agents match your search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-slate-100">
                <TableRow>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Agent Code</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Driver Details</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Vehicle / Plate</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Zone</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Active Load</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Completed</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-mono font-black text-xs text-slate-900">
                      {agent.agent_code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center font-black text-xs shadow-2xs border border-red-500/30 shrink-0">
                          {getAgentInitials(agent.full_name)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {agent.full_name}
                            {agent.rating >= 4.8 && (
                              <span className="flex items-center text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full font-black shadow-2xs">
                                ★ {agent.rating}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                            {agent.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" /> {agent.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-900">
                        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200/80 text-[11px] font-black shadow-2xs">
                          {agent.vehicle_plate}
                        </span>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {agent.vehicle_type || "Cylinder Delivery Van"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {agent.delivery_zone || "Gloucestershire Central"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-black text-[10px] px-2.5 py-0.5 rounded-full border shadow-2xs inline-flex items-center",
                          agent.active_deliveries > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200/80"
                            : "bg-slate-50 text-slate-600 border-slate-200/60",
                        )}
                      >
                        {agent.active_deliveries} active
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-900">
                      {agent.completed_deliveries} drops
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-black text-[10px] px-2.5 py-0.5 rounded-full border shadow-2xs inline-flex items-center",
                          agent.status.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : agent.status.toLowerCase() === "on delivery"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                              : "bg-slate-50 text-slate-600 border-slate-200/60",
                        )}
                      >
                        {agent.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenProfile(agent.id)}
                        className="rounded-full text-xs font-bold gap-1.5 h-8 px-3 hover:bg-red-50/50 text-red-600 hover:text-red-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 5. REDESIGNED DELIVERY AGENT PROFILE MODAL */}
      <DeliveryAgentProfileModal
        open={Boolean(selectedAgentId)}
        onOpenChange={(open) => !open && setSelectedAgentId(null)}
        profileData={agentProfile}
        loading={profileLoading}
        onAgentUpdated={() => {
          loadAgents();
          if (selectedAgentId) handleOpenProfile(selectedAgentId);
        }}
        canEdit={false}
      />
    </div>
  );
}
