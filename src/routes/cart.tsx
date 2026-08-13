import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { gbp, useCartTotals, useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Your Basket | John Stayte Services" },
      { name: "description", content: "Review the gas, fuel and appliances in your John Stayte Services basket before checkout." },
      { property: "og:title", content: "Your Basket | John Stayte Services" },
      { property: "og:description", content: "Review your order before checkout." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { setQty, removeFromCart } = useStore();
  const { lines, subtotal, shipping, vat, total } = useCartTotals();

  const hasOutOfStockItems = lines.some((l) => Number(l.product.stock || 0) <= 0);

  return (
    <SiteLayout>
      <PageHero eyebrow="Basket" title="Your basket" />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {lines.length === 0 && (
            <div className="surface-card p-16 text-center">
              <p className="font-bold">Your basket is empty.</p>
              <Button asChild className="mt-4 rounded-full"><Link to="/products">Start shopping</Link></Button>
            </div>
          )}
          {lines.map((l) => {
            const maxStock = Number(l.product.stock || 0);
            const isOutOfStock = maxStock <= 0;

            return (
              <div key={l.slug} className="surface-card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 sm:flex">
                <img src={l.product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-surface object-contain p-2" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">{l.product.brand} · {gbp(l.product.price)}</p>
                  {isOutOfStock && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Out of stock - please remove to continue
                    </p>
                  )}
                </div>
                <div className="flex items-center rounded-full border bg-white">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setQty(l.slug, l.qty - 1)}
                    disabled={l.qty <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold">{l.qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => {
                      if (l.qty >= maxStock) {
                        toast.error(`Maximum available stock reached for ${l.product.name}`);
                        return;
                      }
                      setQty(l.slug, l.qty + 1);
                    }}
                    disabled={l.qty >= maxStock || isOutOfStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="w-24 text-right font-extrabold">{gbp(l.product.price * l.qty)}</p>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-rose-600" onClick={() => removeFromCart(l.slug)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <aside className="surface-card h-fit p-6 lg:sticky lg:top-32">
          <h2 className="font-extrabold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{gbp(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{shipping === 0 ? "Free" : gbp(shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">VAT (20%)</dt><dd>{gbp(vat)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold"><dt>Total</dt><dd>{gbp(total)}</dd></div>
          </dl>
          {hasOutOfStockItems && (
            <p className="text-xs text-rose-600 font-bold mt-3 text-center">
              Please remove out-of-stock items before checkout.
            </p>
          )}
          <Button
            asChild={!hasOutOfStockItems && lines.length > 0}
            size="lg"
            className="mt-6 w-full rounded-full font-bold shadow-md"
            disabled={lines.length === 0 || hasOutOfStockItems}
          >
            {hasOutOfStockItems || lines.length === 0 ? (
              <span>Checkout</span>
            ) : (
              <Link to="/checkout">Checkout</Link>
            )}
          </Button>
        </aside>
      </div>
    </SiteLayout>
  );
}
