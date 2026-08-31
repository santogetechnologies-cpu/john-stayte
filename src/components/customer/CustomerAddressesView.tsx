import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Home,
  Building,
  Edit2,
  Check,
  AlertCircle,
  Truck,
  Sparkles,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type CustomerAddress = {
  id: string;
  user_id: string;
  label: string;
  name: string;
  street: string;
  city: string;
  postcode: string;
  is_default: boolean;
  created_at: string;
};

export function CustomerAddressesView() {
  const { user } = useStore();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("Home");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Gloucestershire");
  const [postcode, setPostcode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Load customer addresses from Supabase DB
  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        setAddresses([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", authUser.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses((data as CustomerAddress[]) || []);
    } catch (err: any) {
      toast.error("Failed to load addresses: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const openAddModal = () => {
    setEditingId(null);
    setLabel("Home");
    setName(user?.name || "");
    setStreet("");
    setCity("Gloucestershire");
    setPostcode("");
    setIsDefault(addresses.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (ad: CustomerAddress) => {
    setEditingId(ad.id);
    setLabel(ad.label || "Home");
    setName(ad.name || "");
    setStreet(ad.street || "");
    setCity(ad.city || "");
    setPostcode(ad.postcode || "");
    setIsDefault(ad.is_default || false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim() || !postcode.trim()) {
      toast.error("Please enter both street address and postcode.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Not authenticated");

      const currentUserId = authUser.user.id;

      // If set as default, reset other addresses to is_default = false
      if (isDefault) {
        await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", currentUserId);
      }

      if (editingId) {
        // UPDATE Existing Address
        const { error } = await supabase
          .from("customer_addresses")
          .update({
            label: label.trim() || "Home",
            name: name.trim() || user?.name || "Customer",
            street: street.trim(),
            city: city.trim() || "Gloucestershire",
            postcode: postcode.trim().toUpperCase(),
            is_default: isDefault || addresses.length === 1,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Delivery address updated successfully!");
      } else {
        // INSERT New Address
        const { error } = await supabase.from("customer_addresses").insert([
          {
            user_id: currentUserId,
            label: label.trim() || "Home",
            name: name.trim() || user?.name || "Customer",
            street: street.trim(),
            city: city.trim() || "Gloucestershire",
            postcode: postcode.trim().toUpperCase(),
            is_default: isDefault || addresses.length === 0,
          },
        ]);

        if (error) throw error;
        toast.success("New delivery address added successfully!");
      }

      setModalOpen(false);
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to save address: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Address removed successfully");
      setDeleteConfirmId(null);
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to delete address: " + err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", authUser.user.id);

      await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", id);

      toast.success("Default delivery address updated!");
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to update default address: " + err.message);
    }
  };

  const getLabelIcon = (lbl: string) => {
    const l = (lbl || "").toLowerCase();
    if (l.includes("work") || l.includes("office") || l.includes("business") || l.includes("depot")) {
      return <Building className="h-4 w-4" />;
    }
    return <Home className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER                                              */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">Addresses</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
                Delivery Addresses
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                {addresses.length}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Manage where we deliver your gas cylinders, solid fuels, and store products across Gloucestershire.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              onClick={openAddModal}
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-10 px-5 gap-2 transition-all hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4" /> Add New Address
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ADDRESSES CONTENT                                        */}
      {/* ============================================================ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold">
            Loading your delivery addresses from Supabase...
          </p>
        </div>
      ) : addresses.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-4 max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MapPin className="h-8 w-8 text-slate-400" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="font-display font-extrabold text-lg text-slate-900">
              No delivery addresses yet
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Add a delivery address to ensure fast 1-click checkout and seamless direct fleet deliveries to your home, business or farm.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={openAddModal}
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-10 px-6 gap-2"
            >
              <Plus className="h-4 w-4" /> Add Your First Address
            </Button>
          </div>
        </div>
      ) : (
        /* 2-COLUMN RESPONSIVE GRID */
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
          {addresses.map((ad) => (
            <div
              key={ad.id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between space-y-4 relative ${
                ad.is_default
                  ? "border-primary/40 shadow-[0_4px_16px_rgba(227,27,35,0.06)] ring-1 ring-primary/20"
                  : "border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {/* Card Header: Label Badge + Default Pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                    {getLabelIcon(ad.label)}
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    {ad.label || "Home"}
                  </span>
                </div>

                {ad.is_default && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Default Address
                  </span>
                )}
              </div>

              {/* Card Body: Name, Street, Town, Postcode */}
              <div className="space-y-1.5 min-w-0">
                <h3 className="font-display font-black text-base text-slate-900 truncate">
                  {ad.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {ad.street}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  {ad.city && `${ad.city}, `}
                  <span className="font-mono font-bold text-slate-900">{ad.postcode}</span>
                </p>
              </div>

              {/* Card Footer: Set Default & Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div>
                  {!ad.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(ad.id)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      Active for quick checkout
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(ad)}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirmId(ad.id)}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ADD / EDIT ADDRESS MODAL                                  */}
      {/* ============================================================ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 sm:p-7 bg-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display font-black text-xl text-slate-900">
              {editingId ? "Edit Delivery Address" : "Add New Delivery Address"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Enter your Gloucestershire address details for direct fleet delivery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-3 text-xs">
            {/* Address Label Chips */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 text-xs">
                Address Type / Label
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {["Home", "Work", "Farm", "Depot", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLabel(lbl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      label === lbl
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Name */}
            <div className="space-y-1">
              <Label htmlFor="ad-name" className="font-bold text-slate-700 text-xs">
                Recipient / Business Name *
              </Label>
              <Input
                id="ad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Hughes"
                className="rounded-xl text-xs font-semibold h-10 border-slate-200"
                required
              />
            </div>

            {/* Street Address */}
            <div className="space-y-1">
              <Label htmlFor="ad-street" className="font-bold text-slate-700 text-xs">
                Street Address *
              </Label>
              <Input
                id="ad-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. 12 High Street, Whitminster"
                className="rounded-xl text-xs font-semibold h-10 border-slate-200"
                required
              />
            </div>

            {/* City & Postcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ad-city" className="font-bold text-slate-700 text-xs">
                  Town / City *
                </Label>
                <Input
                  id="ad-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Gloucester / Stroud"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ad-postcode" className="font-bold text-slate-700 text-xs">
                  Postcode *
                </Label>
                <Input
                  id="ad-postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. GL2 7NY"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200 uppercase"
                  required
                />
              </div>
            </div>

            {/* Set as Default Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="ad-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
                className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="ad-default"
                className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
              >
                Set as my default delivery address
              </Label>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl font-extrabold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-10 px-5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  editingId ? "Update Address" : "Save Address"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 4. DELETE CONFIRMATION DIALOG                                */}
      {/* ============================================================ */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6 bg-white space-y-3">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-lg text-slate-900">
              Delete Delivery Address?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Are you sure you want to remove this delivery address from your account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-xl text-xs font-bold border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
