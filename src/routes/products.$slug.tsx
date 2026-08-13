import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, Minus, Plus, Star, Truck, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { type Product } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$slug")({
  head: () => ({
    meta: [
      { title: "Product Details | John Stayte Services" },
      { name: "description", content: "John Stayte Services product catalog item." },
    ],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-page py-24 text-center" role="alert">
        {error.message}
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-extrabold">Product not found</h1>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/products">Back to shop</Link>
        </Button>
      </div>
    </SiteLayout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  // Fetch Product & Related items from Supabase
  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const { data: dbProd, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error || !dbProd) {
          setProduct(null);
          setLoading(false);
          return;
        }

        const mapped: Product = {
          id: dbProd.id,
          slug: dbProd.slug,
          name: dbProd.name,
          brand: dbProd.brand || "Calor",
          category: dbProd.category_slug || "gas",
          sub: dbProd.subcategory || "General",
          price: Number(dbProd.price),
          compareAt: dbProd.compare_at_price ? Number(dbProd.compare_at_price) : undefined,
          stock: Number(dbProd.stock || 0),
          image: dbProd.image_url || "/placeholder.svg",
          rating: Number(dbProd.rating || 5.0),
          reviews: Number(dbProd.reviews_count || 0),
          featured: Boolean(dbProd.is_featured),
          offer: Boolean(dbProd.is_offer),
          description: dbProd.description || "",
          specs: dbProd.specs && typeof dbProd.specs === "object" && !Array.isArray(dbProd.specs) ? (dbProd.specs as Record<string, string>) : {},
        };

        setProduct(mapped);

        // Load related items in same category
        const { data: relProds } = await supabase
          .from("products")
          .select("*")
          .eq("category_slug", dbProd.category_slug)
          .neq("slug", slug)
          .limit(4);

        if (relProds) {
          setRelated(
            relProds.map((rp) => ({
              id: rp.id,
              slug: rp.slug,
              name: rp.name,
              brand: rp.brand || "Calor",
              category: rp.category_slug || "gas",
              sub: rp.subcategory || "General",
              price: Number(rp.price),
              stock: Number(rp.stock || 0),
              image: rp.image_url || "/placeholder.svg",
              rating: Number(rp.rating || 5.0),
              reviews: Number(rp.reviews_count || 0),
              description: rp.description || "",
              specs: rp.specs && typeof rp.specs === "object" && !Array.isArray(rp.specs) ? (rp.specs as Record<string, string>) : {},
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load product from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container-page py-24 text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
          <p className="font-bold text-sm text-muted-foreground">Loading product details...</p>
        </div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container-page py-24 text-center">
          <h1 className="text-2xl font-extrabold">Product not found</h1>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/products">Back to shop</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const isWishlisted = wishlist.includes(product.slug);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products" search={{ category: product.category }}>
                  {product.category.toUpperCase()}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="surface-card grid place-items-center bg-surface p-10">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[420px] w-full object-contain"
              width={520}
              height={520}
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {product.brand} · {product.sub}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(product.rating)
                        ? "fill-warning text-warning"
                        : "text-border",
                    )}
                  />
                ))}
              </span>
              {product.rating.toFixed(1)} · {product.reviews} reviews
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl font-extrabold">{gbp(product.price)}</span>
              {product.compareAt && (
                <span className="text-lg text-muted-foreground line-through">
                  {gbp(product.compareAt)}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <div className="mt-6 border-y py-4">
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-xs font-bold",
                  product.stock > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-full border bg-surface">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-sm font-extrabold">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setQty(qty + 1)}
                  disabled={qty >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="lg"
                className="flex-1 rounded-full font-bold shadow-md"
                disabled={product.stock === 0}
                onClick={() => {
                  addToCart(product.slug, qty);
                  toast.success(`Added ${qty} × ${product.name} to cart`);
                }}
              >
                Add to Cart
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => {
                  toggleWishlist(product.slug);
                  toast(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
                }}
              >
                <Heart className={cn("h-5 w-5", isWishlisted && "fill-primary text-primary")} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
