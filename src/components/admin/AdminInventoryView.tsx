import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Search, Plus, Layers, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/lib/supabase";

export function AdminInventoryView() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*, products(*)")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (err: any) {
      toast.error("Failed to load inventory: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filtered = inventory.filter((inv) => {
    const prodName = inv.products?.name || "";
    return prodName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenEdit = (item: any) => {
    setEditItem({
      ...item,
      stockVal: item.current_stock || 0,
      thresholdVal: item.reorder_threshold || 10,
    });
    setModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);

    try {
      const newStock = Number(editItem.stockVal);
      const newThreshold = Number(editItem.thresholdVal);

      // 1. Update public.inventory
      const { error: invErr } = await supabase
        .from("inventory")
        .update({
          current_stock: newStock,
          reorder_threshold: newThreshold,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editItem.id);

      if (invErr) throw invErr;

      // 2. Update public.products if product_id exists
      if (editItem.product_id) {
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", editItem.product_id);
      }

      toast.success("Stock level & threshold saved to Supabase!");
      setModalOpen(false);
      await loadInventory();
    } catch (err: any) {
      toast.error("Failed to update inventory: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Inventory & Reorder Thresholds ({inventory.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track stock levels, reorder thresholds, and depot allocation in Supabase.
          </p>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory by product name..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading inventory matrix from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No inventory records found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real product inventory counts from Supabase will display here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Product</TableHead>
                <TableHead className="font-bold text-xs">Current Stock</TableHead>
                <TableHead className="font-bold text-xs">Reorder Threshold</TableHead>
                <TableHead className="font-bold text-xs">Depot Location</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs text-foreground">
                    {inv.products?.name || "Product"}
                  </TableCell>
                  <TableCell className="font-extrabold text-xs">{inv.current_stock}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.reorder_threshold}</TableCell>
                  <TableCell className="text-xs font-semibold">{inv.depot_location || "Whitminster"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        inv.current_stock < inv.reorder_threshold
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {inv.current_stock < inv.reorder_threshold ? "Reorder Needed" : "Stock Healthy"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(inv)}
                      className="rounded-full text-xs font-bold gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* EDIT INVENTORY MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              Edit Stock: {editItem?.products?.name || "Product"}
            </DialogTitle>
          </DialogHeader>

          {editItem && (
            <form onSubmit={handleSaveStock} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Current Stock Quantity</label>
                <Input
                  type="number"
                  value={editItem.stockVal}
                  onChange={(e) => setEditItem({ ...editItem, stockVal: e.target.value })}
                  className="mt-1 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Reorder Threshold Alert</label>
                <Input
                  type="number"
                  value={editItem.thresholdVal}
                  onChange={(e) => setEditItem({ ...editItem, thresholdVal: e.target.value })}
                  className="mt-1 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-full font-bold text-xs gap-1.5 shadow-md">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
