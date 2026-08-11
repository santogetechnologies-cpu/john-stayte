import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Minus, Plus, Star, Truck, ShieldCheck, RefreshCw } from "lucide-react";
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
import { products, categories } from "@/data/catalog";
import { gbp, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} | John Stayte Services` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.name} | John Stayte Services` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
        ]
      : [],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-page py-24 text-center" role="alert">{error.message}</div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-extrabold">Product not found</h1>
        <Button asChild className="mt-6 rounded-full"><Link to="/products">Back to shop</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData();
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const cat = categories.find((c) => c.slug === product.category);
  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/products">Shop</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products" search={{ category: product.category }}>{cat?.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{product.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="surface-card grid place-items-center bg-surface p-10">
            <img src={product.image} alt={product.name} className="max-h-[420px] w-full object-contain" width={520} height={520} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{product.brand} · {product.sub}</p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < Math.round(product.rating) ? "fill-warning text-warning" : "text-border")} />
                ))}
              </span>
              {product.rating.toFixed(1)} · {product.reviews} reviews
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl font-extrabold">{gbp(product.price)}</span>
              {product.compareAt && (
                <span className="pb-1.5 text-lg text-muted-foreground line-through">{gbp(product.compareAt)}</span>
              )}
              <span className="pb-2 text-xs text-muted-foreground">inc. VAT</span>
            </div>
            <p className={cn("mt-2 text-sm font-semibold", product.stock > 10 ? "text-success" : "text-primary")}>
              {product.stock > 0 ? `${product.stock} in stock` : "Backorder"}
            </p>

            <p className="mt-5 text-muted-foreground">{product.description}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQty((q) => q + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="lg"
                className="rounded-full px-8"
                onClick={() => { addToCart(product.slug, qty); toast.success("Added to basket"); }}
              >
                Add to basket
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8"
                onClick={() => { addToCart(product.slug, qty); navigate({ to: "/checkout" }); }}
              >
                Buy now
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Wishlist" onClick={() => toggleWishlist(product.slug)}>
                <Heart className={cn("h-5 w-5", wishlist.includes(product.slug) && "fill-primary text-primary")} />
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Truck, t: "Next-day delivery", s: "Order before 2pm" },
                { icon: ShieldCheck, t: "Certified supply", s: "Fully compliant LPG" },
                { icon: RefreshCw, t: "Cylinder exchange", s: "At all 3 stations" },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl bg-surface p-4">
                  <f.icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-sm font-bold">{f.t}</p>
                  <p className="text-xs text-muted-foreground">{f.s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="specs" className="mt-16">
          <TabsList className="rounded-full">
            <TabsTrigger value="specs" className="rounded-full">Specifications</TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-full">Delivery info</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-full">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="specs" className="surface-card mt-4 p-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-2 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="delivery" className="surface-card mt-4 p-6 text-sm text-muted-foreground">
            <p>Delivered within 40 miles of Whitminster. Free delivery on orders over £75, otherwise £6.95.
              Orders placed before 2pm are usually delivered the next working day. Cylinder exchanges are
              collected at the point of delivery.</p>
          </TabsContent>
          <TabsContent value="reviews" className="surface-card mt-4 space-y-4 p-6">
            {[
              { n: "Helen W.", r: 5, t: "Delivered next morning, driver even carried it round the back." },
              { n: "Rob G.", r: 4, t: "Good price and easy ordering. Would use again." },
            ].map((rv) => (
              <div key={rv.n} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{rv.n}</span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: rv.r }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{rv.t}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 text-2xl font-extrabold">Related products</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
