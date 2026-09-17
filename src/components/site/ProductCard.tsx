import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn, cleanImageUrl } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const wished = wishlist.includes(product.slug);
  const isOutOfStock = Number(product.stock || 0) <= 0;

  return (
    <article className="group surface-card relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      {/* TOP-LEFT: Wishlist Quick Action */}
      <button
        type="button"
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product.slug);
          toast(wished ? `Removed ${product.name} from wishlist` : `Added ${product.name} to wishlist`);
        }}
        className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-slate-200/80 bg-white/95 backdrop-blur shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer group/fav"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            wished ? "fill-red-600 text-red-600" : "text-slate-400 group-hover/fav:text-red-600",
          )}
        />
      </button>

      {/* TOP-RIGHT: Cart Quick Action */}
      <button
        type="button"
        aria-label="Add to cart"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isOutOfStock) {
            toast.error(`${product.name} is currently out of stock.`);
            return;
          }
          addToCart(product.slug, 1);
          toast.success(`Added ${product.name} to cart`);
        }}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-slate-200/80 bg-white/95 backdrop-blur shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 text-slate-700 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group/cart"
      >
        <ShoppingCart className="h-4 w-4 transition-colors" />
      </button>

      {product.offer && (
        <span className="absolute left-12 top-3.5 z-10 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-xs">
          Offer
        </span>
      )}

      <Link to="/products/$slug" params={{ slug: product.slug }} className="block bg-surface p-6">
        <img
          src={cleanImageUrl(product.image, product.slug)}
          alt={product.name}
          loading="lazy"
          className="mx-auto h-40 w-full object-contain transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {typeof product.brand === "string" ? product.brand : "Calor"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug">
          <Link to="/products/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          {product.rating.toFixed(1)} · {product.reviews} reviews
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-lg font-extrabold">{gbp(product.price)}</span>
          {product.compareAt && (
            <span className="pb-0.5 text-sm text-muted-foreground line-through">
              {gbp(product.compareAt)}
            </span>
          )}
        </div>

        {/* Real-time Product Availability Badge (In Stock / Out of Stock) */}
        <div className="mt-2 flex items-center gap-1.5">
          {isOutOfStock ? (
            <span className="inline-flex items-center text-xs font-bold text-rose-600">
              <XCircle className="mr-1 h-3.5 w-3.5" /> Out of Stock
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> In Stock
            </span>
          )}
        </div>

        <Button
          asChild
          className="mt-4 w-full rounded-full font-black text-xs shadow-xs bg-red-600 hover:bg-red-700 text-white h-9 transition-all flex items-center justify-center gap-1.5 cursor-pointer group/btn"
        >
          <Link to="/products/$slug" params={{ slug: product.slug }}>
            <span>View details &amp; select</span>
            <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
