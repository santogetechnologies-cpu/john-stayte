import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin,
  Phone,
  Fuel,
  Navigation,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  Car,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { AutoGasMap } from "@/components/site/AutoGasMap";
import {
  type AutoGasStation,
  type EastingtonFacilityHighlight,
  fetchPublicAutoGasStations,
  fetchEastingtonHighlight,
  subscribeToAutoGasChanges,
  INITIAL_AUTO_GAS_STATIONS,
  DEFAULT_EASTINGTON_HIGHLIGHT,
} from "@/lib/auto-gas-service";

function ScrollRevealCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting || entry.intersectionRatio > 0.05) {
              setIsRevealed(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -30px 0px",
        },
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsRevealed(true);
    }
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translateY(0px)" : "translateY(24px)",
        transitionProperty: "opacity, transform",
        transitionDuration: "500ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: isRevealed ? `${delay}ms` : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

export const Route = createFileRoute("/auto-gas")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Auto Gas Locations | LPG Filling Stations | John Stayte Services" },
      {
        name: "description",
        content:
          "Find John Stayte Services Auto Gas filling locations across Gloucestershire and surrounding areas including Cirencester, Gloucester, Stroud, and Weston-Super-Mare.",
      },
      { property: "og:title", content: "Auto Gas Locations | John Stayte Services" },
      {
        property: "og:description",
        content:
          "Find our Auto Gas filling locations across Gloucestershire and surrounding areas. Cirencester, Gloucester, Stroud, and Weston-Super-Mare.",
      },
    ],
  }),
  component: AutoGasPage,
});

