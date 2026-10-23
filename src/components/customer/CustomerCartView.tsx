import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Minus,
  Plus,
  Trash2,
  Heart,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  MapPin,
  Package,
  Sparkles,
  Tag,
  RotateCcw,
  Flame,
  X,
  AlertTriangle,
  Info,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { gbp, useCartTotals, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl, cn } from "@/lib/utils";
import { fetchPublicOffers, evaluateOfferForCart, type Offer } from "@/lib/offer-service";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";

export function CustomerCartView() {
  const { setQty, removeFromCart, toggleWishlist, wishlist, clearCart } = useStore();
  const navigate = useNavigate();

  // Active Promo Code / Offer State
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(() => {
    try {
      const saved = sessionStorage.getItem("jss.applied_offer");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);

  // Authoritative live cart totals with database reconciliation and settings
  const { lines, subtotal, offerDiscount, shipping, vat, total, loading, settings } =
    useCartTotals(appliedOffer);

  // Load active public offers
  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers().then((offers) => {
      if (isMounted) setAvailableOffers(offers);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const totalItemsCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const hasOutOfStockItems = lines.some((l) => Number(l.product.stock || 0) <= 0);

  // Check if cart contains refillable LPG cylinders
  const hasCylindersInCart = useMemo(() => {
    return lines.some((l) => isRefillableLpgCylinderProduct(l.product));
  }, [lines]);

  // Delivery progress threshold from authoritative settings
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 0;
  const isFreeDeliveryEnabled = Boolean(settings?.freeDeliveryEnabled);
  const qualifiesForFreeDelivery = isFreeDeliveryEnabled
    ? freeDeliveryThreshold === 0
      ? subtotal > 0
      : subtotal >= freeDeliveryThreshold && subtotal > 0
    : false;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress =
    freeDeliveryThreshold > 0
      ? Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))
      : 100;

  // Compute compare-at savings if available
  const originalTotal = lines.reduce((sum, l) => {
    const comp = l.product.compareAt ? Number(l.product.compareAt) : l.product.price;
    return sum + comp * l.qty;
  }, 0);
  const catalogSavings = Math.max(0, originalTotal - subtotal);
  const totalCombinedSavings = catalogSavings + (offerDiscount || 0);

  // Handle Promo Code Submission
  const handleApplyPromoCode = async () => {
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a promo code.");
      return;
    }
    setApplyingCode(true);
    try {
      let matchedOffer = availableOffers.find(
        (o) => o.code && o.code.toUpperCase() === cleanCode,
      );

      if (!matchedOffer) {
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .eq("code", cleanCode)
          .eq("status", "active")
          .maybeSingle();

        if (error || !data) {
          throw new Error("Invalid promo code or offer is no longer active.");
        }
        matchedOffer = data as unknown as Offer;
      }

      const evalResult = evaluateOfferForCart(matchedOffer, lines, subtotal);
      if (!evalResult.isEligible) {
        throw new Error(evalResult.reason || "Your cart does not meet the requirements for this offer.");
      }

      setAppliedOffer(matchedOffer);
      try {
        sessionStorage.setItem("jss.applied_offer", JSON.stringify(matchedOffer));
      } catch {}
      toast.success(`Promo code "${cleanCode}" applied! You saved ${gbp(evalResult.discountAmount)}.`);
      setPromoCodeInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to apply promo code.");
    } finally {
      setApplyingCode(false);
    }
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    try {
      sessionStorage.removeItem("jss.applied_offer");
    } catch {}
    toast.info("Offer removed from cart.");
  };

  // Move Item to Wishlist
  const handleSaveForLater = (slug: string, name: string) => {
    if (!wishlist.includes(slug)) {
      toggleWishlist(slug);
    }
    removeFromCart(slug);
    toast.success(`Saved "${name}" to your Wishlist`);
  };

  // Remove Item from Cart with Toast Notification
  const handleRemove = (slug: string, name: string) => {
    removeFromCart(slug);
    toast.success(`Removed "${name}" from cart`);
  };

  // Update Quantity with Stock Validation
  const handleUpdateQty = (slug: string, currentQty: number, targetQty: number, stock: number, name: string) => {
    if (targetQty < 1) return;
    if (targetQty > stock) {
      toast.error(`Only ${stock} unit(s) available in stock for ${name}.`);
      return;
    }
    setQty(slug, targetQty);
  };

  // Extract Product Size / Capacity from specs or title
  const getProductSize = (product: any): string | null => {
    const specs = product.specs || {};
    if (specs.cylinder_size) return specs.cylinder_size;
    if (specs.capacity) return specs.capacity;
    if (specs.weight) return specs.weight;
    if (specs.size) return specs.size;
    if (specs.volume) return specs.volume;

    // Fallback: extract weight or size from product title (e.g. "13kg", "19kg", "6kg", "25kg")
    const match = product.name?.match(/\b(\d+(\.\d+)?\s*(kg|g|litre|l|ml))\b/i);
    if (match) return match[1];

    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Updating your shopping cart...</h2>
        <p className="text-xs text-slate-500">Checking live prices, inventory, and delivery options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ============================================================ */}
      {/* 1. CART PAGE HEADER                                          */}
      {/* ============================================================ */}
      <div className="relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">Shopping Cart</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
                Shopping Cart
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Review your selected products and arrange your gas delivery with ease.
            </p>
          </div>

          {lines.length > 0 && (
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm("Are you sure you want to empty your shopping cart?")) {
                    clearCart();
                    toast.info("Shopping cart cleared.");
                  }
                }}
                className="rounded-xl font-bold text-xs border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 h-9 px-3 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Cart
              </Button>
              <Button
                asChild
                className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-sm h-9 px-4 gap-1.5"
              >
                <Link to="/checkout">
                  Proceed to Checkout <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. EMPTY CART STATE                                          */}
      {/* ============================================================ */}
      {lines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-6 max-w-xl mx-auto my-4">
          <div className="h-20 w-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-primary shadow-xs">
            <ShoppingCart className="h-10 w-10 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
              Your cart is waiting for something useful.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              Explore our gas cylinders, refills and accessories to get started.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              className="w-full sm:w-auto rounded-xl font-bold text-xs shadow-md bg-primary hover:bg-primary/90 text-white h-11 px-7 gap-2"
            >
              <Link to="/products">
                <Package className="h-4 w-4" /> Browse Products
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-11 px-6 gap-2"
            >
              <Link to="/order-gas">
                <Flame className="h-4 w-4 text-orange-500" /> Order Gas Bottle
              </Link>
            </Button>
          </div>

          {/* Quick Categories Bar */}
          <div className="pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Popular Categories
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700">
              <Link
                to="/products"
                search={{ category: "bottled-gas" }}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors"
              >
                🔥 Bottled Gas & Refills
              </Link>
              <Link
                to="/products"
                search={{ category: "solid-fuels" }}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors"
              >
                🪵 Solid Fuels & Logs
              </Link>
              <Link
                to="/products"
                search={{ category: "appliances" }}
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors"
              >
                🍳 Appliances & Accessories
              </Link>
              <Link
                to="/account/wishlist"
                className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors text-primary"
              >
                ❤️ Saved in Wishlist ({wishlist.length})
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 3. ACTIVE CART: 2-COLUMN PREMIUM RESPONSIVE LAYOUT           */
        /* ============================================================ */
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: ITEMS & SERVICE BANNERS                       */}
          {/* ========================================================== */}
          <div className="space-y-4">
            {/* Delivery Notice & Free Shipping Progress Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-800 font-semibold min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-red-50 text-primary flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">
                      {settings?.deliveryTierName || "Standard Direct Fleet Delivery"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Serving Gloucestershire, Stroud, Stonehouse & surrounding postcodes
                    </span>
                  </div>
                </div>

                <Badge
                  className={cn(
                    "font-bold text-[11px] px-2.5 py-1 rounded-md shrink-0 w-fit",
                    qualifiesForFreeDelivery
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : isFreeDeliveryEnabled && freeDeliveryThreshold > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-800 border-slate-200",
                  )}
                >
                  {qualifiesForFreeDelivery
                    ? "✓ Free Delivery Qualified"
                    : isFreeDeliveryEnabled && freeDeliveryThreshold > 0
                      ? `Add ${gbp(amountToFreeDelivery)} more for Free Delivery`
                      : shipping === 0
                        ? "Delivery Fee: £0.00"
                        : `Delivery Fee: ${gbp(shipping)}`}
                </Badge>
              </div>

              {/* Progress bar (when free delivery rule with threshold is active) */}
              {isFreeDeliveryEnabled && freeDeliveryThreshold > 0 && (
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        qualifiesForFreeDelivery ? "bg-emerald-500" : "bg-primary",
                      )}
                      style={{ width: `${freeDeliveryProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Current: {gbp(subtotal)}</span>
                    <span>Free delivery threshold: {gbp(freeDeliveryThreshold)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cylinder Exchange Policy Alert (if gas cylinder in cart) */}
            {hasCylindersInCart && (
              <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200/80 p-4 shadow-xs flex items-start gap-3">
                <Flame className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-indigo-950">
                    Calor Gas Cylinder Exchange Policy
                  </h4>
                  <p className="text-indigo-900 leading-relaxed font-medium">
                    Refill cylinders are supplied on an empty-for-full exchange basis with zero cylinder
                    deposit. If you do not have an empty cylinder to return upon delivery, a refundable
                    security deposit option can be added at checkout.
                  </p>
                </div>
              </div>
            )}

            {/* Cart Items Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/70 flex items-center justify-between border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Cart Items ({lines.length})
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Unit Price · Quantity · Total
                </span>
              </div>

              {lines.map((line) => {
                const maxStock = Number(line.product.stock || 0);
                const isOutOfStock = maxStock <= 0;
                const isMaxStockReached = line.qty >= maxStock && !isOutOfStock;
                const sizeLabel = getProductSize(line.product);
                const isCylinder = isRefillableLpgCylinderProduct(line.product);
                const lineTotal = line.product.price * line.qty;

                return (
                  <div
                    key={line.slug}
                    className="p-4 sm:p-5 space-y-4 hover:bg-slate-50/40 transition-colors"
                  >
                    <div className="flex gap-4 sm:gap-5 items-start">
                      {/* Product Thumbnail */}
                      <Link
                        to="/products/$slug"
                        params={{ slug: line.slug }}
                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 group overflow-hidden"
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

                      {/* Product Info & Pricing */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            {line.product.brand}
                          </span>
                          {sizeLabel && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {sizeLabel}
                            </span>
                          )}
                          {isCylinder && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                              Refillable Cylinder
                            </span>
                          )}
                        </div>

                        <Link
                          to="/products/$slug"
                          params={{ slug: line.slug }}
                          className="font-display font-extrabold text-sm sm:text-base text-slate-900 hover:text-primary transition-colors line-clamp-2 block leading-snug"
                        >
                          {line.product.name}
                        </Link>

                        {/* Stock & Unit Price */}
                        <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                          <span className="font-extrabold text-slate-900">
                            {gbp(line.product.price)} each
                          </span>
                          {line.product.compareAt && line.product.compareAt > line.product.price && (
                            <span className="text-slate-400 line-through text-[11px]">
                              {gbp(line.product.compareAt)}
                            </span>
                          )}

                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md",
                              isOutOfStock
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : maxStock <= 5
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            )}
                          >
                            {isOutOfStock
                              ? "Out of Stock"
                              : maxStock <= 5
                                ? `Only ${maxStock} left`
                                : "In Stock"}
                          </span>
                        </div>
                      </div>

                      {/* Line Item Subtotal (Right) */}
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 font-semibold block">Total</span>
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {gbp(lineTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Bar: Quantity Controls + Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      {/* Stepper Controls */}
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/70 p-1 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30"
                          onClick={() =>
                            handleUpdateQty(
                              line.slug,
                              line.qty,
                              line.qty - 1,
                              maxStock,
                              line.product.name,
                            )
                          }
                          disabled={line.qty <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>

                        <span className="w-9 text-center text-xs font-black text-slate-900 select-none">
                          {line.qty}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30"
                          onClick={() =>
                            handleUpdateQty(
                              line.slug,
                              line.qty,
                              line.qty + 1,
                              maxStock,
                              line.product.name,
                            )
                          }
                          disabled={isMaxStockReached || isOutOfStock}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Right actions: Save to Wishlist + Remove */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveForLater(line.slug, line.product.name)}
                          className="text-xs font-bold text-slate-500 hover:text-primary hover:bg-red-50/60 h-8 px-2.5 gap-1.5 rounded-lg"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Save for Later</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(line.slug, line.product.name)}
                          className="text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50/60 h-8 px-2.5 gap-1.5 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: STICKY ORDER SUMMARY PANEL                   */}
          {/* ========================================================== */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {/* Promo Code Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" /> Promotional Code
              </span>

              {appliedOffer ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-emerald-800">
                        {appliedOffer.code}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        Applied
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Saved {gbp(offerDiscount)} on this order
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveOffer}
                    className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100/70"
                    aria-label="Remove offer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code (e.g. WELCOME10)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromoCode()}
                    className="rounded-xl text-xs uppercase font-mono h-10 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  <Button
                    onClick={handleApplyPromoCode}
                    disabled={applyingCode || !promoCodeInput.trim()}
                    className="rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 shrink-0 shadow-xs"
                  >
                    {applyingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary Calculations */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <h3 className="font-display font-black text-base text-slate-900 tracking-tight pb-3 border-b border-slate-100">
                Order Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                {/* Items Subtotal */}
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal ({totalItemsCount} items)</span>
                  <span className="font-extrabold text-slate-900">{gbp(subtotal)}</span>
                </div>

                {/* Offer Discount */}
                {offerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Promotional Discount</span>
                    <span>-{gbp(offerDiscount)}</span>
                  </div>
                )}

                {/* Cylinder Deposit (Policy Clarification) */}
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    Cylinder Deposit
                    <span className="text-[10px] text-slate-400 font-normal">
                      {hasCylindersInCart ? "(Standard Exchange)" : ""}
                    </span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {hasCylindersInCart ? "£0.00" : "N/A"}
                  </span>
                </div>

                {hasCylindersInCart && (
                  <p className="text-[10px] text-slate-400 italic -mt-1 leading-snug">
                    * Refill exchange assumed. If you need a new cylinder without returning an empty, a refundable deposit option can be added at checkout.
                  </p>
                )}

                {/* Estimated Delivery */}
                <div className="flex justify-between text-slate-600">
                  <span>{settings?.deliveryTierName || "Standard Fleet Delivery"}</span>
                  <span className="font-extrabold text-slate-900">
                    {shipping === 0 ? (
                      <span className="text-emerald-700 font-black">
                        {settings?.freeDeliveryEnabled ? "FREE" : "£0.00"}
                      </span>
                    ) : (
                      gbp(shipping)
                    )}
                  </span>
                </div>

                {/* VAT Breakdown */}
                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                  <span>
                    Estimated VAT (
                    {settings?.taxEnabled && (settings?.vatRate ?? 0) > 0
                      ? `${settings.vatRate}%`
                      : "0%"}
                    {settings?.taxPricingMode === "inclusive" ? " incl." : ""}
                    )
                  </span>
                  <span className="font-semibold text-slate-700">{gbp(vat)}</span>
                </div>

                {/* Total */}
                <div className="pt-3 border-t-2 border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="font-display font-black text-sm text-slate-900 block">
                      Estimated Total
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Includes delivery and all applicable taxes
                    </span>
                  </div>
                  <span className="font-display font-black text-2xl text-slate-900">
                    {gbp(total)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  asChild
                  disabled={hasOutOfStockItems || lines.length === 0}
                  className="w-full rounded-full font-black text-xs h-11 bg-primary hover:bg-primary/90 text-white shadow-md gap-2"
                >
                  <Link to="/checkout">
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-full font-bold text-xs h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Link to="/products">Continue Shopping</Link>
                </Button>
              </div>

              {hasOutOfStockItems && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    One or more items in your basket are currently out of stock. Please remove or adjust them before proceeding to checkout.
                  </span>
                </div>
              )}

              {/* Trust & Guarantee Badges */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Secure checkout with SSL encryption & 3D Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Prompt delivery direct from our Gloucestershire depot</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Official Calor Gas approved dealer & distributor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
