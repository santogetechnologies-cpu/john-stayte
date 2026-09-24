import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Tag,
  TicketPercent,
  Copy,
  Check,
  ArrowRight,
  Flame,
  ShoppingBag,
  Users,
  Clock,
  Sparkles,
  ShieldCheck,
  Gift,
  Share2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchPublicOffers, type Offer } from "@/lib/offer-service";
import { gbp } from "@/lib/store";

export function OffersListSection() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "product_based" | "customer_target_based">("all");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    fetchPublicOffers().then((data) => {
      if (isMounted) {
        setOffers(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Promo code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleApplyAndShop = (offer: Offer) => {
    try {
      sessionStorage.setItem("jss.applied_offer", JSON.stringify(offer));
      toast.success(`Offer "${offer.title}" applied to your basket session!`);
    } catch {
      /* ignore */
    }
    navigate({ to: (offer.cta_link as any) || "/order-gas" });
  };

  const filteredOffers = useMemo(() => {
    if (selectedCategory === "all") return offers;
    return offers.filter((o) => o.offer_category === selectedCategory);
  }, [offers, selectedCategory]);

  return (
    <section className="py-12 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All Promotions ({offers.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("product_based")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              selectedCategory === "product_based"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Product & Fuel Deals
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("customer_target_based")}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              selectedCategory === "customer_target_based"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Customer Rewards & Loyalty
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 h-64 animate-pulse space-y-4">
                <div className="h-6 w-24 bg-slate-200 rounded-full" />
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-12 w-full bg-slate-100 rounded-xl" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-xs max-w-lg mx-auto p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Gift className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-display">No Active Offers in this Category</h3>
              <p className="text-xs text-slate-500 mt-1">
                Check back soon or explore our standard catalog for reliable fuel and cylinder prices across Gloucestershire.
              </p>
            </div>
            <Button asChild className="rounded-xl font-bold text-xs bg-primary text-white">
              <Link to="/products">Browse All Products</Link>
            </Button>
          </div>
        ) : (
          /* Offers Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const isPercentage = offer.discount_type === "percentage";
              const isCustomerBased = offer.offer_category === "customer_target_based";

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-4">
                    {/* Badge & Category Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {offer.badge || "Special Offer"}
                      </span>

                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        {isCustomerBased ? (
                          <>
                            <Users className="h-3 w-3 text-purple-600" /> Customer Reward
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-3 w-3 text-blue-600" /> Product Deal
                          </>
                        )}
                      </span>
                    </div>

                    {/* Headline */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 font-display group-hover:text-primary transition-colors">
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                          {offer.description}
                        </p>
                      )}
                    </div>

                    {/* Highlighted Value Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-primary font-display">
                          {isPercentage ? `${offer.discount_value}% OFF` : `£${offer.discount_value} OFF`}
                        </span>
                        {offer.max_discount_cap ? (
                          <span className="text-[10px] text-slate-500 block font-medium">
                            Up to £{offer.max_discount_cap} maximum discount
                          </span>
                        ) : null}
                      </div>

                      {offer.min_order_subtotal > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Min Spend</span>
                          <span className="text-xs font-black text-slate-800">£{offer.min_order_subtotal}</span>
                        </div>
                      )}
                    </div>

                    {/* Code Copy Box if Code exists */}
                    {offer.code ? (
                      <div className="p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Promo Code</span>
                          <span className="text-xs font-mono font-black text-slate-900 tracking-wider">
                            {offer.code}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(offer.code!)}
                          className="h-8 px-3 rounded-lg text-xs font-bold gap-1 bg-white hover:bg-slate-50"
                        >
                          {copiedCode === offer.code ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/60 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Auto-applied at checkout for qualifying items!</span>
                      </div>
                    )}

                    {/* Expiry / Time window notice */}
                    {offer.ends_at && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>Valid until {new Date(offer.ends_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    )}
                  </div>

                  {/* Action CTA */}
                  <Button
                    onClick={() => handleApplyAndShop(offer)}
                    className="w-full rounded-2xl font-black text-xs h-11 gap-2 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                  >
                    <span>{offer.cta_text || "Apply & Shop Now"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Guarantee Trust Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs grid sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">Trusted Local Supply</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Gloucestershire family-run service since 1974.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">Clear, Honest Savings</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Discounts calculated automatically with full transparency.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">Fast Regional Delivery</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Prompt cylinder and solid fuel delivery to your door.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
