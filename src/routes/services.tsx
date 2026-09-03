import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Container, Building2, Home, RefreshCw, Siren, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { services as defaultServices } from "@/data/catalog";
import { supabase } from "@/lib/supabase";

import serviceGasDelivery from "@/assets/service_gas_delivery.jpg";
import serviceBulkSupply from "@/assets/service_bulk_supply.jpg";
import serviceCommercialGas from "@/assets/service_commercial_gas.jpg";
import serviceDomesticSupply from "@/assets/service_domestic_supply.jpg";
import serviceCylinderExchange from "@/assets/service_cylinder_exchange.jpg";
import serviceEmergencyDelivery from "@/assets/service_emergency_delivery.jpg";

const serviceImages: Record<string, string> = {
  "Gas Delivery": serviceGasDelivery,
  "Bulk Supply": serviceBulkSupply,
  "Commercial Gas": serviceCommercialGas,
  "Domestic Supply": serviceDomesticSupply,
  "Cylinder Exchange": serviceCylinderExchange,
  "Emergency Delivery": serviceEmergencyDelivery,
};

const icons: Record<string, typeof Truck> = { Truck, Container, Building2, Home, RefreshCw, Siren };

function ScrollRevealCard({
  children,
  className = "",
  delay = 0,
  staggerIndex,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
        }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsRevealed(true);
    }
  }, []);

  const computedDelay = typeof staggerIndex === "number" ? (staggerIndex % 3) * 100 : delay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translateY(0px)" : "translateY(28px)",
        transitionProperty: "opacity, transform",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: isRevealed ? `${computedDelay}ms` : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

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
  const [serviceList, setServiceList] = useState<any[]>(defaultServices);

  useEffect(() => {
    async function loadServices() {
      try {
        const { data: block } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "services_data")
          .maybeSingle();

        if (block?.content) {
          try {
            const parsed = JSON.parse(block.content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setServiceList(parsed);
              return;
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load services from Supabase:", err);
      }
    }
    loadServices();

    const handleUpdate = () => loadServices();
    window.addEventListener("cms_services_updated", handleUpdate);
    return () => window.removeEventListener("cms_services_updated", handleUpdate);
  }, []);

  return (
    <SiteLayout>
      <div className="bg-[#fcfdfe] min-h-[85vh] py-8 sm:py-10 lg:py-12 border-b border-slate-200/60">
        <div className="container-page max-w-[88rem] px-2 sm:px-3.5 lg:px-4">
          {/* Header / Intro Section matching Reference */}
          <ScrollRevealCard delay={0}>
            <div className="space-y-2 mb-8 sm:mb-10 text-left">
              <p className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.16em] text-primary font-display">
                SERVICES
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.1] font-display">
                Fuel supply, however you need it
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl">
                From a single patio bottle to scheduled bulk deliveries for farms and pubs.
              </p>
            </div>
          </ScrollRevealCard>

          {/* 3-Column x 2-Row Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {serviceList.map((s, idx) => {
              const Icon = icons[s.icon] ?? Truck;
              const image = s.image || s.image_url || serviceImages[s.title] || serviceGasDelivery;

              return (
                <ScrollRevealCard key={s.title} staggerIndex={idx} className="h-full">
                  <article className="group flex flex-row items-stretch gap-4 bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all duration-300 p-3.5 sm:p-4 overflow-hidden h-full">
                    {/* Left: High-Quality Service Image (Sharp/Square Corners) */}
                    <div className="w-[45%] sm:w-[46%] shrink-0 overflow-hidden rounded-none bg-slate-100 min-h-[175px]">
                      <img
                        src={image}
                        alt={s.title}
                        loading="lazy"
                        width={600}
                        height={700}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>

                    {/* Right: Icon, Title, Description & Action */}
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div className="space-y-1.5">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display leading-snug">
                          {s.title}
                        </h2>
                        <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                          {s.desc}
                        </p>
                      </div>

                      <div className="pt-3 mt-2">
                        <Link
                          to="/contact"
                          className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm py-2 px-3 transition-colors shadow-2xs"
                        >
                          <span>Enquire</span>
                          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                        </Link>
                      </div>
                    </div>
                  </article>
                </ScrollRevealCard>
              );
            })}
          </div>

          {/* Bottom Trade / Bulk Account Banner */}
          <div className="mt-12 sm:mt-16">
            <ScrollRevealCard delay={100}>
              <div className="rounded-2xl sm:rounded-3xl bg-ink px-6 sm:px-10 lg:px-12 py-8 sm:py-10 text-ink-foreground flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-xl space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                    Need a trade or bulk account?
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                    Scheduled supply, agreed pricing and one monthly invoice. Talk to our commercial team.
                  </p>
                </div>
                <Button asChild className="rounded-full px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shrink-0 shadow-md">
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>
            </ScrollRevealCard>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
