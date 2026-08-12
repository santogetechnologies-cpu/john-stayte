import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Fish,
  Dog,
  CookingPot,
  Wrench,
  Sprout,
  Utensils,
  Truck,
  Shirt,
  Logs,
  ShieldCheck,
  Clock,
  MapPin,
  Star,
  Quote,
  Loader2,
} from "lucide-react";
import { SiteLayout, SectionHead } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { testimonials } from "@/data/catalog";
import hero from "@/assets/hero-delivery.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Order Gas Online | John Stayte Services, Gloucestershire" },
      {
        name: "description",
        content:
          "Order Calor gas cylinders, coal, logs, fishing baits and gas appliances online. Next-day delivery across Gloucestershire from John Stayte Services.",
      },
      { property: "og:title", content: "Order Gas Online | John Stayte Services" },
      {
        property: "og:description",
        content: "Bottled gas, solid fuel, baits and appliances delivered across Gloucestershire.",
      },
    ],
  }),
  component: Home,
});

const iconMap: Record<string, typeof Flame> = {
  Flame, Logs, Fish, Dog, CookingPot, Wrench, Sprout, Utensils, Truck, Shirt,
};

function Home() {
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(true);

  useEffect(() => {
    async function loadHomeData() {
      setLoadingCats(true);
      try {
        const [{ data: prodData }, { data: catData }] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        ]);

        if (prodData) {
          const mapped = prodData.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand || "Calor",
            category: p.category_slug || "gas",
            sub: p.subcategory || "General",
            price: Number(p.price),
            stock: Number(p.stock || 0),
            image: p.image_url || "/placeholder.svg",
            rating: Number(p.rating || 5.0),
            reviews: Number(p.reviews_count || 0),
            featured: Boolean(p.is_featured),
            offer: Boolean(p.is_offer),
            description: p.description || "",
            specs: p.specs || {},
          }));
          setDbProducts(mapped);
        }

        if (catData && catData.length > 0) {
          setDbCategories(catData);
        }
      } catch (err) {
        console.error("Home load data error:", err);
      } finally {
        setLoadingCats(false);
      }
    }
    loadHomeData();
  }, []);

  const featured = dbProducts.slice(0, 8);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src={hero}
          alt="John Stayte Services gas delivery lorry in the Gloucestershire countryside"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />
        <div className="container-page relative grid gap-10 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="h-2 w-2 rounded-full bg-primary" /> Family run since 1972
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Order your <span className="text-primary">gas delivery</span> with us today.
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-foreground/75 md:text-lg">
              Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and
              delivered across Gloucestershire by a team you can actually call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 text-base">
                <Link to="/order-gas">
                  Order gas online <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 bg-white/10 px-7 text-base text-ink-foreground hover:bg-white/20"
              >
                <Link to="/products">Browse the shop</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: "50+", v: "Years trading" },
                { k: "3", v: "Filling stations" },
                { k: "40mi", v: "Delivery radius" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-extrabold text-primary">{s.k}</dt>
                  <dd className="text-xs uppercase tracking-wide text-ink-foreground/60">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Categories Grid (REAL SUPABASE DATA) */}
      <section className="section-padding bg-slate-50 border-y border-slate-200/60">
        <div className="container-page space-y-8">
          <SectionHead
            badge="Product Catalogue"
            title="Browse by Category"
            desc="Gas cylinders, solid fuel, animal feed and appliances delivered to your door."
          />

          {loadingCats ? (
            <div className="surface-card p-12 text-center text-xs font-bold text-muted-foreground rounded-3xl border bg-white">
              <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
              Loading categories from Supabase...
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {dbCategories.map((c) => {
                const Icon = iconMap[c.icon] || Flame;
                const subs = c.subcategories || [];
                return (
                  <Link
                    key={c.id || c.slug}
                    to="/products"
                    search={{ category: c.slug }}
                    className="surface-card group p-5 rounded-3xl border bg-white hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-3">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {subs.length > 0 ? subs.slice(0, 3).join(", ") : c.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary">
                      <span>Shop category</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding bg-white">
        <div className="container-page space-y-8">
          <SectionHead
            badge="Live Catalog"
            title="Available Products"
            desc="Real live products from our Whitminster depot ready for immediate dispatch."
          />

          {featured.length === 0 ? (
            <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs text-muted-foreground font-bold">
              Loading live products from Supabase...
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch justify-start">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-slate-900 text-white">
        <div className="container-page space-y-8">
          <SectionHead
            badge="Testimonials"
            title="Trusted across Gloucestershire"
            desc="What local residents and businesses say about John Stayte Services."
            light
          />

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-3xl border border-white/10 bg-white/5 space-y-4">
                <Quote className="h-8 w-8 text-primary/60" />
                <p className="text-sm italic text-slate-300">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-sm text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
