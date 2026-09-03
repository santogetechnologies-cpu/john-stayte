import { useState, useEffect, useRef, memo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Truck,
  Flame,
  Logs,
  Dog,
  Fish,
  CookingPot,
  Fuel,
  Users,
  Award,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Navigation,
  Headphones,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { stations } from "@/data/catalog";
import heroImg from "@/assets/hero-delivery.jpg";
import stationImg from "@/assets/station.jpg";
import stationWildGooseBP from "@/assets/station-wild-goose-bp.png";
import stationBridge76 from "@/assets/station-bridge-76.png";
import gloucestershireMap from "@/assets/gloucestershire-map.jpg";
import originsHeritageHero from "@/assets/origins-heritage-hero.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "About Us | John Stayte Services, Gloucestershire" },
      {
        name: "description",
        content:
          "Family-run since 1972 — the history, mission and team behind John Stayte Services gas, fuel, outdoor living and filling stations across Gloucestershire.",
      },
      { property: "og:title", content: "About John Stayte Services — Keeping Gloucestershire Moving Since 1972" },
      {
        property: "og:description",
        content:
          "Three generations of local knowledge, dependable fuel, three filling stations and certified LPG delivery across Gloucestershire.",
      },
    ],
  }),
  component: AboutPage,
});

function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "fade-up",
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade-up" | "card" | "image" | "heading";
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    if (immediate) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 40 + delay);
      return () => clearTimeout(timer);
    }

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: variant === "card" ? 0.08 : 0.12,
          rootMargin: "0px 0px -50px 0px",
        }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
    }
  }, [immediate, delay, variant]);

  const getInitialTransform = () => {
    switch (variant) {
      case "card":
        return "translateY(28px) scale(0.98)";
      case "image":
        return "translateY(16px) scale(0.985)";
      case "heading":
        return "translateY(20px)";
      default:
        return "translateY(18px)";
    }
  };

  const getDuration = () => {
    switch (variant) {
      case "card":
        return "650ms";
      case "image":
        return "700ms";
      case "heading":
        return "600ms";
      default:
        return "550ms";
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0px) scale(1)" : getInitialTransform(),
        transitionProperty: "opacity, transform",
        transitionDuration: getDuration(),
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: isVisible && !immediate ? `${delay}ms` : "0ms",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

const TimelineMilestoneRow = memo(function TimelineMilestoneRow({
  milestone,
  idx,
}: {
  milestone: {
    year: string;
    title: string;
    desc: string;
    side: "left" | "right";
  };
  idx: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const isLeft = milestone.side === "left";

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const el = rowRef.current;
    if (!el) return;

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsVisible(true);
    }
  }, []);

  return (
    <div
      ref={rowRef}
      className="relative flex flex-col md:flex-row items-center justify-between group"
    >
      {/* Left Slot (Desktop Card if Left, Empty if Right) */}
      <div
        className={`w-full md:w-[43%] lg:w-[41%] ${isLeft ? "block" : "hidden md:block md:invisible"} pl-12 md:pl-0`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0px) scale(1)" : "translateY(28px) scale(0.98)",
          transitionProperty: "opacity, transform",
          transitionDuration: "650ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform, opacity",
        }}
      >
        {isLeft && (
          <div className="bg-white/95 backdrop-blur-md rounded-[18px] sm:rounded-[20px] border border-slate-200/80 p-4 sm:p-5 md:p-5.5 shadow-[0_3px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] hover:border-red-200/80 hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center justify-between gap-2.5 mb-2">
              <span className="text-xl sm:text-2xl font-black text-primary font-display tracking-tight">
                {milestone.year}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-red-50 group-hover:text-red-700 text-slate-500 text-[9.5px] font-extrabold uppercase tracking-wider transition-colors">
                MILESTONE #{idx + 1}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mb-1.5">
              {milestone.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
              {milestone.desc}
            </p>
          </div>
        )}
      </div>

      {/* Central Timeline Node */}
      <div
        className="absolute left-5 md:left-1/2 -translate-x-1/2 top-5 md:top-1/2 md:-translate-y-1/2 z-20 flex items-center justify-center pointer-events-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "scale(1)" : "scale(0.6)",
          transitionProperty: "opacity, transform",
          transitionDuration: "500ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: isVisible ? "100ms" : "0ms",
        }}
      >
        <span
          className="absolute h-8.5 w-8.5 rounded-full border-2 border-primary/85 animate-timeline-pulse pointer-events-none"
          style={{ animationDelay: `${idx * 0.35}s` }}
        />
        <div className="h-6 w-6 rounded-full bg-white border-2 border-primary shadow-[0_0_12px_rgba(220,38,38,0.25)] flex items-center justify-center relative z-10">
          <span className="h-3 w-3 rounded-full bg-primary" />
        </div>
      </div>

      {/* Right Slot (Desktop Card if Right, Empty if Left) */}
      <div
        className={`w-full md:w-[43%] lg:w-[41%] ${!isLeft ? "block" : "hidden md:block md:invisible"} pl-12 md:pl-0`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0px) scale(1)" : "translateY(28px) scale(0.98)",
          transitionProperty: "opacity, transform",
          transitionDuration: "650ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform, opacity",
        }}
      >
        {!isLeft && (
          <div className="bg-white/95 backdrop-blur-md rounded-[18px] sm:rounded-[20px] border border-slate-200/80 p-4 sm:p-5 md:p-5.5 shadow-[0_3px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] hover:border-red-200/80 hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center justify-between gap-2.5 mb-2">
              <span className="text-xl sm:text-2xl font-black text-primary font-display tracking-tight">
                {milestone.year}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-red-50 group-hover:text-red-700 text-slate-500 text-[9.5px] font-extrabold uppercase tracking-wider transition-colors">
                MILESTONE #{idx + 1}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mb-1.5">
              {milestone.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
              {milestone.desc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

function AboutPage() {
  const [aboutData, setAboutData] = useState<any>({
    heroEyebrow: "ABOUT JOHN STAYTE SERVICES",
    heroHeading: "KEEPING GLOUCESTERSHIRE MOVING SINCE 1972",
    heroSubtitle:
      "Three generations of local knowledge, dependable fuel, and service you can count on. From our humble roots as a roadside garage to an essential regional energy and outdoor supplier.",
  });
  const [dbStations, setDbStations] = useState<any[]>(stations);

  useEffect(() => {
    async function loadAboutData() {
      try {
        const [{ data: aboutBlock }, { data: stnBlock }] = await Promise.all([
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "about_data")
            .maybeSingle(),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "stations_data")
            .maybeSingle(),
        ]);

        if (aboutBlock?.content) {
          try {
            const parsed = JSON.parse(aboutBlock.content);
            if (parsed && typeof parsed === "object") {
              setAboutData((prev: any) => ({ ...prev, ...parsed }));
            }
          } catch {}
        }

        if (stnBlock?.content) {
          try {
            const parsedStns = JSON.parse(stnBlock.content);
            if (Array.isArray(parsedStns) && parsedStns.length > 0) {
              setDbStations(parsedStns);
            }
          } catch {}
        }
      } catch (err) {
        console.error("Error loading about data:", err);
      }
    }
    loadAboutData();

    const handleUpdate = () => loadAboutData();
    window.addEventListener("cms_about_updated", handleUpdate);
    window.addEventListener("cms_stations_updated", handleUpdate);
    return () => {
      window.removeEventListener("cms_about_updated", handleUpdate);
      window.removeEventListener("cms_stations_updated", handleUpdate);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <SiteLayout footerClassName="mt-0">
      {/* =========================================================================
          SECTION 1 — HIGH-END EDITORIAL HERO
          Left: Heading, Description & CTA Buttons
          Right: Large Landscape Rectangular Family Delivery Photo
      ========================================================================= */}
      <section className="relative bg-[#fcfdfe] overflow-hidden pt-6 pb-6 sm:pt-8 sm:pb-8 lg:pt-10 lg:pb-10">
        {/* Giant Subtle Background Watermark "1972" */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 text-[180px] sm:text-[240px] lg:text-[340px] font-black text-red-500/[0.03] select-none pointer-events-none tracking-tighter leading-none font-display z-0">
          1972
        </div>

        {/* Soft Pale-Red Ambient Radial Aura */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none z-0" />

        <div className="container-page relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
            {/* Left Column: Hero Content & CTAs (50-55% desktop width) */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-left">
              {/* 1. Eyebrow Pill */}
              <Reveal immediate delay={0}>
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs backdrop-blur-xs">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>{aboutData?.heroEyebrow || "ABOUT JOHN STAYTE SERVICES"}</span>
                </div>
              </Reveal>

              {/* 2. Headline - Line 1 and Line 2 staggered */}
              <div>
                <Reveal immediate delay={100} variant="heading">
                  <span className="text-4xl sm:text-5xl lg:text-[48px] xl:text-[54px] font-black text-slate-900 tracking-tight leading-[1.04] font-display block">
                    {aboutData?.heroHeading ? (
                      aboutData.heroHeading.includes("MOVING SINCE") ? (
                        aboutData.heroHeading.split("MOVING SINCE")[0].trim()
                      ) : (
                        "KEEPING GLOUCESTERSHIRE"
                      )
                    ) : (
                      "KEEPING GLOUCESTERSHIRE"
                    )}
                  </span>
                </Reveal>
                <Reveal immediate delay={180} variant="heading">
                  <span className="text-4xl sm:text-5xl lg:text-[48px] xl:text-[54px] font-black text-primary tracking-tight leading-[1.04] font-display block">
                    {aboutData?.heroHeading ? (
                      aboutData.heroHeading.includes("MOVING SINCE") ? (
                        "MOVING SINCE " + aboutData.heroHeading.split("MOVING SINCE")[1].trim()
                      ) : (
                        "MOVING SINCE 1972"
                      )
                    ) : (
                      "MOVING SINCE 1972"
                    )}
                  </span>
                </Reveal>
                <Reveal immediate delay={240}>
                  <div className="h-1.5 w-16 bg-primary rounded-full my-2.5" />
                </Reveal>
              </div>

              {/* 3. Supporting Paragraph */}
              <Reveal immediate delay={320}>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                  {aboutData?.heroSubtitle ||
                    "Three generations of local knowledge, dependable fuel, and service you can count on. From our humble roots as a roadside garage to an essential regional energy and outdoor supplier."}
                </p>
              </Reveal>

              {/* 4. CTA Buttons */}
              <Reveal immediate delay={440}>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => scrollToSection("our-story")}
                    className="px-8 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_16px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_24px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <span>Discover Our Story</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <Link
                    to="/contact"
                    className="px-7 py-3.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white/90 hover:bg-slate-50 text-slate-800 font-extrabold text-xs sm:text-sm shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Contact Us</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Large Landscape Rectangular Family Delivery Photo (45-50% desktop width) */}
            <div className="lg:col-span-6 relative">
              <Reveal immediate delay={350} variant="image">
                <div className="relative rounded-none overflow-hidden bg-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] border border-slate-200/80 aspect-[3/2] sm:aspect-[16/10.5] w-full">
                  <img
                    src="/about-hero-family-delivery.jpg"
                    alt="John Stayte Services delivery specialist delivering Calor LPG gas cylinder to a Gloucestershire family home"
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — CORE BENEFITS STRIP
          Clean White/Off-White Horizontal Strip with Red Line Icons & Subtle Borders
      ========================================================================= */}
      <section className="bg-[#fafafc] border-y border-slate-200/80 py-3 sm:py-3.5 lg:py-4 relative overflow-hidden z-20">
        {/* Subtle Decorative Background Flow Lines (Left & Right) */}
        <div className="absolute -left-12 -bottom-12 w-64 h-64 pointer-events-none opacity-40 select-none">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-slate-300/50">
            <path d="M-20 180 C 40 160, 100 120, 160 40" strokeWidth="1" />
            <path d="M-10 190 C 50 170, 110 130, 170 50" strokeWidth="1" />
            <path d="M0 200 C 60 180, 120 140, 180 60" strokeWidth="1" />
            <path d="M10 210 C 70 190, 130 150, 190 70" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute -right-12 -top-12 w-64 h-64 pointer-events-none opacity-40 select-none">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-slate-300/50">
            <path d="M220 20 C 160 40, 100 80, 40 160" strokeWidth="1" />
            <path d="M210 10 C 150 30, 90 70, 30 150" strokeWidth="1" />
            <path d="M200 0 C 140 20, 80 60, 20 140" strokeWidth="1" />
          </svg>
        </div>

        <div className="container-page relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 items-center">
            {[
              {
                icon: MapPin,
                title: "LOCAL HERITAGE",
                desc: "Proudly rooted in Gloucestershire since 1972.",
              },
              {
                icon: Truck,
                title: "DEPENDABLE DELIVERY",
                desc: "Fast, reliable and safe delivery when you need it most.",
              },
              {
                icon: Users,
                title: "FAMILY VALUES",
                desc: "Three generations of commitment, care and trust.",
              },
              {
                icon: ShieldCheck,
                title: "QUALITY YOU CAN TRUST",
                desc: "Premium products and service you can count on.",
              },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <Reveal key={item.title} variant="card" delay={idx * 80}>
                  <div
                    className={`flex items-center gap-2.5 sm:gap-3 lg:gap-3.5 p-2.5 sm:p-3 lg:p-3.5 group/benefit transition-all ${idx % 2 === 1 ? "border-l border-slate-200/80" : ""
                      } ${idx >= 2 ? "border-t border-slate-200/80 lg:border-t-0" : ""
                      } ${idx > 0 ? "lg:border-l lg:border-slate-200/80" : ""
                      }`}
                  >
                    {/* Large Soft Circular Icon Background */}
                    <div className="h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-full bg-white shadow-[0_3px_14px_rgba(0,0,0,0.05)] border border-slate-100/90 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover/benefit:scale-105">
                      <IconComponent className="h-4.5 w-4.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary stroke-[1.8]" />
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[12.5px] font-extrabold uppercase tracking-wider text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      {/* Red Accent Dash */}
                      <div className="h-[2px] w-5 bg-primary rounded-full my-1" />
                      <p className="text-[10.5px] sm:text-[11.5px] text-slate-500 font-normal leading-tight sm:leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. OUR STORY — ORIGINS & HERITAGE (Cinematic Video Feature)
      ========================================================================= */}
      <section id="our-story" className="pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20 bg-white border-b border-slate-200/60 relative overflow-hidden">
        <div className="container-page relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column: Existing Cinematic Hero Video (48-50% desktop width, Sharp 90-degree Rectangle) */}
            <div className="lg:col-span-6 relative">
              <Reveal delay={200} variant="image">
                <div className="relative rounded-none overflow-hidden bg-slate-950 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.16)] border border-slate-200/80 group aspect-[16/11] sm:aspect-[16/11] lg:aspect-[16/11.5] w-full flex items-center justify-center">
                  <video
                    src="/about-hero-cinematic.mp4"
                    poster="/about-hero-poster.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-label="Cinematic video of John Stayte Services LPG delivery truck travelling through Gloucestershire countryside"
                    className="w-full h-full object-cover object-center pointer-events-none transform transition-transform duration-700 group-hover:scale-[1.01]"
                    style={{ objectPosition: "50% 50%" }}
                  />
                </div>
              </Reveal>
            </div>

            {/* Right Column: Editorial Content (50-52% desktop width) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Eyebrow */}
              <Reveal delay={0}>
                <div className="space-y-1.5">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] text-primary block">
                    ORIGINS & HERITAGE
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="h-[2px] w-20 bg-primary rounded-full inline-block" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block -ml-0.5" />
                  </div>
                </div>
              </Reveal>

              {/* Headline */}
              <Reveal delay={80} variant="heading">
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[45px] font-black text-slate-900 tracking-tight leading-[1.12] font-display">
                  Rooted in Whitminster.<br />
                  Built for <span className="text-primary">Gloucestershire.</span>
                </h2>
                {/* Short Red Divider Line */}
                <div className="w-12 h-1 bg-primary rounded-full mt-4 mb-5" />
              </Reveal>

              {/* 4 Body Paragraphs */}
              <Reveal delay={160}>
                <div className="space-y-3.5 text-slate-700 text-[13.5px] sm:text-[14.5px] lg:text-[15px] leading-[1.65] font-normal">
                  <p>
                    John Stayte Services began in 1972 as a roadside service station and workshop in the heart of Whitminster. Founded with a simple, enduring standard — deliver what local people need, on time, with fair pricing and honest advice — the business quickly became an indispensable fixture for local motorists, farmers, and village households.
                  </p>
                  <p>
                    Over five decades, Gloucestershire has grown and transformed, and our capabilities have expanded alongside it. What started as a single village garage evolved into an authorized Calor Gas regional stockist, solid fuel merchant, pet nutrition supplier, and the operator of three bustling filling station forecourts across Fromebridge, Cambridge, and Frampton on Severn.
                  </p>
                  <p>
                    As the region's reliance on off-grid heating and bottled LPG expanded, we developed a dedicated distribution fleet engineered to navigate narrow country lanes, rural hamlets, and farm tracks. We established certified cylinder depots to guarantee a steady, dependable fuel supply in every season.
                  </p>
                  <p>
                    Today, the third generation of the Stayte family works side-by-side with our dedicated drivers, depot staff, and customer support advisors. While our catalogue and delivery radius have broadened, we remain steadfast to our founding values: neighbourly dependability, genuine local knowledge, and an unwavering commitment to Gloucestershire.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. TIMELINE — OUR JOURNEY THROUGH THE YEARS (Premium Vertical Timeline)
          Desktop/Tablet: Perfectly centered timeline with alternating left/right cards
          Mobile: Clean single-column with left timeline line and right-aligned cards
      ========================================================================= */}
      <section className="pt-7 pb-10 sm:pt-8 sm:pb-12 lg:pt-10 lg:pb-14 bg-[#f8f9fa] border-b border-slate-200/60 relative overflow-hidden">
        {/* Soft Ambient Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="container-page space-y-5 sm:space-y-6 lg:space-y-7 relative z-10">
          {/* Section Header */}
          <div className="text-center space-y-2 sm:space-y-2.5 max-w-2xl mx-auto">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/90 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>FIVE DECADES OF DEDICATION</span>
              </div>
            </Reveal>
            <Reveal delay={80} variant="heading">
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight font-display">
                Our Journey <span className="text-primary">Through the Years</span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
                Key milestones in our evolution from a single village garage to Gloucestershire's trusted fuel partner.
              </p>
            </Reveal>
          </div>

          {/* Vertical Timeline Structure */}
          <div className="relative max-w-4xl mx-auto">
            {/* Desktop Centered Line */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-primary/20 pointer-events-none" />

            {/* Mobile Left-Aligned Line */}
            <div className="md:hidden absolute left-5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-primary/20 pointer-events-none" />

            <div className="space-y-5 sm:space-y-6 lg:space-y-7">
              {[
                {
                  year: "1972",
                  title: "Where It All Began",
                  desc: "Founded as a roadside service station and garage in Whitminster, serving local motorists and farmers.",
                  side: "left" as const,
                },
                {
                  year: "1980s",
                  title: "Growing with Gloucestershire",
                  desc: "Became an authorized Calor Gas stockist, establishing our first dedicated cylinder delivery rounds.",
                  side: "right" as const,
                },
                {
                  year: "1990s",
                  title: "Expanding Our Services",
                  desc: "Added smokeless solid fuels, firewood, animal nutrition, and outdoor lifestyle appliances to our range.",
                  side: "left" as const,
                },
                {
                  year: "2000s",
                  title: "Forecourt Network",
                  desc: "Expanded to three service stations: Fromebridge, Wild Goose Garage (Cambridge) and Bridge Service Station.",
                  side: "right" as const,
                },
                {
                  year: "Today",
                  title: "Three Generations Strong",
                  desc: "Operating a modern ADR-certified delivery fleet across a 40-mile radius with digital ordering & expert advice.",
                  side: "left" as const,
                },
              ].map((milestone, idx) => (
                <TimelineMilestoneRow key={milestone.year} milestone={milestone} idx={idx} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. WHAT WE DO ("More Than Fuel.")
          3-column x 2-row card grid with high-resolution editorial photography
      ========================================================================= */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200/60">
        <div className="container-page space-y-10 sm:space-y-12">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <Reveal delay={0}>
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary block">
                — COMPREHENSIVE PROVISION —
              </span>
            </Reveal>
            <Reveal delay={80} variant="heading">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
                More Than <span className="text-primary">Fuel.</span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto font-normal">
                Everything you need for heating, outdoor living, rural work, and transport from one trusted local team.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-8 items-stretch">
            {[
              {
                title: "Bottled Gas",
                desc: "Propane, butane, patio gas, and cellar gas cylinders delivered directly to your home, pub, or business.",
                icon: Flame,
                image: "/more-than-fuel-bottled-gas.jpg",
                link: "/order-gas",
              },
              {
                title: "Solid Fuel & Logs",
                desc: "Smokeless coal, kiln-dried hardwood logs, kindling, and eco-fuels for open fires and multi-fuel stoves.",
                icon: Logs,
                image: "/more-than-fuel-solid-fuel.jpg",
                link: "/products",
              },
              {
                title: "Animal Feed & Pet Care",
                desc: "Quality equine feeds, poultry grains, wild bird seeds, and domestic pet nutrition from trusted British brands.",
                icon: Dog,
                image: "/more-than-fuel-animal-feed.jpg",
                link: "/products",
              },
              {
                title: "Fishing Bait & Tackle",
                desc: "Fresh boilies, pellets, groundbaits, and terminal tackle trusted by anglers across Gloucestershire.",
                icon: Fish,
                image: "/more-than-fuel-fishing-bait.jpg",
                link: "/products",
              },
              {
                title: "Gas Appliances & Spares",
                desc: "Portable gas heaters, Char-Broil BBQs, regulators, hoses, and certified gas fittings with expert advice.",
                icon: CookingPot,
                image: "/more-than-fuel-gas-appliances.jpg",
                link: "/products",
              },
              {
                title: "Filling Stations & Shops",
                desc: "Three forecourts across Whitminster, Cambridge, and Frampton on Severn providing road fuels and convenience essentials.",
                icon: Fuel,
                image: "/more-than-fuel-filling-stations.jpg",
                link: "/filling-stations",
              },
            ].map((service, idx) => (
              <Reveal key={service.title} variant="card" delay={idx * 100} className="h-full">
                <Link
                  to={service.link}
                  className="group bg-white rounded-[12px] sm:rounded-[16px] lg:rounded-[18px] border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden h-full"
                >
                  <div>
                    {/* Full-Bleed Top Category Image */}
                    <div className="w-full aspect-[16/10] sm:aspect-[16/9.5] overflow-hidden bg-slate-100 relative shrink-0">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    {/* Circular Category Icon (Overlapping Image Bottom) */}
                    <div className="-mt-3.5 sm:-mt-4.5 lg:-mt-5 ml-2.5 sm:ml-4 lg:ml-5 relative z-10">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 lg:h-11 lg:w-11 rounded-full bg-red-50 text-primary border border-red-100/90 flex items-center justify-center shadow-2xs">
                        <service.icon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5 stroke-[1.8]" />
                      </div>
                    </div>

                    {/* Card Text Content */}
                    <div className="p-2.5 sm:p-4 lg:p-5 pt-1.5 sm:pt-2 lg:pt-2.5 space-y-1 sm:space-y-1.5 lg:space-y-2">
                      <h3 className="text-xs sm:text-base lg:text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors tracking-tight leading-snug line-clamp-1 sm:line-clamp-none">
                        {service.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs lg:text-[13px] text-slate-500 font-normal leading-tight sm:leading-relaxed line-clamp-2 sm:line-clamp-none min-h-[24px] sm:min-h-[32px] lg:min-h-[38px]">
                        {service.desc}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Aligned CTA Button */}
                  <div className="px-2.5 sm:px-4 lg:px-5 pb-2.5 sm:pb-4 lg:pb-5">
                    <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-start">
                      <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-primary hover:bg-primary/90 text-white text-[10px] sm:text-xs font-extrabold shadow-[0_2px_8px_rgba(220,38,38,0.22)] group-hover:shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all">
                        <span>Explore category</span>
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform group-hover:translate-x-1 transition-transform shrink-0" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. WHY CHOOSE JOHN STAYTE SERVICES ("Why Choose Us")
          2x2 grid with alternating square/portrait photography and detailed editorial copy
      ========================================================================= */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#fafbfc] border-b border-slate-200/60">
        <div className="container-page space-y-10 sm:space-y-12">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <Reveal delay={0}>
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary block">
                — THE JOHN STAYTE DIFFERENCE —
              </span>
            </Reveal>
            <Reveal delay={80} variant="heading">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
                Why <span className="text-primary">Choose Us</span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto font-normal">
                We combine the reliability of a modern regional distributor with the personal care of an independent family business.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {[
              {
                title: "Local Knowledge",
                desc: "Based in Gloucestershire for over 50 years, our drivers and office team know every rural lane, farm track, and village across the county.",
                additional:
                  "From the Cotswolds to the Severn Vale, we understand the needs of local homes, farms, and businesses because we're part of the community we serve.",
                icon: MapPin,
                image: "/why-choose-local-knowledge.jpg",
                imagePosition: "left" as const,
              },
              {
                title: "Reliable Service",
                desc: "Our scheduled delivery runs keep your life and business moving. If you run low, we're just a call away.",
                additional:
                  "With local depots, real stock on the ground, and emergency top-ups when you need them most, you can count on us for fast, dependable service all year round.",
                icon: Truck,
                image: "/why-choose-reliable-service.jpg",
                imagePosition: "right" as const,
              },
              {
                title: "Family Values",
                desc: "Three generations of family stewardship built on honesty, hard work, and respect.",
                additional:
                  "We answer our own phones, remember our customers by name, and go the extra mile to do the right thing—every time.",
                footer: "It's how we've always done business, and always will.",
                icon: HeartHandshake,
                image: "/why-choose-family-values.jpg",
                imagePosition: "left" as const,
              },
              {
                title: "One Trusted Team",
                desc: "From road fuels and domestic gas to heating logs and pet feeds, everything you need is available through our team under one roof.",
                additional:
                  "One account, one point of contact, and a team of local experts committed to making your life simpler.",
                icon: ShieldCheck,
                image: "/why-choose-one-trusted-team.jpg",
                imagePosition: "right" as const,
              },
            ].map((b, idx) => {
              const IconComponent = b.icon;
              const isImageLeft = b.imagePosition === "left";
              return (
                <Reveal key={b.title} variant="card" delay={idx * 110} className="h-full">
                  <div
                    className={`bg-white rounded-[14px] sm:rounded-[16px] border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col ${isImageLeft ? "md:flex-row" : "md:flex-row-reverse"
                      } h-full group`}
                  >
                    {/* Sharp-Cornered Square/Portrait Photography (Approx 45% Desktop Width) */}
                    <div className="w-full md:w-[45%] h-52 sm:h-60 md:h-auto overflow-hidden bg-slate-100 shrink-0 relative">
                      <img
                        src={b.image}
                        alt={b.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 rounded-none"
                        loading="lazy"
                      />
                    </div>

                    {/* Detailed Informative Content Area (Approx 55% Desktop Width) */}
                    <div className="w-full md:w-[55%] p-5 sm:p-6 lg:p-6.5 flex flex-col justify-center space-y-2.5">
                      {/* Icon Container */}
                      <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shadow-2xs shrink-0">
                        <IconComponent className="h-4.5 w-4.5 stroke-[1.8]" />
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                        {b.title}
                      </h3>

                      {/* Small Red Accent Line */}
                      <div className="h-[2px] w-6 bg-primary rounded-full my-0.5" />

                      {/* Primary Description */}
                      <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                        {b.desc}
                      </p>

                      {/* Additional Paragraph */}
                      <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed">
                        {b.additional}
                      </p>

                      {/* Optional Footer Text */}
                      {b.footer && (
                        <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed italic pt-0.5">
                          {b.footer}
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. REGIONAL COVERAGE / LOCAL CONNECTION
          2-Column showcase: Left text/pills/CTA + Right crisp rectangular map with floating status bar
      ========================================================================= */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white border-b border-slate-200/60">
        <div className="container-page">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
            {/* Left Column: Heading, Description, Delivery Location Pills & CTA (~45% width) */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Reveal delay={0}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/90 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span>REGIONAL COVERAGE</span>
                  </div>
                </Reveal>
                <Reveal delay={80} variant="heading">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                    Right Across <span className="text-primary">Gloucestershire</span>
                  </h2>
                </Reveal>
                <Reveal delay={120}>
                  <div className="w-12 h-1 bg-primary rounded-full mt-2.5" />
                </Reveal>
              </div>

              <Reveal delay={160}>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  Our distribution vehicles operate daily delivery routes across Gloucestershire, serving towns, rural
                  villages, and isolated properties within a 40-mile radius.
                </p>
              </Reveal>

              {/* Service Areas Pill Grid */}
              <Reveal delay={220}>
                <div className="space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Regular Delivery Areas</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {[
                      "Gloucester",
                      "Stroud",
                      "Dursley",
                      "Cam",
                      "Berkeley",
                      "Cheltenham",
                      "Forest of Dean",
                      "Tewkesbury",
                      "Frampton on Severn",
                      "Whitminster",
                      "Stonehouse",
                      "Wotton-under-Edge",
                    ].map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-colors shadow-2xs cursor-default"
                      >
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span>{loc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Nearest Station CTA */}
              <Reveal delay={280}>
                <div className="pt-1">
                  <Link
                    to="/filling-stations"
                    className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.35)] inline-flex items-center gap-2.5 transition-all group cursor-pointer"
                  >
                    <Navigation className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    <span>Find your nearest station</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Premium Sharp-Cornered Map Visual (~55% width) */}
            <div className="lg:col-span-7 xl:col-span-7">
              <Reveal delay={150} variant="image">
                <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/90 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.12)] bg-slate-50 relative group aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] w-full">
                  <img
                    src={gloucestershireMap}
                    alt="Gloucestershire service delivery map showing John Stayte Services 40-mile coverage"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 rounded-none"
                    loading="lazy"
                  />

                  {/* Clean Floating Status Bar Overlay */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 backdrop-blur-md rounded-full px-4 py-2.5 sm:py-3 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between text-xs sm:text-[13px]">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      <span className="font-extrabold text-slate-800">Daily Delivery Fleet Active</span>
                    </div>
                    <span className="text-primary font-black tracking-wide">40-Mile Radius</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. OUR FLEET / DELIVERY SECTION ("Own Vehicle Fleet")
          Premium Light 2-Column Showcase + 3 Horizontal Feature Cards Below
      ========================================================================= */}
      <section className="py-8 sm:py-10 lg:py-12 bg-[#fcfdfe] border-b border-slate-200/60 relative overflow-hidden">
        <div className="container-page space-y-6 sm:space-y-7 lg:space-y-8 relative z-10">
          {/* Top Row: Left Content & Right Large Landscape Truck Photo */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
            {/* Left Column: Heading, Divider & Paragraph + Supporting Content Blocks (~45% width) */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-4 sm:space-y-4.5 text-left flex flex-col justify-center">
              <div>
                <Reveal delay={0}>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-primary block mb-2">
                    OWN VEHICLE FLEET
                  </span>
                </Reveal>
                <Reveal delay={80} variant="heading">
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                    Delivered by people who know the area.
                  </h2>
                </Reveal>
                <Reveal delay={120}>
                  <div className="h-1.5 w-14 bg-primary rounded-full my-2.5 sm:my-3" />
                </Reveal>
                <Reveal delay={160}>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-lg">
                    Unlike generic couriers, our dedicated delivery drivers are certified hazardous goods specialists who understand
                    the unique access needs of countryside driveways, farms, and residential gardens.
                  </p>
                </Reveal>
              </div>

              {/* Supporting Value Points to Balance Composition */}
              <Reveal delay={220}>
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>Local routes. Reliable delivery.</span>
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed pl-3.5">
                      Our drivers know the roads, villages and rural properties across the area, helping every delivery arrive safely and efficiently.
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>Built around your needs.</span>
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed pl-3.5">
                      From planned deliveries to urgent top-ups, our team is focused on dependable service and straightforward communication.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Large Landscape Rectangular Truck Photo (~55% width, Sharp Rectangle) */}
            <div className="lg:col-span-7 xl:col-span-7">
              <Reveal delay={120} variant="image">
                <div className="rounded-none overflow-hidden border border-slate-200/90 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.12)] bg-slate-50 relative group aspect-[16/10] sm:aspect-[16/9.8] w-full">
                  <img
                    src="/own-fleet-truck-hero.jpg"
                    alt="John Stayte Services modern red and white DAF CF Calor LPG cylinder delivery truck"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 rounded-none"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>
          </div>

          {/* Bottom Row: 3 Horizontal Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 pt-2 sm:pt-4">
            {[
              {
                title: "Local Delivery",
                desc: "Scheduled routes ensuring timely gas, coal and essential deliveries.",
                icon: Truck,
              },
              {
                title: "Experienced Drivers",
                desc: "ADR-certified personnel trained in safe cylinder connection and positioning.",
                icon: ShieldCheck,
              },
              {
                title: "Trusted Service",
                desc: "Dependable supply with swap-out of empty cylinders directly at your door.",
                icon: Award,
              },
            ].map((c, idx) => {
              const IconComponent = c.icon;
              return (
                <Reveal key={c.title} variant="card" delay={idx * 100} className="h-full">
                  <div className="bg-white rounded-[14px] sm:rounded-[16px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex items-start gap-4 sm:gap-4.5 h-full group">
                    <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full bg-red-50 text-primary border border-red-100/90 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-300">
                      <IconComponent className="h-5 w-5 sm:h-5.5 sm:w-5.5 stroke-[1.8]" />
                    </div>
                    <div className="space-y-1 sm:space-y-1.5 min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                        {c.title}
                      </h3>
                      <div className="h-[2px] w-6 bg-primary rounded-full my-1" />
                      <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FILLING STATIONS FEATURE ("Three Local Forecourts. One Trusted Name.")
          Clean, Premium 3-Card Showcase matching Reference UI
      ========================================================================= */}
      <section className="py-10 sm:py-14 lg:py-16 bg-[#f8f9fa] border-b border-slate-200/60">
        <div className="container-page space-y-8 sm:space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <Reveal delay={0}>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary block">
                CONVENIENT FORECOURTS
              </span>
            </Reveal>
            <Reveal delay={60}>
              <div className="h-0.5 w-10 bg-primary mx-auto rounded-full" />
            </Reveal>
            <Reveal delay={100} variant="heading">
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                Three Local Forecourts. One Trusted Name.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Visit any of our Gloucestershire service stations for road fuels, Autogas LPG, bottle exchange, and convenience groceries.
              </p>
            </Reveal>
          </div>

          {/* 3 Forecourt Cards: 3 Columns on Desktop, 2 Columns on Mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 items-stretch">
            {dbStations.map((stn, idx) => {
              const styles = [
                {
                  badgeBg: "bg-red-50",
                  badgeText: "text-red-600",
                  badgeBorder: "border-red-100",
                  btnBorder: "border-red-200 hover:border-red-600",
                  btnText: "text-red-600",
                  btnHoverBg: "hover:bg-red-600",
                  btnHoverText: "hover:text-white",
                  defaultImg: stationImg,
                },
                {
                  badgeBg: "bg-emerald-50",
                  badgeText: "text-emerald-600",
                  badgeBorder: "border-emerald-100",
                  btnBorder: "border-emerald-200 hover:border-emerald-600",
                  btnText: "text-emerald-700",
                  btnHoverBg: "hover:bg-emerald-600",
                  btnHoverText: "hover:text-white",
                  defaultImg: stationWildGooseBP,
                },
                {
                  badgeBg: "bg-sky-50",
                  badgeText: "text-sky-600",
                  badgeBorder: "border-sky-100",
                  btnBorder: "border-sky-200 hover:border-sky-600",
                  btnText: "text-sky-700",
                  btnHoverBg: "hover:bg-sky-600",
                  btnHoverText: "hover:text-white",
                  defaultImg: stationBridge76,
                },
              ];
              const style = styles[idx % styles.length];
              const stationImagesMap: Record<string, string> = {
                "Fromebridge Service Station": stationImg,
                "Wild Goose Garage": stationWildGooseBP,
                "Bridge Service Station": stationBridge76,
              };
              const imgSrc = stn.image_url || stationImagesMap[stn.name] || style.defaultImg;

              return (
                <Reveal key={stn.name || idx} variant="card" delay={idx * 110} className="h-full">
                  <div className="bg-white rounded-[14px] sm:rounded-[18px] border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
                    <div>
                      {/* Rectangular Landscape Photograph */}
                      <div className="relative aspect-[16/10] sm:aspect-[16/9.5] overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={imgSrc}
                          alt={stn.name}
                          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 rounded-none"
                          loading="lazy"
                        />
                        {/* Overlaid OPEN NOW Status Badge */}
                        <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 bg-white/95 backdrop-blur-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-800 border border-white/80 shadow-2xs flex items-center gap-1.5 pointer-events-none">
                          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>OPEN NOW</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                        {/* Station Icon & Title Row */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`h-7 w-7 sm:h-9 sm:w-9 rounded-lg ${style.badgeBg} ${style.badgeText} flex items-center justify-center shrink-0 border ${style.badgeBorder}`}>
                            <MapPin className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                          </div>
                          <h3 className="text-xs sm:text-base lg:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                            {stn.name}
                          </h3>
                        </div>

                        {/* Location & Hours */}
                        <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs text-slate-500 font-normal">
                          <p className="flex items-start gap-1.5 sm:gap-2">
                            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 sm:line-clamp-none">{stn.address}</span>
                          </p>
                          <p className="flex items-center gap-1.5 sm:gap-2">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1 sm:line-clamp-none">{stn.hours}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Full-width Outlined Button */}
                    <div className="p-3.5 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
                      <Link
                        to="/filling-stations"
                        className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl border ${style.btnBorder} ${style.btnText} ${style.btnHoverBg} ${style.btnHoverText} bg-white text-[10px] sm:text-xs lg:text-sm font-extrabold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 shadow-2xs group/btn`}
                      >
                        <span>View station details</span>
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. OUR PROMISE / BRAND STATEMENT
          2-Column Split: Left typography + 4 trust pillars + JS badge, Right 1-large + 3-small photo collage
      ========================================================================= */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200/60 relative overflow-hidden">
        <div className="container-page">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
            {/* Left Side: Eyebrow, Heading, Paragraph, 4 Trust Points, Bottom Strip (~42% desktop width) */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-5 sm:space-y-6 text-left">
              <div>
                <Reveal delay={0}>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-primary block mb-2">
                    OUR PROMISE
                  </span>
                </Reveal>
                <Reveal delay={40}>
                  <div className="h-1 w-10 bg-primary rounded-full mb-3" />
                </Reveal>
                <Reveal delay={80} variant="heading">
                  <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                    Local service.<br />
                    Honest advice.<br />
                    <span className="text-primary">Dependable delivery.</span>
                  </h2>
                </Reveal>
              </div>

              <Reveal delay={160}>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Since 1972, our commitment has stayed constant: providing Gloucestershire with honest pricing, certified
                  energy supply, and personal support that large national call centres cannot match.
                </p>
              </Reveal>

              {/* 4 Trust / Value Items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                {[
                  {
                    title: "Trusted Since 1972",
                    desc: "Over 50 years of local expertise",
                    icon: ShieldCheck,
                  },
                  {
                    title: "Local & Independent",
                    desc: "Proudly based in Gloucestershire",
                    icon: MapPin,
                  },
                  {
                    title: "Certified & Compliant",
                    desc: "Fully certified for your safety & peace of mind",
                    icon: Award,
                  },
                  {
                    title: "Personal Support",
                    desc: "Real people, real help when you need it",
                    icon: Headphones,
                  },
                ].map((p, idx) => {
                  const IconComponent = p.icon;
                  return (
                    <Reveal key={p.title} variant="card" delay={200 + idx * 60}>
                      <div
                        className="text-center space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:bg-white hover:border-slate-200 transition-all duration-200 h-full flex flex-col justify-between"
                      >
                        <div className="h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-full bg-red-50 text-primary border border-red-100/90 flex items-center justify-center shadow-2xs">
                          <IconComponent className="h-4 w-4 stroke-[2]" />
                        </div>
                        <div>
                          <h4 className="text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight tracking-tight">
                            {p.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-normal leading-snug">
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              {/* Small Bottom Strip / Trust Pill Box */}
              <Reveal delay={440}>
                <div className="rounded-xl border border-slate-200/90 bg-white p-3 flex items-center gap-3 shadow-2xs w-fit">
                  <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    JS
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                    <span>John Stayte Services</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-medium">Gloucestershire Since 1972</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right Side: Image Collage (~58% desktop width) */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-3 sm:space-y-3.5">
              {/* 1. Large Horizontal Rectangular Image at Top */}
              <Reveal delay={120} variant="image">
                <div className="rounded-[12px] sm:rounded-[14px] overflow-hidden border border-slate-200/90 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.12)] bg-slate-50 relative aspect-[16/9.5] sm:aspect-[16/9.2] w-full group">
                  <img
                    src="/our-promise-main-exact.jpg"
                    alt="Customer speaking with the John Stayte Services technician in the kitchen"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 rounded-none"
                    loading="lazy"
                  />
                </div>
              </Reveal>

              {/* 2. Three Supporting Images Below in One Horizontal Row */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                {/* Image 1: Bottom-left — warm living room with radiator */}
                <Reveal delay={200} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-radiator-exact.jpg"
                      alt="Warm modern UK living room with column radiator central heating"
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 rounded-none"
                      loading="lazy"
                    />
                  </div>
                </Reveal>

                {/* Image 2: Bottom-middle — indoor wood-burning stove with coal basket */}
                <Reveal delay={280} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-stove-exact.jpg"
                      alt="Indoor wood-burning stove with coal basket"
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 rounded-none"
                      loading="lazy"
                    />
                  </div>
                </Reveal>

                {/* Image 3: Bottom-right — clean modern gas hob with blue flame */}
                <Reveal delay={360} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-gashob-exact.jpg"
                      alt="Clean modern kitchen stainless steel gas hob with clean burning blue flame"
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 rounded-none"
                      loading="lazy"
                    />
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. FINAL CALL TO ACTION — Clean Horizontal Showcase
      ========================================================================= */}
      <section className="py-10 sm:py-12 lg:py-14 bg-[#fafbfc] border-t border-slate-200/70 relative overflow-hidden">
        {/* Subtle abstract soft energy background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-red-500/3 rounded-full blur-3xl pointer-events-none" />

        <div className="container-page relative z-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center justify-between">
            {/* Left Side: Eyebrow, Heading, Description (~68% desktop width) */}
            <div className="lg:col-span-8 space-y-2 sm:space-y-2.5 text-left">
              <Reveal delay={0}>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-primary block">
                  NEED A HAND?
                </span>
              </Reveal>
              <Reveal delay={80} variant="heading">
                <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight font-display">
                  Need a hand with fuel, gas or outdoor essentials?
                </h2>
              </Reveal>
              <Reveal delay={150}>
                <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-2xl">
                  Speak with our Gloucestershire customer support team today or order online for prompt doorstep delivery.
                </p>
              </Reveal>
            </div>

            {/* Right Side: Two Clean Action Buttons (~32% desktop width) */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0">
              <Reveal delay={200}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    to="/order-gas"
                    className="px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-2xs hover:shadow-md transition-all duration-200 inline-flex items-center justify-center gap-2 shrink-0 group cursor-pointer"
                  >
                    <span>Order Gas Online</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/contact"
                    className="px-6 py-3 rounded-full border border-slate-300/90 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs sm:text-sm shadow-2xs hover:border-slate-400 transition-all duration-200 inline-flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <span>Contact Us</span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
