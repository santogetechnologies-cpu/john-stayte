import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, X, Loader2, Search as SearchIcon, Filter } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories as fallbackCategories, type Category, type Product } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl } from "@/lib/utils";

type Search = {
  q?: string;
  category?: string;
  sub?: string;
  brand?: string;
  sort?: string;
  max?: number;
  inStock?: boolean;
};

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    sub: typeof search.sub === "string" ? search.sub : undefined,
    brand: typeof search.brand === "string" ? search.brand : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    max: typeof search.max === "number" ? search.max : undefined,
    inStock: search.inStock === true || search.inStock === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Shop All Products | John Stayte Services" },
      {
        name: "description",
        content:
          "Browse the full John Stayte Services catalogue: gas cylinders, coal and logs, fishing baits, animal feed, appliances and spares.",
      },
      { property: "og:title", content: "Shop All Products | John Stayte Services" },
      { property: "og:description", content: "Gas, fuel, baits, feed and appliances delivered locally." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch real product & category catalog from Supabase
  useEffect(() => {
    async function loadSupabaseCatalog() {
      setLoading(true);
      try {
        const [{ data: prods }, { data: cats }] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("categories").select("*"),
        ]);

        if (prods) {
          const mapped: Product[] = prods.map((p) => ({
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
          setDbProducts(mapped);
        }

        if (cats && cats.length > 0) {
          const mappedCats: Category[] = cats.map((c) => ({
            slug: c.slug,
            name: c.name,
            icon: "Flame",
            subs: c.subcategories || [],
          }));
          setDbCategories(mappedCats);
        }
      } catch (err) {
        console.error("Failed to fetch products from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSupabaseCatalog();
  }, []);

  const set = (patch: Partial<Search>) =>
    navigate({ search: ((prev: Search) => ({ ...prev, ...patch })) as never });

  const cat = dbCategories.find((c) => c.slug === search.category);

  const brands = useMemo(() => {
    return Array.from(new Set(dbProducts.map((p) => p.brand))).sort();
  }, [dbProducts]);

  const maxPrice = useMemo(() => {
    if (dbProducts.length === 0) return 100;
    return Math.ceil(Math.max(...dbProducts.map((p) => p.price)));
  }, [dbProducts]);

  const list = useMemo(() => {
    let r = dbProducts.slice();
    if (search.q) {
      const q = search.q.toLowerCase();
      r = r.filter((p) => (p.name + p.brand + p.sub).toLowerCase().includes(q));
    }
    if (search.category) r = r.filter((p) => p.category === search.category);
    if (search.sub) r = r.filter((p) => p.sub === search.sub);
    if (search.brand) r = r.filter((p) => p.brand === search.brand);
    if (search.max) r = r.filter((p) => p.price <= search.max!);
    if (search.inStock) r = r.filter((p) => p.stock > 0);
    switch (search.sort) {
      case "price-asc":
        r.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        r.sort((a, b) => b.price - a.price);
        break;
      case "name":
        r.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        r.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return r;
  }, [dbProducts, search]);

  const Filters = (
    <div className="space-y-5">
      {/* 1. SEARCH SECTION */}
      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-800">Search</h3>
        <div className="relative">
          <Input
            value={search.q ?? ""}
            onChange={(e) => set({ q: e.target.value || undefined })}
            placeholder="Search products..."
            className="rounded-xl bg-slate-50 border-slate-200/80 text-xs font-medium h-9 pl-9 pr-3 focus:bg-white transition-colors"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* 2. CATEGORIES SECTION */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="mb-2.5 text-xs font-black uppercase tracking-wider text-slate-800">Categories</h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => set({ category: undefined, sub: undefined })}
            className={`w-full rounded-xl px-3.5 py-2 text-left text-xs transition-all flex items-center justify-between font-semibold min-h-[38px] ${
              !search.category
                ? "bg-primary text-white font-bold shadow-2xs"
                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <span>All products</span>
          </button>
          {dbCategories.map((c) => {
            const isCatActive = search.category === c.slug;

            // Filter out fake duplicate subcategories that have the exact same name as the parent category
            const validSubs = (c.subs || []).filter(
              (s) => s.trim().toLowerCase() !== c.name.trim().toLowerCase()
            );

            return (
              <div key={c.slug} className="space-y-1">
                <button
                  type="button"
                  onClick={() => set({ category: c.slug, sub: undefined })}
                  className={`w-full rounded-xl px-3.5 py-2 text-left text-xs transition-all flex items-center justify-between font-semibold min-h-[38px] ${
                    isCatActive
                      ? "bg-primary text-white font-bold shadow-2xs"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                </button>

                {/* Nested subcategories, ONLY rendered if distinct subcategories exist */}
                {isCatActive && validSubs.length > 0 && (
                  <div className="ml-3 mt-1 mb-1 border-l-2 border-primary/20 pl-2.5 space-y-0.5">
                    {validSubs.map((s) => {
                      const isSubActive = search.sub === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set({ sub: isSubActive ? undefined : s })}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-all flex items-center justify-between ${
                            isSubActive
                              ? "font-extrabold text-primary bg-primary/10"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 font-medium"
                          }`}
                        >
                          <span className="truncate">{s}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BRAND SECTION */}
      {brands.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-800">Brand</h3>
          <Select
            value={search.brand ?? "all"}
            onValueChange={(v) => set({ brand: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-full rounded-xl bg-slate-50 border-slate-200/80 text-xs font-semibold h-9">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 4. MAX PRICE & IN STOCK FILTERS */}
      <div className="pt-4 border-t border-slate-100 space-y-3.5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Max price</h3>
            <span className="text-xs font-bold text-primary">£{search.max ?? maxPrice}</span>
          </div>
          <Slider
            value={[search.max ?? maxPrice]}
            max={maxPrice}
            min={5}
            step={5}
            onValueChange={([v]) => set({ max: v })}
          />
        </div>

        <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
          <Checkbox
            checked={Boolean(search.inStock)}
            onCheckedChange={(v) => set({ inStock: v ? true : undefined })}
          />
          In stock only
        </label>
      </div>

      {/* 5. CLEAR FILTERS BUTTON */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs font-bold h-9 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => navigate({ search: {} as never })}
        >
          <X className="mr-1.5 h-3.5 w-3.5" /> Clear filters
        </Button>
      </div>
    </div>
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Catalogue"
        title={cat ? cat.name : "All products"}
        subtitle="One master catalogue — gas, fuel, baits, feed, appliances and spares."
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
        {/* SINGLE INTEGRATED SIDEBAR CONTAINER */}
        <aside
          className="hidden lg:flex lg:flex-col w-[280px] min-w-[280px] max-w-[280px] rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain
                     [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]"
        >
          {Filters}
        </aside>

        {/* MAIN PRODUCT LIST */}
        <div>
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="min-w-0 truncate text-xs font-extrabold text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>{list.length} products available</span>
            </p>
            <div className="flex items-center gap-2">
              {/* Mobile: Filters button */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden rounded-full text-xs font-bold h-9 px-4 border-slate-200 flex items-center gap-1.5"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
              <Select value={search.sort ?? "featured"} onValueChange={(v) => set({ sort: v })}>
                <SelectTrigger className="w-44 rounded-full text-xs font-semibold h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="surface-card p-16 text-center space-y-3 rounded-3xl border border-slate-200/80 bg-white">
              <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
              <p className="font-bold text-sm text-muted-foreground">
                Loading products...
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="surface-card p-16 text-center rounded-3xl border border-slate-200/80 bg-white space-y-3">
              <p className="font-bold text-slate-800 text-sm">No products match those filters.</p>
              <Button className="rounded-full text-xs font-bold px-6" onClick={() => navigate({ search: {} as never })}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <p className="mt-10 text-center text-xs font-medium text-muted-foreground">
            Can't find it?{" "}
            <Link to="/contact" className="font-bold text-primary hover:underline">
              Ask our team
            </Link>
            .
          </p>
        </div>
      </div>

      {/* MOBILE FILTER OVERLAY */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          {/* Slide-up panel */}
          <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-extrabold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            {Filters}
            <Button
              className="mt-5 w-full rounded-full text-xs font-bold h-10"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show {list.length} results
            </Button>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
