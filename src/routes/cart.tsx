import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Minus,
  Plus,
  Trash2,
  Bookmark,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  MapPin,
  Flame,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { gbp, useCartTotals, useStore } from "@/lib/store";
import { cleanImageUrl } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "My Cart | John Stayte Services" },
      {
        name: "description",
        content:
          "Review your gas cylinders, smokeless fuels, and country essentials before placing your order.",
      },
      { property: "og:title", content: "My Cart | John Stayte Services" },
      { property: "og:description", content: "Review your cart items and checkout securely." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { setQty, removeFromCart, toggleWishlist, wishlist } = useStore();
  const { lines, subtotal, shipping, vat, total, loading } = useCartTotals();
  const navigate = useNavigate();

  const totalItemsCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const hasOutOfStockItems = lines.some((l) => Number(l.product.stock || 0) <= 0);

  // Compute compare-at savings if available
  const originalTotal = lines.reduce((sum, l) => {
    const comp = l.product.compareAt ? Number(l.product.compareAt) : l.product.price;
    return sum + comp * l.qty;
  }, 0);
  const totalSavings = Math.max(0, originalTotal - subtotal);
  const qualifiesForFreeDelivery = subtotal >= 75;
  const amountToFreeDelivery = Math.max(0, 75 - subtotal);

  const handleSaveForLater = (slug: string, name: string) => {
    if (!wishlist.includes(slug)) {
      toggleWishlist(slug);
    }
    removeFromCart(slug);
    toast.success(`Saved "${name}" to your wishlist`);
  };

  const handleRemove = (slug: string, name: string) => {
    removeFromCart(slug);
    toast.success(`Removed "${name}" from cart`);
  };

  return (
    <SiteLayout>
      <div className="bg-[#f1f3f6] min-h-[calc(100vh-140px)] py-6 sm:py-9">
        <div className="container-page max-w-6xl space-y-4 sm:space-y-5">
          {/* ============================================================ */}
          {/* EMPTY CART STATE                                            */}
          {/* ============================================================ */}
          {lines.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-4 max-w-lg mx-auto my-6">
              <div className="h-20 w-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ShoppingBag className="h-10 w-10 stroke-1" />
              </div>

              <div className="space-y-1.5">
                <h1 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
                  Your cart is empty!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                  Explore our Calor gas cylinders, winter solid fuels, and store essentials to add
                  items.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  className="rounded-lg font-bold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-10 px-6 gap-2"
                >
                  <Link to="/products">
                    <Package className="h-4 w-4" /> Shop Now
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* 2-COLUMN FLIPKART-STYLE E-COMMERCE CART LAYOUT              */
            /* ============================================================ */
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] items-start">
              {/* ========================================================== */}
              {/* LEFT COLUMN: CART ITEMS CONTAINER                         */}
              {/* ========================================================== */}
              <div className="space-y-3 sm:space-y-4">
                {/* Delivery Address & Zone Bar */}
                <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold min-w-0">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">
                      Deliver to:{" "}
                      <strong className="text-slate-900 font-bold">
                        Gloucestershire & Stroud Area (GL10)
                      </strong>
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md shrink-0 w-fit">
                    {qualifiesForFreeDelivery
                      ? "✓ Free Delivery Qualified"
                      : `Add ${gbp(amountToFreeDelivery)} more for FREE Delivery`}
                  </div>
                </div>

                {/* Main Cart Items Card */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                  {/* Card Top Title Bar */}
                  <div className="px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between bg-slate-50/60 border-b border-slate-100">
                    <h2 className="text-sm sm:text-base font-display font-extrabold text-slate-900 tracking-tight">
                      My Cart ({totalItemsCount})
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      Standard Direct Fleet Delivery
                    </span>
                  </div>

                  {/* Product Rows */}
                  {lines.map((line) => {
                    const maxStock = Number(line.product.stock || 0);
                    const isOutOfStock = maxStock <= 0;
                    const isMaxStockReached = line.qty >= maxStock && !isOutOfStock;
                    const compareAtPrice = line.product.compareAt
                      ? Number(line.product.compareAt)
                      : null;
                    const discountPercent =
                      compareAtPrice && compareAtPrice > line.product.price
                        ? Math.round(((compareAtPrice - line.product.price) / compareAtPrice) * 100)
                        : null;

                    return (
                      <div
                        key={line.slug}
                        className="p-4 sm:p-5 sm:px-6 space-y-4 hover:bg-slate-50/30 transition-colors"
                      >
                        {/* Top: Image + Info + Price */}
                        <div className="flex gap-3.5 sm:gap-5 items-start">
                          {/* Product Thumbnail */}
                          <div className="shrink-0 flex flex-col items-center gap-2.5">
                            <Link
                              to="/products/$slug"
                              params={{ slug: line.slug }}
                              className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-slate-50 border border-slate-200/70 p-2 flex items-center justify-center group overflow-hidden"
                            >
                              <img
                                src={cleanImageUrl(line.product.image, line.product.slug)}
                                alt={line.product.name}
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                                }}
                              />
                            </Link>

                            {/* Stepper (Desktop/Tablet Position) */}
                            <div className="hidden sm:flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                                onClick={() => setQty(line.slug, line.qty - 1)}
                                disabled={line.qty <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <span className="w-8 text-center text-xs font-bold text-slate-900 select-none">
                                {line.qty}
                              </span>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                                onClick={() => {
                                  if (line.qty >= maxStock) {
                                    toast.error(`Maximum stock reached for ${line.product.name}`);
                                    return;
                                  }
                                  setQty(line.slug, line.qty + 1);
                                }}
                                disabled={isMaxStockReached || isOutOfStock}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {line.product.brand && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  {line.product.brand}
                                </span>
                              )}
                              <span className="text-slate-300">·</span>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                {line.product.category || "Energy & Fuel"}
                              </span>
                            </div>

                            <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                              <Link
                                to="/products/$slug"
                                params={{ slug: line.slug }}
                                className="hover:text-primary transition-colors line-clamp-2"
                              >
                                {line.product.name}
                              </Link>
                            </h3>

                            {/* Real-time Availability */}
                            <div>
                              {isOutOfStock ? (
                                <span className="inline-flex items-center text-xs font-bold text-rose-600 gap-1">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  Currently Out of Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  In Stock · Delivery within 24-48 hrs
                                </span>
                              )}
                            </div>

                            {/* Pricing Row */}
                            <div className="flex items-baseline gap-2.5 pt-1">
                              <span className="text-base sm:text-lg font-display font-black text-slate-900">
                                {gbp(line.product.price * line.qty)}
                              </span>

                              {compareAtPrice && compareAtPrice > line.product.price && (
                                <span className="text-xs text-slate-400 line-through">
                                  {gbp(compareAtPrice * line.qty)}
                                </span>
                              )}

                              {discountPercent && (
                                <span className="text-[11px] font-bold text-emerald-700">
                                  {discountPercent}% Off
                                </span>
                              )}

                              {line.qty > 1 && (
                                <span className="text-xs text-slate-400 font-medium">
                                  ({gbp(line.product.price)} each)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Bar (Flipkart Style: Stepper on Mobile + SAVE FOR LATER | REMOVE) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          {/* Mobile Stepper */}
                          <div className="flex sm:hidden items-center rounded-lg border border-slate-200 bg-white p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              onClick={() => setQty(line.slug, line.qty - 1)}
                              disabled={line.qty <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-bold text-slate-900">
                              {line.qty}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              onClick={() => {
                                if (line.qty >= maxStock) {
                                  toast.error(`Maximum stock reached for ${line.product.name}`);
                                  return;
                                }
                                setQty(line.slug, line.qty + 1);
                              }}
                              disabled={isMaxStockReached || isOutOfStock}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                            <button
                              type="button"
                              onClick={() => handleSaveForLater(line.slug, line.product.name)}
                              className="text-slate-700 hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                            >
                              <Bookmark className="h-3.5 w-3.5 text-slate-400" />
                              Save for Later
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              type="button"
                              onClick={() => handleRemove(line.slug, line.product.name)}
                              className="text-slate-700 hover:text-rose-600 transition-colors flex items-center gap-1.5 py-1"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Footer Bar for Cart Items Card */}
                  <div className="p-4 sm:px-6 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Link
                      to="/products"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      ← Add More Products from Catalog
                    </Link>

                    <Button
                      asChild={!hasOutOfStockItems && lines.length > 0}
                      className="w-full sm:w-auto rounded-lg font-bold text-xs shadow-sm bg-primary hover:bg-primary/90 text-white h-10 px-7 gap-2"
                      disabled={lines.length === 0 || hasOutOfStockItems}
                    >
                      {hasOutOfStockItems || lines.length === 0 ? (
                        <span>Place Order</span>
                      ) : (
                        <Link to="/checkout">
                          Place Order <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* RIGHT COLUMN: STICKY PRICE DETAILS CARD (FLIPKART STYLE)   */}
              {/* ========================================================== */}
              <aside className="space-y-3.5 lg:sticky lg:top-20">
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
                  {/* Card Header */}
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Price Details
                    </h2>
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-5 space-y-3.5 text-xs sm:text-sm">
                    {/* Price (items) */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span>
                        Price ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})
                      </span>
                      <span className="font-semibold text-slate-900">
                        {gbp(originalTotal > subtotal ? originalTotal : subtotal)}
                      </span>
                    </div>

                    {/* Discount (if applicable) */}
                    {totalSavings > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-medium">
                        <span>Discount</span>
                        <span className="font-bold">− {gbp(totalSavings)}</span>
                      </div>
                    )}

                    {/* Delivery Charges */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Delivery Charges</span>
                      <span>
                        {shipping === 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200/60">
                            FREE
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-900">{gbp(shipping)}</span>
                        )}
                      </span>
                    </div>

                    {/* VAT Breakdown */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span>VAT (20% included)</span>
                      <span className="font-semibold text-slate-900">{gbp(vat)}</span>
                    </div>

                    {/* Total Amount Divider */}
                    <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-baseline">
                      <span className="text-sm sm:text-base font-extrabold text-slate-900">
                        Total Amount
                      </span>
                      <span className="text-lg sm:text-xl font-display font-black text-slate-900">
                        {gbp(total)}
                      </span>
                    </div>

                    {/* Savings Callout */}
                    {totalSavings > 0 ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>You will save {gbp(totalSavings)} on this order!</span>
                      </div>
                    ) : qualifiesForFreeDelivery ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Free direct delivery across Gloucestershire!</span>
                      </div>
                    ) : null}

                    {/* Out of stock alert */}
                    {hasOutOfStockItems && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p className="font-semibold leading-relaxed">
                          Remove out-of-stock items before checkout.
                        </p>
                      </div>
                    )}

                    {/* Primary Checkout Button */}
                    <Button
                      asChild={!hasOutOfStockItems && lines.length > 0}
                      size="lg"
                      className="w-full rounded-lg font-extrabold text-xs sm:text-sm shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-11 gap-2 transition-all hover:scale-[1.01]"
                      disabled={lines.length === 0 || hasOutOfStockItems}
                    >
                      {hasOutOfStockItems || lines.length === 0 ? (
                        <span>Proceed to Checkout</span>
                      ) : (
                        <Link to="/checkout">
                          Proceed to Checkout <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Trust & Guarantee Badges */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2.5 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>100% Safe & Secure Payments (SSL 256-bit)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <span>Gloucestershire Depot Direct Fleet Delivery</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Family-run energy supplier since 1972</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