function AutoGasPage() {
  const [stations, setStations] = useState<AutoGasStation[]>(INITIAL_AUTO_GAS_STATIONS);
  const [highlight, setHighlight] = useState<EastingtonFacilityHighlight>(DEFAULT_EASTINGTON_HIGHLIGHT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [stationsData, highlightData] = await Promise.all([
          fetchPublicAutoGasStations(),
          fetchEastingtonHighlight(),
        ]);
        if (stationsData && stationsData.length > 0) {
          setStations(stationsData);
        }
        if (highlightData) {
          setHighlight(highlightData);
        }
      } catch (err) {
        console.warn("Public Auto Gas load notice:", err);
      }
    }

    loadData();
    const unsubscribe = subscribeToAutoGasChanges(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  return (
    <SiteLayout>
      <div className="bg-slate-50/50 py-10 sm:py-14 lg:py-16">
        <div className="container-page space-y-12 sm:space-y-16">
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/70 text-primary text-xs font-black uppercase tracking-[0.2em] font-display shadow-2xs">
              <Fuel className="h-3.5 w-3.5 stroke-[2.5]" />
              AUTO GAS LOCATIONS
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
              Auto Gas
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal leading-relaxed">
              Find our Auto Gas filling locations across Gloucestershire and surrounding areas.
            </p>
          </div>

          {/* 1. Exactly 4 Location Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {stations.map((station, index) => {
              const phoneClean = station.telephone.replace(/[^0-9+]/g, "");
              const phoneTel = phoneClean.startsWith("0")
                ? `+44${phoneClean.slice(1)}`
                : phoneClean.startsWith("+")
                  ? phoneClean
                  : `+44${phoneClean}`;

              const googleMapsUrl =
                station.maps_url ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${station.name}, ${station.address}, ${station.town || ""}, ${station.postcode}`,
                )}`;

              return (
                <ScrollRevealCard key={station.id} delay={index * 90} className="h-full">
                  <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200/90 hover:border-red-200 p-6 sm:p-8 flex flex-col justify-between h-full shadow-2xs hover:shadow-md transition-all duration-200 group">
                    <div className="space-y-6">
                      {/* Top Bar: Location Number & Status Badge */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-display">
                          {station.station_number}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          {station.badge || "Auto Gas Available"}
                        </span>
                      </div>

                      {/* Station Name */}
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display group-hover:text-primary transition-colors leading-tight">
                          {station.name}
                        </h2>
                      </div>

                      {/* Details: Address, Telephone, Service Tag */}
                      <div className="space-y-4 text-xs sm:text-sm text-slate-700 pt-1">
                        {/* Address */}
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-xl bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <MapPin className="h-4 w-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                              Address
                            </span>
                            <div className="font-semibold text-slate-800 leading-snug">
                              <div>{station.address}</div>
                              {station.town && <div>{station.town}{station.county ? `, ${station.county}` : ""}</div>}
                              <div className="text-slate-900 font-bold">{station.postcode}</div>
                            </div>
                          </div>
                        </div>

                        {/* Telephone */}
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-xl bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Phone className="h-4 w-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                              Telephone
                            </span>
                            <a
                              href={`tel:${phoneTel}`}
                              className="font-bold text-slate-900 hover:text-primary transition-colors inline-block"
                            >
                              {station.telephone}
                            </a>
                          </div>
                        </div>

                        {/* Service Indicator Badge */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                            <Fuel className="h-4 w-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                              {station.service || "Auto Gas"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: Get Directions & Call */}
                    <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Button
                        asChild
                        className="rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm h-10 px-5 shadow-xs flex-1 gap-2 cursor-pointer"
                      >
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Get directions to ${station.name}`}
                        >
                          <Navigation className="h-4 w-4 stroke-[2.2]" />
                          <span>Get Directions</span>
                          <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-75" />
                        </a>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-slate-200 text-slate-700 font-bold text-xs sm:text-sm h-10 px-4 hover:bg-slate-50 gap-2 shrink-0 cursor-pointer"
                      >
                        <a href={`tel:${phoneTel}`}>
                          <PhoneCall className="h-3.5 w-3.5 text-primary" />
                          <span>Call Station</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </ScrollRevealCard>
              );
            })}
          </div>

          {/* 2. EASTINGTON GAS FACILITY HIGHLIGHT SECTION */}
          {highlight.is_active !== false && (
            <ScrollRevealCard delay={150}>
              <section
                aria-label="Eastington Gas Facility"
                className="rounded-[28px] sm:rounded-[32px] bg-white border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-center">
                  {/* LEFT: Large High-Quality Client Image */}
                  <div className="lg:col-span-7 h-[280px] sm:h-[360px] lg:h-[440px] relative overflow-hidden bg-slate-100 group">
                    <img
                      src={highlight.image_url || "/eastington_gas_tank.jpg"}
                      alt="John Stayte Services Eastington Gas Tank Facility"
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* RIGHT: Text Content */}
                  <div className="lg:col-span-5 p-6 sm:p-8 lg:p-12 space-y-4 sm:space-y-5 text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/70 text-primary text-xs font-black uppercase tracking-[0.2em] font-display shadow-2xs">
                      <Fuel className="h-3.5 w-3.5 stroke-[2.5]" />
                      {highlight.eyebrow || "EASTINGTON GAS FACILITY"}
                    </span>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight font-display leading-tight">
                        {highlight.title || "Our Gas Tank in Eastington"}
                      </h2>
                      <p className="text-base sm:text-lg text-slate-700 font-semibold leading-relaxed">
                        “{highlight.description || "This is the gas tank in Eastington."}”
                      </p>
                    </div>

                    {highlight.supportingText && (
                      <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed pt-1">
                        {highlight.supportingText}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </ScrollRevealCard>
          )}

          {/* 3. Informational Guidance Section */}
          <ScrollRevealCard delay={180}>
            <div className="rounded-[28px] sm:rounded-[32px] bg-white border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-2xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Car className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                    About John Stayte Auto Gas
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Clean, economical and convenient LPG refuelling across Gloucestershire
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Cost Efficient</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Auto Gas provides significant running cost savings compared to traditional petrol and diesel.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Lower Emissions</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Autogas burns cleaner, producing fewer particulates and lower carbon emissions for greener journeys.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Commercial Fleets</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We support both private dual-fuel vehicles and commercial fleet accounts with convenient billing.
                  </p>
                </div>
              </div>
            </div>
          </ScrollRevealCard>

          {/* 4. AUTO GAS LOCATIONS MAP SECTION */}
          <ScrollRevealCard delay={200}>
            <section aria-label="Auto Gas Locations Map" className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/70 text-primary text-xs font-black uppercase tracking-[0.2em] font-display shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 stroke-[2.5]" />
                  FIND YOUR NEAREST AUTO GAS STATION
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
                  Our Auto Gas Locations
                </h2>
                <p className="text-xs sm:text-sm lg:text-base text-slate-600 font-normal leading-relaxed">
                  Find our Auto Gas filling stations and plan your journey with ease.
                </p>
              </div>

              {/* Interactive Map & Synchronized 4-Location List */}
              <AutoGasMap stations={stations} />
            </section>
          </ScrollRevealCard>

          {/* 5. Bottom Callout Banner */}
          <ScrollRevealCard delay={240}>
            <div className="rounded-2xl sm:rounded-3xl bg-ink px-6 sm:px-10 lg:px-12 py-8 sm:py-10 text-ink-foreground flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-md">
              <div className="max-w-xl space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                  Have questions about our Auto Gas locations?
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Our Gloucestershire team is happy to assist with opening hours, nozzle types, and commercial fuel arrangements.
                </p>
              </div>
              <Button
                asChild
                className="rounded-full px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shrink-0 shadow-md cursor-pointer"
              >
                <Link to="/contact">
                  <span>Contact Our Team</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </ScrollRevealCard>
        </div>
      </div>
    </SiteLayout>
  );
}
