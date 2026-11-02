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
  HelpCircle,
  CreditCard,
  Percent,
  Tag,
  Send,
  Eye,
  ShieldCheck,
  History,
  Phone,
  Mail,
  Package,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  approveGasCustomerApplication,
  declineGasCustomerApplication,
  requestMoreInfoGasCustomerApplication,
  GasCustomerApplication,
} from "@/lib/application-service";

export function ManagerApplicationsView() {
  const [applications, setApplications] = useState<GasCustomerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");

  // Selected Application & Details Dialog
  const [selectedApp, setSelectedApp] = useState<GasCustomerApplication | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Decision Modal States
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [pricingBand, setPricingBand] = useState("Standard Domestic");
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [creditApproved, setCreditApproved] = useState(false);
  const [creditLimit, setCreditLimit] = useState<number>(500);
  const [managerApprovalNotes, setManagerApprovalNotes] = useState("");

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [moreInfoModalOpen, setMoreInfoModalOpen] = useState(false);
  const [requestedInfoText, setRequestedInfoText] = useState("");

  const [submittingAction, setSubmittingAction] = useState(false);

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
      .channel("manager_applications_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gas_customer_applications" },
        () => loadApplications(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        loadApplications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-open application if linked with ?appId=... in query string
  useEffect(() => {
    if (applications.length === 0) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const targetAppId = searchParams.get("appId") || searchParams.get("id");
      if (targetAppId) {
        const found = applications.find(
          (a) =>
            a.id === targetAppId ||
            a.customer_id === targetAppId ||
            a.application_reference === targetAppId,
        );
        if (found) {
          handleOpenDetails(found);
        }
      }
    } catch {
      /* ignore */
    }
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const ref = app.application_reference || app.id || "";
      const matchesSearch =
        (app.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.business_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.postcode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.toLowerCase().includes(searchQuery.toLowerCase());

      const appStatus = app.status;
      let matchesStatus = true;
      if (statusFilter === "PENDING") {
        matchesStatus = appStatus === "PENDING" || appStatus === "SUBMITTED";
      } else if (statusFilter === "MORE_INFO_NEEDED") {
        matchesStatus = appStatus === "MORE_INFO_NEEDED";
      } else if (statusFilter === "APPROVED") {
        matchesStatus = appStatus === "APPROVED";
      } else if (statusFilter === "DECLINED") {
        matchesStatus = appStatus === "DECLINED" || appStatus === "REJECTED";
      }

      const appType =
        app.customer_type || (app.usage_type === "COMMERCIAL" || app.usage_type === "BULK" ? "BUSINESS" : "HOME");
      const matchesType =
        customerTypeFilter === "ALL" || appType.toUpperCase() === customerTypeFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [applications, searchQuery, statusFilter, customerTypeFilter]);

  const handleOpenDetails = (app: GasCustomerApplication) => {
    setSelectedApp(app);
    // Pre-populate approval defaults based on application type
    const isBusiness =
      app.customer_type === "BUSINESS" || app.usage_type === "COMMERCIAL" || app.usage_type === "BULK";
    setPricingBand(isBusiness ? "Commercial Trade (Band B)" : "Standard Domestic");
    setDiscountPercentage(isBusiness ? 5 : 0);
    setCreditApproved(Boolean(app.credit_account_approved));
    setCreditLimit(app.credit_limit || (isBusiness ? 1000 : 500));
    setManagerApprovalNotes(app.admin_notes || "");
    setDeclineReason(app.rejection_reason || "");
    setRequestedInfoText(app.more_info_requested || "");
    setDetailsModalOpen(true);
  };

  // 1. APPROVE ACTION
  const handleConfirmApprove = async () => {
    if (!selectedApp) return;
    setSubmittingAction(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const managerName = authData?.user?.user_metadata?.full_name || "Depot Manager";

      await approveGasCustomerApplication({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        pricingBand,
        discountPercentage: Number(discountPercentage) || 0,
        creditApproved,
        creditLimit: creditApproved ? Number(creditLimit) || 0 : 0,
        managerNotes: managerApprovalNotes.trim(),
        reviewedBy: managerName,
      });

      toast.success(
        `Application ${selectedApp.application_reference || selectedApp.id} approved! Customer account activated.`,
      );
      setApproveModalOpen(false);
      setDetailsModalOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      toast.error(
        "Failed to approve application: " + (err instanceof Error ? err.message : "Error"),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // 2. DECLINE ACTION
  const handleConfirmDecline = async () => {
    if (!selectedApp) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining this application.");
      return;
    }
    setSubmittingAction(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const managerName = authData?.user?.user_metadata?.full_name || "Depot Manager";

      await declineGasCustomerApplication({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        reason: declineReason.trim(),
        reviewedBy: managerName,
      });

      toast.success(
        `Application ${selectedApp.application_reference || selectedApp.id} marked as Declined. Customer notified.`,
      );
      setDeclineModalOpen(false);
      setDetailsModalOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      toast.error(
        "Failed to decline application: " + (err instanceof Error ? err.message : "Error"),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. MORE INFORMATION NEEDED ACTION
  const handleConfirmMoreInfo = async () => {
    if (!selectedApp) return;
    if (!requestedInfoText.trim()) {
      toast.error("Please specify the missing information needed from the customer.");
      return;
    }
    setSubmittingAction(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const managerName = authData?.user?.user_metadata?.full_name || "Depot Manager";

      await requestMoreInfoGasCustomerApplication({
        applicationId: selectedApp.id,
        customerId: selectedApp.customer_id,
        requestedInfo: requestedInfoText.trim(),
        reviewedBy: managerName,
      });

      toast.success(
        `Additional information requested for application ${selectedApp.application_reference || selectedApp.id}. Customer notified.`,
      );
      setMoreInfoModalOpen(false);
      setDetailsModalOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      toast.error(
        "Failed to request more information: " + (err instanceof Error ? err.message : "Error"),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingCount = applications.filter(
    (a) => a.status === "PENDING" || a.status === "SUBMITTED",
  ).length;
  const moreInfoCount = applications.filter((a) => a.status === "MORE_INFO_NEEDED").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const declinedCount = applications.filter(
    (a) => a.status === "DECLINED" || a.status === "REJECTED",
  ).length;

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Gas Customer Applications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2 font-display">
            <FileText className="h-7 w-7 text-primary" /> Gas Customer Applications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review customer onboarding requests, Home vs. Business requirements, verify safety compliance, and decide on approval, pricing bands, and credit limits.
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
            <span>Sync Applications</span>
          </Button>
        </div>
      </div>

      {/* 2. Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 shadow-xs",
            statusFilter === "PENDING"
              ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-300"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-700">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
          <p className="text-[10px] text-slate-500">Requires manager action</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("MORE_INFO_NEEDED")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 shadow-xs",
            statusFilter === "MORE_INFO_NEEDED"
              ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-300"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-blue-700">More Info Needed</span>
            <HelpCircle className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{moreInfoCount}</p>
          <p className="text-[10px] text-slate-500">Awaiting customer response</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("APPROVED")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 shadow-xs",
            statusFilter === "APPROVED"
              ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-300"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-700">Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{approvedCount}</p>
          <p className="text-[10px] text-slate-500">Accounts active</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("DECLINED")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1 shadow-xs",
            statusFilter === "DECLINED"
              ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-300"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-rose-700">Declined</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{declinedCount}</p>
          <p className="text-[10px] text-slate-500">Not approved</p>
        </button>
      </div>

      {/* 3. Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ref, email, phone, postcode..."
            className="pl-9 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-xs rounded-xl w-[140px] bg-slate-50 border-slate-200 font-bold">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses ({applications.length})</SelectItem>
              <SelectItem value="PENDING">Pending Review ({pendingCount})</SelectItem>
              <SelectItem value="MORE_INFO_NEEDED">More Info Needed ({moreInfoCount})</SelectItem>
              <SelectItem value="APPROVED">Approved ({approvedCount})</SelectItem>
              <SelectItem value="DECLINED">Declined ({declinedCount})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
            <SelectTrigger className="h-10 text-xs rounded-xl w-[130px] bg-slate-50 border-slate-200 font-bold">
              <SelectValue placeholder="Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="HOME">Home</SelectItem>
              <SelectItem value="BUSINESS">Business</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "ALL" || customerTypeFilter !== "ALL" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setCustomerTypeFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-slate-500 hover:text-slate-900 rounded-full cursor-pointer"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 4. Applications Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Reference</TableHead>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Customer &amp; Type</TableHead>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Location</TableHead>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Previous Account</TableHead>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Status</TableHead>
              <TableHead className="text-[11px] font-black uppercase text-slate-600">Pricing / Terms</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase text-slate-600">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
                  <p className="text-xs text-slate-500 font-bold mt-2">Loading applications...</p>
                </TableCell>
              </TableRow>
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 stroke-[1.5] mb-2" />
                  <p className="text-sm font-bold text-slate-700">No applications found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your filters or search terms.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((app) => {
                const ref = app.application_reference || `JSS-APP-${app.id.slice(0, 8).toUpperCase()}`;
                const isHome = app.customer_type === "HOME" || app.usage_type === "DOMESTIC";
                const isApproved = app.status === "APPROVED";
                const isMoreInfo = app.status === "MORE_INFO_NEEDED";
                const isDeclined = app.status === "DECLINED" || app.status === "REJECTED";

                return (
                  <TableRow key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="font-mono text-xs font-black text-slate-900">
                      {ref}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                          {isHome ? (
                            <Home className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          <span>{app.full_name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {app.business_name ? `${app.business_name} • ` : ""}
                          {app.email}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">
                          {app.city || "Gloucester"} {app.postcode}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      {app.has_previous_purchases ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                          Yes: {app.previous_account_details ? app.previous_account_details.slice(0, 16) : "Known Depot"}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">New Customer</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {isApproved ? (
                        <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                          Approved
                        </Badge>
                      ) : isMoreInfo ? (
                        <Badge className="bg-amber-600 text-white font-extrabold text-[10px]">
                          More Info Needed
                        </Badge>
                      ) : isDeclined ? (
                        <Badge className="bg-rose-600 text-white font-extrabold text-[10px]">
                          Declined
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[10px]">
                          Pending Review
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      {isApproved ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-emerald-800 text-[11px]">
                            {app.pricing_band || "Standard"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {app.discount_percentage ? `${app.discount_percentage}% off` : "0% off"}
                            {app.credit_account_approved ? ` • Credit £${app.credit_limit}` : ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetails(app)}
                        className="rounded-full text-xs font-bold gap-1 px-3 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================================================= */}
      {/* 5. APPLICATION DETAILS & DECISION MODAL */}
      {/* ========================================================================= */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 text-left">
          {selectedApp && (
            <div className="space-y-6">
              <DialogHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono font-black text-primary uppercase">
                    Ref: {selectedApp.application_reference || selectedApp.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">
                      {selectedApp.customer_type === "BUSINESS" ? "🏢 Business" : "🏠 Home"}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-xs font-bold",
                        selectedApp.status === "APPROVED"
                          ? "bg-emerald-600 text-white"
                          : selectedApp.status === "MORE_INFO_NEEDED"
                            ? "bg-amber-600 text-white"
                            : selectedApp.status === "DECLINED" || selectedApp.status === "REJECTED"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-100 text-amber-900 border-amber-300",
                      )}
                    >
                      {selectedApp.status}
                    </Badge>
                  </div>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-display">
                  {selectedApp.full_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Submitted on {new Date(selectedApp.created_at || selectedApp.signed_at).toLocaleString("en-GB")}
                </DialogDescription>
              </DialogHeader>

              {/* Review Sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Customer Contact */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Customer Contact Details
                  </h4>
                  <p><span className="text-slate-500">Full Name:</span> <strong className="text-slate-900">{selectedApp.full_name}</strong></p>
                  <p><span className="text-slate-500">Email:</span> <strong className="text-slate-900">{selectedApp.email}</strong></p>
                  <p><span className="text-slate-500">Telephone:</span> <strong className="text-slate-900">{selectedApp.phone}</strong></p>
                  <p><span className="text-slate-500">Preferred Contact:</span> <strong className="text-slate-900">{selectedApp.preferred_contact_method || "Phone"}</strong></p>
                </div>

                {/* Premises & Delivery Address */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery &amp; Site Address
                  </h4>
                  <p><span className="text-slate-500">Address:</span> <strong className="text-slate-900">{selectedApp.street_address}</strong></p>
                  <p><span className="text-slate-500">Town/City:</span> <strong className="text-slate-900">{selectedApp.city}</strong></p>
                  <p><span className="text-slate-500">Postcode:</span> <strong className="text-slate-900 font-mono">{selectedApp.postcode}</strong></p>
                  {selectedApp.billing_address && (
                    <p><span className="text-slate-500">Billing:</span> <strong className="text-slate-900">{selectedApp.billing_address}</strong></p>
                  )}
                </div>

                {/* Home / Business Requirements */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 sm:col-span-2">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-primary" /> Gas &amp; Cylinder Requirements
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p><span className="text-slate-500">Usage Category:</span> <strong className="text-slate-900">{selectedApp.usage_type} LPG</strong></p>
                    <p><span className="text-slate-500">Cylinder Type(s):</span> <strong className="text-slate-900">{selectedApp.cylinder_type || "Propane LPG"}</strong></p>
                    <p><span className="text-slate-500">Sizes Requested:</span> <strong className="text-slate-900">{selectedApp.cylinder_size || "Standard Bottles"}</strong></p>
                    <p><span className="text-slate-500">Exchange Status:</span> <strong className="text-slate-900">{selectedApp.existing_cylinder_status || "Standard Exchange"}</strong></p>
                  </div>
                  {selectedApp.order_requirement && (
                    <div className="pt-2 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 font-medium">Notes &amp; Appliances:</span>
                      <p className="text-slate-800 font-mono mt-0.5 whitespace-pre-wrap">{selectedApp.order_requirement}</p>
                    </div>
                  )}
                </div>

                {/* Commercial Details if Business */}
                {selectedApp.business_name && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2 sm:col-span-2">
                    <h4 className="font-black text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" /> Commercial Business Registration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <p><span className="text-blue-700">Business Name:</span> <strong className="text-slate-900">{selectedApp.business_name}</strong></p>
                      <p><span className="text-blue-700">Sector/Type:</span> <strong className="text-slate-900">{selectedApp.business_type || "Commercial"}</strong></p>
                      <p><span className="text-blue-700">Contact:</span> <strong className="text-slate-900">{selectedApp.business_contact || selectedApp.phone}</strong></p>
                    </div>
                  </div>
                )}

                {/* Previous Customer Status */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 sm:col-span-2">
                  <h4 className="font-black text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Previous John Stayte Customer Check
                  </h4>
                  <p>
                    <span className="text-amber-800 font-medium">Purchased previously from John Stayte:</span>{" "}
                    <strong className="text-slate-900">
                      {selectedApp.has_previous_purchases ? "YES (Existing Account Record)" : "NO (New Customer)"}
                    </strong>
                  </p>
                  {selectedApp.previous_account_details && (
                    <p className="text-[11px] text-amber-900">
                      <span className="font-bold">Provided Account Details:</span> {selectedApp.previous_account_details}
                    </p>
                  )}
                </div>

                {/* More Info Request & Customer Response History */}
                {(selectedApp.more_info_requested || selectedApp.more_info_response) && (
                  <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2 sm:col-span-2">
                    <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-slate-600" /> Additional Information Correspondence
                    </h4>
                    {selectedApp.more_info_requested && (
                      <p className="text-xs text-amber-900">
                        <strong>Manager Request:</strong> "{selectedApp.more_info_requested}"
                      </p>
                    )}
                    {selectedApp.more_info_response && (
                      <p className="text-xs text-emerald-900">
                        <strong>Customer Reply:</strong> "{selectedApp.more_info_response}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* THREE DECISION BUTTONS */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Manager Review Decision
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    onClick={() => setApproveModalOpen(true)}
                    className="rounded-xl py-3 font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve Application</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setMoreInfoModalOpen(true)}
                    className="rounded-xl py-3 font-black text-xs border-amber-300 text-amber-900 hover:bg-amber-50 gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                    <span>More Info Needed</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setDeclineModalOpen(true)}
                    className="rounded-xl py-3 font-black text-xs border-rose-300 text-rose-800 hover:bg-rose-50 gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Decline Application</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DECISION MODAL A: APPROVE */}
      {/* ========================================================================= */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-7 text-left space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Approve Gas Application
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign pricing band, applicable discount, credit account facilities, and activate this customer account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Pricing Band Selection */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-800">Assign Customer Pricing Band *</Label>
              <Select value={pricingBand} onValueChange={setPricingBand}>
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 border-slate-300 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard Domestic">Standard Domestic (Band S)</SelectItem>
                  <SelectItem value="High Volume Domestic (Band A)">High Volume Domestic (Band A)</SelectItem>
                  <SelectItem value="Commercial Trade (Band B)">Commercial Trade (Band B)</SelectItem>
                  <SelectItem value="Hospitality & Catering (Band C)">Hospitality &amp; Catering (Band C)</SelectItem>
                  <SelectItem value="Industrial & Agricultural (Band D)">Industrial &amp; Agricultural (Band D)</SelectItem>
                  <SelectItem value="Bulk LPG Propane (Band E)">Bulk LPG Propane (Band E)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Percentage */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-800">Discount Percentage (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="h-10 text-xs bg-slate-50 border-slate-300 rounded-xl"
              />
            </div>

            {/* Credit Account Facilities */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-xs text-slate-900">Approve Credit Account Facility</p>
                  <p className="text-[11px] text-slate-500">Enable 30-day invoice terms for this customer</p>
                </div>
                <Switch checked={creditApproved} onCheckedChange={setCreditApproved} />
              </div>

              {creditApproved && (
                <div className="space-y-1 pt-1 animate-in fade-in-50 duration-200">
                  <Label className="font-bold text-slate-800">Approved Credit Limit (£ GBP)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="h-9 text-xs bg-white border-slate-300 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Manager Notes */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-800">Manager Approval Notes (Optional)</Label>
              <Textarea
                rows={2}
                value={managerApprovalNotes}
                onChange={(e) => setManagerApprovalNotes(e.target.value)}
                placeholder="e.g. Verified existing paper records, linked commercial cylinder agreement."
                className="text-xs bg-slate-50 border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApprove}
              disabled={submittingAction}
              className="rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
            >
              {submittingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Confirm &amp; Activate Account</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DECISION MODAL B: DECLINE */}
      {/* ========================================================================= */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 text-left space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-900 font-display flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" /> Decline Application
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a clear reason for declining this application. The reason will be recorded in the audit history and sent to the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            <Label className="font-bold text-slate-800">Reason for Decline *</Label>
            <Textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Delivery address is outside our Gloucestershire distribution area; or unable to verify business registration."
              className="text-xs bg-slate-50 border-slate-300 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineModalOpen(false)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDecline}
              disabled={submittingAction || !declineReason.trim()}
              className="rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs gap-1.5"
            >
              {submittingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>Confirm Decline</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DECISION MODAL C: MORE INFORMATION NEEDED */}
      {/* ========================================================================= */}
      <Dialog open={moreInfoModalOpen} onOpenChange={setMoreInfoModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 text-left space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-amber-950 font-display flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-600" /> Request More Information
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify the details or documentation needed from the applicant before you can make an approval decision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            <Label className="font-bold text-slate-800">Information Needed from Customer *</Label>
            <Textarea
              rows={3}
              value={requestedInfoText}
              onChange={(e) => setRequestedInfoText(e.target.value)}
              placeholder="e.g. Please clarify cylinder cage storage access on site; or provide company VAT registration certificate."
              className="text-xs bg-slate-50 border-slate-300 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMoreInfoModalOpen(false)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmMoreInfo}
              disabled={submittingAction || !requestedInfoText.trim()}
              className="rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
            >
              {submittingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Send Request to Customer</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
