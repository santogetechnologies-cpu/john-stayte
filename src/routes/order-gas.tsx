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
      <div className="bg-[#fcfdfe] min-h-[85vh] py-8 sm:py-10 lg:py-14 border-b border-slate-200/60">
        <div className="container-page max-w-6xl xl:max-w-7xl 2xl:max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 mb-8 sm:mb-10 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>ORDER GAS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
              Order your gas in four steps
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
              Pick your cylinder, choose a delivery day, and we'll do the rest.
            </p>
          </div>

          <nav aria-label="Progress" className="mb-8 sm:mb-10">
            <ol className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {steps.map((s, i) => {
                const isActive = step === i;
                const isComplete = step > i;
                return (
                  <li key={s} className="w-full">
                    <button
                      type="button"
                      onClick={() => {
                        if (i < step) setStep(i);
                      }}
                      disabled={i > step}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl border text-xs sm:text-sm lg:text-[14.5px] font-extrabold transition-all duration-200 text-left",
                        isActive
                          ? "border-primary bg-primary text-white shadow-[0_4px_16px_rgba(220,38,38,0.28)]"
                          : isComplete
                          ? "border-slate-300 bg-white text-slate-900 hover:border-slate-400 shadow-2xs cursor-pointer"
                          : "border-slate-200/80 bg-slate-50 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors",
                          isActive
                            ? "bg-white/20 text-white"
                            : isComplete
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-slate-200/70 text-slate-500"
                        )}
                      >
                        {isComplete ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <span>{i + 1}</span>}
                      </span>
                      <span className="truncate leading-tight">{s}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_4px_28px_rgba(0,0,0,0.04)] p-6 sm:p-8 lg:p-10">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground font-bold">
                <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin mb-3" />
                Loading gas products from Supabase...
              </div>
            ) : (
              <>
                {step === 0 && (
                  <div className="space-y-6 sm:space-y-7">
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight font-display">
                        Select cylinder type
                      </h2>
                      <div className="h-1 w-12 bg-primary rounded-full mt-2" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                      {types.map((t) => {
                        const isSelected = type === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setType(t);
                              setStep(1);
                            }}
                            className={cn(
                              "group relative flex items-center justify-between p-4.5 sm:p-5 lg:p-5.5 min-h-[74px] sm:min-h-[80px] rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-2xs"
                                : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs"
                            )}
                          >
                            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                              <div
                                className={cn(
                                  "h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs",
                                  isSelected
                                    ? "bg-primary text-white"
                                    : "bg-red-50 text-primary border border-red-100/90 group-hover:bg-red-100/70"
                                )}
                              >
                                <Flame className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2]" />
                              </div>
                              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                                {t}
                              </span>
                            </div>
                            <ChevronRight
                              className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-200",
                                isSelected
                                  ? "text-primary translate-x-1"
                                  : "text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-7">
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight font-display">
                        Available Cylinders
                      </h2>
                      <div className="h-1 w-12 bg-primary rounded-full mt-2" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                      {sizes.map((s) => {
                        const isSelected = slug === s.slug;
                        return (
                          <button
                            key={s.slug}
                            type="button"
                            onClick={() => setSlug(s.slug)}
                            className={cn(
                              "group relative flex items-center justify-between p-4.5 sm:p-5 lg:p-5.5 min-h-[74px] sm:min-h-[80px] rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-2xs"
                                : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs"
                            )}
                          >
                            <div className="min-w-0 pr-3">
                              <p className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-snug">
                                {s.name}
                              </p>
                              <p className="font-black text-primary text-base sm:text-lg mt-1 tracking-tight">
                                {gbp(s.price)}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border transition-all",
                                isSelected
                                  ? "border-primary bg-primary text-white shadow-2xs"
                                  : "border-slate-200 bg-slate-50 text-transparent opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between sm:justify-start gap-5 border-t border-slate-100 pt-6">
                      <Label className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-700">
                        Quantity:
                      </Label>
                      <div className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 p-1 shadow-2xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-white text-slate-700 font-bold"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                        >
                          -
                        </Button>
                        <span className="w-10 sm:w-12 text-center font-black text-sm sm:text-base text-slate-900">{qty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-white text-slate-700 font-bold"
                          onClick={() => setQty((q) => q + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight font-display">
                        Delivery details
                      </h2>
                      <div className="h-1 w-12 bg-primary rounded-full mt-2" />
                    </div>

                    <div className="space-y-4 max-w-2xl">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm font-extrabold text-slate-800">
                          Preferred delivery date *
                        </Label>
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white transition-colors h-11 text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm font-extrabold text-slate-800">
                          Delivery address & postcode *
                        </Label>
                        <Textarea
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Full street address and postcode..."
                          className="rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white transition-colors text-sm sm:text-base p-3.5"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm font-extrabold text-slate-800">
                          Driver instructions (optional)
                        </Label>
                        <Input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Leave behind side gate"
                          className="rounded-xl border-slate-200/90 focus-visible:ring-primary/20 bg-slate-50/50 hover:bg-white transition-colors h-11 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight font-display">
                        Review your gas order
                      </h2>
                      <div className="h-1 w-12 bg-primary rounded-full mt-2" />
                    </div>

                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 sm:p-7 space-y-3.5 text-sm sm:text-base max-w-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                        <span className="text-slate-500 font-medium">Cylinder</span>
                        <span className="font-extrabold text-slate-900 text-right">{selected?.name}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                        <span className="text-slate-500 font-medium">Quantity</span>
                        <span className="font-extrabold text-slate-900">{qty}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                        <span className="text-slate-500 font-medium">Delivery Date</span>
                        <span className="font-extrabold text-slate-900">{date}</span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/70 pb-3">
                        <span className="text-slate-500 font-medium">Delivery Address</span>
                        <span className="font-extrabold text-slate-900 text-right max-w-xs">{address}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5">
                        <span className="text-base sm:text-lg font-black text-slate-900">Total Amount</span>
                        <span className="text-xl sm:text-2xl font-black text-primary">{gbp((selected?.price || 0) * qty)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 sm:mt-10 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-6 sm:px-7 py-3 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer h-10 sm:h-11"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="ml-auto">
                    {step < 3 ? (
                      <Button
                        type="button"
                        className="rounded-full px-8 sm:px-9 py-3 sm:py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm lg:text-base shadow-[0_4px_16px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer h-10 sm:h-12"
                        onClick={next}
                      >
                        <span>Continue</span>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="rounded-full px-8 sm:px-9 py-3 sm:py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm lg:text-base shadow-[0_4px_16px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer h-10 sm:h-12"
                        onClick={() => {
                          if (selected) {
                            addToCart(selected.slug, qty);
                            toast.success("Gas order added to basket!");
                            navigate({ to: "/cart" });
                          }
                        }}
                      >
                        <span>Add to Basket & Checkout</span>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
