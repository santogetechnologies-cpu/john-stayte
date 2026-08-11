import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { offers, products } from "@/data/catalog";

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
  component: Offers,
});

function Offers() {
  const deals = products.filter((p) => p.offer);
  return (
    <SiteLayout>
      <PageHero eyebrow="Offers" title="Latest deals & bundles" subtitle="Refreshed monthly — while stocks last." />
      <div className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {offers.map((o) => (
            <article key={o.title} className="surface-card flex flex-col bg-ink p-6 text-ink-foreground">
              <span className="w-fit rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase text-primary-foreground">{o.tag}</span>
              <h2 className="mt-4 text-lg font-extrabold">{o.title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-foreground/70">{o.desc}</p>
              <p className="mt-4 font-display text-2xl font-extrabold text-primary">{o.price}</p>
            </article>
          ))}
        </div>
        <h2 className="mb-6 mt-16 text-2xl font-extrabold">Discounted products</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </SiteLayout>
  );
}
