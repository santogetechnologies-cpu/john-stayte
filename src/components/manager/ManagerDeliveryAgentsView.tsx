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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground">Delivery Agents</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Depot Delivery Drivers & Agents
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time driver roster, vehicle allocations, active dispatch loads, and ratings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/manager/delivery-assignment">
            <Button className="rounded-full text-xs font-bold gap-2 bg-primary hover:bg-primary/90 shadow-md">
              <Truck className="h-4 w-4" /> Go to Delivery Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Total Drivers</span>
            <span className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{agents.length}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Registered LPG drivers</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Active & Available</span>
            <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{activeCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Ready for dispatch</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">On Route</span>
            <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600">{onDeliveryCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Currently executing drops</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Fleet Rating Avg</span>
            <span className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {agents.length > 0
              ? (
                  agents.reduce((acc, a) => acc + (a.rating || 5), 0) / agents.length
                ).toFixed(1) + " / 5.0"
              : "5.0 / 5.0"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Customer verified reviews</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-4 rounded-3xl border shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, code, plate, or email..."
            className="pl-10 h-10 rounded-full text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-full text-xs font-bold bg-slate-50 border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl text-xs font-medium">
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
              className="rounded-full text-xs h-9 px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* 4. AGENTS TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-bold text-muted-foreground">Loading delivery drivers...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No drivers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No delivery agents match your search criteria.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Agent Code</TableHead>
                <TableHead className="font-bold text-xs">Driver Details</TableHead>
                <TableHead className="font-bold text-xs">Vehicle / Plate</TableHead>
                <TableHead className="font-bold text-xs">Zone</TableHead>
                <TableHead className="font-bold text-xs">Active Load</TableHead>
                <TableHead className="font-bold text-xs">Completed</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono font-bold text-xs text-primary">
                    {agent.agent_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs border border-red-500/30 shrink-0">
                        {getAgentInitials(agent.full_name)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          {agent.full_name}
                          {agent.rating >= 4.8 && (
                            <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-full font-bold">
                              ★ {agent.rating}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          {agent.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {agent.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-foreground">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold">
                        {agent.vehicle_plate}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {agent.vehicle_type || "Cylinder Delivery Van"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {agent.delivery_zone || "Gloucestershire Central"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-[11px] px-2.5 py-0.5",
                        agent.active_deliveries > 0
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-600 border-slate-200",
                      )}
                    >
                      {agent.active_deliveries} active
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    {agent.completed_deliveries} drops
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-[10px] px-2 py-0.5",
                        agent.status.toLowerCase() === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : agent.status.toLowerCase() === "on delivery"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-600 border-slate-200",
                      )}
                    >
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenProfile(agent.id)}
                      className="rounded-full text-xs font-bold gap-1.5 h-8 px-3 hover:bg-slate-100 text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
