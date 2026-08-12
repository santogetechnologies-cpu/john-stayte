import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Product } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
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
  component: OrderGasPage,
});

const types = ["Propane Cylinders", "Butane Cylinders", "Patio Cylinders", "Camping Gas", "Pub Gas"];
const steps = ["Cylinder type", "Size & quantity", "Delivery", "Review"];

function OrderGasPage() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(types[0]);
  const [slug, setSlug] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const { addToCart } = useStore();
  const navigate = useNavigate();

  const [gasProducts, setGasProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGasProducts() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("products")
          .select("*")
          .order("price", { ascending: true });

        if (data) {
          const mapped: Product[] = data.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand || "Calor",
            category: p.category_slug || "gas",
            sub: p.subcategory || "Propane Cylinders",
            price: Number(p.price),
            stock: Number(p.stock || 0),
            image: p.image_url || "/placeholder.svg",
            rating: Number(p.rating || 5.0),
            reviews: Number(p.reviews_count || 0),
            featured: Boolean(p.is_featured),
            offer: Boolean(p.is_offer),
            description: p.description || "",
            specs: p.specs && typeof p.specs === "object" && !Array.isArray(p.specs) ? (p.specs as Record<string, string>) : {},
          }));
          setGasProducts(mapped);
          if (mapped.length > 0) setSlug(mapped[0].slug);
        }
      } catch (err) {
        console.error("Gas products load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGasProducts();
  }, []);

  const sizes = gasProducts;
  const selected = gasProducts.find((p) => p.slug === slug) || gasProducts[0];

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
                step === i ? "border-primary bg-primary text-primary-foreground" : step > i ? "border-ink bg-ink text-ink-foreground" : "border-slate-200 text-slate-500"
              )}>
                {step > i ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                <span>{s}</span>
              </li>
            ))}
          </ol>

          {loading ? (
            <div className="surface-card p-12 text-center text-xs text-muted-foreground font-bold rounded-3xl border bg-white">
              <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
              Loading gas products from Supabase...
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-extrabold">Select cylinder type</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {types.map((t) => (
                      <button key={t} onClick={() => { setType(t); setStep(1); }} className={cn("surface-card flex items-center justify-between p-5 text-left rounded-2xl border transition-all", type === t ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-300")}>
                        <div className="flex items-center gap-3">
                          <Flame className="h-6 w-6 text-primary" />
                          <span className="font-extrabold text-sm">{t}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-extrabold">Available Cylinders</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sizes.map((s) => (
                      <button key={s.slug} onClick={() => setSlug(s.slug)} className={cn("surface-card flex items-center justify-between p-5 text-left rounded-2xl border transition-all", slug === s.slug ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-300")}>
                        <div>
                          <p className="font-extrabold text-sm">{s.name}</p>
                          <p className="font-black text-primary text-base mt-1">{gbp(s.price)}</p>
                        </div>
                        <Check className={cn("h-5 w-5 text-primary", slug === s.slug ? "opacity-100" : "opacity-0")} />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 border-t pt-4">
                    <Label className="font-bold">Quantity:</Label>
                    <div className="flex items-center rounded-full border bg-slate-50">
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</Button>
                      <span className="w-10 text-center font-bold">{qty}</span>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty((q) => q + 1)}>+</Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 max-w-lg">
                  <h2 className="text-xl font-extrabold">Delivery details</h2>
                  <div className="space-y-2">
                    <Label>Preferred delivery date *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery address & postcode *</Label>
                    <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address and postcode..." className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver instructions (optional)</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Leave behind side gate" className="rounded-xl" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-extrabold">Review your gas order</h2>
                  <div className="surface-card p-6 rounded-3xl border bg-white space-y-3 text-sm">
                    <div className="flex justify-between font-bold border-b pb-2">
                      <span>Cylinder</span>
                      <span>{selected?.name}</span>
                    </div>
                    <div className="flex justify-between font-bold border-b pb-2">
                      <span>Quantity</span>
                      <span>{qty}</span>
                    </div>
                    <div className="flex justify-between font-bold border-b pb-2">
                      <span>Delivery Date</span>
                      <span>{date}</span>
                    </div>
                    <div className="flex justify-between font-bold border-b pb-2">
                      <span>Delivery Address</span>
                      <span className="text-right max-w-xs">{address}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-primary pt-2">
                      <span>Total Amount</span>
                      <span>{gbp((selected?.price || 0) * qty)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between gap-3 border-t pt-6">
                {step > 0 && <Button variant="outline" className="rounded-full" onClick={() => setStep((s) => s - 1)}>Back</Button>}
                <div className="ml-auto">
                  {step < 3 ? (
                    <Button className="rounded-full px-6" onClick={next}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
                  ) : (
                    <Button className="rounded-full px-6 shadow-md" onClick={() => {
                      if (selected) {
                        addToCart(selected.slug, qty);
                        toast.success("Gas order added to basket!");
                        navigate({ to: "/cart" });
                      }
                    }}>Add to Basket & Checkout</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
