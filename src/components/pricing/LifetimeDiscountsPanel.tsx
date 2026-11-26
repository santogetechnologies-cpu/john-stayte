import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Edit3,
  Eye,
  Filter,
  History,
  Info,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCustomerEligibleOrderHistory,
  getCustomerLifetimeEligibilityList,
  toggleLifetimeTierActive,
  updateLifetimeProgrammeEnabled,
  upsertLifetimeDiscountTier,
  type CustomerEligibilityRow,
  type EligibleOrderRecord,
  type LifetimeDiscountProgramme,
  type LifetimeDiscountTier,
} from "@/lib/lifetime-discount-service";

interface LifetimeDiscountsPanelProps {
  roleLabel: "Admin" | "Manager";
  userId?: string | null;
}

interface TierFormState {
  id?: string;
  tier_name: string;
  min_spend: string;
  max_spend: string;
  discount_percentage: string;
  display_order: string;
  is_active: boolean;
}

export function LifetimeDiscountsPanel({ roleLabel, userId }: LifetimeDiscountsPanelProps) {
  const isAdmin = roleLabel === "Admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programme, setProgramme] = useState<LifetimeDiscountProgramme>({
    isEnabled: true,
    tiers: [],
    source: "default",
  });
  const [customers, setCustomers] = useState<CustomerEligibilityRow[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  // Tier Modal
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [tierForm, setTierForm] = useState<TierFormState>({
    tier_name: "",
    min_spend: "0",
    max_spend: "",
    discount_percentage: "0",
    display_order: "1",
    is_active: true,
  });

  // Customer Order History Modal
  const [historyCustomer, setHistoryCustomer] = useState<CustomerEligibilityRow | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<EligibleOrderRecord[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCustomerLifetimeEligibilityList();
      setProgramme(res.programme);
      setCustomers(res.customers);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load lifetime discount data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleToggleProgramme = async () => {
    if (!isAdmin) return;
    setSaving(true);
    const nextState = !programme.isEnabled;
    const res = await updateLifetimeProgrammeEnabled(nextState, userId ?? null);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || "Failed to update programme status.");
      return;
    }
    toast.success(`Lifetime purchase discount programme ${nextState ? "activated" : "deactivated"}.`);
    await loadData();
  };

  const handleToggleTier = async (tier: LifetimeDiscountTier) => {
    if (!isAdmin) return;
    setSaving(true);
    const res = await toggleLifetimeTierActive(tier.id, !tier.is_active);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || "Failed to update tier status.");
      return;
    }
    toast.success(`${tier.tier_name} ${!tier.is_active ? "activated" : "deactivated"}.`);
    await loadData();
  };

  const openAddTier = () => {
    if (!isAdmin) return;
    const nextOrder =
      programme.tiers.length > 0
        ? Math.max(...programme.tiers.map((t) => t.display_order)) + 1
        : 1;
    setTierForm({
      tier_name: "",
      min_spend: "0",
      max_spend: "",
      discount_percentage: "0",
      display_order: String(nextOrder),
      is_active: true,
    });
    setTierModalOpen(true);
  };

  const openEditTier = (tier: LifetimeDiscountTier) => {
    if (!isAdmin) return;
    setTierForm({
      id: tier.id,
      tier_name: tier.tier_name,
      min_spend: String(tier.min_spend),
      max_spend: tier.max_spend !== null && tier.max_spend !== undefined ? String(tier.max_spend) : "",
      discount_percentage: String(tier.discount_percentage),
      display_order: String(tier.display_order),
      is_active: tier.is_active,
    });
    setTierModalOpen(true);
  };

  const handleSaveTier = async () => {
    if (!isAdmin) return;
    const name = tierForm.tier_name.trim();
    const minSpend = Number(tierForm.min_spend);
    const maxSpend = tierForm.max_spend.trim() === "" ? null : Number(tierForm.max_spend);
    const discountPct = Number(tierForm.discount_percentage);
    const displayOrder = Number(tierForm.display_order) || 1;

    if (!name) {
      toast.error("Tier name is required.");
      return;
    }
    if (!Number.isFinite(minSpend) || minSpend < 0) {
      toast.error("Minimum spend must be £0 or greater.");
      return;
    }
    if (maxSpend !== null && (!Number.isFinite(maxSpend) || maxSpend <= minSpend)) {
      toast.error("Maximum spend must be greater than minimum spend (or leave blank for no limit).");
      return;
    }
    if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      toast.error("Discount percentage must be between 0% and 100%.");
      return;
    }

    setSaving(true);
    const res = await upsertLifetimeDiscountTier({
      id: tierForm.id,
      tier_name: name,
      min_spend: minSpend,
      max_spend: maxSpend,
      discount_percentage: discountPct,
      is_active: tierForm.is_active,
      display_order: displayOrder,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to save discount tier.");
      return;
    }

    toast.success(`Saved tier "${name}".`);
    setTierModalOpen(false);
    await loadData();
  };

  const openCustomerHistory = async (row: CustomerEligibilityRow) => {
    setHistoryCustomer(row);
    setHistoryLoading(true);
    setHistoryOrders([]);
    try {
      const orders = await getCustomerEligibleOrderHistory(row.customerId);
      setHistoryOrders(orders);
    } catch {
      toast.error("Failed to load customer order history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const stats = useMemo(() => {
    const qualifying = customers.filter((c) => c.discountPercentage > 0 && !c.hasExplicitDiscountArrangement).length;
    const overrideProtected = customers.filter((c) => c.hasExplicitDiscountArrangement).length;
    const totalEligibleSpend = customers.reduce((sum, c) => sum + c.eligibleSpend, 0);
    return {
      totalCustomers: customers.length,
      qualifying,
      overrideProtected,
      totalEligibleSpend,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (q) {
        const matches =
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.accountNumber || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (tierFilter === "QUALIFYING") {
        return c.discountPercentage > 0;
      }
      if (tierFilter === "OVERRIDE") {
        return c.hasExplicitDiscountArrangement;
      }
      if (tierFilter !== "ALL") {
        return c.currentTierName === tierFilter;
      }
      return true;
    });
  }, [customers, searchQuery, tierFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Programme Activation */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
              <Award className="h-5 w-5 text-red-600" />
              Customer Lifetime Purchase Discount Programme
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 mt-1">
              {isAdmin ? "Managed by Admin." : "Read-only view for Manager."} Automatically rewards customers based on cumulative completed/paid orders
              without overriding special customer pricing or explicitly discounted bands.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge
              variant="outline"
              className={
                programme.isEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }
            >
              {programme.isEnabled ? "Programme Active" : "Programme Inactive"}
            </Badge>
            {isAdmin && (
              <Button
                size="sm"
                variant={programme.isEnabled ? "outline" : "default"}
                disabled={saving}
                onClick={handleToggleProgramme}
                className={
                  programme.isEnabled
                    ? "text-xs border-slate-300"
                    : "text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                }
              >
                <Power className="h-3.5 w-3.5 mr-1.5" />
                {programme.isEnabled ? "Deactivate Programme" : "Activate Programme"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {programme.source === "default" && (
          <CardContent className="pt-0 pb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Default Tier Rules Active (Pending Database Migration 00106)</p>
                <p className="text-amber-800 mt-0.5">
                  Displaying the configured initial business tiers. Apply migration{" "}
                  <code className="font-mono bg-amber-100 px-1 rounded">00106_lifetime_purchase_discount_system.sql</code>{" "}
                  to persist tier edits and programme toggles in Supabase.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalCustomers}</p>
            </div>
            <Users className="h-7 w-7 text-slate-400" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Qualifying (&gt;0% Tier)</p>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.qualifying}</p>
            </div>
            <Percent className="h-7 w-7 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Override Protected</p>
              <p className="text-2xl font-bold text-blue-700 mt-0.5">{stats.overrideProtected}</p>
            </div>
            <ShieldCheck className="h-7 w-7 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Eligible Spend</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                £{stats.totalEligibleSpend.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-7 w-7 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tier Configuration Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Purchase-Value Discount Tiers</CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Only delivered or paid orders count toward lifetime spend. Cancelled, failed, refunded, and unpaid pending orders are excluded.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openAddTier} className="bg-red-600 hover:bg-red-700 text-white text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Tier
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Order</TableHead>
                  <TableHead className="text-xs font-semibold">Tier Name</TableHead>
                  <TableHead className="text-xs font-semibold">Min Spend</TableHead>
                  <TableHead className="text-xs font-semibold">Max Spend</TableHead>
                  <TableHead className="text-xs font-semibold">Discount %</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  {isAdmin && <TableHead className="text-xs font-semibold text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {programme.tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="text-xs font-mono text-slate-500">{tier.display_order}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-900">{tier.tier_name}</TableCell>
                    <TableCell className="text-xs font-mono">£{Number(tier.min_spend).toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {tier.max_spend !== null && tier.max_spend !== undefined
                        ? `£${Number(tier.max_spend).toFixed(2)}`
                        : "No upper limit"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700">
                      {Number(tier.discount_percentage)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tier.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                            : "bg-slate-100 text-slate-500 border-slate-200 text-[11px]"
                        }
                      >
                        {tier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditTier(tier)}
                          className="h-7 px-2 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => void handleToggleTier(tier)}
                          className="h-7 px-2 text-xs"
                        >
                          {tier.is_active ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Eligibility Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Customer Lifetime Eligibility</CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Real-time qualification per customer. Special pricing and explicit discounted bands are never overwritten.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, account..."
                  className="pl-8 h-8 text-xs w-56"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
                >
                  <option value="ALL">All Customers</option>
                  <option value="QUALIFYING">Qualifying (&gt;0% Tier)</option>
                  <option value="OVERRIDE">Override Protected</option>
                  {programme.tiers.map((t) => (
                    <option key={t.id} value={t.tier_name}>
                      {t.tier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Account #</TableHead>
                  <TableHead className="text-xs font-semibold">Eligible Spend</TableHead>
                  <TableHead className="text-xs font-semibold">Current Tier</TableHead>
                  <TableHead className="text-xs font-semibold">Discount %</TableHead>
                  <TableHead className="text-xs font-semibold">Next Tier / Remaining</TableHead>
                  <TableHead className="text-xs font-semibold">Checkout Mode</TableHead>
                  <TableHead className="text-xs font-semibold text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      {loading ? "Loading customer eligibility..." : "No matching customers found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((row) => (
                    <TableRow key={row.customerId}>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-900">{row.fullName}</div>
                        <div className="text-[11px] text-slate-500">{row.email}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-700">
                        {row.accountNumber || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-slate-900">
                        £{row.eligibleSpend.toFixed(2)}
                        <div className="text-[10px] font-sans font-normal text-slate-500">
                          {row.eligibleOrderCount} eligible order{row.eligibleOrderCount === 1 ? "" : "s"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">{row.currentTierName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            row.discountPercentage > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold"
                              : "bg-slate-50 text-slate-600 border-slate-200 text-xs"
                          }
                        >
                          {row.discountPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {row.nextTierName ? (
                          <div>
                            <span className="font-medium text-slate-800">{row.nextTierName}</span>
                            <div className="text-[11px] text-slate-500">
                              £{row.remainingToNextTier.toFixed(2)} remaining
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium">Top tier reached</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.hasExplicitDiscountArrangement ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                            Band/Special Protected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]">
                            Auto Lifetime Eligible
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void openCustomerHistory(row)}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Orders
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Add Tier Dialog */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{tierForm.id ? "Edit Discount Tier" : "Add Discount Tier"}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure cumulative purchase thresholds and automatic checkout discount percentage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tier Name</label>
              <Input
                value={tierForm.tier_name}
                onChange={(e) => setTierForm((f) => ({ ...f, tier_name: e.target.value }))}
                placeholder="e.g. Bronze Loyalty (10%)"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Min Spend (£)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tierForm.min_spend}
                  onChange={(e) => setTierForm((f) => ({ ...f, min_spend: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Max Spend (£, blank = ∞)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tierForm.max_spend}
                  onChange={(e) => setTierForm((f) => ({ ...f, max_spend: e.target.value }))}
                  placeholder="No limit"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={tierForm.discount_percentage}
                  onChange={(e) => setTierForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Display Order</label>
                <Input
                  type="number"
                  min="1"
                  value={tierForm.display_order}
                  onChange={(e) => setTierForm((f) => ({ ...f, display_order: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={tierForm.is_active}
                onChange={(e) => setTierForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Tier is active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTierModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => void handleSaveTier()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {saving ? "Saving..." : "Save Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Order History Dialog */}
      <Dialog open={Boolean(historyCustomer)} onOpenChange={(open) => !open && setHistoryCustomer(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-red-600" />
              Purchase History — {historyCustomer?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Eligible Lifetime Spend: £{historyCustomer?.eligibleSpend.toFixed(2)} · Current Tier:{" "}
              {historyCustomer?.currentTierName} ({historyCustomer?.discountPercentage}%)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs">Order #</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Eligibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                      Loading order history...
                    </TableCell>
                  </TableRow>
                ) : historyOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                      No orders found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyOrders.map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell className="text-xs font-mono font-medium">{ord.order_number}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {new Date(ord.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-xs">{ord.status}</TableCell>
                      <TableCell className="text-xs">{ord.payment_status}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">£{ord.total.toFixed(2)}</TableCell>
                      <TableCell>
                        {ord.isEligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Counted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            {ord.exclusionReason || "Excluded"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHistoryCustomer(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
