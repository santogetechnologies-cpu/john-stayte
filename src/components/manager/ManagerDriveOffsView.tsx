import { useState, useEffect, useMemo } from "react";
import {
  Fuel,
  Search,
  Plus,
  Download,
  ShieldAlert,
  AlertTriangle,
  PoundSterling,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
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
  FORECOURT_LOCATIONS,
  fetchDriveOffIncidents,
  calculateDriveOffStats,
  subscribeToDriveOffChanges,
} from "@/lib/drive-off-service";
import type { FuelDriveOffIncident } from "@/types/drive-offs";
import { ReportIncidentModal } from "@/components/drive-offs/ReportIncidentModal";
import { DriveOffDetailSheet } from "@/components/drive-offs/DriveOffDetailSheet";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function ManagerDriveOffsView() {
  const { user } = useStore();
  const [incidents, setIncidents] = useState<FuelDriveOffIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<FuelDriveOffIncident | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchDriveOffIncidents({
        branchId: selectedBranch,
        status: selectedStatus,
        searchQuery,
      });
      setIncidents(data);
      setSelectedIncident((prev) => {
        if (!prev) return null;
        return data.find((i) => i.id === prev.id) || prev;
      });
    } catch {
      if (!silent) toast.error("Failed to load incidents");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Supabase Realtime synchronization for live incident and payment updates
    const unsubscribe = subscribeToDriveOffChanges(() => {
      loadData(true);
    }, "manager_drive_offs_sync");

    // 2. Refresh data when tab or window regains focus
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    };
    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);

    // 3. Fallback polling heartbeat every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => {
      unsubscribe();
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [selectedBranch, selectedStatus]);

  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase().trim();
    return incidents.filter(
      (i) =>
        i.vehicle_registration_number.toLowerCase().includes(q) ||
        i.incident_number.toLowerCase().includes(q) ||
        (i.vehicle_make && i.vehicle_make.toLowerCase().includes(q)) ||
        (i.police_crime_reference && i.police_crime_reference.toLowerCase().includes(q)) ||
        i.branch_name.toLowerCase().includes(q),
    );
  }, [incidents, searchQuery]);

  const stats = useMemo(() => calculateDriveOffStats(filteredIncidents), [filteredIncidents]);

  const handleIncidentCreated = (newInc: FuelDriveOffIncident) => {
    setIncidents((prev) => [newInc, ...prev]);
  };

  const handleIncidentUpdated = (updated: FuelDriveOffIncident) => {
    setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedIncident(updated);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2">
              <ShieldAlert className="h-3.5 w-3.5" /> Forecourt Operations & Incident Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
              Drive-Offs – Track and manage fuel drive-off incidents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Forecourt bilking and non-payment tracking across all service stations with police reference filing and recovery settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setReportModalOpen(true)}
              className="rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs h-10 px-5"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Report Incident
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Unpaid
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.unpaidCount}</span>
            <span className="text-xs text-red-600 font-bold">incidents</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <PoundSterling className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">
              £{stats.totalUnpaidAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settled / Recovered
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">
              £{stats.recoveredAmount.toFixed(2)}
            </span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {stats.recoveryRatePercent}%
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              With Police
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.withPoliceCount}</span>
            <span className="text-xs text-blue-600 font-bold">files</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white/80 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by vehicle registration (VRN), incident #, make, crime ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 rounded-2xl text-xs font-medium h-10 w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full md:w-[220px] rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium h-10">
              <SelectValue placeholder="All Forecourts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forecourts</SelectItem>
              {FORECOURT_LOCATIONS.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-[170px] rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium h-10">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial_payment">Partial Payment</SelectItem>
              <SelectItem value="police_investigation">Police Investigation</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="written_off">Written Off</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => loadData()}
            variant="ghost"
            size="icon"
            className="rounded-2xl text-slate-500 hover:text-slate-900 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 4. Incidents Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-100">
            <TableRow>
              <TableHead className="font-bold text-slate-600 text-xs">Incident & Date</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs">Forecourt & Pump</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs">Vehicle Plate (VRN)</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs">Fuel & Quantity</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs">Amount Due</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs">Status</TableHead>
              <TableHead className="font-bold text-slate-600 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                  Loading forecourt incidents...
                </TableCell>
              </TableRow>
            ) : filteredIncidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                  No drive-off incidents found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredIncidents.map((inc) => (
                <TableRow key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-3.5">
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      {inc.incident_number}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {inc.incident_date} · {inc.incident_time}
                    </span>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <span className="font-bold text-xs text-slate-800 block">
                      {inc.branch_name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pump {inc.pump_number}
                    </span>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <div className="inline-block px-2.5 py-0.5 bg-amber-300 text-slate-950 font-mono font-extrabold text-xs rounded-md tracking-wider border border-amber-400 shadow-2xs">
                      {inc.vehicle_registration_number}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                      {[inc.vehicle_colour, inc.vehicle_make, inc.vehicle_model]
                        .filter(Boolean)
                        .join(" ") || "Unspecified"}
                    </span>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <span className="text-xs font-semibold text-slate-800 block">
                      {inc.fuel_type}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {inc.litres_dispensed} L @ £{inc.price_per_litre.toFixed(3)}
                    </span>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <span className="text-xs font-bold text-slate-900 block">
                      £{inc.total_amount_due.toFixed(2)}
                    </span>
                    {inc.balance_remaining > 0 ? (
                      <span className="text-[10px] text-red-600 font-bold">
                        Bal: £{inc.balance_remaining.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold">Paid in full</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        inc.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : inc.status === "police_investigation"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {inc.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3.5 text-right">
                    <Button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setDetailSheetOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs font-bold text-slate-700 hover:text-red-600"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReportIncidentModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        actorName={user?.name || "Manager"}
        onIncidentCreated={handleIncidentCreated}
      />

      <DriveOffDetailSheet
        incident={selectedIncident}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        actorName={user?.name || "Manager"}
        onIncidentUpdated={handleIncidentUpdated}
      />
    </div>
  );
}

