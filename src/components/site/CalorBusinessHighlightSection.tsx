import { useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Handshake,
  ShieldCheck,
  BarChart3,
  Users2,
  Utensils,
  Factory,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalorBusinessHighlightSection() {
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
            if (entry.isIntersecting || entry.intersectionRatio >= 0.15) {
              setIsRevealed(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: 0.15,
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
      aria-label="Calor Business Energy Partnership"
      className="py-8 sm:py-12 md:py-16 bg-slate-50/60 border-b border-slate-200/60"
    >
      <div className="container-page">
        {/* Main Rounded Hero Card */}
        <div
          className="relative rounded-3xl sm:rounded-[36px] overflow-hidden border border-slate-200/90 shadow-md bg-white p-6 sm:p-10 lg:p-12 xl:p-14 transition-all duration-700"
          style={{
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? "translateY(0px) scale(1)" : "translateY(24px) scale(0.98)",
            willChange: "transform, opacity",
          }}
        >
          {/* Background Layer with User-Supplied Background Image */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              backgroundImage: "url('/calor-section-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />

          {/* Main Content Layout */}
          <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* LEFT COLUMN: Content, Benefit Cards, and CTA */}
            <div className="w-full lg:col-span-7 space-y-5 sm:space-y-6">
              {/* Badge */}
              <div className="flex items-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/90 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-red-600 shadow-2xs">
                  <Handshake className="h-3.5 w-3.5 text-red-500 stroke-[2.2]" />
                  TRUSTED LPG PARTNERSHIP
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] font-black text-slate-950 tracking-tight font-display leading-[1.12]">
                PROUDLY POWERING <br />
                BUSINESSES WITH <span className="text-[#E30613]">CALOR</span>
              </h2>

              {/* Subheading & Paragraph */}
              <div className="space-y-2.5 max-w-xl">
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  Powering businesses with trusted LPG solutions.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Through our relationship with Calor, we help businesses access reliable LPG solutions for a wide range of commercial needs. From hospitality and catering to manufacturing, agriculture and other off-grid applications, LPG provides a versatile energy solution for businesses that need dependable fuel.
                </p>
              </div>

              {/* 3 Benefit Cards: Full-width stacked on Mobile, 3 Columns on Tablet/Desktop */}
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-3.5 pt-2">
                {/* Benefit 1 */}
                <div className="flex items-center gap-3 p-3.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs hover:border-red-200 transition-colors">
                  <div className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-red-50/90 border border-red-100/90 text-[#E30613] flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 sm:h-4 sm:w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs font-black text-slate-900 block leading-tight font-display">
                      Reliable Energy
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5 sm:mt-0">
                      Dependable LPG supply
                    </span>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex items-center gap-3 p-3.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs hover:border-red-200 transition-colors">
                  <div className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-red-50/90 border border-red-100/90 text-[#E30613] flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs font-black text-slate-900 block leading-tight font-display">
                      Flexible Solutions
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5 sm:mt-0">
                      Tailored commercial LPG
                    </span>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex items-center gap-3 p-3.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs hover:border-red-200 transition-colors">
                  <div className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-red-50/90 border border-red-100/90 text-[#E30613] flex items-center justify-center shrink-0">
                    <Users2 className="h-5 w-5 sm:h-4 sm:w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-xs font-black text-slate-900 block leading-tight font-display">
                      Trusted Support
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5 sm:mt-0">
                      Local JSS support
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary CTA Button */}
              <div className="pt-2 sm:pt-3">
                <Button
                  asChild
                  className="w-full sm:w-auto rounded-full bg-[#E30613] hover:bg-[#c90510] text-white font-extrabold text-sm sm:text-base px-8 py-5 sm:py-6 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Link to="/order-gas" search={{ brand: "Calor" }}>
                    <span>Explore Our Gas Solutions</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN: Much Bigger Prominent Calor Logo & Sectors */}
            <div className="w-full lg:col-span-5 flex flex-col items-center text-center space-y-6 sm:space-y-8 pt-4 lg:pt-0">
              {/* Prominent Large Calor Logo */}
              <div className="w-full flex items-center justify-center py-2 sm:py-4">
                <img
                  src="/calor-logo.png"
                  alt="Calor"
                  className="h-28 sm:h-36 md:h-44 lg:h-52 xl:h-56 w-auto object-contain max-w-[260px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[480px] xl:max-w-[520px] mix-blend-multiply transition-transform duration-300 hover:scale-105 select-none"
                  loading="lazy"
                />
              </div>

              {/* Tagline Divider: —— ENERGY FOR A BRIGHTER TOMORROW —— */}
              <div className="w-full flex items-center justify-center gap-3">
                <div className="h-px bg-slate-200 flex-1 max-w-[40px] sm:max-w-[60px] md:max-w-[80px]" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 font-display">
                  ENERGY FOR A BRIGHTER TOMORROW
                </span>
                <div className="h-px bg-slate-200 flex-1 max-w-[40px] sm:max-w-[60px] md:max-w-[80px]" />
              </div>

              {/* 3 Sector Highlights */}
              <div className="w-full grid grid-cols-3 divide-x divide-slate-200/90 items-start pt-1">
                {/* Sector 1: Hospitality & Catering */}
                <div className="flex flex-col items-center px-1.5 sm:px-2 space-y-2">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-red-100 shadow-2xs text-[#E30613] flex items-center justify-center">
                    <Utensils className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider leading-tight font-display">
                    HOSPITALITY <br className="hidden sm:inline" />
                    & CATERING
                  </span>
                </div>

                {/* Sector 2: Manufacturing & Industry */}
                <div className="flex flex-col items-center px-1.5 sm:px-2 space-y-2">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-red-100 shadow-2xs text-[#E30613] flex items-center justify-center">
                    <Factory className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider leading-tight font-display">
                    MANUFACTURING <br className="hidden sm:inline" />
                    & INDUSTRY
                  </span>
                </div>

                {/* Sector 3: Agriculture & Off-Grid */}
                <div className="flex flex-col items-center px-1.5 sm:px-2 space-y-2">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-red-100 shadow-2xs text-[#E30613] flex items-center justify-center">
                    <Sprout className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider leading-tight font-display">
                    AGRICULTURE <br className="hidden sm:inline" />
                    & OFF-GRID
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
