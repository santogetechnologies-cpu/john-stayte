import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerAddressesView() {
  const { user } = useStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");

  // Load customer addresses from Supabase DB
  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", authUser.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (err: any) {
      toast.error("Failed to load addresses: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !postcode) return;

    setSubmitting(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("customer_addresses").insert([
        {
          user_id: authUser.user.id,
          label: label.trim() || "Home",
          name: name.trim() || user?.name || "Customer",
          street: street.trim(),
          city: city.trim() || "Gloucestershire",
          postcode: postcode.trim(),
          is_default: addresses.length === 0,
        },
      ]);

      if (error) throw error;

      toast.success("Delivery address saved to database!");
      setOpen(false);
      setLabel("");
      setName("");
      setStreet("");
      setCity("");
      setPostcode("");
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to save address: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this delivery address?")) return;
    try {
      const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Address deleted from database");
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to delete address: " + err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", authUser.user.id);
      await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);

      toast.success("Default address updated!");
      await loadAddresses();
    } catch (err: any) {
      toast.error("Failed to update default address: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Addresses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Delivery Addresses
          </h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full font-bold text-xs gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" /> Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="font-black text-lg">Add Delivery Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Address Label (e.g. Home, Work, Farm)</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home"
                  className="mt-1 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Recipient Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name..."
                  className="mt-1 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Street Address *</label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="12 High Street"
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Town / City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Whitminster"
                    className="mt-1 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Postcode *</label>
                  <Input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="GL2 7HL"
                    className="mt-1 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-full font-bold text-xs">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Address"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading saved addresses from Supabase...
        </div>
      ) : addresses.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <MapPin className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">No saved addresses</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add a delivery address to complete checkout faster.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((ad) => (
            <div key={ad.id} className="surface-card p-6 rounded-3xl border bg-white space-y-3 text-xs shadow-xs relative">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                  {ad.label}
                </Badge>
                {ad.is_default && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Default
                  </Badge>
                )}
              </div>
              <div>
                <p className="font-extrabold text-foreground text-sm">{ad.name}</p>
                <p className="text-muted-foreground mt-0.5">{ad.street}, {ad.city} {ad.postcode}</p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t">
                {!ad.is_default && (
                  <button
                    onClick={() => handleSetDefault(ad.id)}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Set as default
                  </button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(ad.id)}
                  className="h-7 w-7 rounded-full text-red-600 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
