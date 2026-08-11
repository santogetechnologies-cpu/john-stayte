import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gbp, useCartTotals, useStore } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Checkout | John Stayte Services" },
      { name: "description", content: "Secure checkout for gas, fuel and appliance orders with guest or account options." },
      { property: "og:title", content: "Checkout | John Stayte Services" },
      { property: "og:description", content: "Complete your John Stayte Services order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { subtotal, shipping, vat, total, lines } = useCartTotals();
  const { clearCart, user } = useStore();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const navigate = useNavigate();

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "JSS10") {
      setDiscount(subtotal * 0.1);
      toast.success("Coupon JSS10 applied — 10% off");
    } else toast.error("That coupon isn't valid.");
  };

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return toast.error("Your basket is empty.");
    clearCart();
    toast.success("Order placed — confirmation on its way.");
    navigate({ to: "/account" });
  };

  return (
    <SiteLayout>
      <PageHero eyebrow="Checkout" title={user ? `Checkout, ${user.name.split(" ")[0]}` : "Guest checkout"} />
      <form onSubmit={place} className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="surface-card p-7">
            <h2 className="font-extrabold">Delivery details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="fn">Full name</Label><Input id="fn" required maxLength={100} defaultValue={user?.name} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="em">Email</Label><Input id="em" type="email" required maxLength={255} defaultValue={user?.email} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="ph">Phone</Label><Input id="ph" required maxLength={20} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="pc">Postcode</Label><Input id="pc" required maxLength={10} className="mt-1.5 rounded-full" /></div>
            </div>
            <div className="mt-4"><Label htmlFor="ad">Address</Label><Textarea id="ad" required maxLength={300} className="mt-1.5 rounded-2xl" /></div>
          </section>
          <section className="surface-card p-7">
            <h2 className="font-extrabold">Payment (demo)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="cn">Card number</Label><Input id="cn" placeholder="4242 4242 4242 4242" maxLength={19} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="ex">Expiry</Label><Input id="ex" placeholder="12/29" maxLength={5} className="mt-1.5 rounded-full" /></div>
              <div><Label htmlFor="cv">CVC</Label><Input id="cv" placeholder="123" maxLength={4} className="mt-1.5 rounded-full" /></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">UI only — no card data is stored or processed.</p>
          </section>
        </div>

        <aside className="surface-card h-fit p-6 lg:sticky lg:top-32">
          <h2 className="font-extrabold">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.slug} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">{l.qty} × {l.product.name}</span>
                <span className="font-semibold">{gbp(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" maxLength={20} className="rounded-full" />
            <Button type="button" variant="outline" className="rounded-full" onClick={applyCoupon}>Apply</Button>
          </div>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{gbp(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-primary"><dt>Discount</dt><dd>−{gbp(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{shipping === 0 ? "Free" : gbp(shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">VAT (20%)</dt><dd>{gbp(vat)}</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold"><dt>Total</dt><dd>{gbp(Math.max(0, total - discount))}</dd></div>
          </dl>
          <Button type="submit" size="lg" className="mt-6 w-full rounded-full">Place order</Button>
        </aside>
      </form>
    </SiteLayout>
  );
}
