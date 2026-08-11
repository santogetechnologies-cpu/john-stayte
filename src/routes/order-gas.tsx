import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronRight, Flame } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { products, IMG } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/order-gas")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Order Gas Online | Cylinder Delivery | John Stayte Services" },
      { name: "description", content: "Order propane, butane, patio or pub gas cylinders online in four simple steps with delivery across Gloucestershire." },
      { property: "og:title", content: "Order Gas Online | John Stayte Services" },
      { property: "og:description", content: "Choose your cylinder, size, date and address — delivered next day." },
    ],
  }),
  component: OrderGas,
});

const types = ["Propane Cylinders", "Butane Cylinders", "Patio Cylinders", "Camping Gas", "Pub Gas"];
const steps = ["Cylinder type", "Size & quantity", "Delivery", "Review"];

function OrderGas() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(types[0]);
  const [slug, setSlug] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const { addToCart } = useStore();
  const navigate = useNavigate();

  const sizes = products.filter((p) => p.sub === type);
  const selected = products.find((p) => p.slug === slug);

  const next = () => {
    if (step === 1 && !selected) return toast.error("Pick a cylinder size first.");
    if (step === 2 && (!date || address.trim().length < 6))
      return toast.error("Add a delivery date and address.");
    setStep((s) => Math.min(3, s + 1));
  };

  return (
    <SiteLayout>
      <PageHero eyebrow="Order gas" title="Order your gas in four steps" subtitle="Pick your cylinder, choose a delivery day, and we'll do the rest." />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <ol className="mb-8 flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <li key={s} className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground",
              )}>
                {i < step ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>} {s}
              </li>
            ))}
          </ol>

          <div className="surface-card p-6 md:p-8">
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setSlug(null); setStep(1); }}
                    className={cn("flex items-center gap-4 rounded-2xl border p-5 text-left transition-all hover:border-primary", type === t && "border-primary bg-accent")}
                  >
                    <img src={IMG.cylinder} alt="" className="h-16 w-12 object-contain" loading="lazy" />
                    <span>
                      <span className="block font-bold">{t}</span>
                      <span className="block text-xs text-muted-foreground">{products.filter((p) => p.sub === t).length} sizes available</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {sizes.map((p) => (
                    <button
                      key={p.slug}
                      onClick={() => setSlug(p.slug)}
                      className={cn("rounded-2xl border p-4 text-left transition-all hover:border-primary", slug === p.slug && "border-primary bg-accent")}
                    >
                      <span className="block text-sm font-bold">{p.name}</span>
                      <span className="mt-1 block font-display text-lg font-extrabold">{gbp(p.price)}</span>
                    </button>
                  ))}
                </div>
                <div className="max-w-40">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="mt-1.5 rounded-full" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="date">Preferred delivery date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 rounded-full" />
                </div>
                <div>
                  <Label htmlFor="addr">Delivery address</Label>
                  <Textarea id="addr" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} placeholder="House name/number, street, town, postcode" className="mt-1.5 rounded-2xl" />
                </div>
                <div>
                  <Label htmlFor="notes">Driver notes (optional)</Label>
                  <Textarea id="notes" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, where to leave the cylinder…" className="mt-1.5 rounded-2xl" />
                </div>
              </div>
            )}

            {step === 3 && selected && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold">Review your order</h2>
                <dl className="grid gap-2 text-sm">
                  {[
                    ["Cylinder", selected.name],
                    ["Quantity", String(qty)],
                    ["Delivery date", date],
                    ["Address", address],
                    ["Notes", notes || "—"],
                    ["Total", gbp(selected.price * qty)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 border-b py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Button
                  size="lg"
                  className="w-full rounded-full"
                  onClick={() => { addToCart(selected.slug, qty); toast.success("Gas order added to basket"); navigate({ to: "/checkout" }); }}
                >
                  Continue to checkout
                </Button>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" className="rounded-full" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
              {step < 3 && (
                <Button className="rounded-full px-6" onClick={next}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="surface-card h-fit p-6 lg:sticky lg:top-32">
          <h2 className="flex items-center gap-2 font-extrabold"><Flame className="h-4 w-4 text-primary" /> Your gas order</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold">{type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cylinder</span><span className="font-semibold text-right">{selected?.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-semibold">{qty}</span></div>
            <div className="flex justify-between border-t pt-2 text-base"><span>Subtotal</span><span className="font-extrabold">{gbp((selected?.price ?? 0) * qty)}</span></div>
          </div>
          <p className="mt-4 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
            Free delivery over £75. Empty cylinders collected on delivery.
          </p>
        </aside>
      </div>
    </SiteLayout>
  );
}
