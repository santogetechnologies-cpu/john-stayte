import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { stations } from "@/data/catalog";
import stationImg from "@/assets/station.jpg";

export const Route = createFileRoute("/filling-stations")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Filling Stations | John Stayte Services Gloucestershire" },
      { name: "description", content: "Visit Fromebridge Service Station, Wild Goose Garage or Bridge Service Station for gas, fuel and cylinder exchange." },
      { property: "og:title", content: "Our Filling Stations | John Stayte Services" },
      { property: "og:description", content: "Three Gloucestershire forecourts for fuel, gas and cylinder exchange." },
    ],
  }),
  component: Stations,
});

function Stations() {
  return (
    <SiteLayout>
      <PageHero eyebrow="Locations" title="Our filling stations" subtitle="Three Gloucestershire forecourts for fuel, autogas, cylinder exchange and shop essentials." />
      <div className="container-page grid gap-5 py-12 lg:grid-cols-3">
        {stations.map((s) => (
          <article key={s.name} className="surface-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
            <img src={stationImg} alt={`${s.name} forecourt`} loading="lazy" width={1200} height={800} className="h-44 w-full object-cover" />
            <div className="p-6">
              <h2 className="text-lg font-extrabold">{s.name}</h2>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> {s.address}</li>
                <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /> <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-primary">{s.phone}</a></li>
                <li className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-primary" /> {s.hours}</li>
              </ul>
              <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                <a href={s.maps} target="_blank" rel="noreferrer noopener">
                  <Navigation className="mr-1.5 h-4 w-4" /> Get directions
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="container-page pb-12">
        <div className="overflow-hidden rounded-[2rem] border">
          <iframe
            title="Filling station locations map"
            className="h-[420px] w-full"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-2.55%2C51.68%2C-2.25%2C51.83&layer=mapnik"
          />
        </div>
      </div>
    </SiteLayout>
  );
}
