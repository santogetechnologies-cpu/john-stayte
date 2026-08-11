import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Container, Building2, Home, RefreshCw, Siren, ArrowRight } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { services } from "@/data/catalog";

const icons: Record<string, typeof Truck> = { Truck, Container, Building2, Home, RefreshCw, Siren };

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Gas Services | Delivery, Bulk & Commercial | John Stayte Services" },
      { name: "description", content: "Gas delivery, bulk supply, commercial and domestic gas, cylinder exchange and emergency delivery across Gloucestershire." },
      { property: "og:title", content: "Our Services | John Stayte Services" },
      { property: "og:description", content: "Domestic, commercial and emergency LPG supply across Gloucestershire." },
    ],
  }),
  component: Services,
});

function Services() {
  return (
    <SiteLayout>
      <PageHero eyebrow="Services" title="Fuel supply, however you need it" subtitle="From a single patio bottle to scheduled bulk deliveries for farms and pubs." />
      <div className="container-page grid gap-5 py-12 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const Icon = icons[s.icon] ?? Truck;
          return (
            <article key={s.title} className="surface-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-lg font-extrabold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <Link to="/contact" className="mt-5 inline-flex items-center text-sm font-bold text-primary">
                Enquire <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
      <div className="container-page pb-12">
        <div className="rounded-[2rem] bg-ink px-8 py-12 text-ink-foreground md:px-14">
          <h2 className="text-2xl font-extrabold md:text-3xl">Need a trade or bulk account?</h2>
          <p className="mt-3 max-w-xl text-ink-foreground/75">
            Scheduled supply, agreed pricing and one monthly invoice. Talk to our commercial team.
          </p>
          <Button asChild className="mt-7 rounded-full px-7"><Link to="/contact">Talk to us</Link></Button>
        </div>
      </div>
    </SiteLayout>
  );
}
