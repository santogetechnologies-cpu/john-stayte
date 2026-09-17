import { useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Fuel,
  Car,
  ShoppingBasket,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function TexacoForecourtHighlightSection() {
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
            if (entry.isIntersecting || entry.intersectionRatio >= 0.12) {
              setIsRevealed(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: 0.12,
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
    <section
      ref={ref}
      aria-label="Proudly working with Texaco across our forecourts"
      className="relative py-12 sm:py-16 lg:py-20 border-b border-slate-200/60 overflow-hidden"
      style={{
        backgroundImage: "url('/texaco-section-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="container-page relative z-10">
        <div
          className="transition-all duration-700 space-y-10 sm:space-y-12 lg:space-y-14"
          style={{
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? "translateY(0px)" : "translateY(24px)",
            willChange: "transform, opacity",
          }}
        >
          {/* Top Section: Left text copy + Right forecourt image */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column: Eyebrow, Heading, Description & 2 Supporting Lines */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left">
              {/* Eyebrow */}
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-0.5 bg-[#E30613] rounded-full inline-block shrink-0" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#E30613]">
                  TRUSTED FORECOURT PARTNER
                </span>
              </div>

              {/* Main Heading */}
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black text-[#0B1220] tracking-tight font-display leading-[1.08]">
                Proudly working with <br />
                <span className="text-[#E30613]">Texaco</span> across our <br />
                forecourts
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
                Our three local filling stations operate as Texaco service stations,
                combining trusted forecourt standards with the local service and
                support JSS has provided since 1972.
              </p>

              {/* 2 Supporting Content Lines */}
              <div className="space-y-2 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                <p>
                  Trusted forecourts for everyday journeys across Gloucestershire.
                </p>
                <p>
                  From quality fuel to Auto Gas, our local stations are here to keep you moving.
                </p>
              </div>
            </div>

            {/* Right Column: Hero Forecourt Photo (Clean Rectangular, Sharp 90° Corners) */}
            <div className="lg:col-span-6 relative w-full flex items-center justify-end">
              <div className="relative rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.14)] border border-white/80 bg-slate-100 aspect-[16/9.8] sm:aspect-[16/9.5] lg:aspect-[16/9.2] w-full min-h-[250px] sm:min-h-[300px] lg:min-h-[340px] group">
                <img
                  src="/texaco-forecourt-showcase.jpg"
                  alt="Texaco Service Station Forecourt"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 select-none rounded-none"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Bottom Features Row: 4 Items with Dividers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-4 pt-4 lg:pt-6">
            {/* Feature 1: 3 Filling Stations */}
            <div className="flex flex-col items-start md:border-r md:border-slate-200/80 md:pr-4">
              <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-red-50/80 border border-red-100 text-[#E30613] flex items-center justify-center mb-3 shadow-2xs">
                <Fuel className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-base sm:text-lg font-black text-[#0B1D3A] leading-tight">
                  3
                </div>
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  FILLING STATIONS
                </div>
                <p className="text-xs text-slate-500 font-normal leading-snug pt-0.5">
                  Texaco service stations
                </p>
              </div>
            </div>

            {/* Feature 2: Auto Gas Available */}
            <div className="flex flex-col items-start md:border-r md:border-slate-200/80 md:pr-4">
              <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-red-50/80 border border-red-100 text-[#E30613] flex items-center justify-center mb-3 shadow-2xs">
                <Car className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  AUTO GAS
                </div>
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  AVAILABLE
                </div>
                <p className="text-xs text-slate-500 font-normal leading-snug pt-0.5">
                  Clean, reliable, every day
                </p>
              </div>
            </div>

            {/* Feature 3: Fuel & Forecourt Services */}
            <div className="flex flex-col items-start md:border-r md:border-slate-200/80 md:pr-4">
              <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-red-50/80 border border-red-100 text-[#E30613] flex items-center justify-center mb-3 shadow-2xs">
                <ShoppingBasket className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  FUEL & FORECOURT
                </div>
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  SERVICES
                </div>
                <p className="text-xs text-slate-500 font-normal leading-snug pt-0.5">
                  More than just fuel
                </p>
              </div>
            </div>

            {/* Feature 4: Local Gloucestershire */}
            <div className="flex flex-col items-start">
              <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-red-50/80 border border-red-100 text-[#E30613] flex items-center justify-center mb-3 shadow-2xs">
                <MapPin className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  LOCAL
                </div>
                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1D3A] leading-tight">
                  GLOUCESTERSHIRE
                </div>
                <p className="text-xs text-slate-500 font-normal leading-snug pt-0.5">
                  Serving our communities
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA Button */}
          <div className="pt-2 text-left">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#E30613] hover:bg-[#C90510] text-white font-extrabold text-xs sm:text-sm h-12 px-7 sm:px-8 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer inline-flex items-center gap-2.5"
            >
              <Link to="/filling-stations">
                <span>Explore Our Filling Stations</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
