import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, Heart, MapPin, User, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerGlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<any[]>([]);
  const [matchedOrders, setMatchedOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user, wishlist } = useStore();

  useEffect(() => {
    if (!query.trim()) {
      setMatchedProducts([]);
      setMatchedOrders([]);
      return;
    }

    const q = query.trim();
    let isCurrent = true;
    setLoading(true);

    async function fetchSearch() {
      try {
        const [
          { data: prods },
          { data: ords },
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, slug, brand, category_slug, price")
            .ilike("name", `%${q}%`)
            .limit(5),
          user?.email
            ? supabase
                .from("orders")
                .select("id, order_number, total, status")
                .eq("customer_email", user.email)
                .ilike("order_number", `%${q}%`)
                .limit(5)
            : Promise.resolve({ data: [] }),
        ]);

        if (isCurrent) {
          setMatchedProducts(prods || []);
          setMatchedOrders(ords || []);
        }
      } catch (err) {
        console.error("Customer Search DB Error:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    const timer = setTimeout(fetchSearch, 200);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, user?.email]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate({ to: path as never });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-3xl border bg-card shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Customer Portal Search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-4 py-3.5 bg-muted/30">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, order history, or account pages..."
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
                Account Quick Links
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "My Orders", href: "/account/orders", icon: ShoppingBag },
                  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
                  { label: "Addresses", href: "/account/addresses", icon: MapPin },
                  { label: "Profile", href: "/account/profile", icon: User },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className="flex items-center gap-2 p-2.5 rounded-2xl border bg-card hover:bg-slate-50 text-left transition-all group"
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
              {/* PRODUCTS */}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Products ({matchedProducts.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(`/products/${p.slug}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.brand} · £{Number(p.price).toFixed(2)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ORDERS */}
              {matchedOrders.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    My Orders ({matchedOrders.length})
                  </p>
                  <div className="grid gap-1">
                    {matchedOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => handleSelect("/account/orders")}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border bg-card hover:bg-slate-50 text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold">#{o.order_number}</p>
                          <p className="text-[11px] text-muted-foreground">£{Number(o.total).toFixed(2)} · {o.status}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading && matchedProducts.length === 0 && matchedOrders.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No products or orders matching "{query}".
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
