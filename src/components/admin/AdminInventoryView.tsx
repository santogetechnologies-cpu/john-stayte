import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  Search,
  Plus,
  Edit,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  RotateCcw,
  Loader2,
  Building,
  Tag,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminInventoryView() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("status");
      if (p === "low_stock" || p === "in_stock" || p === "out_of_stock") return p;
    }
    return "all";
  });

  // Modal State for Adding/Editing Stock
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockVal, setStockVal] = useState<string>("0");
  const [thresholdVal, setThresholdVal] = useState<string>("5");
  const [depotLocation, setDepotLocation] = useState<string>("Gloucestershire Main Depot (Whitminster)");
  const [saving, setSaving] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all products from products table
      const { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (prodErr) throw prodErr;

      // 2. Fetch inventory metadata table
      const { data: dbInventory, error: invErr } = await supabase
        .from("inventory")
        .select("*");

      if (invErr) {
        console.warn("Inventory query notice:", invErr.message);
      }

      const invMap = new Map((dbInventory || []).map((inv: any) => [inv.product_id, inv]));

      // 3. Merge products with inventory metadata
      const merged = (dbProducts || []).map((prod: any) => {
        const invMeta = invMap.get(prod.id);
        const stock = Number(prod.stock || 0);
        const threshold = Number(invMeta?.reorder_threshold ?? prod.specs?.reorder_threshold ?? 5);
        const depot = invMeta?.depot_location || "Gloucestershire Main Depot (Whitminster)";
        const sku = prod.specs?.sku || prod.slug?.toUpperCase() || `SKU-${prod.id.slice(0, 6).toUpperCase()}`;

        let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (stock === 0) {
          status = "out_of_stock";
        } else if (stock <= 10) {
          status = "low_stock";
        }

        return {
          id: prod.id,
          inventory_id: invMeta?.id || null,
          product_id: prod.id,
          name: prod.name.trim(),
          brand: prod.brand || "John Stayte Services",
          category_slug: prod.category_slug || "gas",
          price: Number(prod.price || 0),
          stock: stock,
          reorder_threshold: threshold,
          depot_location: depot,
          sku: sku,
          status: status,
          updated_at: invMeta?.updated_at || prod.updated_at,
          specs: prod.specs || {},
        };
      });

      setInventoryItems(merged);
    } catch (err: any) {
      console.error("Failed to load inventory:", err);
      setError(err.message || "Failed to connect to Supabase products database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();

    // Subscribe to realtime changes on products
    const channel = supabase
      .channel("admin_inventory_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => loadInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (item: any) => {
    setSelectedProduct(item);
    setStockVal(String(item.stock));
    setThresholdVal(String(item.reorder_threshold));
    setDepotLocation(item.depot_location);
    setModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);

    try {
      const newStock = Number(stockVal);
      const newThreshold = Number(thresholdVal);

      if (isNaN(newStock) || newStock < 0) {
        throw new Error("Stock quantity must be a non-negative number.");
      }
      if (isNaN(newThreshold) || newThreshold < 0) {
        throw new Error("Reorder threshold must be a non-negative number.");
      }

      // 1. Update public.products (Source of truth for stock)
      const updatedSpecs = {
        ...selectedProduct.specs,
        sku: selectedProduct.sku,
        reorder_threshold: newThreshold,
      };

      const { error: prodErr } = await supabase
        .from("products")
        .update({
          stock: newStock,
          specs: updatedSpecs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedProduct.product_id);

      if (prodErr) throw prodErr;

      // 2. Update or Insert public.inventory metadata
      const invPayload: any = {
        product_id: selectedProduct.product_id,
        current_stock: newStock,
        reorder_threshold: newThreshold,
        depot_location: depotLocation,
        updated_at: new Date().toISOString(),
      };

      if (selectedProduct.inventory_id) {
        await supabase
          .from("inventory")
          .update(invPayload)
          .eq("id", selectedProduct.inventory_id);
      } else {
        await supabase
          .from("inventory")
          .insert([invPayload]);
      }

      // 3. Create Audit Log Entry
      await logAdminAuditAction("UPDATE_STOCK", "product", selectedProduct.product_id, {
        product_name: selectedProduct.name,
        old_stock: selectedProduct.stock,
        new_stock: newStock,
        new_threshold: newThreshold,
        depot_location: depotLocation,
      });

      // 4. Create Notification if Stock <= Threshold
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      if (currentUserId && newStock <= newThreshold) {
        const notifTitle = newStock === 0
          ? `OUT OF STOCK ALERT: ${selectedProduct.name}`
          : `LOW STOCK ALERT: ${selectedProduct.name} (${newStock} remaining)`;

        await supabase.from("notifications").insert([
          {
            user_id: currentUserId,
            title: notifTitle,
            message: `Stock level for ${selectedProduct.name} at ${depotLocation} is now ${newStock} units (Threshold: ${newThreshold}).`,
            category: "inventory",
            read: false,
          },
        ]);
      }

      toast.success(`Updated stock for ${selectedProduct.name} to ${newStock} units!`);
      setModalOpen(false);
      window.dispatchEvent(new Event("admin_modules_updated"));
      await loadInventory();
    } catch (err: any) {
      toast.error("Failed to update stock: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter & Search Logic
  const filtered = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const skuMatch = item.sku.toLowerCase().includes(q);
        const catMatch = item.category_slug.toLowerCase().includes(q);
        const brandMatch = item.brand.toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !catMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [inventoryItems, searchQuery, statusFilter]);

  // Aggregate Inventory KPI Metrics
  const totalItemsCount = inventoryItems.length;
  const healthyItemsCount = inventoryItems.filter((i) => i.status === "in_stock").length;
  const lowStockItemsCount = inventoryItems.filter((i) => i.status === "low_stock").length;
  const outOfStockItemsCount = inventoryItems.filter((i) => i.status === "out_of_stock").length;

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" /> Inventory & Stock Control ({totalItemsCount})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time catalog stock quantities, reorder alert thresholds, and depot allocations.
          </p>
        </div>
      </div>

      {/* 2. INVENTORY SUMMARY KPIS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs text-left cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm ${
            statusFilter === "all" ? "ring-2 ring-slate-400/30" : ""
          }`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Tracked Catalog Items</p>
          <p className="text-2xl font-black text-foreground">{totalItemsCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Active products</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("in_stock")}
          className={`surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs text-left cursor-pointer transition-all hover:border-emerald-300 hover:shadow-sm ${
            statusFilter === "in_stock" ? "ring-2 ring-emerald-500/30" : ""
          }`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Stock Healthy</p>
          <p className="text-2xl font-black text-emerald-600">{healthyItemsCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Above reorder threshold</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("low_stock")}
          className={`surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs text-left cursor-pointer transition-all hover:border-amber-300 hover:shadow-sm ${
            statusFilter === "low_stock" ? "ring-2 ring-amber-500/30" : ""
          }`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Low Stock Alerts</p>
          <p className="text-2xl font-black text-amber-600">{lowStockItemsCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Requires inventory reorder</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("out_of_stock")}
          className={`surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs text-left cursor-pointer transition-all hover:border-rose-300 hover:shadow-sm ${
            statusFilter === "out_of_stock" ? "ring-2 ring-rose-500/30" : ""
          }`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-black text-rose-600">{outOfStockItemsCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Zero available units</p>
        </button>
      </div>

      {/* 3. SEARCH & CONTROLS */}
      <div className="surface-card p-4 rounded-3xl border bg-white space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, brand, or depot..."
              className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              onClick={loadInventory}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 border-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* 4. INVENTORY TABLE CONTAINER */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading product inventory...
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="mx-auto h-9 w-9 text-rose-500" />
            <h3 className="font-bold text-sm text-foreground">System Notice</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
            <Button onClick={loadInventory} size="sm" variant="outline" className="rounded-full text-xs font-bold gap-1.5 mt-2">
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="font-extrabold text-base text-foreground">No inventory records found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No inventory items match your search filter."
                : "Add products in the Admin Products module to start tracking stock."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Product Details</TableHead>
                <TableHead className="font-bold text-xs">SKU / Identifier</TableHead>
                <TableHead className="font-bold text-xs">Current Stock</TableHead>
                <TableHead className="font-bold text-xs">Reorder Threshold</TableHead>
                <TableHead className="font-bold text-xs">Depot Allocation</TableHead>
                <TableHead className="font-bold text-xs">Stock Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-xs">
                    <p className="font-extrabold text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.brand} &bull; {gbp(item.price)}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {item.sku}
                  </TableCell>
                  <TableCell className="font-black text-sm">
                    <span className={item.stock === 0 ? "text-rose-600 font-black" : item.stock <= item.reorder_threshold ? "text-amber-700 font-black" : "text-foreground"}>
                      {item.stock} units
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-semibold">
                    &le; {item.reorder_threshold} units
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">
                    {item.depot_location}
                  </TableCell>
                  <TableCell>
                    {item.status === "out_of_stock" ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-extrabold">
                        <XCircle className="h-3 w-3 mr-1 text-rose-600" /> Out of Stock
                      </Badge>
                    ) : item.status === "low_stock" ? (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-extrabold">
                        <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" /> Low Stock Alert
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> In Stock (Healthy)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(item)}
                      className="rounded-full text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-3.5 w-3.5" /> Update Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 5. ADD / UPDATE STOCK MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-foreground">
              Update Stock: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleSaveStock} className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Product Details</p>
                <p className="font-extrabold text-foreground">{selectedProduct.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">SKU: {selectedProduct.sku} &bull; Category: {selectedProduct.category_slug}</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700">Current Available Stock Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={stockVal}
                  onChange={(e) => setStockVal(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-black h-10 border-slate-200"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">Setting this to 0 will trigger an Out of Stock status.</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700">Low Stock Alert Threshold *</Label>
                <Input
                  type="number"
                  min="0"
                  value={thresholdVal}
                  onChange={(e) => setThresholdVal(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-bold h-10 border-slate-200"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">Triggers low stock alert when stock &le; threshold.</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700">Depot / Station Allocation</Label>
                <Input
                  value={depotLocation}
                  onChange={(e) => setDepotLocation(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-medium h-10 border-slate-200"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Stock Level"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
