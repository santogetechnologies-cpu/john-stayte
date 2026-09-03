import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Power,
  Loader2,
  Percent,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminCouponsView() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [perCustomerLimit, setPerCustomerLimit] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderAmount("0");
    setMaxDiscount("");
    setMaxUses("100");
    setPerCustomerLimit("1");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setIsActive(true);
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err: any) {
      toast.error("Failed to load coupons from Supabase: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  // Handle Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return toast.error("Please enter a coupon code.");
    }
    if (!discountValue || Number(discountValue) <= 0) {
      return toast.error("Please enter a valid discount value.");
    }

    setSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrderAmount) || 0,
        max_uses: Number(maxUses) || 100,
        used_count: 0,
        is_active: isActive,
        starts_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        expires_at: endDate ? new Date(endDate).toISOString() : null,
      };

      const { data, error } = await supabase.from("coupons").insert(payload).select().single();

      if (error) throw error;

      await logAdminAuditAction("CREATE_COUPON", "coupons", data.id, { code: cleanCode });
      toast.success(`Coupon "${cleanCode}" created in Supabase!`);
      setCoupons([data, ...coupons]);
      setCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to create coupon: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Populate Edit Modal
  const handleOpenEditModal = (coupon: any) => {
    setSelectedCoupon(coupon);
    setCode(coupon.code || "");
    setDescription(coupon.description || "");
    setDiscountType((coupon.discount_type as any) || "percentage");
    setDiscountValue(String(coupon.discount_value || ""));
    setMinOrderAmount(String(coupon.min_order_amount || "0"));
    setMaxDiscount(coupon.max_discount ? String(coupon.max_discount) : "");
    setMaxUses(String(coupon.max_uses || "100"));
    setPerCustomerLimit(String(coupon.per_customer_limit || "1"));
    setStartDate(coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 10) : "");
    setEndDate(coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 10) : "");
    setIsActive(Boolean(coupon.is_active));
    setEditModalOpen(true);
  };

  // Handle Update Coupon
  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return toast.error("Coupon code required.");

    setSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrderAmount) || 0,
        max_uses: Number(maxUses) || 100,
        is_active: isActive,
        starts_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        expires_at: endDate ? new Date(endDate).toISOString() : null,
      };

      const { error } = await supabase.from("coupons").update(payload).eq("id", selectedCoupon.id);

      if (error) throw error;

      await logAdminAuditAction("UPDATE_COUPON", "coupons", selectedCoupon.id, { code: cleanCode });
      setCoupons(coupons.map((c) => (c.id === selectedCoupon.id ? { ...c, ...payload } : c)));
      toast.success(`Coupon "${cleanCode}" updated successfully!`);
      setEditModalOpen(false);
      setSelectedCoupon(null);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to update coupon: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle (Enable/Disable)
  const handleToggleCouponStatus = async (coupon: any) => {
    try {
      const newActive = !coupon.is_active;
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: newActive })
        .eq("id", coupon.id);

      if (error) throw error;

      await logAdminAuditAction(
        newActive ? "ENABLE_COUPON" : "DISABLE_COUPON",
        "coupons",
        coupon.id,
        { code: coupon.code },
      );
      setCoupons(coupons.map((c) => (c.id === coupon.id ? { ...c, is_active: newActive } : c)));
      toast.success(`Coupon "${coupon.code}" ${newActive ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Handle Delete Coupon
  const handleDeleteCoupon = async (id: string, couponCode: string) => {
    if (!confirm(`Are you sure you want to delete coupon code "${couponCode}"?`)) return;
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;

      await logAdminAuditAction("DELETE_COUPON", "coupons", id, { code: couponCode });
      setCoupons(coupons.filter((c) => c.id !== id));
      toast.success(`Coupon "${couponCode}" deleted from Supabase`);
    } catch (err: any) {
      toast.error("Failed to delete coupon: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Coupons</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Coupon Code Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage checkout coupon codes, discount limits, and promotional vouchers in Supabase.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          className="rounded-full text-xs font-extrabold gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Coupons Table / Empty State */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading coupons from
            Supabase...
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-slate-100 text-slate-400 w-fit mx-auto">
              <Ticket className="h-10 w-10" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-extrabold text-base text-foreground">No coupons created</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create your first coupon to offer customers a discount at checkout.
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4" /> Create Coupon
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-xs">Coupon Code</TableHead>
                <TableHead className="font-bold text-xs">Discount</TableHead>
                <TableHead className="font-bold text-xs">Min Spend / Usage</TableHead>
                <TableHead className="font-bold text-xs">Validity Dates</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="text-right font-bold text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => {
                const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                const isScheduled = c.starts_at && new Date(c.starts_at) > new Date();

                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                          <Ticket className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-mono text-xs font-extrabold text-foreground tracking-wider uppercase">
                            {c.code}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {c.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-extrabold text-emerald-700">
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}% OFF`
                        : `${gbp(c.discount_value)} OFF`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span>Min {gbp(c.min_order_amount || 0)}</span>
                      <span className="block text-[11px] font-medium text-slate-500">
                        Used {c.used_count || 0}/{c.max_uses || "∞"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.starts_at
                        ? new Date(c.starts_at).toLocaleDateString("en-GB")
                        : "Immediate"}
                      {c.expires_at
                        ? ` - ${new Date(c.expires_at).toLocaleDateString("en-GB")}`
                        : " (No Expire)"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          !c.is_active
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : isExpired
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isScheduled
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {!c.is_active
                          ? "Disabled"
                          : isExpired
                            ? "Expired"
                            : isScheduled
                              ? "Scheduled"
                              : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCouponStatus(c)}
                          title={c.is_active ? "Disable coupon" : "Enable coupon"}
                          className={`h-8 w-8 p-0 rounded-full ${c.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-8 w-8 p-0 rounded-full text-slate-600 hover:bg-slate-100"
                          title="Edit coupon"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="h-8 w-8 p-0 rounded-full text-red-600 hover:bg-red-50"
                          title="Delete coupon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CREATE COUPON MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" /> Create Coupon Code
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2 text-xs font-medium">
            <div>
              <Label htmlFor="coupon-code" className="font-bold text-slate-700">
                Coupon Code * (e.g. WELCOME10)
              </Label>
              <Input
                id="coupon-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                className="mt-1.5 rounded-xl font-mono text-xs font-bold uppercase h-10 border-slate-200"
                required
              />
            </div>

            <div>
              <Label htmlFor="coupon-desc" className="font-bold text-slate-700">
                Description
              </Label>
              <Textarea
                id="coupon-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="10% off your first order over £50..."
                className="mt-1.5 rounded-xl text-xs font-semibold border-slate-200 min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount-type" className="font-bold text-slate-700">
                  Discount Type *
                </Label>
                <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                  <SelectTrigger
                    id="discount-type"
                    className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount-val" className="font-bold text-slate-700">
                  Discount Value *
                </Label>
                <Input
                  id="discount-val"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10 (for 10%)" : "10 (for £10 off)"}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-spend" className="font-bold text-slate-700">
                  Minimum Order Value (£)
                </Label>
                <Input
                  id="min-spend"
                  type="number"
                  step="0.01"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="max-discount" className="font-bold text-slate-700">
                  Max Discount Limit (£ Optional)
                </Label>
                <Input
                  id="max-discount"
                  type="number"
                  step="0.01"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-uses" className="font-bold text-slate-700">
                  Total Usage Limit
                </Label>
                <Input
                  id="max-uses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="100"
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="per-customer" className="font-bold text-slate-700">
                  Per Customer Limit
                </Label>
                <Input
                  id="per-customer"
                  type="number"
                  value={perCustomerLimit}
                  onChange={(e) => setPerCustomerLimit(e.target.value)}
                  placeholder="1"
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date" className="font-bold text-slate-700">
                  Start Date *
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>

              <div>
                <Label htmlFor="end-date" className="font-bold text-slate-700">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="is-active" className="font-bold text-slate-700">
                  Status *
                </Label>
                <Select
                  value={isActive ? "active" : "disabled"}
                  onValueChange={(val) => setIsActive(val === "active")}
                >
                  <SelectTrigger
                    id="is-active"
                    className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full font-extrabold text-xs shadow-md bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Create Coupon
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT COUPON MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Edit Coupon Code
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCoupon} className="space-y-4 pt-2 text-xs font-medium">
            <div>
              <Label htmlFor="edit-code" className="font-bold text-slate-700">
                Coupon Code *
              </Label>
              <Input
                id="edit-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-1.5 rounded-xl font-mono text-xs font-bold uppercase h-10 border-slate-200"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-discount-type" className="font-bold text-slate-700">
                  Discount Type
                </Label>
                <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                  <SelectTrigger
                    id="edit-discount-type"
                    className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-discount-val" className="font-bold text-slate-700">
                  Discount Value
                </Label>
                <Input
                  id="edit-discount-val"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-min-spend" className="font-bold text-slate-700">
                  Min Order Amount (£)
                </Label>
                <Input
                  id="edit-min-spend"
                  type="number"
                  step="0.01"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="edit-is-active" className="font-bold text-slate-700">
                  Status
                </Label>
                <Select
                  value={isActive ? "active" : "disabled"}
                  onValueChange={(val) => setIsActive(val === "active")}
                >
                  <SelectTrigger
                    id="edit-is-active"
                    className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full font-extrabold text-xs shadow-md bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
