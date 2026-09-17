import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Power,
  Loader2,
  DollarSign,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp, useStore } from "@/lib/store";
import {
  fetchCylinderDeposits,
  createCylinderDeposit,
  updateCylinderDeposit,
  toggleCylinderDepositStatus,
  deleteCylinderDeposit,
  getEligibleLpgProducts,
  CylinderDepositRecord,
} from "@/lib/cylinder-deposit-service";

export function AdminCylinderDepositsView() {
  const { user } = useStore();
  const [deposits, setDeposits] = useState<CylinderDepositRecord[]>([]);
  const [eligibleProducts, setEligibleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<CylinderDepositRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedProductId, setSelectedProductId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [depList, prodList] = await Promise.all([
        fetchCylinderDeposits(),
        getEligibleLpgProducts(),
      ]);
      setDeposits(depList);
      setEligibleProducts(prodList);
    } catch (err: any) {
      toast.error("Failed to load cylinder deposits: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingDeposit(null);
    setSelectedProductId("");
    setDepositAmount("");
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (dep: CylinderDepositRecord) => {
    setEditingDeposit(dep);
    setSelectedProductId(dep.product_id);
    setDepositAmount(dep.deposit_amount.toString());
    setIsActive(dep.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(depositAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError("Please enter a valid non-negative deposit amount.");
      return;
    }

    if (!editingDeposit && !selectedProductId) {
      setFormError("Please select an LPG Cylinder product.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDeposit) {
        await updateCylinderDeposit(editingDeposit.id, {
          depositAmount: parsedAmount,
          isActive,
          updatedBy: user?.email || user?.name || "admin",
        });
        toast.success("Security deposit updated successfully!");
      } else {
        await createCylinderDeposit({
          productId: selectedProductId,
          depositAmount: parsedAmount,
          isActive,
          createdBy: user?.email || user?.name || "admin",
        });
        toast.success("Security deposit configuration created!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save security deposit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (dep: CylinderDepositRecord) => {
    const newStatus = !dep.is_active;
    try {
      await toggleCylinderDepositStatus(dep.id, newStatus);
      toast.success(
        `Deposit for ${dep.product?.name || "cylinder"} marked as ${newStatus ? "Active" : "Inactive"}.`,
      );
      setDeposits((prev) =>
        prev.map((d) => (d.id === dep.id ? { ...d, is_active: newStatus } : d)),
      );
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the security deposit configuration for "${name || "this cylinder"}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteCylinderDeposit(id);
      toast.success("Security deposit configuration deleted.");
      setDeposits((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  // Filtered Deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      if (statusFilter === "ACTIVE" && !d.is_active) return false;
      if (statusFilter === "INACTIVE" && d.is_active) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const prodName = (d.product?.name || "").toLowerCase();
      const prodSlug = (d.product?.slug || "").toLowerCase();
      const catSlug = (d.product?.category_slug || "").toLowerCase();
      const amountStr = d.deposit_amount.toString();

      return (
        prodName.includes(q) ||
        prodSlug.includes(q) ||
        catSlug.includes(q) ||
        amountStr.includes(q)
      );
    });
  }, [deposits, statusFilter, searchQuery]);

  // Key Metrics
  const totalConfigured = deposits.length;
  const activeCount = deposits.filter((d) => d.is_active).length;
  const inactiveCount = deposits.filter((d) => !d.is_active).length;
  const avgDeposit =
    activeCount > 0
      ? deposits.filter((d) => d.is_active).reduce((sum, d) => sum + d.deposit_amount, 0) /
        activeCount
      : 0;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-display">
                Cylinder Deposits
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configure real-time security deposits for LPG New Cylinder purchases across the catalog.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border-slate-200 text-xs font-bold gap-2 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm gap-2 h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            Configure Deposit
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Configured
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalConfigured}</div>
          <p className="text-[11px] text-slate-500">LPG products with deposit rules</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Deposits
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          <p className="text-[11px] text-slate-500">Currently applied to new orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inactive / Paused
            </span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700">{inactiveCount}</div>
          <p className="text-[11px] text-slate-500">Temporarily disabled</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Deposit
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{gbp(avgDeposit)}</div>
          <p className="text-[11px] text-slate-500">Across active cylinder catalog</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cylinder name or code..."
            className="pl-9 bg-slate-50/60 border-slate-200 rounded-xl text-xs h-9 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({deposits.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-slate-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-semibold">
            <Loader2 className="h-7 w-7 animate-spin text-red-600" />
            <span>Loading security deposits from database...</span>
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Security Deposits Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "No deposits match your search term. Try a different keyword or reset filters."
                : "No deposit rules configured yet. Click 'Configure Deposit' to add security deposits for your LPG cylinders."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="text-xs font-bold rounded-xl mt-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5">
                    Cylinder / Product
                  </TableHead>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5">
                    Category
                  </TableHead>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5">
                    Security Deposit
                  </TableHead>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5">
                    Last Updated
                  </TableHead>
                  <TableHead className="font-extrabold text-slate-700 text-xs py-3.5 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.map((dep) => {
                  const prod = dep.product;
                  const specs = prod?.specs || {};
                  const usageType =
                    specs.usage_type ||
                    (prod?.category_slug === "bulk-gas"
                      ? "BULK"
                      : prod?.name?.toLowerCase().includes("commercial") ||
                          prod?.name?.toLowerCase().includes("47kg") ||
                          prod?.name?.toLowerCase().includes("19kg")
                        ? "COMMERCIAL"
                        : "DOMESTIC");

                  return (
                    <TableRow key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {prod?.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              {prod?.name || "Unnamed Cylinder"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {specs.cylinder_size || "Standard Size"} · Gas Refill:{" "}
                              {gbp(prod?.price || 0)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold tracking-wide uppercase ${
                            usageType === "DOMESTIC"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : usageType === "COMMERCIAL"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {usageType} LPG
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 font-black text-sm text-slate-900">
                        {gbp(dep.deposit_amount)}
                      </TableCell>

                      <TableCell className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            dep.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              dep.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {dep.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 text-xs text-slate-500 font-medium">
                        {new Date(dep.updated_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(dep)}
                            title={dep.is_active ? "Deactivate Deposit" : "Activate Deposit"}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Power
                              className={`h-4 w-4 ${dep.is_active ? "text-emerald-600" : "text-slate-400"}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(dep)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Deposit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dep.id, prod?.name)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Configuration"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-600" />
              {editingDeposit ? "Edit Security Deposit" : "Configure Cylinder Deposit"}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              {editingDeposit
                ? `Update the security deposit rule for ${editingDeposit.product?.name || "cylinder"}.`
                : "Select an LPG Cylinder product and set the refundable security deposit amount."}
            </p>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Product Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">LPG Cylinder Product *</Label>
              {editingDeposit ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <span>{editingDeposit.product?.name || "Selected Cylinder"}</span>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedProductId}
                    onValueChange={(val) => {
                      setSelectedProductId(val);
                      const existing = deposits.find((d) => d.product_id === val);
                      if (existing) {
                        setDepositAmount(existing.deposit_amount.toString());
                        setIsActive(existing.is_active);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl text-xs h-10">
                      <SelectValue placeholder="Select a gas cylinder..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {eligibleProducts.map((p) => {
                        const existing = deposits.find((d) => d.product_id === p.id);
                        return (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span>{p.name} ({gbp(p.price || 0)})</span>
                              {existing && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  [Configured: {gbp(existing.deposit_amount)}]
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedProductId && deposits.some((d) => d.product_id === selectedProductId) && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ✓ Existing deposit rule found ({gbp(deposits.find((d) => d.product_id === selectedProductId)?.deposit_amount || 0)}). Saving will update this configuration.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Deposit Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Security Deposit Amount (£) *
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  £
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 39.99"
                  className="pl-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold h-10"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Applied only on first-time New Cylinder purchases. Zero on Refill/Exchange.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">Active Configuration</div>
                  <div className="text-[11px] text-slate-500">
                    Enabled for live customer orders
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-red-600 focus:ring-red-600"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingDeposit ? (
                  "Save Changes"
                ) : (
                  "Create Configuration"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
