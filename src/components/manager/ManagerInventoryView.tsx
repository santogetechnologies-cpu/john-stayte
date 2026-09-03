import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Edit2,
  Loader2,
  Building2,
  Filter,
  X,
  AlertOctagon,
  Save,
  RotateCcw,
  Edit,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerInventoryView() {
  const navigate = useNavigate();
  const routerLocation = useRouterState({ select: (s) => s.location });

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("status") || "all";
    }
    return "all";
  });

  // Keep statusFilter synchronized with live router location changes
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const paramStatus = (routerLocation.search as any)?.status || params.get("status") || "all";
    setStatusFilter(paramStatus);
  }, [routerLocation]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockVal, setStockVal] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (prodErr) throw prodErr;

      const { data: dbInventory } = await supabase.from("inventory").select("*");
      const invMap = new Map((dbInventory || []).map((inv: any) => [inv.product_id, inv]));

      const merged = (dbProducts || []).map((prod: any) => {
        const invMeta = invMap.get(prod.id);
        const stock = Number(prod.stock || 0);
        const threshold = Number(invMeta?.reorder_threshold ?? prod.specs?.reorder_threshold ?? 5);
        const depot = invMeta?.depot_location || "Gloucestershire Depot (Whitminster)";
        const sku =
          prod.specs?.sku || prod.slug?.toUpperCase() || `SKU-${prod.id.slice(0, 6).toUpperCase()}`;

        let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (stock === 0) {
          status = "out_of_stock";
        } else if (stock <= threshold) {
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
        };
      });

      setInventoryItems(merged);
    } catch (err: any) {
      console.error("Failed to load manager inventory:", err);
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();

    const handleLocationChange = () => {
      const paramStatus = new URLSearchParams(window.location.search).get("status");
      if (paramStatus) setStatusFilter(paramStatus);
    };
    window.addEventListener("popstate", handleLocationChange);

    const channel = supabase
      .channel("manager_inventory_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () =>
        loadInventory(),
      )
      .subscribe();

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (item: any) => {
    setSelectedProduct(item);
    setStockVal(String(item.stock));
    setModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);

    try {
      const newStock = Number(stockVal);
      if (isNaN(newStock) || newStock < 0) {
        throw new Error("Stock quantity must be a non-negative number.");
      }

      // Update public.products
      const { error: prodErr } = await supabase
        .from("products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", selectedProduct.product_id);

      if (prodErr) throw prodErr;

      // Update or Insert public.inventory
      const invPayload = {
        product_id: selectedProduct.product_id,
        current_stock: newStock,
        reorder_threshold: selectedProduct.reorder_threshold,
        depot_location: selectedProduct.depot_location,
        updated_at: new Date().toISOString(),
      };

      if (selectedProduct.inventory_id) {
        await supabase.from("inventory").update(invPayload).eq("id", selectedProduct.inventory_id);
      } else {
        await supabase.from("inventory").insert([invPayload]);
      }

      toast.success(`Depot stock for ${selectedProduct.name} updated to ${newStock} units!`);
      setModalOpen(false);
      window.dispatchEvent(new Event("admin_modules_updated"));
      await loadInventory();
    } catch (err: any) {
      toast.error("Failed to update stock: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return inventoryItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category_slug.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === "low_stock") return item.status === "low_stock";
      if (statusFilter === "out_of_stock") return item.status === "out_of_stock";
      if (statusFilter === "in_stock") return item.status === "in_stock";
      return true;
    });
  }, [inventoryItems, searchQuery, statusFilter]);

  const lowStockCount = inventoryItems.filter((i) => i.status === "low_stock").length;
  const outOfStockCount = inventoryItems.filter((i) => i.status === "out_of_stock").length;
  const inStockCount = inventoryItems.filter((i) => i.status === "in_stock").length;

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    navigate({
      to: "/manager/inventory",
      search: (val === "all" ? {} : { status: val }) as never,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Inventory</span>
            {statusFilter !== "all" && (
              <>
                <span>/</span>
                <span className="text-primary font-bold capitalize">
                  {statusFilter === "low_stock"
                    ? "Low Stock Items"
                    : statusFilter.replace(/_/g, " ")}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" /> Depot Stock Level Monitoring (
            {filtered.length}
            {statusFilter !== "all" ? ` of ${inventoryItems.length}` : ""})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track and adjust cylinder stock availability for Whitminster & Gloucestershire depots.
          </p>
        </div>

        {/* Quick status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("all")}
            className="rounded-full text-xs h-8 font-bold"
          >
            All Stock ({inventoryItems.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "low_stock" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("low_stock")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Low Stock ({lowStockCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "out_of_stock" ? "default" : "outline"}
            onClick={() => handleStatusFilterChange("out_of_stock")}
            className="rounded-full text-xs h-8 font-bold"
          >
            Out of Stock ({outOfStockCount})
          </Button>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search depot inventory by product name or SKU..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-52 rounded-full text-xs font-bold bg-slate-50 border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl font-medium text-xs">
              <SelectItem value="all">All Inventory ({inventoryItems.length})</SelectItem>
              <SelectItem value="low_stock">Low Stock Alerts ({lowStockCount})</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock ({outOfStockCount})</SelectItem>
              <SelectItem value="in_stock">In Stock Healthy ({inStockCount})</SelectItem>
            </SelectContent>
          </Select>

          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusFilterChange("all")}
              className="rounded-full text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading depot inventory...
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="mx-auto h-9 w-9 text-rose-500" />
            <h3 className="font-bold text-sm text-foreground">Notice</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
            <Button
              onClick={loadInventory}
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 mt-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="font-extrabold text-base text-foreground">
              No depot inventory records found
            </h3>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Product Details</TableHead>
                <TableHead className="font-bold text-xs">SKU</TableHead>
                <TableHead className="font-bold text-xs">Available Stock</TableHead>
                <TableHead className="font-bold text-xs">Reorder Level</TableHead>
                <TableHead className="font-bold text-xs">Depot Allocation</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-xs">
                    <p className="font-extrabold text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{gbp(item.price)}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {item.sku}
                  </TableCell>
                  <TableCell className="font-black text-sm">{item.stock} units</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-semibold">
                    &le; {item.reorder_threshold} units
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">
                    {item.depot_location}
                  </TableCell>
                  <TableCell>
                    {item.status === "out_of_stock" ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-extrabold">
                        Out of Stock
                      </Badge>
                    ) : item.status === "low_stock" ? (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px] font-extrabold">
                        Low Stock Alert
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold">
                        In Stock (Healthy)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(item)}
                      className="rounded-full text-xs font-bold gap-1 text-primary"
                    >
                      <Edit className="h-3.5 w-3.5" /> Adjust Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-foreground">
              Adjust Depot Stock: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleSaveStock} className="space-y-4 pt-2 text-xs">
              <div>
                <Label className="font-bold text-slate-700">Available Stock Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={stockVal}
                  onChange={(e) => setStockVal(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-black h-10 border-slate-200"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary text-white"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Update Stock"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
