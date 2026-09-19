import { useState, useEffect, useRef, memo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Truck,
  Users,
  Award,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Navigation,
  Headphones,
  Building2,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Sun,
  Sprout,
  Quote,
  Store,
  Fuel,
  Car,
  Home,
  Lightbulb,
  Settings,
  Flame,
  Target,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { stations } from "@/data/catalog";
import heroImg from "@/assets/hero-delivery.jpg";
import originsHeritageHero from "@/assets/origins-heritage-hero.jpg";
import jssLogo from "@/assets/image-5.png";

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
      {
        property: "og:title",
        content: "About John Stayte Services — Keeping Gloucestershire Moving Since 1972",
      },
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
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
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
        },
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
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
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
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
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
          } catch { }
        }

        if (stnBlock?.content) {
          try {
            const parsedStns = JSON.parse(stnBlock.content);
            const stationList = Array.isArray(parsedStns)
              ? parsedStns
              : (Array.isArray(parsedStns?.stations) ? parsedStns.stations : []);
            if (stationList.length > 0) {
              setDbStations(stationList);
            }
          } catch { }
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
                    {aboutData?.heroHeading
                      ? aboutData.heroHeading.includes("MOVING SINCE")
                        ? aboutData.heroHeading.split("MOVING SINCE")[0].trim()
                        : aboutData.heroHeading
                      : "KEEPING GLOUCESTERSHIRE"}
                  </span>
                </Reveal>
                <Reveal immediate delay={180} variant="heading">
                  <span className="text-4xl sm:text-5xl lg:text-[48px] xl:text-[54px] font-black text-primary tracking-tight leading-[1.04] font-display block">
                    {aboutData?.heroHeading
                      ? aboutData.heroHeading.includes("MOVING SINCE")
                        ? "MOVING SINCE " + aboutData.heroHeading.split("MOVING SINCE")[1].trim()
                        : ""
                      : "MOVING SINCE 1972"}
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
                      } ${idx >= 2 ? "border-t border-slate-200/80 lg:border-t-0" : ""} ${idx > 0 ? "lg:border-l lg:border-slate-200/80" : ""
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
      <section
        id="our-story"
        className="pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20 bg-white border-b border-slate-200/60 relative overflow-hidden"
      >
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
                  Rooted in Whitminster.
                  <br />
                  Built for <span className="text-primary">Gloucestershire.</span>
                </h2>
                {/* Short Red Divider Line */}
                <div className="w-12 h-1 bg-primary rounded-full mt-4 mb-5" />
              </Reveal>

              {/* 4 Body Paragraphs */}
              <Reveal delay={160}>
                <div className="space-y-3.5 text-slate-700 text-[13.5px] sm:text-[14.5px] lg:text-[15px] leading-[1.65] font-normal">
                  <p>
                    John Stayte Services began in 1972 as a roadside service station and workshop in
                    the heart of Whitminster. Founded with a simple, enduring standard — deliver
                    what local people need, on time, with fair pricing and honest advice — the
                    business quickly became an indispensable fixture for local motorists, farmers,
                    and village households.
                  </p>
                  <p>
                    Over five decades, Gloucestershire has grown and transformed, and our
                    capabilities have expanded alongside it. What started as a single village garage
                    evolved into an authorized Calor Gas regional stockist, solid fuel merchant, pet
                    nutrition supplier, and the operator of three bustling filling station
                    forecourts across Dursley, Whitminster, and Stonehouse.
                  </p>
                  <p>
                    As the region's reliance on off-grid heating and bottled LPG expanded, we
                    developed a dedicated distribution fleet engineered to navigate narrow country
                    lanes, rural hamlets, and farm tracks. We established certified cylinder depots
                    to guarantee a steady, dependable fuel supply in every season.
                  </p>
                  <p>
                    Today, the third generation of the Stayte family works side-by-side with our
                    dedicated drivers, depot staff, and customer support advisors. While our
                    catalogue and delivery radius have broadened, we remain steadfast to our
                    founding values: neighbourly dependability, genuine local knowledge, and an
                    unwavering commitment to Gloucestershire.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3.5 OUR HEAD OFFICE — EASTINGTON (Clean Editorial Hero Section)
          Full-width 3D scene backdrop with clean rectangular media panel, contact bar, & brand strip
      ========================================================================= */}
      <section className="py-10 sm:py-12 lg:py-14 relative overflow-hidden bg-[#fafbfe] border-b border-slate-200/70">
        {/* Current Background Image Preserved */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url('/head-office-3d-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        />

        {/* Soft Translucent Overlays for High Legibility & Seamless 3D Blend */}
        <div className="absolute inset-0 bg-white/45 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/55 to-white/20 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 pointer-events-none z-0" />

        {/* Ambient Red Glow Accents */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/[0.05] rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/[0.06] rounded-full blur-[100px] pointer-events-none z-0" />

        <div className="container-page relative z-10 space-y-6 sm:space-y-8">

          {/* MAIN 2-COLUMN HERO COMPOSITION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 xl:gap-12 items-center">

            {/* LEFT COLUMN: Head Office Narrative & 4 Feature Pillars */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-4.5">

              {/* Eyebrow & Red Underline */}
              <Reveal delay={0}>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-[11px] font-black tracking-widest text-[#e31b23] bg-red-50/95 border border-red-200/80 shadow-2xs backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e31b23]"></span>
                    </span>
                    OUR HEAD OFFICE
                  </div>
                  <div className="h-[2.5px] w-12 bg-primary rounded-full mt-2" />
                </div>
              </Reveal>

              {/* Heading & Subtitle */}
              <Reveal delay={40} variant="heading">
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-black text-slate-950 tracking-tight leading-[1.08] font-display">
                  Head Office, <span className="text-primary">Eastington</span>
                </h2>
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mt-1.5 font-mono">
                  OUR OPERATIONS. OUR PEOPLE. A STRONGER GLOUCESTERSHIRE.
                </p>
              </Reveal>

              {/* Editorial Paragraphs */}
              <Reveal delay={80}>
                <div className="space-y-2.5 text-slate-800 text-[13.5px] sm:text-[14.5px] leading-relaxed font-normal">
                  <p>
                    Our Head Office in Eastington is the central hub for John Stayte Services,
                    overseeing customer support, administration, and our primary fuel depot.
                    From here, we coordinate deliveries, manage stock, and ensure a reliable supply
                    of LPG and associated products to homes, businesses, farms, and industries
                    across Gloucestershire.
                  </p>
                  <p>
                    With a dedicated team and a modern depot, we're committed to efficiency,
                    safety, and excellent service — keeping local communities fuelled and supported
                    all year round.
                  </p>
                </div>
              </Reveal>

              {/* 4 Feature Pillars (Dedicated Team, Reliable Supply, Safety Focused, Supporting Local) */}
              <Reveal delay={120}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                  <div className="flex flex-col items-center text-center p-3 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:border-red-200 hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center mb-1.5 shadow-2xs">
                      <Users className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 leading-tight">Dedicated Team</span>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">Here to help</span>
                  </div>

                  <div className="flex flex-col items-center text-center p-3 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:border-red-200 hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center mb-1.5 shadow-2xs">
                      <Truck className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 leading-tight">Reliable Supply</span>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">All year round</span>
                  </div>

                  <div className="flex flex-col items-center text-center p-3 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:border-red-200 hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center mb-1.5 shadow-2xs">
                      <ShieldCheck className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 leading-tight">Safety Focused</span>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">In everything we do</span>
                  </div>

                  <div className="flex flex-col items-center text-center p-3 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:border-red-200 hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center mb-1.5 shadow-2xs">
                      <HeartHandshake className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 leading-tight">Supporting Local</span>
                    <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">Homes, businesses & farms</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* RIGHT COLUMN: Clean Sharp Rectangular Eastington Depot Photograph + Quote */}
            <div className="lg:col-span-6 space-y-3">
              <Reveal delay={100} variant="image">
                <div className="relative rounded-md overflow-hidden bg-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.09)] border border-slate-300/80 aspect-[16/10.8] w-full">
                  <img
                    src="/head-office-eastington-sunset.jpg"
                    alt="John Stayte Services Eastington Head Office & Animal Feeds Depot building at sunset"
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
              </Reveal>

              {/* Bottom Quote Bar */}
              <Reveal delay={140}>
                <div className="flex items-center gap-3 pt-0.5 px-1">
                  <span className="text-2xl sm:text-3xl font-black text-primary font-serif leading-none">
                    “
                  </span>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-700 italic">
                      "A reliable supply. A local commitment. A stronger Gloucestershire."
                    </p>
                    <div className="h-0.5 w-8 bg-primary rounded-full mt-1" />
                  </div>
                </div>
              </Reveal>
            </div>

          </div>

          {/* CONTACT INFORMATION HORIZONTAL BAR - CLEAN RECTANGLE */}
          <Reveal delay={160}>
            <div className="bg-white/92 backdrop-blur-md border border-slate-200/90 shadow-2xs rounded-md p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 divide-y sm:divide-y-0 lg:divide-x divide-slate-200/80">

              {/* Address */}
              <div className="flex items-start gap-3.5 pt-2.5 first:pt-0 sm:pt-0">
                <div className="h-9 w-9 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <MapPin className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    ADDRESS
                  </div>
                  <div className="text-xs sm:text-[12.5px] text-slate-900 font-bold leading-relaxed mt-0.5">
                    Puddlesworth Lane<br />
                    Eastington, Stonehouse<br />
                    Gloucestershire, GL10 3AH
                  </div>
                </div>
              </div>

              {/* Telephone */}
              <div className="flex items-start gap-3.5 pt-2.5 sm:pt-0 sm:pl-4 lg:pl-5">
                <div className="h-9 w-9 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Phone className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    TELEPHONE
                  </div>
                  <a
                    href="tel:+441453822859"
                    className="text-sm sm:text-base font-black text-slate-900 hover:text-primary transition-colors block mt-0.5"
                  >
                    +44 (0)1453 822859
                  </a>
                  <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                    Mon – Fri, 8:00 AM – 5:00 PM
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3.5 pt-2.5 sm:pt-0 sm:pl-4 lg:pl-5">
                <div className="h-9 w-9 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Mail className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    EMAIL
                  </div>
                  <a
                    href="mailto:info@johnstayteservices.co.uk"
                    className="text-xs sm:text-[12.5px] font-bold text-slate-900 hover:text-primary transition-colors truncate block mt-0.5"
                    title="info@johnstayteservices.co.uk"
                  >
                    info@johnstayteservices.co.uk
                  </a>
                  <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                    We'll get back to you soon
                  </div>
                </div>
              </div>

              {/* Website */}
              <div className="flex items-start gap-3.5 pt-2.5 sm:pt-0 sm:pl-4 lg:pl-5">
                <div className="h-9 w-9 rounded-sm bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Globe className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    WEBSITE
                  </div>
                  <a
                    href="https://www.johnstayteservices.co.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-[12.5px] font-bold text-slate-900 hover:text-primary transition-colors truncate block mt-0.5"
                    title="www.johnstayteservices.co.uk"
                  >
                    www.johnstayteservices.co.uk
                  </a>
                  <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                    Visit our website
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* BOTTOM BRAND STRIP */}
          <Reveal delay={200}>
            <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-300/60">

              {/* Left: Stylized Tagline */}
              <div className="flex items-center gap-3">
                <div className="font-serif italic font-extrabold text-xl sm:text-2xl text-slate-800 tracking-tight leading-none">
                  Fueling <span className="text-primary">Gloucestershire</span> Together
                </div>
              </div>

              {/* Center: 3 Trust Pillars */}
              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">LOCAL PEOPLE</span>
                    <span className="text-[10px] text-slate-500 font-normal">At the heart of what we do</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">TRUSTED SERVICE</span>
                    <span className="text-[10px] text-slate-500 font-normal">For over 50 years</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">CLEANER ENERGY</span>
                    <span className="text-[10px] text-slate-500 font-normal">A brighter tomorrow</span>
                  </div>
                </div>
              </div>

              {/* Right: Red Accent Polygon Tag */}
              <div className="hidden xl:flex items-center bg-primary text-white px-4 py-2 rounded-sm shadow-2xs text-right">
                <div>
                  <div className="text-[9.5px] font-black tracking-widest uppercase text-white/90">
                    SAME TRUST.
                  </div>
                  <div className="text-[11.5px] font-black tracking-wider uppercase text-white">
                    A BRIGHTER TOMORROW
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

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
                Key milestones in our evolution from a single village garage to Gloucestershire's
                trusted fuel partner.
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
                  desc: "Expanded to three service stations: Wild Goose Garage (Dursley), Fromebridge Service Station, and Bridge Service Station (Stonehouse).",
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
          5. OUR MISSION & VISION
          Premium corporate 2-card layout with subtle soft pink/red atmospheric
          depth, glass-like white surfaces, refined icon halo treatments, and JSS palette.
      ========================================================================= */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#fdfcfc] via-[#fff8f7]/70 to-[#fdfcfc] border-b border-slate-200/60 relative overflow-hidden">
        {/* Soft Ambient Radial Background Glows & Faint Atmospheric Geometry */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[550px] h-[450px] bg-red-500/[0.035] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[550px] h-[450px] bg-primary/[0.025] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-gradient-to-b from-red-100/30 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Faint Decorative Abstract Depth Curves */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#dc2626_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="container-page relative z-10 space-y-12 sm:space-y-16 max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-3.5 max-w-2xl mx-auto">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-200/80 bg-white/90 text-primary text-xs font-extrabold uppercase tracking-widest shadow-2xs backdrop-blur-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>OUR DIRECTION</span>
              </div>
            </Reveal>
            <Reveal delay={80} variant="heading">
              <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-slate-900 tracking-tight font-display">
                Our Mission &amp; <span className="text-primary">Vision</span>
              </h2>
            </Reveal>
          </div>

          {/* 2 Side-by-Side Premium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-9 lg:gap-10 items-stretch">
            {/* Card 1: Our Mission */}
            <Reveal delay={100} variant="card" className="h-full">
              <div className="h-full rounded-[26px] sm:rounded-[28px] border border-slate-200/80 bg-white/90 backdrop-blur-xl p-8 sm:p-10 lg:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_20px_45px_rgba(220,38,38,0.08)] hover:border-red-200 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-start relative overflow-hidden group">
                {/* Soft Interior Ambient Corner Flare */}
                <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-red-100/40 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                {/* Refined Icon Treatment with Subtle Red Ambient Halo */}
                <div className="relative mb-7 shrink-0">
                  <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/80 border border-red-200/90 text-primary flex items-center justify-center shadow-[0_4px_16px_rgba(220,38,38,0.12)] group-hover:scale-105 group-hover:shadow-[0_6px_20px_rgba(220,38,38,0.18)] transition-all duration-300">
                    <Target className="h-8 w-8 sm:h-9 sm:w-9 stroke-[1.85]" />
                  </div>
                </div>

                {/* Title & Accent Line */}
                <div className="space-y-3 mb-4">
                  <h3 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight font-display">
                    Our Mission
                  </h3>
                  <div className="h-[2.5px] w-8 bg-primary rounded-full group-hover:w-12 transition-all duration-300" />
                </div>

                {/* Exact Description Text */}
                <p className="text-base sm:text-[17px] text-slate-600 font-normal leading-relaxed">
                  To provide reliable, safe and convenient fuel, gas and essential products while delivering trusted local service to every customer and community we serve.
                </p>
              </div>
            </Reveal>

            {/* Card 2: Our Vision */}
            <Reveal delay={200} variant="card" className="h-full">
              <div className="h-full rounded-[26px] sm:rounded-[28px] border border-slate-200/80 bg-white/90 backdrop-blur-xl p-8 sm:p-10 lg:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_20px_45px_rgba(220,38,38,0.08)] hover:border-red-200 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-start relative overflow-hidden group">
                {/* Soft Interior Ambient Corner Flare */}
                <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-red-100/40 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                {/* Refined Icon Treatment with Subtle Red Ambient Halo */}
                <div className="relative mb-7 shrink-0">
                  <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/80 border border-red-200/90 text-primary flex items-center justify-center shadow-[0_4px_16px_rgba(220,38,38,0.12)] group-hover:scale-105 group-hover:shadow-[0_6px_20px_rgba(220,38,38,0.18)] transition-all duration-300">
                    <Eye className="h-8 w-8 sm:h-9 sm:w-9 stroke-[1.85]" />
                  </div>
                </div>

                {/* Title & Accent Line */}
                <div className="space-y-3 mb-4">
                  <h3 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight font-display">
                    Our Vision
                  </h3>
                  <div className="h-[2.5px] w-8 bg-primary rounded-full group-hover:w-12 transition-all duration-300" />
                </div>

                {/* Exact Description Text */}
                <p className="text-base sm:text-[17px] text-slate-600 font-normal leading-relaxed">
                  To be a trusted independent supplier across Gloucestershire, continuing to grow through excellent service, strong local relationships and a commitment to the communities we support.
                </p>
              </div>
            </Reveal>
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
                We combine the reliability of a modern regional distributor with the personal care
                of an independent family business.
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
          7. NIZA GROUP ANNOUNCEMENT ("Company News")
          Exact Match to Visual Reference:
          - Seamless full-width background image (/niza-announcement-bg.png) behind the entire section
          - Contained content aligned with container-page
          - Top Hero: COMPANY NEWS, bold heading, feature row, and prominent JS × NIZA branding
          - Editorial Article: 2-Column press release with red quote box, Visit NIZA Group button, executive message card, and 4 value pillars
      ========================================================================= */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 border-b border-slate-200/80 bg-[#fbfdfc]">
        {/* Full-width Seamless Background Image from Image 3 */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url('/niza-announcement-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        />

        {/* Soft Ambient Light Balancing */}
        <div className="absolute inset-0 bg-white/35 pointer-events-none z-0" />

        <div className="container-page relative z-10 space-y-12 sm:space-y-16">
          
          {/* TOP HERO ANNOUNCEMENT AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* LEFT COLUMN: Headings, Subtitle & Feature Pillars */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-3.5 sm:space-y-4">
              
              {/* Pill Badge: COMPANY NEWS */}
              <Reveal delay={0}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-[#bbf7d0] text-slate-800 text-[11px] font-black uppercase tracking-widest shadow-2xs backdrop-blur-xs">
                  <span className="h-2 w-2 rounded-full bg-[#059669]" />
                  <span>COMPANY NEWS</span>
                </div>
              </Reveal>

              {/* Dominant Main Heading */}
              <Reveal delay={60} variant="heading">
                <h2 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black text-slate-950 tracking-tight leading-[1.05] font-display uppercase">
                  JOHN STAYTE SERVICES <br />
                  <span>PROUDLY JOINS </span>
                  <span className="text-[#059669]">NIZA GROUP</span>
                </h2>
              </Reveal>

              {/* Supporting Line */}
              <Reveal delay={100}>
                <p className="text-sm sm:text-base lg:text-[16px] font-bold text-slate-800 leading-snug">
                  A stronger future for our customers, communities and colleagues.
                </p>
              </Reveal>

              {/* Horizontal Feature Row with Dividers */}
              <Reveal delay={140}>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pt-2 text-[11px] sm:text-xs font-black text-slate-700 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#059669] stroke-[2.2]" />
                    <span>PEOPLE</span>
                  </div>
                  <span className="text-slate-300 font-normal">|</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#059669] stroke-[2.2]" />
                    <span>PLACES</span>
                  </div>
                  <span className="text-slate-300 font-normal">|</span>
                  <div className="flex items-center gap-1.5">
                    <Sprout className="h-4 w-4 text-[#059669] stroke-[2.2]" />
                    <span>COMMUNITIES</span>
                  </div>
                  <span className="text-slate-300 font-normal">|</span>
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-[#059669] stroke-[2.2]" />
                    <span>A BRIGHTER TOMORROW</span>
                  </div>
                </div>
              </Reveal>

            </div>

            {/* RIGHT COLUMN: JSS × NIZA Logo Relationship + Script Tagline */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center text-center lg:border-l lg:border-slate-300/60 lg:pl-10 py-2">
              <Reveal delay={120}>
                <div className="space-y-3 sm:space-y-4">
                  {/* Logos Row */}
                  <div className="flex items-center justify-center gap-5 sm:gap-7">
                    {/* JSS Official Brand Badge */}
                    <div className="flex items-center">
                      <img
                        src="/favicon.png"
                        alt="John Stayte Services"
                        className="h-16 sm:h-20 md:h-22 w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                      />
                    </div>

                    {/* Relationship Connector */}
                    <span className="text-slate-300 font-light text-3xl sm:text-4xl select-none px-1">
                      ✕
                    </span>

                    {/* NIZA Group Official Brand Logo */}
                    <div className="flex items-center transition-transform duration-300 hover:scale-105">
                      <img
                        src="/brands/niza-group-official.png"
                        alt="NIZA Group"
                        className="h-16 sm:h-20 md:h-22 w-auto object-contain drop-shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Script Accent Tagline with Curved Underline */}
                  <div className="pt-2">
                    <div className="font-serif italic font-extrabold text-xl sm:text-2xl md:text-[25px] text-[#059669] tracking-wide">
                      Local Roots. Greater Possibilities.
                    </div>
                    <svg
                      className="w-56 sm:w-68 md:w-76 h-3 mx-auto text-[#059669] mt-1"
                      viewBox="0 0 200 12"
                      fill="none"
                    >
                      <path
                        d="M2 9C60 2 140 2 198 9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </Reveal>
            </div>

          </div>

          {/* EDITORIAL ACQUISITION ARTICLE & SIDEBAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Acquisition Press Narrative (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Date */}
              <Reveal delay={0}>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>July 21, 2026</span>
                </div>
              </Reveal>

              {/* Article Headline */}
              <Reveal delay={40} variant="heading">
                <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-950 tracking-tight leading-tight font-display">
                  Niza Group Expands with the Acquisition of John Stayte Services
                </h3>
              </Reveal>

              {/* Narrative Paragraphs */}
              <Reveal delay={80}>
                <div className="space-y-3.5 text-slate-600 text-sm sm:text-[14.5px] leading-relaxed font-normal">
                  <p>
                    John Stayte Services has officially become part of NIZA Group as of 1st July 2026. Customers
                    can expect the same reliable fuel, gas, heating, and retail services, backed by NIZA Group's
                    commitment to growth, innovation, and exceptional customer care.
                  </p>
                  <p>
                    Today marks a significant milestone in the continued growth of Niza Group, as we are delighted
                    to announce the successful acquisition of John Stayte Services, a highly respected
                    Gloucestershire business with decades of experience serving local communities.
                  </p>
                  <p>
                    This acquisition represents much more than simply adding new locations—it strengthens our
                    commitment to providing quality fuel, convenience retail, bottled gas, agricultural supplies
                    and specialist products across Gloucestershire and the South West.
                  </p>
                </div>
              </Reveal>

              {/* Quote Callout Box */}
              <Reveal delay={120}>
                <div className="mt-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#fff8f8]/90 backdrop-blur-xs border border-red-100 border-l-4 border-l-primary flex items-start gap-3.5 shadow-2xs">
                  <span className="text-3xl sm:text-4xl font-serif font-black text-primary leading-none shrink-0 select-none">
                    “
                  </span>
                  <p className="text-xs sm:text-[13.5px] text-slate-700 italic font-medium leading-relaxed pt-1">
                    For existing John Stayte Services customers, you can continue to expect the same trusted service
                    from the same local teams, now backed by the strength, investment and long-term vision of Niza Group.
                  </p>
                </div>
              </Reveal>

              {/* Official NIZA Website CTA Button */}
              <Reveal delay={160}>
                <div className="pt-3">
                  <a
                    href="https://nizagroup.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-primary hover:bg-primary/90 active:scale-[0.99] text-white text-sm sm:text-[15px] font-black shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-600/35 transition-all duration-200 group cursor-pointer"
                  >
                    <span>Visit NIZA Group</span>
                    <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </a>
                </div>
              </Reveal>

            </div>

            {/* RIGHT COLUMN: Strengthening Niza Group Information Card & Value Pillars (5 cols) */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-5">
              
              {/* Strengthening Niza Group Information Card */}
              <Reveal delay={60} variant="card">
                <div className="p-5 sm:p-6 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-4">
                  {/* Top: Heading & Narrative */}
                  <div className="space-y-2.5">
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
                      Strengthening Niza Group
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      Niza Group has grown into one of the region’s leading independent forecourt operators, operating Esso and Texaco branded fuel stations together with modern convenience stores offering more than 1,000+ branded grocery and everyday products.
                    </p>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      The acquisition of John Stayte Services allows us to expand our retail network further while preserving the excellent customer service and specialist product range that local communities have relied upon for generations.
                    </p>
                  </div>

                  {/* Bottom: Split Visual Area (NIZA Logo on Left, Statement on Right) */}
                  <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                    {/* Left: Prominent Official NIZA Group Logo */}
                    <div className="sm:col-span-6 flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-emerald-50/60 via-slate-50 to-white border border-emerald-100/60 shadow-2xs">
                      <img
                        src="/brands/niza-group-official.png"
                        alt="NIZA Group Official Logo"
                        className="h-9 sm:h-11 w-auto max-w-full object-contain drop-shadow-2xs"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* Right: Statement with Accent Line */}
                    <div className="sm:col-span-6 pl-1 sm:pl-2">
                      <div className="text-[11px] sm:text-xs font-black text-slate-800 tracking-wider uppercase leading-tight font-display">
                        INVESTING<br />
                        IN PEOPLE,<br />
                        PLACES AND<br />
                        COMMUNITIES
                      </div>
                      <div className="w-8 h-0.5 bg-[#16a34a] rounded-full mt-2" />
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* 4 Value Pillars Card */}
              <Reveal delay={100} variant="card">
                <div className="p-5 sm:p-6 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-4">
                  {/* Pillar 1 */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-full bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Users className="h-4.5 w-4.5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-tight">
                        Same Trusted Service
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        The same local teams you know
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2 */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-full bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <TrendingUp className="h-4.5 w-4.5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-tight">
                        Greater Investment
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Improved stores and facilities
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-full bg-[#dbeafe] text-[#2563eb] border border-[#bfdbfe] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Store className="h-4.5 w-4.5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-tight">
                        Expanded Network
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        More locations and convenience
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4 */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-full bg-[#fef3c7] text-[#d97706] border border-[#fde68a] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-tight">
                        A Brighter Future
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Supporting our communities
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          8. TEXACO BRIDGNORTH SERVICE STATION HIGHLIGHT SECTION
          Independent Milestone Feature with subtle ambient pastel accents,
          2-column showcase (Left: Forecourt photo, Right: Milestone card & details)
      ========================================================================= */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200/60 relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[420px] h-[420px] bg-emerald-100/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[460px] h-[460px] bg-red-100/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[420px] h-[420px] bg-emerald-50/40 rounded-full blur-3xl pointer-events-none" />

        <div className="container-page relative z-10 space-y-8 sm:space-y-10">
          {/* Top Row: Section Heading (Left) + Independent Texaco Brand Header (Right) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-2 border-b border-slate-100/80">
            {/* Left: Eyebrow + Main Heading + Supporting Text */}
            <div className="space-y-2 max-w-2xl">
              <Reveal delay={0}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-slate-800 text-[11px] font-extrabold uppercase tracking-widest shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LATEST MILESTONE</span>
                </div>
              </Reveal>

              <Reveal delay={60} variant="heading">
                <h2 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[42px] font-black text-slate-950 tracking-tight leading-[1.1] font-display uppercase">
                  <span className="text-primary">TEXACO </span>
                  <span>BRIDGNORTH SERVICE STATION</span>
                </h2>
              </Reveal>

              <Reveal delay={100}>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Quality fuel. Great value. A local stop you can rely on.
                </p>
              </Reveal>
            </div>

            {/* Right: Independent Texaco Branding & Tagline */}
            <Reveal delay={120}>
              <div className="flex items-center gap-5 sm:gap-7 self-start md:self-center shrink-0">
                {/* Texaco Logo */}
                <div className="flex flex-col items-center">
                  <img
                    src="/brands/texaco-logo.svg"
                    alt="Texaco"
                    className="h-20 sm:h-24 md:h-28 w-auto object-contain drop-shadow-xs"
                    loading="lazy"
                  />
                </div>

                {/* Vertical Divider */}
                <div className="h-16 sm:h-20 w-px bg-slate-200/90" />

                {/* Tagline with red underline */}
                <div className="flex flex-col justify-center">
                  <span className="text-sm sm:text-base font-black text-slate-900 tracking-wider uppercase leading-tight font-display">
                    FUELING <br />
                    STRONGER <br />
                    COMMUNITIES.
                  </span>
                  <div className="w-10 h-0.5 bg-primary rounded-full mt-2" />
                </div>
              </div>
            </Reveal>
          </div>

          {/* Main 2-Column Content: Left Forecourt Image + Right Milestone Card */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* LEFT COLUMN: Clean Realistic Texaco Forecourt Photograph */}
            <div className="lg:col-span-6 xl:col-span-6 flex">
              <Reveal delay={150} variant="image" className="w-full h-full">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.12)] bg-slate-100 group w-full h-full min-h-[340px] sm:min-h-[420px] lg:min-h-full">
                  <img
                    src="/texaco-bridgnorth-station.jpg"
                    alt="Texaco Bridgnorth Service Station forecourt"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>

            {/* RIGHT COLUMN: Milestone Card, Location Box, 4 Feature Pillars & CTA */}
            <div className="lg:col-span-6 xl:col-span-6 flex">
              <Reveal delay={200} className="w-full">
                <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 lg:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between space-y-6 h-full">
                  {/* Top: Acquired On Date + Title + Narrative */}
                  <div className="space-y-3.5">
                    {/* Date Pill */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-primary shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary leading-tight">
                          ACQUIRED ON
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                          19 March 2026
                        </div>
                      </div>
                    </div>

                    {/* Section Card Heading */}
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                      Texaco Bridgnorth Service Station
                    </h3>

                    {/* Detailed Acquisition Description */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                      We are delighted to announce the acquisition of Texaco Bridgnorth Service Station on 19 March 2026, marking another important milestone in our continued growth as one of the UK’s leading independent forecourt operators.
                    </p>
                  </div>

                  {/* Location Address & Phone Box */}
                  <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/70">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 text-xs sm:text-[13px]">
                      <div className="font-extrabold text-slate-900">
                        Texaco Bridgnorth Service Station
                      </div>
                      <div className="text-slate-600 font-medium">
                        Wyken, Bridgnorth, WV15 5NR
                      </div>
                      <div className="text-slate-500 font-medium flex items-center gap-1 pt-0.5 text-[11px] sm:text-xs">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>Phone: 01902 965364</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Supporting Feature Highlight Pillars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Pillar 1: Quality Fuel */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center space-y-1.5 flex flex-col items-center">
                      <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-2xs">
                        <Fuel className="h-4 w-4" />
                      </div>
                      <div className="font-black text-slate-900 text-xs">Quality Fuel</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Reliable fuel for everyday journeys
                      </div>
                    </div>

                    {/* Pillar 2: Convenience Store */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center space-y-1.5 flex flex-col items-center">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                        <Store className="h-4 w-4" />
                      </div>
                      <div className="font-black text-slate-900 text-xs">Convenience Store</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Everyday essentials and more
                      </div>
                    </div>

                    {/* Pillar 3: Easy Access */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center space-y-1.5 flex flex-col items-center">
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="font-black text-slate-900 text-xs">Easy Access</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Convenient location for local drivers
                      </div>
                    </div>

                    {/* Pillar 4: Local Community */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center space-y-1.5 flex flex-col items-center">
                      <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="font-black text-slate-900 text-xs">Local Community</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Proud to serve Bridgnorth
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Red Primary Button & Quote */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100">
                    <Link
                      to="/filling-stations"
                      className="px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.35)] inline-flex items-center justify-center gap-2 transition-all cursor-pointer group shrink-0"
                    >
                      <span>Learn More About Our Locations</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <div className="border-l-2 border-primary pl-3 py-0.5">
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-600 italic leading-snug">
                        “Supporting local communities for a brighter tomorrow.”
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PROUDLY PARTNERED WITH (CORPORATE PARTNERSHIPS SECTION)
          Featuring Calor, Air Liquide, and BOC in premium cards with high-res branding,
          capability tags, and direct product catalog links.
      ========================================================================= */}
      <section
        className="py-14 sm:py-20 lg:py-24 border-b border-slate-200/60 relative overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/partnerships-bg.png')",
        }}
      >
        {/* Soft light overlay so the background image is subtle & cards/text remain ultra-readable */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px] pointer-events-none" />

        <div className="container-page relative z-10 space-y-10 sm:space-y-14">
          {/* Section Header: Pill, Heading, Subtitle & Red Accent Bar */}
          <div className="text-center space-y-3.5 max-w-3xl mx-auto">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50/90 border border-red-200/70 text-red-700 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-2xs">
                <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                <span>TRUSTED BRANDS. STRONGER TOGETHER.</span>
              </div>
            </Reveal>

            <Reveal delay={60} variant="heading">
              <h2 className="text-2xl sm:text-3xl lg:text-[40px] xl:text-[44px] font-black tracking-tight leading-[1.1] font-display uppercase">
                <span className="text-slate-950">PROUDLY </span>
                <span className="text-primary">PARTNERED WITH</span>
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
                We’re proud to work with trusted gas and energy brands, delivering reliable products and services to our customers.
              </p>
            </Reveal>

            <Reveal delay={140}>
              <div className="w-12 h-1 bg-primary rounded-full mx-auto mt-2" />
            </Reveal>
          </div>

          {/* Three Premium Brand Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 items-stretch">
            {/* BRAND 1: CALOR */}
            <Reveal delay={150} variant="card" className="flex">
              <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 sm:p-7 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(220,38,38,0.08)] hover:border-red-200/90 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                {/* Ambient corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/40 via-red-50/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="space-y-4 sm:space-y-5">
                  {/* Brand Logo Header */}
                  <div className="flex items-center min-h-[90px] sm:min-h-[105px] md:min-h-[115px]">
                    <img
                      src="/brands/calor-partner-logo.png"
                      alt="Calor"
                      className="h-16 sm:h-20 md:h-22 lg:h-24 w-auto max-w-[260px] sm:max-w-[290px] md:max-w-[320px] object-contain shrink-0 mix-blend-multiply select-none"
                      loading="lazy"
                    />
                  </div>

                  {/* Brand Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Calor is one of the UK’s leading suppliers of LPG, providing reliable and efficient energy for homes, businesses and rural communities.
                  </p>

                  {/* 3 Capability Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Home className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>Home Heating</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>Business Energy</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Sprout className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Cleaner Tomorrow</span>
                    </span>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <Button
                    asChild
                    className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Link
                      to="/order-gas"
                      search={{ brand: "Calor" }}
                    >
                      <span>View Products</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>

            {/* BRAND 2: AIR LIQUIDE */}
            <Reveal delay={200} variant="card" className="flex">
              <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 sm:p-7 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(220,38,38,0.08)] hover:border-red-200/90 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                {/* Ambient corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-100/40 via-red-50/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="space-y-4 sm:space-y-5">
                  {/* Brand Logo Header */}
                  <div className="flex items-center min-h-[90px] sm:min-h-[105px] md:min-h-[115px]">
                    <img
                      src="/brands/air-liquide-partner.png"
                      alt="Air Liquide"
                      className="h-16 sm:h-20 md:h-22 lg:h-24 w-auto max-w-[260px] sm:max-w-[290px] md:max-w-[320px] object-contain shrink-0 mix-blend-multiply select-none"
                      loading="lazy"
                    />
                  </div>

                  {/* Brand Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Air Liquide supplies industrial and specialty gases with a focus on innovation, safety and sustainability across multiple sectors.
                  </p>

                  {/* 3 Capability Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Settings className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>Industrial Gases</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Innovative Solutions</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Sprout className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Sustainable Future</span>
                    </span>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <Button
                    asChild
                    className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Link
                      to="/order-gas"
                      search={{ brand: "Air Liquide" }}
                    >
                      <span>View Products</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>

            {/* BRAND 3: BOC */}
            <Reveal delay={250} variant="card" className="flex">
              <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 sm:p-7 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(220,38,38,0.08)] hover:border-red-200/90 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                {/* Ambient corner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/40 via-red-50/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="space-y-4 sm:space-y-5">
                  {/* Brand Logo Header */}
                  <div className="flex items-center min-h-[90px] sm:min-h-[105px] md:min-h-[115px]">
                    <img
                      src="/brands/boc-logo.svg"
                      alt="BOC - A Linde company"
                      className="h-16 sm:h-20 md:h-22 lg:h-24 w-auto max-w-[260px] sm:max-w-[290px] md:max-w-[320px] object-contain shrink-0 select-none"
                      loading="lazy"
                    />
                  </div>

                  {/* Brand Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    BOC is a trusted name in industrial, medical and specialty gases, delivering high-quality solutions for a safer and more productive tomorrow.
                  </p>

                  {/* 3 Capability Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>Medical Gases</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Settings className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>Industrial Solutions</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs font-semibold text-slate-700">
                      <Sprout className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>A Cleaner, Safer World</span>
                    </span>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <Button
                    asChild
                    className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Link
                      to="/order-gas"
                      search={{ category: "boc-gases" }}
                    >
                      <span>View Products</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Section Footer: "Stronger Together" motif */}
          <Reveal delay={300}>
            <div className="pt-6 sm:pt-8 text-center space-y-2">
              <div className="text-2xl sm:text-3xl font-serif italic text-slate-400 font-light select-none tracking-wide">
                Stronger Together
              </div>
              <div className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
                <span className="h-px w-10 sm:w-16 bg-slate-200" />
                <span>PEOPLE • PARTNERSHIPS • A CLEANER BRITAIN</span>
                <span className="h-px w-10 sm:w-16 bg-slate-200" />
              </div>
            </div>
          </Reveal>
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
                    Unlike generic couriers, our dedicated delivery drivers are certified hazardous
                    goods specialists who understand the unique access needs of countryside
                    driveways, farms, and residential gardens.
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
                      Our drivers know the roads, villages and rural properties across the area,
                      helping every delivery arrive safely and efficiently.
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>Built around your needs.</span>
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed pl-3.5">
                      From planned deliveries to urgent top-ups, our team is focused on dependable
                      service and straightforward communication.
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
                Visit any of our Gloucestershire service stations for road fuels, Autogas LPG,
                bottle exchange, and convenience groceries.
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
                  defaultImg: "/fromebridge-service-station-1.jpg",
                },
                {
                  badgeBg: "bg-emerald-50",
                  badgeText: "text-emerald-600",
                  badgeBorder: "border-emerald-100",
                  btnBorder: "border-emerald-200 hover:border-emerald-600",
                  btnText: "text-emerald-700",
                  btnHoverBg: "hover:bg-emerald-600",
                  btnHoverText: "hover:text-white",
                  defaultImg: "/wild-goose-garage-1.jpg",
                },
                {
                  badgeBg: "bg-sky-50",
                  badgeText: "text-sky-600",
                  badgeBorder: "border-sky-100",
                  btnBorder: "border-sky-200 hover:border-sky-600",
                  btnText: "text-sky-700",
                  btnHoverBg: "hover:bg-sky-600",
                  btnHoverText: "hover:text-white",
                  defaultImg: "/bridge-station-forecourt.jpg",
                },
              ];
              const style = styles[idx % styles.length];
              const stationImagesMap: Record<string, string> = {
                "Fromebridge Service Station": "/fromebridge-service-station-1.jpg",
                "Wild Goose Garage": "/wild-goose-garage-1.jpg",
                "Bridge Service Station": "/bridge-station-forecourt.jpg",
              };
              const getStationImage = (name: string, fallback: string) => {
                if (!name) return fallback;
                const lower = name.toLowerCase();
                if (lower.includes("fromebridge")) return "/fromebridge-service-station-1.jpg";
                if (lower.includes("wild goose")) return "/wild-goose-garage-1.jpg";
                if (lower.includes("bridge")) return "/bridge-station-forecourt.jpg";
                return stationImagesMap[name] || fallback;
              };
              const imgSrc = getStationImage(stn.name, stn.image_url || style.defaultImg);

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
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                        {/* Station Icon & Title Row */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className={`h-7 w-7 sm:h-9 sm:w-9 rounded-lg ${style.badgeBg} ${style.badgeText} flex items-center justify-center shrink-0 border ${style.badgeBorder}`}
                          >
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
                    Local service.
                    <br />
                    Honest advice.
                    <br />
                    <span className="text-primary">Dependable delivery.</span>
                  </h2>
                </Reveal>
              </div>

              <Reveal delay={160}>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Since 1972, our commitment has stayed constant: providing Gloucestershire with
                  honest pricing, certified energy supply, and personal support that large national
                  call centres cannot match.
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
                      <div className="text-center space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 shadow-2xs hover:bg-white hover:border-slate-200 transition-all duration-200 h-full flex flex-col justify-between">
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
              {/* 1. Large Horizontal Rectangular Image at Top: JSS Engineer Home Visit */}
              <Reveal delay={120} variant="image">
                <div className="rounded-[12px] sm:rounded-[14px] overflow-hidden border border-slate-200/90 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.12)] bg-slate-50 relative aspect-[16/9.5] sm:aspect-[16/9.2] w-full group">
                  <img
                    src="/our-promise-service-visit.jpg"
                    alt="John Stayte Services professional gas engineer advising a Gloucestershire homeowner"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 rounded-none"
                    loading="lazy"
                  />
                </div>
              </Reveal>

              {/* 2. Three Supporting Images Below in One Horizontal Row */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                {/* Image 1: Bottom-left — Home Heating */}
                <Reveal delay={200} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-home-heating.jpg"
                      alt="Comfortable UK home interior with modern column radiator home heating"
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 rounded-none"
                      loading="lazy"
                    />
                  </div>
                </Reveal>

                {/* Image 2: Bottom-middle — Wood & Solid Fuel */}
                <Reveal delay={280} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-wood-stove.jpg"
                      alt="Cosy Cotswold fireplace with wood-burning stove and firewood logs"
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 rounded-none"
                      loading="lazy"
                    />
                  </div>
                </Reveal>

                {/* Image 3: Bottom-right — Gas & Cooking */}
                <Reveal delay={360} variant="image">
                  <div className="rounded-[10px] sm:rounded-[12px] overflow-hidden border border-slate-200/80 shadow-2xs aspect-[4/3] bg-slate-50 group">
                    <img
                      src="/our-promise-gas-hob.jpg"
                      alt="Contemporary kitchen gas hob with clean burning blue flame"
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
                  Speak with our Gloucestershire customer support team today or order online for
                  prompt doorstep delivery.
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
