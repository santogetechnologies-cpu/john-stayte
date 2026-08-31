import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { type Product } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Latest Offers & Bundles | John Stayte Services" },
      { name: "description", content: "Seasonal deals, fuel bundles and discounted appliances from John Stayte Services." },
      { property: "og:title", content: "Latest Offers | John Stayte Services" },
      { property: "og:description", content: "Seasonal fuel bundles and discounted appliances." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const [deals, setDeals] = useState<Product[]>([]);
  const [promoOffers, setPromoOffers] = useState<any[]>([]);

  useEffect(() => {
    async function loadOffersData() {
      try {
        const [{ data: prodData }, { data: offerData }] = await Promise.all([
          supabase.from("products").select("*").eq("is_offer", true),
          supabase.from("offers").select("*").eq("is_active", true),
        ]);

        if (prodData) {
          const mapped: Product[] = prodData.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand || "Calor",
            category: p.category_slug || "gas",
            sub: p.subcategory || "General",
            price: Number(p.price),
            compareAt: p.compare_at_price ? Number(p.compare_at_price) : undefined,
            stock: Number(p.stock || 0),
            image: cleanImageUrl(p.image_url, p.slug),
            rating: Number(p.rating || 5.0),
            reviews: Number(p.reviews_count || 0),
            featured: Boolean(p.is_featured),
            offer: Boolean(p.is_offer),
            description: p.description || "",
            specs: p.specs && typeof p.specs === "object" && !Array.isArray(p.specs) ? (p.specs as Record<string, string>) : {},
          }));
          setDeals(mapped);
        }

        if (offerData) {
          setPromoOffers(offerData);
        }
      } catch (err) {
        console.error("Offers load error:", err);
      }
    }
    loadOffersData();
  }, []);

  return (
    <SiteLayout>
      <PageHero eyebrow="Offers" title="Latest deals & bundles" subtitle="Refreshed monthly — while stocks last." />
      <div className="container-page py-12">
        {promoOffers.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {promoOffers.map((o) => (
              <article key={o.id} className="surface-card flex flex-col overflow-hidden bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-md">
                {o.banner_url && (
                  <img
                    src={o.banner_url}
                    alt={o.title}
                    className="h-44 w-full object-cover opacity-90"
                  />
                )}
                <div className="p-6 flex flex-col flex-1 justify-between space-y-3">
                  <div>
                    <span className="w-fit rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground">
                      {o.discount_percentage ? `Save ${o.discount_percentage}%` : "Special Deal"}
                    </span>
                    <h2 className="mt-3 text-lg font-black tracking-tight">{o.title}</h2>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{o.description}</p>
                  </div>
                  {o.ends_at && (
                    <p className="text-[11px] text-amber-400 font-bold">
                      Valid until {new Date(o.ends_at).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <h2 className="mb-6 text-2xl font-extrabold">Special Offer Products</h2>
        {deals.length === 0 ? (
          <div className="surface-card p-12 text-center text-xs text-muted-foreground font-bold rounded-3xl border bg-white">
            No special offers active in Supabase right now.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
