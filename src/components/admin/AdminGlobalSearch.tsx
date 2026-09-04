import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Package,
  ShoppingBag,
  Users,
  Building2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export function AdminGlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<any[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<any[]>([]);
  const [matchedCustomers, setMatchedCustomers] = useState<any[]>([]);
  const [matchedStations, setMatchedStations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setMatchedOrders([]);
      setMatchedProducts([]);
      setMatchedCustomers([]);
      setMatchedStations([]);
      return;
    }

    const q = query.trim();
    let isCurrent = true;
    setLoading(true);

    async function fetchSearch() {
      try {
        const [{ data: prods }, { data: ords }, { data: custs }, { data: stns }] =
          await Promise.all([
            supabase
              .from("products")
              .select("id, name, slug, brand, category_slug")
              .ilike("name", `%${q}%`)
              .limit(5),
            supabase
              .from("orders")
              .select("id, order_number, customer_name, total, status")
              .ilike("order_number", `%${q}%`)
              .limit(5),
            supabase
              .from("profiles")
              .select("id, full_name, email, role")
              .eq("role", "customer")
              .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
              .limit(5),
            supabase.from("stations").select("id, name, city").ilike("name", `%${q}%`).limit(5),
          ]);

        if (isCurrent) {
          setMatchedProducts(prods || []);
          setMatchedOrders(ords || []);
          setMatchedCustomers(custs || []);
          setMatchedStations(stns || []);
        }
      } catch (err) {
        console.error("Admin Global Search DB Error:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    const timer = setTimeout(fetchSearch, 200);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate({ to: path as never });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Admin Search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-4 py-3.5 bg-muted/30">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search live orders, products, customers, or stations..."
            className="h-9 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary ml-2" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
                  { label: "Products", href: "/admin/products", icon: Package },
                  { label: "Customers", href: "/admin/customers", icon: Users },
                  { label: "Stations", href: "/admin/stations", icon: Building2 },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border bg-card hover:bg-slate-50 text-left transition-all group"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && (
            <div className="space-y-4">
              {/* ORDERS */}
              {matchedOrders.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Orders (
                    {matchedOrders.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => handleSelect("/admin/orders")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-black">
                            #{o.order_number || o.id.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.customer_name} · £{Number(o.total).toFixed(2)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUCTS */}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" /> Products (
                    {matchedProducts.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect("/admin/products")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.brand} · {p.category_slug}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMERS */}
              {matchedCustomers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Customers (
                    {matchedCustomers.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect("/admin/customers")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold">{c.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.email}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STATIONS */}
              {matchedStations.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Stations (
                    {matchedStations.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedStations.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelect("/admin/stations")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">{s.city}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading &&
                matchedOrders.length === 0 &&
                matchedProducts.length === 0 &&
                matchedCustomers.length === 0 &&
                matchedStations.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No database records found matching "{query}".
                  </div>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
