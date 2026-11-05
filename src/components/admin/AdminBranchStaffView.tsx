import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Search,
  Plus,
  MapPin,
  Mail,
  Phone,
  Key,
  Power,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Clock,
  ShieldAlert,
  Loader2,
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ACTIVE_FORECOURT_BRANCHES,
  isPendingBranchAssignment,
  resolveBranchInfo,
  type BranchDetails,
} from "@/lib/branch-service";
import {
  getBranchStaffList,
  createBranchStaff,
  checkBranchStaffEmail,
  assignExistingCustomerAsBranchStaff,
  updateBranchStaffAssignment,
  toggleBranchStaffStatus,
  resetBranchStaffPassword,
  type BranchStaffRecord,
} from "@/lib/branch-staff-service";

export function AdminBranchStaffView() {
  const [staffList, setStaffList] = useState<BranchStaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "inactive">("active");

  // Existing Account Detection State in Add Staff Modal
  interface ExistingAccountDetection {
    status: "existing_customer" | "blocked";
    user?: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      status: string;
      assignedBranch?: string;
      assignedBranchId?: string | null;
      createdAt?: string;
    };
    reason?: string;
  }

  const [existingAccountState, setExistingAccountState] = useState<ExistingAccountDetection | null>(null);
  const [roleChangeConfirmed, setRoleChangeConfirmed] = useState(false);
  const [assigningExisting, setAssigningExisting] = useState(false);

  // Change Branch Assignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedStaffForReassign, setSelectedStaffForReassign] = useState<BranchStaffRecord | null>(null);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Status Toggle Confirmation
  const [statusDialogStaff, setStatusDialogStaff] = useState<BranchStaffRecord | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStaff, setResetStaff] = useState<BranchStaffRecord | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // View Details Modal State
  const [viewDetailsStaff, setViewDetailsStaff] = useState<BranchStaffRecord | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await getBranchStaffList();
      setStaffList(data);
    } catch (err: any) {
      toast.error("Failed to load branch staff list: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        staff.full_name.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        staff.assigned_branch.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter by branch
      if (branchFilter !== "all") {
        if (branchFilter === "pending") {
          if (!isPendingBranchAssignment(staff.assigned_branch)) return false;
        } else {
          const staffBranchInfo = resolveBranchInfo(staff.assigned_branch, staff.assigned_branch_id);
          const staffTown = staffBranchInfo?.town?.toLowerCase();
          const targetTown = branchFilter.toLowerCase();
          if (staffTown !== targetTown && !staff.assigned_branch.toLowerCase().includes(targetTown)) {
            return false;
          }
        }
      }

      // Filter by status
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (!isPendingBranchAssignment(staff.assigned_branch)) return false;
        } else if (staff.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [staffList, searchQuery, branchFilter, statusFilter]);

  // KPI Counts
  const kpis = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === "active").length;
    const pending = staffList.filter((s) => isPendingBranchAssignment(s.assigned_branch)).length;
    const inactive = staffList.filter((s) => s.status === "inactive").length;
    return { total, active, pending, inactive };
  }, [staffList]);

  const resetAddModalForm = () => {
    setNewFullName("");
    setNewEmail("");
    setNewPassword("");
    setShowNewPassword(false);
    setNewPhone("");
    setNewBranchId("");
    setNewStatus("active");
    setExistingAccountState(null);
    setRoleChangeConfirmed(false);
  };

  // Handle Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return toast.error("Please enter staff member's full name.");
    if (!newEmail.trim()) return toast.error("Please enter a valid email address.");
    if (!newBranchId) return toast.error("Please select a customer collection forecourt.");

    setCreating(true);
    try {
      // 1. Check whether email already exists in system
      const check = await checkBranchStaffEmail(newEmail);
      if (!check.ok) {
        throw new Error(check.error || "Failed to verify email address.");
      }

      // 2. If email exists, block conversion and require a dedicated separate staff email
      if (check.exists) {
        setExistingAccountState({
          status: "blocked",
          user: check.existingUser,
          reason:
            check.message ||
            "This email address is already registered. Branch Staff members must have dedicated, separate staff accounts with their own email and login credentials.",
        });
        setCreating(false);
        return;
      }

      // 3. New email: proceed with separate branch staff creation
      const res = await createBranchStaff({
        fullName: newFullName,
        email: newEmail,
        password: newPassword.trim() || undefined,
        phone: newPhone.trim() || undefined,
        assignedBranchId: newBranchId,
        status: newStatus,
      });

      if (!res.ok) {
        if (res.existingUser) {
          setExistingAccountState({
            status: "blocked",
            user: res.existingUser,
            reason: res.error || "This email address is already registered. Please provide a separate staff email address.",
          });
          return;
        }
        throw new Error(res.error || "Failed to create branch staff.");
      }

      toast.success(res.message || "Branch staff created successfully!");
      setAddModalOpen(false);
      resetAddModalForm();
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Error creating branch staff.");
    } finally {
      setCreating(false);
    }
  };

  // Handle Explicit Confirmation for Assigning Existing Customer as Branch Staff
  const handleConfirmCustomerAssignment = async () => {
    if (!existingAccountState?.user) return;
    if (!roleChangeConfirmed) {
      return toast.error("Please check the confirmation box to authorize changing this customer's role.");
    }
    if (!newBranchId) {
      return toast.error("Please select a customer collection forecourt.");
    }

    setAssigningExisting(true);
    try {
      const res = await assignExistingCustomerAsBranchStaff({
        userId: existingAccountState.user.id,
        email: newEmail,
        assignedBranchId: newBranchId,
        status: newStatus,
        fullName: newFullName.trim() || undefined,
        phone: newPhone.trim() || undefined,
        confirmRoleChange: true,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to assign customer as branch staff.");
      }

      toast.success(res.message || "Customer account successfully assigned as Branch Staff!");
      setAddModalOpen(false);
      resetAddModalForm();
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Error assigning customer as branch staff.");
    } finally {
      setAssigningExisting(false);
    }
  };

  // Handle Reassign Branch
  const handleConfirmReassign = async () => {
    if (!selectedStaffForReassign || !targetBranchId) return;
    setReassigning(true);
    try {
      const res = await updateBranchStaffAssignment(
        selectedStaffForReassign.id,
        targetBranchId,
      );

      if (!res.ok) {
        throw new Error(res.error || "Failed to reassign branch.");
      }

      toast.success(res.message || "Branch assignment updated!");
      setReassignModalOpen(false);
      setSelectedStaffForReassign(null);
      setTargetBranchId("");
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Error reassigning branch.");
    } finally {
      setReassigning(false);
    }
  };

  // Handle Toggle Status
  const handleConfirmToggleStatus = async () => {
    if (!statusDialogStaff) return;
    setTogglingStatus(true);
    try {
      const res = await toggleBranchStaffStatus(
        statusDialogStaff.id,
        statusDialogStaff.status,
      );

      if (!res.ok) {
        throw new Error(res.error || "Failed to update status.");
      }

      toast.success(res.message || "Status updated!");
      setStatusDialogStaff(null);
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Error updating status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff) return;
    setResettingPassword(true);
    try {
      const res = await resetBranchStaffPassword(
        resetStaff.id,
        resetStaff.email,
        customPassword.trim() || undefined,
      );

      if (!res.ok) {
        throw new Error(res.error || "Failed to reset password.");
      }

      toast.success(res.message || "Password updated successfully.");
      setResetModalOpen(false);
      setResetStaff(null);
      setCustomPassword("");
      setShowCustomPassword(false);
    } catch (err: any) {
      toast.error(err.message || "Error resetting password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Operations</span>
            <span>/</span>
            <span className="text-foreground font-bold">Branch Staff Management</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-red-600" />
            Branch Staff Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Allocate and govern forecourt staff across the four active Click &amp; Collect branches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStaff}
            disabled={loading}
            className="rounded-xl text-xs font-bold border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Branch Staff
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Branch Staff
            </span>
            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.total}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Forecourt team members</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Active Staff
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{kpis.active}</div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Operational in branch</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Pending Assignment
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{kpis.pending}</div>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">Awaiting forecourt allocation</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Inactive Staff
            </span>
            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-600 mt-2">{kpis.inactive}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Deactivated access</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, or branch..."
            className="pl-9 h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {ACTIVE_FORECOURT_BRANCHES.map((b) => (
                <SelectItem key={b.id} value={b.town}>
                  {b.town}
                </SelectItem>
              ))}
              <SelectItem value="pending">Pending Confirmation</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending Assignment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5">
                Staff Member
              </TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5">
                Email
              </TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5">
                Assigned Branch
              </TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5">
                Created Date
              </TableHead>
              <TableHead className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 py-3.5 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                    <span>Loading branch staff accounts...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-slate-300" />
                    <span className="font-bold text-slate-700">No branch staff found</span>
                    <span className="text-[11px] text-slate-400">
                      Try adjusting your search criteria or click "Add Branch Staff" to onboard.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const isPending = isPendingBranchAssignment(staff.assigned_branch);
                const branchObj = resolveBranchInfo(staff.assigned_branch, staff.assigned_branch_id);
                const displayBranchName = branchObj ? branchObj.town : staff.assigned_branch;

                return (
                  <TableRow key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Staff Member */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {staff.full_name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "BS"}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {staff.full_name}
                            {staff.email === "staff@jss.com" && (
                              <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                Default Account
                              </Badge>
                            )}
                          </div>
                          {staff.phone && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs text-slate-600 font-medium py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{staff.email}</span>
                      </div>
                    </TableCell>

                    {/* Assigned Branch */}
                    <TableCell className="py-3.5">
                      {isPending ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 font-extrabold text-[10px] flex items-center gap-1 w-fit"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Pending Confirmation
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold text-[10px] flex items-center gap-1 w-fit"
                        >
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          {displayBranchName}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 ${
                          staff.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {staff.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-slate-500 py-3.5">
                      {staff.created_at ? new Date(staff.created_at).toLocaleDateString("en-GB") : "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reassign Branch */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Assign or change branch"
                          onClick={() => {
                            setSelectedStaffForReassign(staff);
                            setTargetBranchId(staff.assigned_branch_id || "");
                            setReassignModalOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold"
                        >
                          <Building2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                          {isPending ? "Assign Branch" : "Change Branch"}
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reset staff access or password"
                          onClick={() => {
                            setResetStaff(staff);
                            setCustomPassword("");
                            setShowCustomPassword(false);
                            setResetModalOpen(true);
                          }}
                          className="h-8 px-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </Button>

                        {/* Toggle Status */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={staff.status === "active" ? "Deactivate account" : "Activate account"}
                          onClick={() => setStatusDialogStaff(staff)}
                          className={`h-8 px-2 rounded-lg text-xs ${
                            staff.status === "active"
                              ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>

                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View staff details"
                          onClick={() => setViewDetailsStaff(staff)}
                          className="h-8 px-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL 1: ADD BRANCH STAFF */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) resetAddModalForm();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-600" />
              {existingAccountState?.status === "blocked"
                ? "Existing Account Detected"
                : "Add Branch Staff Member"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {existingAccountState?.status === "blocked"
                ? "Dedicated staff account required for forecourt operations."
                : "Create an authenticated account for a customer collection forecourt team member."}
            </DialogDescription>
          </DialogHeader>

          {existingAccountState?.status === "blocked" ? (
            <div className="space-y-4 mt-2">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">
                    Separate Staff Account Required
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  {existingAccountState.reason}
                </p>
                {existingAccountState.user && (
                  <div className="bg-white/90 p-3 rounded-lg border border-amber-200/60 text-xs space-y-1.5 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">User:</span>
                      <span className="font-bold text-slate-900">{existingAccountState.user.fullName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Email:</span>
                      <span className="font-mono text-slate-700">{newEmail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Current Role:</span>
                      <Badge variant="outline" className="text-[10px] font-bold capitalize bg-slate-100 text-slate-800">
                        {existingAccountState.user.role.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-amber-200/60">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Personal customer account, login password, and orders remain 100% untouched
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    Staff accounts must have their own unique credentials and separate user ID
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddModalOpen(false);
                    resetAddModalForm();
                  }}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setNewEmail("");
                    setExistingAccountState(null);
                  }}
                  className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Use a Different Email
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateStaff} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  required
                  className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff.name@johnstayteservices.co.uk"
                  required
                  className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank for secure default (BranchStayte2026!)"
                    className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Can be updated by the staff member upon login.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phone Number (Optional)
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 01453 762541"
                  className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assign Forecourt Branch <span className="text-red-500">*</span>
                </label>
                <Select value={newBranchId} onValueChange={setNewBranchId} required>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold">
                    <SelectValue placeholder="Select active collection forecourt" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVE_FORECOURT_BRANCHES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="font-bold">{b.town}</span> — {b.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Strictly limited to the 4 customer collection forecourts. Whitminster Depot is excluded.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Status</label>
                <Select
                  value={newStatus}
                  onValueChange={(val: "active" | "inactive") => setNewStatus(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Operational immediately)</SelectItem>
                    <SelectItem value="inactive">Inactive (Suspended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddModalOpen(false);
                    resetAddModalForm();
                  }}
                  disabled={creating}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Checking &amp; Creating...
                    </>
                  ) : (
                    "Create Branch Staff"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ASSIGN / CHANGE BRANCH WITH CONFIRMATION */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-600" />
              Assign Forecourt Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Change the operational collection branch for{" "}
              <strong className="text-slate-900">{selectedStaffForReassign?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 font-semibold">Current Assignment:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedStaffForReassign?.assigned_branch || "Pending Confirmation"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span className="font-medium text-slate-700">{selectedStaffForReassign?.email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select New Forecourt Branch <span className="text-red-500">*</span>
              </label>
              <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold">
                  <SelectValue placeholder="Choose collection forecourt" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_FORECOURT_BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="font-bold">{b.town}</span> — {b.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Confirmation Warning:</strong> Changing this assignment will immediately
                update this staff member's Click &amp; Collect dashboard. They will only see
                orders belonging to the newly selected forecourt.
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReassignModalOpen(false)}
                disabled={reassigning}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReassign}
                disabled={reassigning || !targetBranchId}
                className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
              >
                {reassigning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Updating Assignment...
                  </>
                ) : (
                  "Confirm Branch Assignment"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: TOGGLE STATUS CONFIRMATION */}
      <AlertDialog
        open={!!statusDialogStaff}
        onOpenChange={(open) => !open && setStatusDialogStaff(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl bg-white p-6 border border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Power className="h-5 w-5 text-red-600" />
              {statusDialogStaff?.status === "active" ? "Deactivate" : "Activate"} Staff Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to {statusDialogStaff?.status === "active" ? "deactivate" : "activate"}{" "}
              <strong>{statusDialogStaff?.full_name}</strong> ({statusDialogStaff?.email})?
              {statusDialogStaff?.status === "active"
                ? " Deactivated staff will not be able to log in or fulfill Click & Collect orders."
                : " Activated staff will regain access to their assigned forecourt portal."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingStatus} className="rounded-xl text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleStatus}
              disabled={togglingStatus}
              className={`rounded-xl text-xs font-bold text-white shadow-md ${
                statusDialogStaff?.status === "active"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              }`}
            >
              {togglingStatus ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 4: RESET PASSWORD / ACCESS */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Key className="h-5 w-5 text-red-600" />
              Reset Staff Login Access
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reset login access for <strong>{resetStaff?.full_name}</strong> ({resetStaff?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                New Temporary Password (Optional)
              </label>
              <div className="relative">
                <Input
                  type={showCustomPassword ? "text" : "password"}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave blank to send email reset link"
                  className="h-10 rounded-xl text-xs bg-slate-50 border-slate-200 focus:bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomPassword((prev) => !prev)}
                  title={showCustomPassword ? "Hide password" : "Show password"}
                  aria-label={showCustomPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                >
                  {showCustomPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                If provided, must be at least 8 characters. Otherwise a secure Supabase recovery link
                will be generated.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(false)}
                disabled={resettingPassword}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resettingPassword}
                className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Resetting...
                  </>
                ) : customPassword.trim() ? (
                  "Set New Password"
                ) : (
                  "Send Recovery Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: VIEW STAFF DETAILS */}
      <Dialog open={!!viewDetailsStaff} onOpenChange={(open) => !open && setViewDetailsStaff(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-700" />
              Staff Profile Details
            </DialogTitle>
          </DialogHeader>

          {viewDetailsStaff && (
            <div className="space-y-3 mt-2 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center font-black text-sm text-slate-700">
                  {viewDetailsStaff.full_name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "BS"}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{viewDetailsStaff.full_name}</h3>
                  <p className="text-slate-500 text-xs">{viewDetailsStaff.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Role</span>
                  <span className="font-extrabold text-slate-800">{viewDetailsStaff.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                  <span className="font-extrabold capitalize text-slate-800">{viewDetailsStaff.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Assigned Forecourt</span>
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-red-600" />
                  {viewDetailsStaff.assigned_branch}
                </span>
                {viewDetailsStaff.assigned_branch_id && (
                  <span className="text-[10px] font-mono text-slate-400 block mt-1">
                    Station ID: {viewDetailsStaff.assigned_branch_id}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">System User ID</span>
                <span className="font-mono text-[11px] text-slate-600 break-all select-all">
                  {viewDetailsStaff.id}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1 pt-1">
                <span>Created: {new Date(viewDetailsStaff.created_at).toLocaleString("en-GB")}</span>
                {viewDetailsStaff.updated_at && (
                  <span>Updated: {new Date(viewDetailsStaff.updated_at).toLocaleDateString("en-GB")}</span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewDetailsStaff(null)}
              className="rounded-xl text-xs w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

