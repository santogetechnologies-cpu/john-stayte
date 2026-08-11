import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import hero from "@/assets/hero-delivery.jpg";
import station from "@/assets/station.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "About Us | John Stayte Services, Gloucestershire" },
      { name: "description", content: "Family-run since 1972 — the history, mission and team behind John Stayte Services gas and fuel supply." },
      { property: "og:title", content: "About John Stayte Services" },
      { property: "og:description", content: "Family-run gas and fuel supplier serving Gloucestershire since 1972." },
    ],
  }),
  component: About,
});

const team = [
  { n: "XXXXX", r: "Founder" }, { n: "YYYYY", r: "Operations Director" },
  { n: "ZZZZZZ", r: "Depot Manager" }, { n: "WWWWW", r: "Customer Care Lead" },
];

function About() {
  return (
    <SiteLayout>
      <PageHero eyebrow="About us" title="Fuelling Gloucestershire since 1972" subtitle="Three generations, three filling stations, one very reliable delivery fleet." />
      <div className="container-page grid gap-12 py-12 lg:grid-cols-2 lg:items-center">
        <img src={hero} alt="JSS delivery lorry" loading="lazy" width={1920} height={1088} className="h-80 w-full rounded-[2rem] object-cover" />
        <div>
          <h2 className="text-2xl font-extrabold">Our history</h2>
          <p className="mt-3 text-muted-foreground">
            What began as a single roadside garage in Whitminster is now a full fuel and outdoor-living
            supplier: bottled gas, solid fuel, animal feed, fishing baits, appliances and spares.
          </p>
          <h2 className="mt-8 text-2xl font-extrabold">Our mission</h2>
          <p className="mt-3 text-muted-foreground">
            Keep local homes warm, local pubs pouring and local anglers fishing — with honest pricing,
            certified supply and a phone that gets answered by someone who knows the answer.
          </p>
        </div>
      </div>
      <div className="container-page grid gap-4 pb-12 md:grid-cols-3">
        {[
          { t: "Why choose us", d: "Own fleet, certified LPG handling and fifty years of local knowledge." },
          { t: "Service areas", d: "Gloucester, Stroud, Dursley, Cam, Berkeley, Cheltenham and the Forest of Dean." },
          { t: "Gallery", d: "Our forecourts, fleet and showroom across Gloucestershire." },
        ].map((c) => (
          <article key={c.t} className="surface-card p-7">
            <h3 className="text-lg font-extrabold">{c.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </article>
        ))}
      </div>
      <div className="container-page grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
        {[hero, station, hero].map((src, i) => (
          <img key={i} src={src} alt="John Stayte Services gallery" loading="lazy" className="h-56 w-full rounded-2xl object-cover" />
        ))}
      </div>
      <div className="container-page pb-16">
        <h2 className="mb-6 text-2xl font-extrabold">Meet the team</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m) => (
            <div key={m.n} className="surface-card p-6 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent font-display text-xl font-extrabold text-primary">
                {m.n.split(" ").map((x) => x[0]).join("")}
              </span>
              <p className="mt-4 font-bold">{m.n}</p>
              <p className="text-xs text-muted-foreground">{m.r}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
