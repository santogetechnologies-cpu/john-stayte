import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerWishlistView() {
  const { wishlist, addToCart } = useStore();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlistProducts() {
      if (wishlist.length === 0) {
        setWishlistProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .in("slug", wishlist);
        setWishlistProducts(prods || []);
      } catch (err) {
        console.error("Wishlist DB Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWishlistProducts();
  }, [wishlist]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">Wishlist</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          My Saved Wishlist ({wishlist.length})
        </h1>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center text-xs text-muted-foreground font-bold rounded-3xl border bg-white">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading saved products from Supabase...
        </div>
      ) : wishlist.length === 0 || wishlistProducts.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <Heart className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">Your wishlist is empty</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Save products here to find them later.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="rounded-full font-bold text-xs gap-2">
              <Link to="/products">
                Browse Products <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlistProducts.map((p) => (
            <div
              key={p.id}
              className="surface-card p-4 rounded-3xl border bg-white flex items-center gap-4 shadow-xs hover:border-primary/40 transition-all"
            >
              <img
                src={p.image_url || "/placeholder.svg"}
                alt={p.name}
                className="h-16 w-16 rounded-2xl object-contain bg-slate-50 p-1 border shrink-0"
              />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-foreground truncate">{p.name}</p>
                <p className="text-muted-foreground font-extrabold mt-0.5">{gbp(Number(p.price))}</p>
              </div>
              <Button
                size="sm"
                className="rounded-full text-xs font-bold"
                onClick={() => {
                  addToCart(p.slug);
                  toast.success("Added to basket");
                }}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
