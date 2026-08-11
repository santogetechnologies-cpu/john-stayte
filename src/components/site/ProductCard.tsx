import { Link } from "@tanstack/react-router";
import { Heart, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const wished = wishlist.includes(product.slug);

  return (
    <article className="group surface-card relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <button
        type="button"
        aria-label="Add to wishlist"
        onClick={() => toggleWishlist(product.slug)}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border bg-background/90 backdrop-blur transition-colors hover:border-primary"
      >
        <Heart className={cn("h-4 w-4", wished ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>

      {product.offer && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          Offer
        </span>
      )}

      <Link to="/products/$slug" params={{ slug: product.slug }} className="block bg-surface p-6">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="mx-auto h-40 w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{product.brand}</p>
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
            <span className="pb-0.5 text-sm text-muted-foreground line-through">{gbp(product.compareAt)}</span>
          )}
        </div>
        <p className={cn("mt-1 text-xs font-semibold", product.stock > 10 ? "text-success" : "text-primary")}>
          {product.stock > 10 ? "In stock" : `Only ${product.stock} left`}
        </p>
        <Button
          className="mt-4 w-full rounded-full"
          onClick={() => {
            addToCart(product.slug);
            toast.success(`${product.name} added to basket`);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add to basket
        </Button>
      </div>
    </article>
  );
}
