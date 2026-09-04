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
  RefreshCw,
  Loader2,
  Calendar,
  AlertTriangle,
  Flame,
  Check,
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

  // Approval & Rejection Confirmation Dialogs
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await getAllGasCustomerApplications();
      setApplications(data);
    } catch (err: unknown) {
      toast.error(
        "Failed to load customer applications: " + (err instanceof Error ? err.message : "Error"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const channel = supabase
      .channel("admin_applications_realtime_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        loadApplications(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gas_customer_applications" },
        () => loadApplications(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_content_blocks" }, () =>
        loadApplications(),
      )
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
    setRejectionReason(app.admin_notes || "");
    setModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminName = authData?.user?.user_metadata?.full_name || "Admin Staff";

      await updateGasApplicationStatus({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        status: "APPROVED",
        adminNotes: adminNotes.trim(),
        reviewedBy: adminName,
      });

      toast.success(`Application for ${selectedApp.full_name} approved successfully!`);
      setApproveModalOpen(false);
      setModalOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      toast.error(
        "Failed to approve application: " + (err instanceof Error ? err.message : "Error"),
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminName = authData?.user?.user_metadata?.full_name || "Admin Staff";

      const finalReason =
        rejectionReason.trim() || adminNotes.trim() || "Application details require verification.";

      await updateGasApplicationStatus({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        status: "REJECTED",
        adminNotes: finalReason,
        reviewedBy: adminName,
      });

      toast.success(`Application for ${selectedApp.full_name} rejected.`);
      setRejectModalOpen(false);
      setModalOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      toast.error(
        "Failed to reject application: " + (err instanceof Error ? err.message : "Error"),
      );
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
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Gas Customer Applications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Gas Customer Applications (
            {applications.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review customer onboarding forms, gas usage classifications, and verify submitted
            digital signatures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadApplications}
            className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white cursor-pointer"
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
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700",
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
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading customer applications from database...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="font-extrabold text-slate-900 text-sm">No customer applications found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              New registered customers who submit their Gas Customer Application will appear here
              with their digital signatures.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Application ID
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Customer Name
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Contact Details
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Address
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Usage Type
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Submitted Date
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Digital Signature
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => (
                  <TableRow key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-mono font-bold text-xs text-slate-900">
                      #{app.id}
                    </TableCell>

                    <TableCell>
                      <span className="font-black text-xs text-slate-900 block">
                        {app.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        UID: {app.customer_id.slice(0, 8)}...
                      </span>
                    </TableCell>

                    <TableCell className="text-xs">
                      <p className="font-medium text-slate-900">{app.email}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{app.phone}</p>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700 max-w-xs truncate">
                      <p className="font-bold truncate">{app.street_address}</p>
                      <p className="text-[11px] text-slate-400">
                        {app.city} ({app.postcode})
                      </p>
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge
                        className={cn(
                          "font-bold text-[10px] uppercase",
                          app.usage_type === "DOMESTIC"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200",
                        )}
                      >
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
                              : "bg-amber-500 text-white",
                        )}
                      >
                        {app.status === "APPROVED"
                          ? "Approved"
                          : app.status === "REJECTED"
                            ? "Rejected"
                            : "Pending Review"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetails(app)}
                        className="rounded-full text-[11px] font-bold h-7 px-3 bg-slate-900 hover:bg-primary text-white transition-colors cursor-pointer"
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

      {/* 4. Details Modal */}
      {selectedApp && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <DialogHeader>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <DialogTitle className="text-xl font-black text-slate-900 font-display">
                  Gas Customer Application Review
                </DialogTitle>
                <Badge
                  className={cn(
                    "text-xs font-black uppercase px-2.5 py-0.5",
                    selectedApp.status === "APPROVED"
                      ? "bg-emerald-600 text-white"
                      : selectedApp.status === "REJECTED"
                        ? "bg-rose-600 text-white"
                        : "bg-amber-500 text-white",
                  )}
                >
                  {selectedApp.status === "APPROVED"
                    ? "Approved"
                    : selectedApp.status === "REJECTED"
                      ? "Rejected"
                      : "Pending Review"}
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
                    <span className="text-slate-500 font-medium">Full Name:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Email Address:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Phone:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Date of Birth:</span>
                    <p className="font-extrabold text-slate-900">
                      {selectedApp.date_of_birth || "Not provided"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium">Registered Street Address:</span>
                    <p className="font-extrabold text-slate-900">
                      {selectedApp.street_address}, {selectedApp.city} {selectedApp.postcode}
                    </p>
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
                    <span className="text-slate-500 font-medium">Usage Type:</span>
                    <p className="font-extrabold text-slate-900">{selectedApp.usage_type} LPG</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Existing Cylinder Status:</span>
                    <p className="font-extrabold text-slate-900">
                      {selectedApp.existing_cylinder_status}
                    </p>
                  </div>
                  {selectedApp.business_name && (
                    <>
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-blue-700 font-bold">Registered Business Name:</span>
                        <p className="font-black text-slate-900 text-sm">
                          {selectedApp.business_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Trade Sector:</span>
                        <p className="font-extrabold text-slate-900">{selectedApp.business_type}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Accounts Contact:</span>
                        <p className="font-extrabold text-slate-900">
                          {selectedApp.business_contact || "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Immutable Submitted Signature Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-primary" /> Customer Digital Signature
                    (Signed Record)
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
                <label className="font-bold text-slate-700 text-xs">Staff Review Notes</label>
                <Textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes on verification or site inspection..."
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:w-auto rounded-full text-xs font-bold"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {selectedApp.status === "APPROVED" ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                      Application Approved
                    </div>
                  ) : selectedApp.status === "REJECTED" ? (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        Application Rejected
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setApproveModalOpen(true)}
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer"
                      >
                        Re-Approve
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={updating}
                        onClick={() => setRejectModalOpen(true)}
                        className="flex-1 sm:flex-none rounded-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Application
                      </Button>

                      <Button
                        type="button"
                        disabled={updating}
                        onClick={() => setApproveModalOpen(true)}
                        className="flex-1 sm:flex-none rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Application
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. APPROVE CONFIRMATION DIALOG */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl text-left">
          <DialogHeader className="space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Approve gas customer application?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              This will approve{" "}
              <span className="font-bold text-slate-800">{selectedApp?.full_name}</span>'s
              application. They will receive an instant notification and be authorized to place
              cylinder orders.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updating}
              onClick={() => setApproveModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updating}
              onClick={handleConfirmApprove}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 gap-1.5 cursor-pointer shadow-xs shadow-emerald-200"
            >
              {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. REJECT CONFIRMATION DIALOG */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl text-left">
          <DialogHeader className="space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Reject gas customer application?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              Please provide a reason so{" "}
              <span className="font-bold text-slate-800">{selectedApp?.full_name}</span> can review
              and update their application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 py-2">
            <label className="text-xs font-bold text-slate-700">Rejection Reason</label>
            <Textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete site address or trade registration documentation required..."
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updating}
              onClick={() => setRejectModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updating}
              onClick={handleConfirmReject}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white h-9 px-4 gap-1.5 cursor-pointer shadow-xs shadow-rose-200"
            >
              {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
