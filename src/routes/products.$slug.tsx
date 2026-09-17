import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Heart,
  Minus,
  Plus,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Loader2,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { cn, cleanImageUrl } from "@/lib/utils";

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
  const { addToCart, wishlist, toggleWishlist, user } = useStore();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  // Reviews state
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  const loadReviews = async (prodId: string) => {
    try {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", prodId)
        .order("created_at", { ascending: false });
      if (data) setReviewsList(data);
    } catch (err) {
      console.warn("Reviews load notice:", err);
    }
  };

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
          image: cleanImageUrl(dbProd.image_url, dbProd.slug),
          rating: Number(dbProd.rating || 5.0),
          reviews: Number(dbProd.reviews_count || 0),
          featured: Boolean(dbProd.is_featured),
          offer: Boolean(dbProd.is_offer),
          description: dbProd.description || "",
          specs:
            dbProd.specs && typeof dbProd.specs === "object" && !Array.isArray(dbProd.specs)
              ? (dbProd.specs as Record<string, string>)
              : {},
        };

        setProduct(mapped);
        loadReviews(dbProd.id);

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
              image: cleanImageUrl(rp.image_url, rp.slug),
              rating: Number(rp.rating || 5.0),
              reviews: Number(rp.reviews_count || 0),
              description: rp.description || "",
              specs:
                rp.specs && typeof rp.specs === "object" && !Array.isArray(rp.specs)
                  ? (rp.specs as Record<string, string>)
                  : {},
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
              src={cleanImageUrl(product.image, product.slug)}
              alt={product.name}
              className="max-h-[420px] w-full object-contain"
              width={520}
              height={520}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
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
                      i < Math.round(product.rating) ? "fill-warning text-warning" : "text-border",
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
                  product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
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

        {/* Customer Reviews Section */}
        <section className="mt-16 border-t pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500" /> Customer Reviews (
                {reviewsList.length})
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Verified customer ratings and post-delivery feedback for {product.name}.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 shadow-xs self-start sm:self-auto border-slate-200 hover:text-primary"
            >
              <Link to="/account/orders">
                <MessageSquare className="h-4 w-4" /> Review via Delivered Orders
              </Link>
            </Button>
          </div>

          {/* Rating Summary Breakdown (if reviews exist) */}
          {reviewsList.length > 0 && (
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Overall Score */}
              <div className="text-center md:text-left space-y-2 md:border-r border-slate-200/80 md:pr-6">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-display">
                  {(
                    reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
                    reviewsList.length
                  ).toFixed(1)}
                </span>
                <div className="flex justify-center md:justify-start gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const avg =
                      reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
                      reviewsList.length;
                    return (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(avg) ? "text-amber-500 fill-amber-500" : "text-slate-200"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground font-semibold">
                  Based on {reviewsList.length} verified customer{" "}
                  {reviewsList.length === 1 ? "review" : "reviews"}
                </p>
              </div>

              {/* Star Distribution Progress */}
              <div className="space-y-1.5 md:col-span-2">
                {[5, 4, 3, 2, 1].map((starNum) => {
                  const count = reviewsList.filter(
                    (r) => Math.round(Number(r.rating)) === starNum,
                  ).length;
                  const pct = Math.round((count / reviewsList.length) * 100);
                  return (
                    <div key={starNum} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-slate-700 flex items-center gap-1">
                        {starNum} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      </span>
                      <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-500 font-mono text-[11px]">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews List */}
          {reviewsList.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed bg-slate-50/50 text-center space-y-3 max-w-md mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                <Star className="h-7 w-7 fill-amber-400 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-extrabold text-foreground">No reviews yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Be the first to share your experience with {product.name}. Reviews become
                  available automatically after your order is delivered.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-white mt-2"
              >
                <Link to="/products">Browse All Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="surface-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-800 font-black text-xs">
                        {(typeof rev.user_name === "string" ? rev.user_name : "C")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                          {typeof rev.user_name === "string" ? rev.user_name : "Verified Customer"}
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.2 rounded-full font-extrabold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified Order
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(rev.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rating Breakdown Badges */}
                  {(rev.product_quality_rating || rev.delivery_agent_rating) && (
                    <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                      {rev.product_quality_rating && (
                        <span className="bg-slate-50 border border-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          Product Quality:{" "}
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />{" "}
                          {rev.product_quality_rating}/5
                        </span>
                      )}
                      {rev.delivery_agent_rating && (
                        <span className="bg-slate-50 border border-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          Delivery Service:{" "}
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />{" "}
                          {rev.delivery_agent_rating}/5
                        </span>
                      )}
                    </div>
                  )}

                  {typeof rev.comment === "string" && rev.comment.trim() && (
                    <p className="text-xs text-slate-700 leading-relaxed pt-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20 border-t pt-10">
            <h2 className="text-xl font-extrabold tracking-tight mb-6">Related Products</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
