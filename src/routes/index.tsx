import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Fish,
  Dog,
  CookingPot,
  Wrench,
  Sprout,
  Utensils,
  Truck,
  Shirt,
  Logs,
  ShieldCheck,
  Clock,
  MapPin,
  Star,
  Quote,
} from "lucide-react";
import { SiteLayout, SectionHead } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { categories, products, offers, testimonials, IMG } from "@/data/catalog";
import hero from "@/assets/hero-delivery.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Order Gas Online | John Stayte Services, Gloucestershire" },
      {
        name: "description",
        content:
          "Order Calor gas cylinders, coal, logs, fishing baits and gas appliances online. Next-day delivery across Gloucestershire from John Stayte Services.",
      },
      { property: "og:title", content: "Order Gas Online | John Stayte Services" },
      {
        property: "og:description",
        content: "Bottled gas, solid fuel, baits and appliances delivered across Gloucestershire.",
      },
    ],
  }),
  component: Home,
});

const iconMap: Record<string, typeof Flame> = {
  Flame, Logs, Fish, Dog, CookingPot, Wrench, Sprout, Utensils, Truck, Shirt,
};

function Home() {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const dealProducts = products.filter((p) => p.offer).slice(0, 4);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src={hero}
          alt="John Stayte Services gas delivery lorry in the Gloucestershire countryside"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />
        <div className="container-page relative grid gap-10 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="h-2 w-2 rounded-full bg-primary" /> Family run since 1972
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Order your <span className="text-primary">gas delivery</span> with us today.
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-foreground/75 md:text-lg">
              Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and
              delivered across Gloucestershire by a team you can actually call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 text-base">
                <Link to="/order-gas">
                  Order gas online <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 bg-white/10 px-7 text-base text-ink-foreground hover:bg-white/20"
              >
                <Link to="/products">Browse the shop</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: "50+", v: "Years trading" },
                { k: "3", v: "Filling stations" },
                { k: "40mi", v: "Delivery radius" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-extrabold text-primary">{s.k}</dt>
                  <dd className="text-xs uppercase tracking-wide text-ink-foreground/60">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="container-page -mt-10 relative z-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Order Gas", to: "/order-gas", icon: Flame, search: undefined },
            { label: "Coal & Logs", to: "/products", icon: Logs, search: { category: "coal-logs" } },
            { label: "Gas Bottles", to: "/products", icon: Flame, search: { category: "gas" } },
            { label: "Appliances", to: "/products", icon: CookingPot, search: { category: "gas-appliances" } },
            { label: "Filling Stations", to: "/filling-stations", icon: MapPin, search: undefined },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              search={a.search as never}
              className="surface-card group flex items-center gap-3 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 truncate text-sm font-bold">{a.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Promo trio */}
      <section className="container-page mt-16 grid gap-4 md:grid-cols-3">
        {[
          { title: "Auto Gas Update", body: "Our auto gas tanks and pumps have been replaced with new ones.", cta: "Read more", to: "/blog", img: IMG.cylinder },
          { title: "Order Gas Online", body: "You can now order your gas online — make sure to order in time.", cta: "Order now", to: "/order-gas", img: IMG.truck },
          { title: "Gas Heaters", body: "As the weather turns colder, check out our mobile gas heaters.", cta: "Shop now", to: "/products", img: IMG.heater },
        ].map((c) => (
          <article key={c.title} className="surface-card flex items-center gap-4 overflow-hidden p-5">
            <div className="min-w-0">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-primary">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              <Button asChild size="sm" className="mt-4 rounded-full">
                <Link to={c.to}>{c.cta}</Link>
              </Button>
            </div>
            <img src={c.img} alt="" loading="lazy" className="h-28 w-24 shrink-0 object-contain" />
          </article>
        ))}
      </section>

      {/* Categories */}
      <section className="container-page mt-24">
        <SectionHead
          title="Shop by category"
          subtitle="Everything from cylinders to kindling, in one catalogue."
          action={
            <Button asChild variant="ghost" className="rounded-full">
              <Link to="/products">All products <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = iconMap[c.icon] ?? Flame;
            return (
              <Link
                key={c.slug}
                to="/products"
                search={{ category: c.slug }}
                className="surface-card group grid place-items-center gap-3 p-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-bold">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Popular */}
      <section className="container-page mt-24">
        <SectionHead title="Popular products" subtitle="What Gloucestershire is ordering this week." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="mt-24 bg-surface py-20">
        <div className="container-page">
          <SectionHead
            title="Latest offers"
            subtitle="Bundles and seasonal deals, refreshed every month."
            action={
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/offers">All offers <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            }
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {offers.map((o) => (
              <article key={o.title} className="surface-card flex flex-col p-6">
                <span className="w-fit rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase text-primary-foreground">
                  {o.tag}
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{o.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{o.desc}</p>
                <p className="mt-4 font-display text-2xl font-extrabold">{o.price}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dealProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* About + coverage */}
      <section className="container-page mt-24 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">About us</p>
          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
            A local supplier that still answers the phone
          </h2>
          <p className="mt-4 text-muted-foreground">
            John Stayte Services has fuelled homes, farms, pubs and anglers across Gloucestershire for
            over fifty years. Three filling stations, our own delivery fleet, and a team that knows
            which regulator fits your cylinder.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Truck, t: "Own delivery fleet" },
              { icon: ShieldCheck, t: "Fully certified LPG" },
              { icon: Clock, t: "Next-day standard" },
              { icon: MapPin, t: "40-mile radius" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3 rounded-xl bg-surface p-3 text-sm font-semibold">
                <f.icon className="h-4 w-4 shrink-0 text-primary" /> {f.t}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link to="/about">More about JSS</Link>
          </Button>
        </div>
        <div className="surface-card overflow-hidden p-8">
          <h3 className="text-lg font-extrabold">Delivery coverage</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We deliver within 40 miles of Whitminster, including:
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Gloucester", "Stroud", "Dursley", "Cam", "Stonehouse", "Frampton", "Berkeley", "Cheltenham", "Tewkesbury", "Nailsworth", "Wotton", "Forest of Dean"].map((a) => (
              <span key={a} className="rounded-full border bg-surface px-3 py-1.5 text-xs font-semibold">
                {a}
              </span>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border">
            <iframe
              title="Delivery coverage map"
              className="h-64 w-full"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-2.75%2C51.60%2C-2.05%2C51.95&layer=mapnik"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page mt-24">
        <SectionHead title="What our customers say" />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="surface-card p-6">
              <Quote className="h-6 w-6 text-primary" />
              <blockquote className="mt-4 text-sm leading-relaxed">{t.quote}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold text-primary">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-sm font-bold">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
                <span className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-24">
        <div className="overflow-hidden rounded-[2rem] bg-primary px-8 py-14 text-center text-primary-foreground md:px-16">
          <h2 className="text-3xl font-extrabold md:text-4xl">Running low? Order before 2pm.</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Place your order today and we'll usually be with you the next working day.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full px-8 text-base">
            <Link to="/order-gas">Start your gas order</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
