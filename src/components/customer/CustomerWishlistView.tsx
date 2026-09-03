import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  ArrowRight,
  Loader2,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";

export function CustomerWishlistView() {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch product data from Supabase using canonical wishlist slugs
  useEffect(() => {
    let isMounted = true;

    async function loadWishlistProducts() {
      if (wishlist.length === 0) {
        if (isMounted) {
          setWishlistProducts([]);
          setLoading(false);
        }
        return;
      }
      if (isMounted) setLoading(true);
      try {
        const { data: prods, error } = await supabase
          .from("products")
          .select("*")
          .in("slug", wishlist);
        if (error) throw error;
        if (isMounted) {
          setWishlistProducts(prods || []);
        }
      } catch (err) {
        console.error("Wishlist product load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadWishlistProducts();

    return () => {
      isMounted = false;
    };
  }, [wishlist]);

  const handleRemove = (slug: string, name: string) => {
    toggleWishlist(slug);
    toast.success(`Removed ${name} from wishlist`);
  };

  const handleAddToCart = (product: any) => {
    const isOutOfStock = Number(product.stock || 0) <= 0;
    if (isOutOfStock) {
      toast.error(`${product.name} is currently out of stock`);
      return;
    }
    addToCart(product.slug);
    toast.success(`Added ${product.name} to basket`);
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER                                              */}
      {/* ============================================================ */}
      <div className="relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">Wishlist</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
                My Saved Wishlist
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                {wishlist.length}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Products and fuels you’ve saved for later or quick local reordering across Gloucestershire.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 gap-1.5"
            >
              <Link to="/products">
                Browse Shop <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. WISHLIST CONTENT / GRID                                   */}
      {/* ============================================================ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold">
            Loading your saved products...
          </p>
        </div>
      ) : wishlist.length === 0 || wishlistProducts.length === 0 ? (
        /* ============================================================ */
        /* 3. EMPTY STATE                                              */
        /* ============================================================ */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-4 max-w-2xl mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-100/80 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="h-8 w-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display font-extrabold text-lg text-slate-900">
              Your wishlist is empty
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Save your frequently ordered bottled gas, smokeless fuels, logs, or BBQ essentials here for fast 1-click reordering.
            </p>
          </div>

          <div className="pt-2">
            <Button
              asChild
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-10 px-6 gap-2"
            >
              <Link to="/products">
                <Package className="h-4 w-4" /> Start Shopping
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 4. RESPONSIVE PRODUCT CARD GRID                             */
        /* ============================================================ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {wishlistProducts.map((product) => {
            const isOutOfStock = Number(product.stock || 0) <= 0;

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Product Image Area */}
                <div className="relative p-6 bg-slate-50/60 border-b border-slate-100 flex items-center justify-center min-h-[190px]">
                  {/* Remove / Heart Action Button */}
                  <button
                    type="button"
                    aria-label="Remove from wishlist"
                    onClick={() => handleRemove(product.slug, product.name)}
                    className="absolute right-3 top-3 z-10 grid h-8.5 w-8.5 place-items-center rounded-full border border-slate-200/80 bg-white/95 text-primary hover:bg-rose-50 hover:border-rose-200 transition-all shadow-xs"
                    title="Remove from wishlist"
                  >
                    <Heart className="h-4 w-4 fill-primary text-primary" />
                  </button>

                  {/* Brand Tag / Offer Tag */}
                  {product.brand && (
                    <span className="absolute left-3 top-3 z-10 px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 shadow-xs">
                      {product.brand}
                    </span>
                  )}

                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="w-full flex items-center justify-center"
                  >
                    <img
                      src={cleanImageUrl(product.image_url, product.slug)}
                      alt={product.name}
                      loading="lazy"
                      className="max-h-36 w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </Link>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      <Link
                        to="/products/$slug"
                        params={{ slug: product.slug }}
                        className="hover:text-primary transition-colors"
                      >
                        {product.name}
                      </Link>
                    </h3>

                    {/* Stock Status */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center text-rose-600 gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-600 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
                    <span className="text-lg font-display font-black text-slate-900">
                      {gbp(Number(product.price))}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {gbp(Number(product.compare_at_price))}
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="space-y-1.5 pt-1">
                    <Button
                      disabled={isOutOfStock}
                      className="w-full rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-9.5 gap-2 transition-all hover:scale-[1.01]"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {isOutOfStock ? "Out of Stock" : "Add to Basket"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 h-8 gap-1.5 transition-colors"
                      onClick={() => handleRemove(product.slug, product.name)}
                    >
                      <Trash2 className="h-3 w-3" /> Remove from Wishlist
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
