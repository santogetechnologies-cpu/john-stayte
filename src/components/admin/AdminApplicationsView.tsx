import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  MapPin,
  PenTool,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Calendar,
  AlertTriangle,
  Flame,
  Save,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  getAllGasCustomerApplications,
  updateGasApplicationStatus,
  GasCustomerApplication,
  ApplicationStatus,
} from "@/lib/application-service";

export function AdminApplicationsView() {
  const [applications, setApplications] = useState<GasCustomerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [usageFilter, setUsageFilter] = useState<string>("ALL");

  // Details Modal
  const [selectedApp, setSelectedApp] = useState<GasCustomerApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await getAllGasCustomerApplications();
      setApplications(data);
    } catch (err: any) {
      toast.error("Failed to load customer applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const channel = supabase
      .channel("admin_applications_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "gas_customer_applications" }, () => loadApplications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        (app.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.business_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.postcode || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
      const matchesUsage = usageFilter === "ALL" || app.usage_type === usageFilter;

      return matchesSearch && matchesStatus && matchesUsage;
    });
  }, [applications, searchQuery, statusFilter, usageFilter]);

  const handleOpenDetails = (app: GasCustomerApplication) => {
    setSelectedApp(app);
    setAdminNotes(app.admin_notes || "");
    setModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: ApplicationStatus) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await updateGasApplicationStatus({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        status: newStatus,
        adminNotes: adminNotes.trim(),
        reviewedBy: "Admin Staff",
      });

      toast.success(`Application marked as ${newStatus}!`);
      setModalOpen(false);
      await loadApplications();
    } catch (err: any) {
      toast.error("Failed to update application: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Gas Customer Applications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Gas Customer Applications ({applications.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review customer onboarding forms, gas usage classifications, and verify submitted digital signatures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadApplications}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading ? "animate-spin text-primary" : "")} />
            <span>Sync Live DB</span>
          </Button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: "All Applications", count: applications.length },
              {
                id: "SUBMITTED",
                label: "Pending Review",
                count: applications.filter((a) => a.status === "SUBMITTED").length,
              },
              {
                id: "APPROVED",
                label: "Approved",
                count: applications.filter((a) => a.status === "APPROVED").length,
              },
              {
                id: "REJECTED",
                label: "Rejected",
                count: applications.filter((a) => a.status === "REJECTED").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Select value={usageFilter} onValueChange={setUsageFilter}>
              <SelectTrigger className="w-36 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="Usage" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">All Usages</SelectItem>
                <SelectItem value="DOMESTIC">🏠 Domestic</SelectItem>
                <SelectItem value="COMMERCIAL">🏨 Commercial</SelectItem>
                <SelectItem value="BULK">🏭 Bulk LPG</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, phone, business..."
                className="pl-8.5 rounded-full bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs text-left">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-bold">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
            Loading customer applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No customer applications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              New registered customers who submit their Gas Customer Application will appear here with their digital signatures.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs">Customer Name</TableHead>
                  <TableHead className="font-bold text-xs">Contact & Location</TableHead>
                  <TableHead className="font-bold text-xs">Usage & Business</TableHead>
                  <TableHead className="font-bold text-xs">Signed Date</TableHead>
                  <TableHead className="font-bold text-xs">Digital Signature</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id} className="hover:bg-slate-50/60">
                    <TableCell className="text-xs">
                      <p className="font-extrabold text-slate-900">{app.full_name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">ID: {app.customer_id.slice(0, 8)}</p>
                    </TableCell>

                    <TableCell className="text-xs">
                      <p className="font-semibold text-slate-800">{app.phone}</p>
                      <p className="text-[11px] text-muted-foreground">{app.city} ({app.postcode})</p>
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge className={cn("font-bold text-[10px] uppercase", app.usage_type === "DOMESTIC" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                        {app.usage_type}
                      </Badge>
                      {app.business_name && (
                        <p className="text-[11px] font-bold text-slate-700 mt-1 truncate max-w-xs">
                          {app.business_name}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {new Date(app.signed_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell>
                      {app.signature_data ? (
                        <div className="h-9 w-24 rounded-lg border border-slate-200 bg-slate-50 p-0.5 flex items-center justify-center overflow-hidden">
                          <img
                            src={app.signature_data}
                            alt="Signature"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No signature</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] font-extrabold uppercase px-2.5 py-0.5",
                          app.status === "APPROVED"
                            ? "bg-emerald-600 text-white"
                            : app.status === "REJECTED"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-white"
                        )}
                      >
                        {app.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetails(app)}
                        className="rounded-full text-[11px] font-bold h-7 px-3"
                      >
                        Review Form
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 4. Details Dialog */}
      {selectedApp && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <DialogHeader>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <DialogTitle className="text-xl font-black text-slate-900">
                  Gas Customer Application Review
                </DialogTitle>
                <Badge className={cn("text-xs font-black uppercase", selectedApp.status === "APPROVED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white")}>
                  {selectedApp.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Personal info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Customer Personal Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Full Name:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email Address:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Date of Birth:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.date_of_birth || "Not provided"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Street Address:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.street_address}, {selectedApp.city} {selectedApp.postcode}</p>
                  </div>
                </div>
              </div>

              {/* Usage & Business */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-primary" /> Gas Usage & Cylinder Requirements
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Usage Type:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.usage_type} LPG</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Existing Cylinder Status:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.existing_cylinder_status}</p>
                  </div>
                  {selectedApp.business_name && (
                    <>
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-blue-700 font-bold">Registered Business Name:</span>
                        <p className="font-black text-slate-900 text-sm">{selectedApp.business_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Trade Sector:</span>
                        <p className="font-extrabold text-slate-900">{selectedApp.business_type}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Accounts Contact:</span>
                        <p className="font-extrabold text-slate-900">{selectedApp.business_contact || "N/A"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Immutable Submitted Signature Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-primary" /> Customer Digital Signature (Signed Record)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Signed: {new Date(selectedApp.signed_at).toLocaleString("en-GB")}
                  </span>
                </div>

                {selectedApp.signature_data ? (
                  <div className="rounded-xl border border-slate-300 bg-white p-2">
                    <img
                      src={selectedApp.signature_data}
                      alt="Submitted Signature"
                      className="h-24 w-auto object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No digital signature attached.</p>
                )}
              </div>

              {/* Admin Review Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Staff Review Notes</label>
                <Textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes on verification or site inspection..."
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:w-auto rounded-full"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updating}
                    onClick={() => handleUpdateStatus("REJECTED")}
                    className="flex-1 sm:flex-none rounded-full text-red-600 border-red-200 hover:bg-red-50 text-xs font-bold"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>

                  <Button
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdateStatus("APPROVED")}
                    className="flex-1 sm:flex-none rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Approve Application
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
