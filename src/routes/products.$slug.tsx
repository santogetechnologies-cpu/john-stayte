import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, Minus, Plus, Star, Truck, ShieldCheck, RefreshCw, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
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
  const { addToCart, wishlist, toggleWishlist, user } = useStore();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  // Reviews state
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
          image: dbProd.image_url || "/placeholder.svg",
          rating: Number(dbProd.rating || 5.0),
          reviews: Number(dbProd.reviews_count || 0),
          featured: Boolean(dbProd.is_featured),
          offer: Boolean(dbProd.is_offer),
          description: dbProd.description || "",
          specs: dbProd.specs && typeof dbProd.specs === "object" && !Array.isArray(dbProd.specs) ? (dbProd.specs as Record<string, string>) : {},
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) {
      toast.error("Please sign in to submit a review.", {
        action: {
          label: "Sign In",
          onClick: () => navigate({ to: "/login", search: { redirect: `/products/${product?.slug}` } }),
        },
      });
      return;
    }
    if (!product) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert([
        {
          product_id: product.id,
          user_id: currentUserId,
          user_name: user?.name || "Verified Customer",
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        },
      ]);
      if (error) throw error;

      const newCount = (product.reviews || 0) + 1;
      const newRating = Number(
        (((product.rating || 5) * (product.reviews || 0) + reviewRating) / newCount).toFixed(1)
      );

      setProduct((prev) => (prev ? { ...prev, reviews: newCount, rating: newRating } : null));
      await supabase.from("products").update({ reviews_count: newCount, rating: newRating }).eq("id", product.id);

      toast.success("Thank you! Your review has been submitted.");
      setReviewComment("");
      setShowReviewForm(false);
      loadReviews(product.id);
    } catch (err: any) {
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

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

        {/* Customer Reviews Section */}
        <section className="mt-16 border-t pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500" /> Customer Reviews ({reviewsList.length})
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Verified customer ratings and feedback for {product.name}.
              </p>
            </div>

            <Button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="rounded-full text-xs font-bold gap-1.5 shadow-xs self-start sm:self-auto"
            >
              <MessageSquare className="h-4 w-4" /> {showReviewForm ? "Close Review Form" : "Write a Review"}
            </Button>
          </div>

          {/* Review Submission Form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="surface-card p-6 rounded-3xl border bg-slate-50/70 mb-8 space-y-4 max-w-2xl">
              <h3 className="text-sm font-extrabold text-foreground">Share Your Experience</h3>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Rating</label>
                <div className="flex gap-1.5 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-hidden"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= reviewRating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{reviewRating} of 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Your Review / Comments</label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How did the product perform? Delivery experience..."
                  className="rounded-2xl bg-white text-xs min-h-[90px]"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewForm(false)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReview}
                  size="sm"
                  className="rounded-full text-xs font-bold"
                >
                  {submittingReview ? "Submitting..." : "Post Review"}
                </Button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviewsList.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed bg-slate-50/50 text-center space-y-2">
              <Star className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-extrabold text-foreground">No customer reviews yet</p>
              <p className="text-xs text-muted-foreground">Be the first verified customer to review this product.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {(typeof rev.user_name === "string" ? rev.user_name : "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                          {typeof rev.user_name === "string" ? rev.user_name : "Customer"}
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Verified
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
                          className={`h-3 w-3 ${
                            i < rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {typeof rev.comment === "string" && rev.comment.trim() && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
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
