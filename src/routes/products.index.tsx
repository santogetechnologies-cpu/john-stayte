import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
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
            image: p.image_url || "/placeholder.svg",
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
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">Search</h3>
        <Input
          value={search.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          placeholder="Search products"
          className="rounded-full bg-surface"
        />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">Categories</h3>
        <div className="grid gap-1">
          <button
            onClick={() => set({ category: undefined, sub: undefined })}
            className={`rounded-lg px-3 py-1.5 text-left text-sm ${
              !search.category ? "bg-primary text-primary-foreground font-bold" : "hover:bg-surface font-medium"
            }`}
          >
            All products
          </button>
          {dbCategories.map((c) => (
            <div key={c.slug}>
              <button
                onClick={() => set({ category: c.slug, sub: undefined })}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold ${
                  search.category === c.slug ? "bg-primary text-primary-foreground font-bold" : "hover:bg-surface"
                }`}
              >
                {c.name}
              </button>
              {search.category === c.slug && c.subs && c.subs.length > 0 && (
                <div className="ml-3 mt-1 grid gap-0.5 border-l pl-3">
                  {c.subs.map((s) => (
                    <button
                      key={s}
                      onClick={() => set({ sub: search.sub === s ? undefined : s })}
                      className={`rounded-md px-2 py-1 text-left text-xs ${
                        search.sub === s
                          ? "font-bold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">Brand</h3>
          <Select
            value={search.brand ?? "all"}
            onValueChange={(v) => set({ brand: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="rounded-full bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">
          Max price · £{search.max ?? maxPrice}
        </h3>
        <Slider
          value={[search.max ?? maxPrice]}
          max={maxPrice}
          min={5}
          step={5}
          onValueChange={([v]) => set({ max: v })}
        />
      </div>
      <label className="flex items-center gap-3 text-sm font-medium">
        <Checkbox
          checked={Boolean(search.inStock)}
          onCheckedChange={(v) => set({ inStock: v ? true : undefined })}
        />
        In stock only
      </label>
      <Button
        variant="outline"
        className="w-full rounded-full"
        onClick={() => navigate({ search: {} as never })}
      >
        <X className="mr-1.5 h-4 w-4" /> Clear filters
      </Button>
    </div>
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Catalogue"
        title={cat ? cat.name : "All products"}
        subtitle="One master catalogue — gas, fuel, baits, feed, appliances and spares."
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface-card h-fit p-5 lg:sticky lg:top-32">{Filters}</aside>
        <div>
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              <SlidersHorizontal className="mr-1.5 inline h-4 w-4" />
              {list.length} products
            </p>
            <Select value={search.sort ?? "featured"} onValueChange={(v) => set({ sort: v })}>
              <SelectTrigger className="w-44 rounded-full">
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

          {loading ? (
            <div className="surface-card p-16 text-center space-y-3">
              <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
              <p className="font-bold text-sm text-muted-foreground">
                Loading products from Supabase...
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="surface-card p-16 text-center">
              <p className="font-bold">No products match those filters.</p>
              <Button className="mt-4 rounded-full" onClick={() => navigate({ search: {} as never })}>
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

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Can't find it?{" "}
            <Link to="/contact" className="font-semibold text-primary">
              Ask our team
            </Link>
            .
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
