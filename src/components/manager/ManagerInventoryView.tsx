import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Layers, Search, Save } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

export function ManagerInventoryView() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleStockChange = (id: string, newStock: number) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, current_stock: newStock } : i)),
    );
  };

  const handleSaveStock = async (invItem: any) => {
    setUpdatingId(invItem.id);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ current_stock: invItem.current_stock, updated_at: new Date().toISOString() })
        .eq("id", invItem.id);

      if (error) throw error;

      if (invItem.product_id) {
        await supabase
          .from("products")
          .update({ stock: invItem.current_stock })
          .eq("id", invItem.product_id);
      }

      toast.success("Stock level updated in Supabase!");
      await loadInventory();
    } catch (err: any) {
      toast.error("Failed to update stock: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = inventory.filter((inv) => {
    const prodName = inv.products?.name || "";
    return prodName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">Manager</Link>
            <span>/</span>
            <span className="text-foreground">Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Depot Stock Control ({inventory.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Adjust stock levels and reorder thresholds in Supabase.
          </p>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock by product name..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading stock control matrix from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No inventory records found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Depot stock items will render here when populated in Supabase.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Product</TableHead>
                <TableHead className="font-bold text-xs">Current Stock</TableHead>
                <TableHead className="font-bold text-xs">Reorder Threshold</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Save Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-bold text-xs text-foreground">
                    {inv.products?.name || "Product"}
                  </TableCell>
                  <TableCell className="font-extrabold text-xs">
                    <Input
                      type="number"
                      value={inv.current_stock}
                      onChange={(e) => handleStockChange(inv.id, Number(e.target.value))}
                      className="w-20 h-8 text-xs font-bold rounded-xl"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.reorder_threshold}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold text-[10px] ${
                        inv.current_stock < inv.reorder_threshold
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {inv.current_stock < inv.reorder_threshold ? "Low Stock Alert" : "Stock Healthy"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSaveStock(inv)}
                      disabled={updatingId === inv.id}
                      className="rounded-full text-xs font-bold h-7 gap-1"
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
