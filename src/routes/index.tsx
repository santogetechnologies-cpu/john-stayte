import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { OrderGasShopByCategory } from "@/components/site/OrderGasShopByCategory";
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
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Fuel,
  Car,
  MessageSquare,
  Package,
  Phone,
  Navigation,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  CalendarDays,
  User,
  Sparkles,
  ThumbsUp,
  Headphones,
  Users,
  Heart,
  Award,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  Mail,
} from "lucide-react";
import { SiteLayout, SectionHead } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { gbp, useStore } from "@/lib/store";
import { toast } from "sonner";
import { cn, cleanImageUrl } from "@/lib/utils";
import { stations, testimonials, categories as defaultCategories } from "@/data/catalog";
import { blogArticles } from "@/data/blog";
import hero from "@/assets/hero-delivery.jpg";
import stationImg from "@/assets/station.jpg";
import stationWildGooseBP from "@/assets/station-wild-goose-bp.png";
import stationBridge76 from "@/assets/station-bridge-76.png";
import coalLogs from "@/assets/coal-logs.jpg";
import bbqPro3 from "@/assets/char_broil_professionalpro3_1.jpg";
import truckImg from "@/assets/image-3.png";
import doorstepDeliveryImg from "@/assets/doorstep-gas-delivery.jpg";
import { FeaturedSafetyGuide } from "@/components/site/FeaturedSafetyGuide";
import { CalorBusinessHighlightSection } from "@/components/site/CalorBusinessHighlightSection";
import { TexacoForecourtHighlightSection } from "@/components/site/TexacoForecourtHighlightSection";
import cylinderImg from "@/assets/image-2.png";
import heaterImg from "@/assets/image-4.png";
import baitsImg from "@/assets/fishing-baits.jpg";
import animalFeedImg from "@/assets/animal-feed-cat.jpg";
import gardenImg from "@/assets/garden-cat.jpg";
import foodImg from "@/assets/food-cat.jpg";
import trailersImg from "@/assets/trailers-cat.jpg";
import workwearImg from "@/assets/workwear-cat.jpg";
import calorCylindersStudio from "@/assets/calor-cylinders-studio.jpg";
import guideSafeStorage from "@/assets/guide-safe-storage.jpg";
import guidePropaneVsButane from "@/assets/guide-propane-vs-butane.jpg";
import supportPersonImg from "@/assets/support-person.jpg";
import guideSmokelessFuel from "@/assets/guide-smokeless-fuel.jpg";
import { supabase } from "@/lib/supabase";

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
  Flame,
  Logs,
  Fish,
  Dog,
  CookingPot,
  Wrench,
  Sprout,
  Utensils,
  Truck,
  Shirt,
};

function TestimonialsCarousel({ customItems }: { customItems?: any[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    duration: 25,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay every 1000ms (1 second)
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      if (!isHovered) {
        emblaApi.scrollNext();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [emblaApi, isHovered]);

  const fallbackItems = [
    {
      name: "James Claret",
      role: "Operations Director",
      quote:
        "John Stayte Services has been our trusted fuel supplier for over five years. Their reliable delivery and excellent customer service make them an essential partner for our business.",
    },
    {
      name: "Rachel Morgan",
      role: "Facilities Manager",
      quote:
        "We've been working with John Stayte Services for all our heating and cooking gas needs. Their team is professional, efficient, and always goes the extra mile.",
    },
    {
      name: "Andrew Bennett",
      role: "Customer Contract Specialist",
      quote:
        "Exceptional service, competitive prices, and prompt deliveries every time. John Stayte Services is our go-to partner for all our gas requirements.",
    },
    {
      name: "Sarah H.",
      role: "Residential Client, Frampton on Severn",
      quote:
        "Ordered 19kg propane at 9am and it was on the doorstep the next morning. Faultless service and dependable direct delivery across Gloucestershire.",
    },
    {
      name: "The Bell Inn",
      role: "Hospitality Partner, Stroud",
      quote:
        "Our cellar gas has never run out since switching to JSS. The scheduled automated deliveries and local reliability are spot on every time.",
    },
    {
      name: "Mark T.",
      role: "Agricultural Partner, Cam",
      quote:
        "Coal, kiln-dried logs, and animal feed all in one scheduled delivery. Saves our farm team multiple supply trips every single week.",
    },
  ];

  const items = customItems && customItems.length > 0 ? customItems : fallbackItems;

  return (
    <div
      className="relative px-2 sm:px-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Navigation Arrows */}
      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-slate-200/80 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all hover:scale-105"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-slate-200/80 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all hover:scale-105"
        aria-label="Next testimonial"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Carousel Viewport */}
      <div ref={emblaRef} className="overflow-hidden py-1">
        <div className="flex -ml-4 sm:-ml-5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="min-w-0 shrink-0 grow-0 pl-4 sm:pl-5 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <ScrollRevealItem delay={idx * 100} variant="card" className="h-full">
                <div className="h-full bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-8 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {/* Stylized Red Quote Marks */}
                    <div className="text-primary text-4xl sm:text-5xl font-serif font-black leading-none select-none mb-3">
                      “
                    </div>
                    {/* Quote Body */}
                    <p className="text-sm sm:text-[14.5px] font-medium text-slate-700 leading-relaxed">
                      {typeof item.quote === "string" ? item.quote : String(item.quote || "")}
                    </p>
                  </div>

                  <div>
                    {/* Subtle Divider */}
                    <div className="border-t border-slate-100 my-5" />
                    {/* Customer Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 fill-slate-400 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                          {typeof item.name === "string" ? item.name : String(item.name || "")}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {typeof item.role === "string" ? item.role : String(item.role || "")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollRevealItem>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pt-6 sm:pt-7">
        {scrollSnaps.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => emblaApi?.scrollTo(idx)}
            className={cn(
              "rounded-full transition-all duration-300",
              selectedIndex === idx
                ? "w-2.5 h-2.5 bg-primary scale-110"
                : "w-2 h-2 bg-slate-300 hover:bg-slate-400",
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function BlogCarousel({ posts }: { posts: any[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    duration: 25,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative px-2 sm:px-4">
      {/* Floating Navigation Arrows */}
      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-slate-200/80 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all hover:scale-105"
        aria-label="Previous articles"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-slate-200/80 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all hover:scale-105"
        aria-label="Next articles"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Carousel Viewport */}
      <div ref={emblaRef} className="overflow-hidden py-1">
        <div className="flex -ml-4 sm:-ml-5">
          {posts.map((post, idx) => (
            <div
              key={post.slug}
              className="min-w-0 shrink-0 grow-0 pl-4 sm:pl-5 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <ScrollRevealItem delay={idx * 100} variant="card" className="h-full">
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="group h-full bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Top Image */}
                    <div className="h-48 sm:h-52 w-full relative overflow-hidden bg-slate-100">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <span className="absolute top-3.5 left-3.5 rounded-full bg-white/95 backdrop-blur-xs px-3 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary shadow-2xs">
                        {typeof post.tag === "string" ? post.tag : "Safety Guide"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 sm:p-6 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Clock className="h-3.5 w-3.5 text-primary" />{" "}
                          {typeof post.readingTime === "string" ? post.readingTime : "4 min read"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(post.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug tracking-tight">
                        {typeof post.title === "string" ? post.title : String(post.title || "")}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-slate-500 line-clamp-3 leading-relaxed">
                        {typeof post.excerpt === "string"
                          ? post.excerpt
                          : String(post.excerpt || "")}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1">
                    <span className="text-xs sm:text-sm font-bold text-primary flex items-center justify-between group-hover:gap-2 transition-all">
                      <span>Read guide</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </ScrollRevealItem>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pt-6 sm:pt-7">
        {scrollSnaps.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => emblaApi?.scrollTo(idx)}
            className={cn(
              "rounded-full transition-all duration-300",
              selectedIndex === idx
                ? "w-2.5 h-2.5 bg-primary scale-110"
                : "w-2 h-2 bg-slate-300 hover:bg-slate-400",
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

import { ALL_BRANDS } from "@/data/brands";

function TrustedBrandsSection() {
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
    <section ref={ref} className="py-10 sm:py-14 md:py-16 bg-white border-b border-slate-200/60">
      <div className="container-page space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div
          className="text-center space-y-3 max-w-2xl mx-auto"
          style={{
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? "translateY(0px) scale(1)" : "translateY(24px) scale(0.98)",
            transitionProperty: "opacity, transform",
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform, opacity",
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/80 bg-red-50/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 shadow-2xs">
            <Award className="h-3.5 w-3.5 text-red-500" /> OFFICIAL STOCKIST
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display">
            All Brands <span className="text-primary">– Shop by Brand</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Trusted Names, Quality Products – browse products across all 31 certified partner brands.
          </p>
        </div>

        {/* 31 Brand Logo Cards in balanced 6-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {ALL_BRANDS.map((brand, idx) => (
            <div
              key={`${brand.id}-${idx}`}
              className="h-full"
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? "translateY(0px) scale(1)" : "translateY(20px) scale(0.98)",
                transitionProperty: "opacity, transform",
                transitionDuration: "400ms",
                transitionDelay: isRevealed ? `${Math.min(idx * 30, 600)}ms` : "0ms",
                willChange: "transform, opacity",
              }}
            >
              <Link
                to="/order-gas"
                search={{ brand: brand.name }}
                className="group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-red-200 hover:-translate-y-1 transition-all duration-300 ease-out text-center cursor-pointer select-none h-full overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-full flex-1 flex items-center justify-center min-h-[56px] sm:min-h-[64px] px-1">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-12 max-w-[120px] sm:max-w-[130px] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2 w-full pt-1 border-t border-slate-100">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors tracking-tight truncate block">
                    {brand.name}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const RevealContext = createContext<boolean>(false);

function ScrollRevealSection({
  children,
  className = "",
  immediate = false,
  threshold = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  immediate?: boolean;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(immediate);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      setIsRevealed(true);
      return;
    }

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
            if (entry.isIntersecting || entry.intersectionRatio >= 0.1) {
              setIsRevealed(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: [0.08, threshold],
          rootMargin: "0px 0px -25px 0px",
        },
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsRevealed(true);
    }
  }, [immediate, threshold]);

  const initialTransform = isMobile
    ? "translateY(25px) scale(0.99)"
    : "translateY(45px) scale(0.98)";

  const duration = isMobile ? "550ms" : "750ms";

  return (
    <RevealContext.Provider value={isRevealed}>
      <div
        ref={ref}
        className={className}
        style={{
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed ? "translateY(0px) scale(1)" : initialTransform,
          transitionProperty: "opacity, transform",
          transitionDuration: duration,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </div>
    </RevealContext.Provider>
  );
}

function ScrollRevealItem({
  children,
  className = "",
  delay = 0,
  variant = "card",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "card" | "heading" | "image" | "pill" | "eyebrow" | "description" | "cta";
}) {
  const isSectionRevealed = useContext(RevealContext);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, []);

  const initialTransform =
    variant === "eyebrow"
      ? isMobile
        ? "translateY(10px)"
        : "translateY(14px)"
      : variant === "heading"
        ? isMobile
          ? "translateY(16px)"
          : "translateY(24px)"
        : variant === "description" || variant === "cta"
          ? isMobile
            ? "translateY(14px)"
            : "translateY(20px)"
          : variant === "image"
            ? isMobile
              ? "scale(1.02)"
              : "scale(1.03)"
            : variant === "pill"
              ? "translateY(12px) scale(0.97)"
              : isMobile
                ? "translateY(20px) scale(0.98)"
                : "translateY(30px) scale(0.96)";

  const duration =
    variant === "eyebrow" || variant === "heading"
      ? isMobile
        ? "500ms"
        : "600ms"
      : variant === "description" || variant === "cta"
        ? isMobile
          ? "520ms"
          : "620ms"
        : variant === "image"
          ? isMobile
            ? "550ms"
            : "700ms"
          : isMobile
            ? "520ms"
            : "600ms";

  const effectiveDelay = isMobile ? Math.round(delay * 0.75) : delay;

  return (
    <div
      className={className}
      style={{
        opacity: isSectionRevealed ? 1 : 0,
        transform: isSectionRevealed ? "translateY(0px) scale(1)" : initialTransform,
        transitionProperty: "opacity, transform",
        transitionDuration: duration,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${effectiveDelay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "section",
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "section" | "card" | "heading" | "image" | "pill" | "eyebrow" | "description" | "cta";
  immediate?: boolean;
}) {
  if (variant === "section") {
    return (
      <ScrollRevealSection className={className} immediate={immediate}>
        {children}
      </ScrollRevealSection>
    );
  }
  return (
    <ScrollRevealItem className={className} delay={delay} variant={variant}>
      {children}
    </ScrollRevealItem>
  );
}

const safeStr = (val: any, fallback = ""): string => {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return fallback;
};

function Home() {
  const navigate = useNavigate();
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>(defaultCategories);
  const [dbBlogPosts, setDbBlogPosts] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  const [homeData, setHomeData] = useState<any>({
    heroEyebrow: "Family run since 1972",
    heroHeading: "Order your gas delivery with us today.",
    heroSubtitle:
      "Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and delivered across Gloucestershire by a team you can actually call.",
    deliveryBadge: "Next-Day Local Delivery Available",
    primaryCtaText: "Order Gas Online",
    primaryCtaLink: "/order-gas",
    secondaryCtaText: "Browse Full Shop",
    secondaryCtaLink: "/products",
  });
  const [dbStations, setDbStations] = useState<any[]>(stations);
  const [dbTestimonials, setDbTestimonials] = useState<any[]>(testimonials);
  const [dbServices, setDbServices] = useState<any[]>([]);

  useEffect(() => {
    async function loadHomeData() {
      setLoadingCats(true);
      try {
        const [
          { data: prodData },
          { data: catData },
          { data: blogData },
          { data: homeBlock },
          { data: stnBlock },
          { data: testBlock },
          { data: srvBlock },
        ] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
          supabase
            .from("cms_blog_posts")
            .select("*")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "home_data")
            .maybeSingle(),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "stations_data")
            .maybeSingle(),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "testimonials_data")
            .maybeSingle(),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "services_data")
            .maybeSingle(),
        ]);

        if (prodData) {
          const mapped = prodData.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand || "Calor",
            category: p.category_slug || "gas",
            sub: p.subcategory || "General",
            price: Number(p.price),
            compareAt: p.compare_at_price ? Number(p.compare_at_price) : undefined,
            stock: Number(p.stock || 0),
            image: cleanImageUrl(p.image_url, p.slug),
            rating: Number(p.rating || 5.0),
            reviews: Number(p.reviews_count || 0),
            featured: Boolean(p.is_featured),
            offer: Boolean(p.is_offer),
            description: p.description || "",
            specs: p.specs || {},
          }));
          setDbProducts(mapped);
        }

        if (catData && catData.length > 0) {
          // Merge with defaultCategories so trailers and workwear from catalog are always available
          const existingSlugs = new Set(catData.map((c: any) => c.slug));
          const missingDefaults = defaultCategories.filter((dc) => !existingSlugs.has(dc.slug));
          setDbCategories([...catData, ...missingDefaults]);
        } else {
          setDbCategories(defaultCategories);
        }

        if (blogData && blogData.length > 0) {
          setDbBlogPosts(blogData);
        }

        if (homeBlock?.content) {
          try {
            const parsed = JSON.parse(homeBlock.content);
            if (parsed && typeof parsed === "object") {
              setHomeData((prev: any) => {
                const updated = { ...prev, ...parsed };
                // Preserve approved defaults only if CMS field is empty or blank
                if (!parsed.heroEyebrow?.trim()) updated.heroEyebrow = prev.heroEyebrow;
                if (!parsed.heroHeading?.trim()) updated.heroHeading = prev.heroHeading;
                if (!parsed.heroSubtitle?.trim()) updated.heroSubtitle = prev.heroSubtitle;
                return updated;
              });
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

        if (testBlock?.content) {
          try {
            const parsedTests = JSON.parse(testBlock.content);
            const testList = Array.isArray(parsedTests)
              ? parsedTests
              : (Array.isArray(parsedTests?.reviews) ? parsedTests.reviews : []);
            if (testList.length > 0) {
              setDbTestimonials(testList);
            }
          } catch { }
        }

        if (srvBlock?.content) {
          try {
            const parsedServices = JSON.parse(srvBlock.content);
            const serviceList = Array.isArray(parsedServices)
              ? parsedServices
              : (Array.isArray(parsedServices?.services) ? parsedServices.services : []);
            if (serviceList.length > 0) {
              setDbServices(serviceList.filter((s: any) => s.status !== "Inactive"));
            }
          } catch { }
        }
      } catch (err) {
        console.error("Home load data error:", err);
      } finally {
        setLoadingCats(false);
      }
    }
    loadHomeData();

    const handleUpdate = () => loadHomeData();
    window.addEventListener("cms_home_updated", handleUpdate);
    window.addEventListener("cms_stations_updated", handleUpdate);
    window.addEventListener("cms_testimonials_updated", handleUpdate);
    window.addEventListener("cms_services_updated", handleUpdate);
    return () => {
      window.removeEventListener("cms_home_updated", handleUpdate);
      window.removeEventListener("cms_stations_updated", handleUpdate);
      window.removeEventListener("cms_testimonials_updated", handleUpdate);
      window.removeEventListener("cms_services_updated", handleUpdate);
    };
  }, []);

  const { addToCart, wishlist, toggleWishlist } = useStore();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("popular");
  const [catalogPage, setCatalogPage] = useState<number>(0);

  const featured = dbProducts.slice(0, 8);

  const filteredCatalogProducts = useMemo(() => {
    let prods = [...dbProducts];
    if (selectedCategoryFilter !== "all") {
      prods = prods.filter((p) => p.category === selectedCategoryFilter);
    }
    if (selectedSort === "price-low") {
      prods.sort((a, b) => a.price - b.price);
    } else if (selectedSort === "price-high") {
      prods.sort((a, b) => b.price - a.price);
    } else if (selectedSort === "rating") {
      prods.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return prods;
  }, [dbProducts, selectedCategoryFilter, selectedSort]);

  const displayedCatalogProducts = useMemo(() => {
    const startIndex = catalogPage * 2;
    return filteredCatalogProducts.slice(startIndex, startIndex + 2);
  }, [filteredCatalogProducts, catalogPage]);

  // Extract unique brands dynamically from real database products
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    dbProducts.forEach((p) => {
      if (p.brand && typeof p.brand === "string" && p.brand.trim().length > 0) {
        brandSet.add(p.brand.trim());
      }
    });
    return Array.from(brandSet).sort();
  }, [dbProducts]);

  // Display blog posts from CMS if available, otherwise fallback to rich blogArticles
  const displayBlogPosts = useMemo(() => {
    if (dbBlogPosts.length > 0) {
      return dbBlogPosts.map((post) => {
        const found = blogArticles.find((a) => a.slug === post.slug);
        const rawExcerpt = post.excerpt || found?.excerpt || "";
        return {
          slug: typeof post.slug === "string" ? post.slug : String(post.slug || ""),
          title: typeof post.title === "string" ? post.title : String(post.title || ""),
          excerpt: typeof rawExcerpt === "string" ? rawExcerpt : String(rawExcerpt || ""),
          date: post.created_at,
          image:
            typeof post.image_url === "string"
              ? post.image_url
              : found?.heroImage || guideSafeStorage,
          tag: typeof found?.tag === "string" ? found!.tag : "Safety Guide",
          readingTime: typeof found?.readingTime === "string" ? found!.readingTime : "4 min read",
        };
      });
    }
    return blogArticles.map((post) => ({
      slug: typeof post.slug === "string" ? post.slug : String(post.slug || ""),
      title: typeof post.title === "string" ? post.title : String(post.title || ""),
      excerpt: typeof post.excerpt === "string" ? post.excerpt : String(post.excerpt || ""),
      date: post.date,
      image: post.heroImage,
      tag: typeof post.tag === "string" ? post.tag : "Safety Guide",
      readingTime: typeof post.readingTime === "string" ? post.readingTime : "4 min read",
    }));
  }, [dbBlogPosts]);

  const [heroMounted, setHeroMounted] = useState(false);

  useEffect(() => {
    // Trigger page-load entrance immediately on mount
    const timer = setTimeout(() => {
      setHeroMounted(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  // Typewriter animation for home hero heading: "Order your gas delivery with us today."
  const targetHeroHeading =
    typeof homeData?.heroHeading === "string" && homeData.heroHeading.trim()
      ? homeData.heroHeading
      : "Order your gas delivery with us today.";

  const [typedHeadingCount, setTypedHeadingCount] = useState<number>(0);

  useEffect(() => {
    // Start typing smoothly after hero begins mounting
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        setTypedHeadingCount((prev) => {
          if (prev < targetHeroHeading.length) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 50);

      return () => clearInterval(interval);
    }, 280);

    return () => clearTimeout(startDelay);
  }, [targetHeroHeading]);

  return (
    <SiteLayout footerClassName="mt-0">
      {/* =========================================================================
          HERO — ORIGINAL TRUCK HERO (Restored)
      ========================================================================= */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src={hero}
          alt="John Stayte Services gas delivery lorry in the Gloucestershire countryside"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/20" />
        <div className="container-page relative grid gap-10 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div
            style={{
              opacity: heroMounted ? 1 : 0,
              transform: heroMounted ? "translateY(0px) scale(1)" : "translateY(25px) scale(0.99)",
              transitionProperty: "opacity, transform",
              transitionDuration: "700ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform, opacity",
            }}
          >
            {/* Badge */}
            <div
              style={{
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? "translateY(0px)" : "translateY(15px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "600ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: "50ms",
              }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="h-2 w-2 rounded-full bg-primary" />{" "}
                {typeof homeData?.heroEyebrow === "string" && homeData.heroEyebrow.trim()
                  ? homeData.heroEyebrow
                  : "Family run since 1972"}
              </span>
            </div>

            {/* Heading with smooth Typewriter animation */}
            <div className="relative mt-6">
              {/* Invisible Ghost element: Locks exact height and line breaks to prevent any layout shift */}
              <h1
                aria-hidden="true"
                className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl text-transparent opacity-0 pointer-events-none select-none"
              >
                {targetHeroHeading.includes("gas delivery") ? (
                  <>
                    {targetHeroHeading.split("gas delivery")[0]}
                    <span className="text-primary">gas delivery</span>
                    {targetHeroHeading.split("gas delivery")[1]}
                  </>
                ) : (
                  targetHeroHeading
                )}
              </h1>

              {/* Real Typewriter Animated Heading */}
              <h1
                className="absolute top-0 left-0 right-0 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl text-white"
                style={{
                  opacity: heroMounted ? 1 : 0,
                  transform: heroMounted ? "translateY(0px)" : "translateY(20px)",
                  transitionProperty: "opacity, transform",
                  transitionDuration: "650ms",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: "150ms",
                }}
              >
                {(() => {
                  const gasIdx = targetHeroHeading.indexOf("gas delivery");
                  if (gasIdx !== -1) {
                    const gasEnd = gasIdx + "gas delivery".length;
                    const p1 = targetHeroHeading.slice(0, Math.min(typedHeadingCount, gasIdx));
                    const p2 =
                      typedHeadingCount > gasIdx
                        ? targetHeroHeading.slice(gasIdx, Math.min(typedHeadingCount, gasEnd))
                        : "";
                    const p3 =
                      typedHeadingCount > gasEnd ? targetHeroHeading.slice(gasEnd, typedHeadingCount) : "";
                    return (
                      <>
                        {p1}
                        {p2 && <span className="text-primary">{p2}</span>}
                        {p3}
                      </>
                    );
                  }
                  return targetHeroHeading.slice(0, typedHeadingCount);
                })()}
                {typedHeadingCount > 0 && typedHeadingCount < targetHeroHeading.length && (
                  <span
                    className="inline-block w-[3px] sm:w-[4px] h-[0.85em] bg-primary ml-1 align-baseline rounded-sm animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </h1>
            </div>

            {/* Description */}
            <p
              className="mt-5 max-w-xl text-base text-white/75 md:text-lg"
              style={{
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? "translateY(0px)" : "translateY(20px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "650ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: "250ms",
              }}
            >
              {typeof homeData?.heroSubtitle === "string" && homeData.heroSubtitle.trim()
                ? homeData.heroSubtitle
                : "Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and delivered across Gloucestershire by a team you can actually call."}
            </p>

            {/* CTA Buttons */}
            <div
              className="mt-8 flex flex-wrap items-center gap-4"
              style={{
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? "translateY(0px)" : "translateY(20px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "650ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: "350ms",
              }}
            >
              <Button
                asChild
                size="lg"
                className="rounded-full px-7 bg-primary hover:bg-primary/90 text-white shadow-md"
              >
                <Link to={homeData?.primaryCtaLink || "/order-gas"}>
                  {homeData?.primaryCtaText || "Order gas online"}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 bg-black/20 text-white hover:bg-white/10"
              >
                <Link to={homeData?.secondaryCtaLink || "/products"}>
                  {homeData?.secondaryCtaText || "Browse the shop"}
                </Link>
              </Button>
            </div>

            {/* Stats Items */}
            <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 max-w-xl lg:max-w-2xl">
              {[
                { k: "50+", v: "Years trading", icon: ShieldCheck },
                { k: "3", v: "Filling stations", icon: Fuel },
                { k: "4", v: "Auto gas stations", icon: Car },
                { k: "40mi", v: "Delivery radius", icon: MapPin },
              ].map((s, idx) => (
                <div
                  key={s.v}
                  style={{
                    opacity: heroMounted ? 1 : 0,
                    transform: heroMounted
                      ? "translateY(0px) scale(1)"
                      : "translateY(20px) scale(0.96)",
                    transitionProperty: "opacity, transform",
                    transitionDuration: "600ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: `${450 + idx * 80}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <s.icon className="h-6 w-6 text-primary shrink-0 stroke-[1.75]" />
                    <div>
                      <dt className="font-display text-2xl font-extrabold text-white leading-none">
                        {s.k}
                      </dt>
                      <dd className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/60 leading-tight">
                        {s.v}
                      </dd>
                    </div>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1 — QUICK ACTIONS / HOW CAN WE HELP TODAY? (Strict Reference Rebuild)
      ========================================================================= */}
      <section className="pt-8 pb-5 sm:pt-10 sm:pb-6 bg-[#f7f8fa] border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection>
            <div className="rounded-[28px] md:rounded-[36px] border border-slate-200/80 bg-white p-5 sm:p-8 lg:p-9 shadow-sm space-y-6 sm:space-y-8">
              {/* Section Header */}
              <ScrollRevealItem variant="heading" delay={0}>
                <div className="max-w-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-6 bg-primary rounded-full inline-block" />
                    <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                      QUICK SERVICES
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    How Can We Help <span className="text-primary">Today?</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-0.5">
                    Select an action to order fuels, browse our local catalogue, find forecourts or
                    speak with our team.
                  </p>
                </div>
              </ScrollRevealItem>

              {/* 4 Service Cards Grid */}
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                {[
                  {
                    title: "Order Gas",
                    badge: "BOTTLED GAS & CYLINDERS",
                    description:
                      "Calor butane, propane & patio gas cylinders delivered direct to your door across Gloucestershire.",
                    cta: "Order Gas Online",
                    to: "/order-gas" as const,
                    image: truckImg,
                    icon: Fuel,
                  },
                  {
                    title: "Shop Products",
                    badge: "MASTER CATALOGUE",
                    description:
                      "Browse our complete range of solid fuels, animal feed, baits, BBQ appliances & genuine spares.",
                    cta: "Browse Catalogue",
                    to: "/products" as const,
                    image: coalLogs,
                    icon: ShoppingBag,
                  },
                  {
                    title: "Find a Station",
                    badge: "3 FORECOURTS OPEN 7 DAYS",
                    description:
                      "Visit our service stations in Dursley, Whitminster & Stonehouse for fuel, autogas & gas swap.",
                    cta: "View Locations",
                    to: "/filling-stations" as const,
                    image: stationImg,
                    icon: MapPin,
                  },
                  {
                    title: "Help & Support",
                    badge: "LOCAL DIRECT CARE",
                    description:
                      "Speak directly with our Gloucestershire team for technical advice, delivery updates and enquiries.",
                    cta: "Get in Touch",
                    to: "/contact" as const,
                    image: supportPersonImg,
                    icon: MessageSquare,
                  },
                ].map((action, idx) => (
                  <ScrollRevealItem
                    key={action.title}
                    variant="card"
                    delay={100 + idx * 100}
                    className="h-full"
                  >
                    <Link
                      to={action.to}
                      className="group rounded-[22px] border border-slate-200/90 bg-white overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-300 shadow-xs h-full"
                    >
                      {/* Top Image Area (~45% height) */}
                      <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 relative shrink-0">
                        <img
                          src={action.image}
                          alt={action.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Floating Circular Icon Badge (Top Left) */}
                        <div className="absolute top-3.5 left-3.5 h-9 w-9 rounded-full bg-white text-primary flex items-center justify-center shadow-xs border border-slate-100 font-bold z-10">
                          <action.icon className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Bottom Content Area */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          {/* Pill Badge */}
                          <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                            {action.badge}
                          </span>

                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                            {action.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {action.description}
                          </p>
                        </div>

                        {/* Compact Button-Style CTA */}
                        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-start">
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-extrabold shadow-xs group-hover:bg-primary/90 transition-colors">
                            <span>{action.cta}</span>
                            <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform duration-200" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ScrollRevealItem>
                ))}
              </div>

              {/* Benefits Strip (Horizontal Trust Bar) */}
              <div className="mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/60">
                {[
                  {
                    title: "Fast Local Delivery",
                    desc: "Next-day delivery across Gloucestershire",
                    icon: Truck,
                  },
                  {
                    title: "Trusted & Reliable",
                    desc: "Decades of local service you can rely on",
                    icon: ShieldCheck,
                  },
                  {
                    title: "Quality Assured",
                    desc: "Premium products from trusted brands",
                    icon: ThumbsUp,
                  },
                  {
                    title: "Local Support",
                    desc: "Real people, real help when you need it",
                    icon: Headphones,
                  },
                ].map((item, idx) => (
                  <ScrollRevealItem key={item.title} variant="card" delay={500 + idx * 80}>
                    <div
                      className={`flex items-start gap-3.5 ${idx !== 3 ? "lg:border-r lg:border-slate-200/80 lg:pr-6" : ""
                        }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/15">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 tracking-tight uppercase">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </ScrollRevealItem>
                ))}
              </div>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — BROWSE BY CATEGORY (Exact /order-gas Component Reuse)
      ========================================================================= */}
      <OrderGasShopByCategory
        onSelectCategory={(catId) => {
          navigate({
            to: "/order-gas",
            hash: catId,
          });
        }}
      />

      {/* =========================================================================
          SECTION 3 — AVAILABLE PRODUCTS / LIVE CATALOG (Strict Reference Rebuild)
      ========================================================================= */}
      <section className="pt-8 pb-5 sm:pt-10 sm:pb-6 md:pt-10 md:pb-7 bg-[#f8f9fa] border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection className="space-y-6 sm:space-y-7">
            {/* Section Header & Top-Right Integrated Controls */}
            <ScrollRevealItem variant="heading" delay={0}>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                      LIVE CATALOG
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    Available <span className="text-primary">Products</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                    Real live products from our Whitminster depot ready for immediate dispatch.
                  </p>
                </div>

                {/* Top-Right Pill Controls */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {/* Categories Dropdown Pill */}
                  <div className="relative">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => {
                        setSelectedCategoryFilter(e.target.value);
                        setCatalogPage(0);
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded-full h-9 pl-4 pr-8 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer transition-colors"
                      aria-label="Filter products by category"
                    >
                      <option value="all">Categories: All</option>
                      {dbCategories && dbCategories.length > 0 ? (
                        dbCategories.map((c) => (
                          <option
                            key={c.id || c.slug}
                            value={typeof c.slug === "string" ? c.slug : String(c.slug || "")}
                          >
                            {typeof c.name === "string" ? c.name : String(c.name || "")}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gas">Gas Cylinders</option>
                          <option value="coal-logs">Solid Fuel</option>
                          <option value="animal-feed">Animal Feed</option>
                          <option value="fishing-bait">Fishing Bait</option>
                          <option value="gas-appliances">Gas Appliances</option>
                          <option value="trailers">Trailers</option>
                          <option value="workwear">Workwear</option>
                          <option value="garden">Garden & DIY</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>

                  {/* Sort by: Popular Dropdown Pill */}
                  <div className="relative">
                    <select
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 rounded-full h-9 pl-4 pr-8 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer transition-colors"
                      aria-label="Sort products"
                    >
                      <option value="popular">Sort by: Popular</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Rating: High to Low</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  </div>

                  {/* Red Grid Icon Button */}
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </ScrollRevealItem>

            {/* Large Horizontal Product Cards Showcase with Left & Right Arrow Navigation */}
            {displayedCatalogProducts.length === 0 ? (
              <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs text-muted-foreground font-bold">
                Loading products...
              </div>
            ) : (
              <div className="relative w-full max-w-[1140px] mx-auto flex items-center justify-center gap-2 sm:gap-3.5 md:gap-5">
                {/* Left Navigation Arrow */}
                <button
                  type="button"
                  onClick={() => setCatalogPage((prev) => Math.max(0, prev - 1))}
                  disabled={catalogPage === 0}
                  aria-label="Previous products"
                  className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-2xs hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-all flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Product Cards Grid */}
                <div className="w-full max-w-[1040px] grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 items-stretch flex-1">
                  {displayedCatalogProducts.map((p, idx) => {
                    const wished = wishlist.includes(p.slug);
                    const isOutOfStock = Number(p.stock || 0) <= 0;

                    return (
                      <ScrollRevealItem
                        key={p.id || p.slug}
                        variant="card"
                        delay={120 + idx * 100}
                        className="h-full"
                      >
                        <div className="group rounded-[6px] border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-300 flex flex-col md:flex-row items-stretch h-full">
                          {/* Left / Top - Product Image Area */}
                          <div className="w-full md:w-[48%] relative shrink-0 overflow-hidden aspect-square md:aspect-auto min-h-0 md:min-h-full bg-slate-100 flex items-center justify-center md:items-stretch">
                            {/* Top-Left Status Badge */}
                            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 md:top-3.5 md:left-3.5 z-10">
                              {idx === 0 ? (
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1 rounded-full bg-primary text-white text-[9px] sm:text-[10px] md:text-[11px] font-extrabold shadow-sm">
                                  <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />{" "}
                                  <span className="hidden sm:inline">Best Seller</span>
                                  <span className="sm:hidden">Best</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold shadow-sm backdrop-blur-xs">
                                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-emerald-600" />{" "}
                                  <span className="hidden sm:inline">In Stock</span>
                                  <span className="sm:hidden">Stock</span>
                                </span>
                              )}
                            </div>

                            {/* Product Photo */}
                            <Link
                              to="/products/$slug"
                              params={{ slug: p.slug }}
                              className="block w-full h-full flex items-center justify-center"
                            >
                              <img
                                src={cleanImageUrl(p.image, p.slug)}
                                alt={p.name}
                                className="w-full h-full object-contain p-2.5 sm:p-3.5 md:p-0 md:object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = cylinderImg;
                                }}
                              />
                            </Link>
                          </div>

                          {/* Right / Bottom - Product Content Area */}
                          <div className="w-full md:w-[52%] p-3 sm:p-4 md:p-7 flex flex-col justify-between flex-1 space-y-2.5 sm:space-y-3 md:space-y-4">
                            <div>
                              {/* Top Header Row with Brand & Wishlist Heart */}
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                                  {p.brand || "CALOR"}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Add to wishlist"
                                  onClick={() => toggleWishlist(p.slug)}
                                  className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0"
                                >
                                  <Heart
                                    className={cn(
                                      "h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 transition-colors",
                                      wished
                                        ? "fill-primary text-primary"
                                        : "text-slate-400 hover:text-primary",
                                    )}
                                  />
                                </button>
                              </div>

                              {/* Product Title */}
                              <h3 className="mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-snug line-clamp-2">
                                <Link
                                  to="/products/$slug"
                                  params={{ slug: p.slug }}
                                  className="hover:text-primary transition-colors"
                                >
                                  {typeof p.name === "string" ? p.name : String(p.name || "")}
                                </Link>
                              </h3>

                              {/* Rating Row */}
                              <div className="mt-1 sm:mt-1.5 md:mt-2.5 flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-slate-500">
                                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span className="font-bold text-slate-700">
                                  {p.rating ? p.rating.toFixed(1) : "5.0"}
                                </span>
                                <span className="text-slate-400">({p.reviews || 0})</span>
                              </div>

                              {/* Divider (desktop only or subtle) */}
                              <div className="my-1.5 sm:my-2 md:my-4 border-t border-slate-100" />

                              {/* Price & Stock status */}
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm sm:text-base md:text-3xl font-black text-slate-900 tracking-tight">
                                    {gbp(p.price)}
                                  </span>
                                  {p.compareAt && (
                                    <span className="text-[10px] sm:text-xs md:text-sm text-slate-400 line-through font-medium">
                                      {gbp(p.compareAt)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
                                  <span className="truncate">In Stock</span>
                                </div>
                              </div>
                            </div>

                            {/* Primary CTA: Add to Cart Button */}
                            <div className="pt-1 sm:pt-1.5 md:pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  addToCart(p.slug);
                                  toast.success(`Added ${p.name} to your cart`);
                                }}
                                disabled={isOutOfStock}
                                className="w-full h-8 sm:h-9 md:h-11 px-2.5 sm:px-3 md:px-5 rounded-full bg-primary hover:bg-primary/90 active:scale-[0.99] text-white text-[10px] sm:text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 group/btn cursor-pointer transition-all duration-200"
                              >
                                <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 shrink-0" />
                                <span className="truncate">Add to cart</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </ScrollRevealItem>
                    );
                  })}
                </div>

                {/* Right Navigation Arrow */}
                <button
                  type="button"
                  onClick={() => {
                    const maxPages = Math.ceil(filteredCatalogProducts.length / 2) - 1;
                    setCatalogPage((prev) => Math.min(maxPages > 0 ? maxPages : 0, prev + 1));
                  }}
                  disabled={catalogPage >= Math.ceil(filteredCatalogProducts.length / 2) - 1}
                  aria-label="Next products"
                  className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-2xs hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-all flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
          GAS DELIVERY FEATURE BANNER (Strict Reference Match - Standalone Card)
      ========================================================================= */}
      <section className="py-10 md:py-14 bg-[#f7f8fa] border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection>
            <ScrollRevealItem variant="card" delay={0}>
              <div className="rounded-[28px] sm:rounded-[32px] border border-slate-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-md shadow-slate-900/5 grid gap-8 lg:grid-cols-12 items-center relative overflow-hidden">
                {/* LEFT COLUMN: Gas Delivery Lorry Image Frame (~5 cols, Sharp 90-degree Rectangle) */}
                <div className="lg:col-span-5 relative rounded-none overflow-hidden bg-[#f4f5f7] border border-slate-200/80 aspect-[4/3] sm:min-h-[300px] md:min-h-[340px] flex items-center justify-center group shadow-xs">
                  {/* Lorry Image */}
                  <img
                    src={doorstepDeliveryImg}
                    alt="John Stayte dedicated gas delivery driver and lorry"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 relative z-1 rounded-none"
                    loading="lazy"
                  />

                  {/* Red Curved Accent Graphic around bottom/right edge of truck */}
                  <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border-[24px] border-primary/90 pointer-events-none z-0" />
                </div>

                {/* RIGHT COLUMN: Promotional Content Area (~7 cols) */}
                <div className="lg:col-span-7 flex flex-col justify-center space-y-4 lg:pl-4">
                  {/* Pill Badge */}
                  <div className="inline-block self-start px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/15 text-primary text-[11px] font-extrabold uppercase tracking-wider">
                    CONVENIENT LOCAL SUPPLY
                  </div>

                  {/* Main Heading */}
                  <div>
                    <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.1]">
                      Need gas delivered directly to{" "}
                      <span className="text-primary">your door?</span>
                    </h2>

                    {/* Small Red Horizontal Accent Line */}
                    <div className="h-0.5 w-10 bg-primary rounded-full my-3.5" />
                  </div>

                  {/* Supporting Paragraph */}
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                    Order your Calor butane, propane, patio gas and pub cylinders online and arrange
                    fast, reliable local delivery from John Stayte Services across Gloucestershire.
                  </p>

                  {/* Action Buttons Row */}
                  <div className="pt-3 flex flex-wrap items-center gap-3.5">
                    <Link
                      to="/order-gas"
                      className="bg-primary hover:bg-primary/90 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-md inline-flex items-center gap-2 transition-all cursor-pointer group/btn"
                    >
                      <span>Order Gas Online</span>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                    </Link>

                    <Link
                      to="/contact"
                      className="bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 border border-slate-300 font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-2xs inline-flex items-center gap-2 transition-all cursor-pointer group/btn"
                    >
                      <span>Delivery Info</span>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollRevealItem>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
        3. OUR SERVICES (Strict Reference Rebuild - Editorial 3 Cards)
    ========================================================================= */}
      <section className="py-12 md:py-16 bg-white border-b border-slate-200/60 relative overflow-hidden">
        <div className="container-page">
          <ScrollRevealSection className="space-y-8">
            {/* Section Header */}
            <ScrollRevealItem variant="heading" delay={0}>
              <div className="space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                  WHAT WE OFFER
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
                  Our Core Services
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                  Comprehensive fuel, cylinder exchange, and appliance solutions for domestic and
                  commercial clients.
                </p>
              </div>
            </ScrollRevealItem>

            {/* 3 Large Service Cards */}
            <div className="grid gap-6 md:gap-7 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
              {/* Service 1 */}
              <ScrollRevealItem variant="card" delay={100} className="h-full">
                <Link
                  to={dbServices[0]?.link || "/order-gas"}
                  className="group rounded-[26px] border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative h-full"
                >
                  {/* Upper Image Frame (~55-60% height) */}
                  <div className="relative h-56 sm:h-64 bg-[#fbf2ef] overflow-hidden flex items-center justify-center p-6">
                    <img
                      src={dbServices[0]?.image || cylinderImg}
                      alt={dbServices[0]?.title || "Gas cylinder delivery"}
                      className="max-h-[190px] sm:max-h-[210px] w-auto object-contain group-hover:scale-[1.04] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Bottom White Content Area */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4 relative bg-white">
                    {/* Faint Decorative Watermark Icon (Lower-Right) */}
                    <div className="absolute right-5 bottom-4 pointer-events-none opacity-[0.06] text-slate-900">
                      <CookingPot className="h-20 w-20" />
                    </div>

                    <div className="space-y-2 relative z-1">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors">
                        {safeStr(dbServices[0]?.title, "Gas Cylinder Delivery")}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        {safeStr(
                          dbServices[0]?.desc,
                          safeStr(
                            dbServices[0]?.description,
                            "Reliable bottled gas delivery for homes and businesses across Gloucestershire.",
                          ),
                        )}
                      </p>
                    </div>

                    {/* Compact Red Button-Style CTA */}
                    <div className="pt-1 relative z-1">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-xs group-hover:bg-primary/90 transition-colors">
                        <span>{safeStr(dbServices[0]?.ctaText, "Order cylinders")}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollRevealItem>

              {/* Service 2 */}
              <ScrollRevealItem variant="card" delay={200} className="h-full">
                <Link
                  to={dbServices[1]?.link || "/filling-stations"}
                  className="group rounded-[26px] border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative h-full"
                >
                  {/* Upper Image Frame (~55-60% height) */}
                  <div className="relative h-56 sm:h-64 bg-slate-100 overflow-hidden">
                    <img
                      src={dbServices[1]?.image || stationImg}
                      alt={safeStr(dbServices[1]?.title, "Service stations and forecourts")}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Bottom White Content Area */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4 relative bg-white">
                    {/* Faint Decorative Watermark Icon (Lower-Right) */}
                    <div className="absolute right-5 bottom-4 pointer-events-none opacity-[0.06] text-slate-900">
                      <MapPin className="h-20 w-20" />
                    </div>

                    <div className="space-y-2 relative z-1">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors">
                        {safeStr(dbServices[1]?.title, "Forecourts & Filling Stations")}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        {safeStr(
                          dbServices[1]?.desc,
                          safeStr(
                            dbServices[1]?.description,
                            "Fuel, autogas and cylinder exchange at our local service stations.",
                          ),
                        )}
                      </p>
                    </div>

                    {/* Compact Red Button-Style CTA */}
                    <div className="pt-1 relative z-1">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-xs group-hover:bg-primary/90 transition-colors">
                        <span>{safeStr(dbServices[1]?.ctaText, "Find a forecourt")}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollRevealItem>

              {/* Service 3 */}
              <ScrollRevealItem variant="card" delay={300} className="h-full">
                <Link
                  to={dbServices[2]?.link || "/products"}
                  search={dbServices[2]?.link ? undefined : ({ category: "gas-appliances" } as any)}
                  className="group rounded-[26px] border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 relative h-full"
                >
                  {/* Upper Image Frame (~55-60% height) */}
                  <div className="relative h-56 sm:h-64 bg-[#f3f4f6] overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={dbServices[2]?.image || heaterImg}
                      alt={safeStr(
                        dbServices[2]?.title,
                        "Gas heaters, appliances and genuine spares",
                      )}
                      className="max-h-[190px] sm:max-h-[210px] w-auto object-contain group-hover:scale-[1.04] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Bottom White Content Area */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4 relative bg-white">
                    {/* Faint Decorative Watermark Icon (Lower-Right) */}
                    <div className="absolute right-5 bottom-4 pointer-events-none opacity-[0.06] text-slate-900">
                      <Wrench className="h-20 w-20" />
                    </div>

                    <div className="space-y-2 relative z-1">
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors">
                        {safeStr(dbServices[2]?.title, "Gas Appliances & Spares")}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        {safeStr(
                          dbServices[2]?.desc,
                          safeStr(
                            dbServices[2]?.description,
                            "Quality appliances, regulators, hoses and genuine replacement parts.",
                          ),
                        )}
                      </p>
                    </div>

                    {/* Compact Red Button-Style CTA */}
                    <div className="pt-1 relative z-1">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-extrabold shadow-xs group-hover:bg-primary/90 transition-colors">
                        <span>{safeStr(dbServices[2]?.ctaText, "Browse appliances")}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollRevealItem>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
        4. WHY CHOOSE JOHN STAYTE (Connected Editorial Timeline - Compact & Polished)
    ========================================================================= */}
      <section className="why-trust-us-section pt-8 pb-9 md:pt-10 md:pb-12 bg-[#fafbfc] border-b border-slate-200/60 relative overflow-hidden">
        <div className="container-page relative z-1">
          <ScrollRevealSection>
            {/* Header */}
            <ScrollRevealItem variant="heading" delay={0}>
              <div className="why-trust-header text-center max-w-2xl mx-auto">
                <p className="why-trust-eyebrow text-xs font-black uppercase tracking-[0.25em] text-primary">
                  THE JOHN STAYTE DIFFERENCE
                </p>
                <div className="h-0.5 w-8 bg-primary rounded-full mx-auto mt-2 mb-2.5" />
                <h2 className="why-trust-title text-2xl sm:text-3xl lg:text-[38px] font-black text-slate-900 tracking-tight leading-tight">
                  Why Customers Trust Us <span className="text-primary">Since 1972</span>
                </h2>
                <p className="why-trust-desc text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 max-w-lg mx-auto">
                  Over five decades supplying Gloucestershire with dependable fuels, appliances and
                  local service.
                </p>
              </div>
            </ScrollRevealItem>

            {/* Desktop & Tablet: Connected Timeline Row */}
            <div className="relative mt-8 sm:mt-10 hidden md:block">
              {/* Continuous Thin Connecting Line */}
              <div className="absolute top-10 sm:top-11 left-[12.5%] right-[12.5%] h-[1px] bg-slate-200 z-0">
                {/* Intermediate Connection Nodes */}
                <div className="absolute top-1/2 left-[16.67%] -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-white shadow-2xs" />
                <div className="absolute top-1/2 left-[50%] -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-white shadow-2xs" />
                <div className="absolute top-1/2 left-[83.33%] -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-white shadow-2xs" />
              </div>

              {/* 4 Trust Points */}
              <div className="grid grid-cols-4 gap-5 lg:gap-7 items-start relative z-10">
                {/* Item 1 */}
                <ScrollRevealItem variant="card" delay={100}>
                  <div className="text-center group">
                    <div className="mx-auto h-20 w-20 sm:h-22 sm:w-22 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                      <Users className="h-7 w-7 stroke-[1.75]" />
                    </div>
                    <div className="h-0.5 w-6 bg-primary rounded-full mx-auto mt-4 mb-2.5" />
                    <h3 className="font-black text-sm lg:text-base text-slate-900 tracking-tight leading-snug">
                      Family-Run Business
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-[220px] mx-auto">
                      Independent and established in 1972, bringing personal accountability and care
                      to every order.
                    </p>
                  </div>
                </ScrollRevealItem>

                {/* Item 2 */}
                <ScrollRevealItem variant="card" delay={200}>
                  <div className="text-center group">
                    <div className="mx-auto h-20 w-20 sm:h-22 sm:w-22 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                      <Truck className="h-7 w-7 stroke-[1.75]" />
                    </div>
                    <div className="h-0.5 w-6 bg-primary rounded-full mx-auto mt-4 mb-2.5" />
                    <h3 className="font-black text-sm lg:text-base text-slate-900 tracking-tight leading-snug">
                      Dedicated Fleet
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-[220px] mx-auto">
                      Our own local delivery drivers serving households, farms and businesses across
                      a 40-mile radius.
                    </p>
                  </div>
                </ScrollRevealItem>

                {/* Item 3 */}
                <ScrollRevealItem variant="card" delay={300}>
                  <div className="text-center group">
                    <div className="mx-auto h-20 w-20 sm:h-22 sm:w-22 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                      <MapPin className="h-7 w-7 stroke-[1.75]" />
                    </div>
                    <div className="h-0.5 w-6 bg-primary rounded-full mx-auto mt-4 mb-2.5" />
                    <h3 className="font-black text-sm lg:text-base text-slate-900 tracking-tight leading-snug">
                      3 Local Forecourts
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-[220px] mx-auto">
                      Physical service stations open 7 days a week for immediate gas bottle
                      exchanges and supplies.
                    </p>
                  </div>
                </ScrollRevealItem>

                {/* Item 4 */}
                <ScrollRevealItem variant="card" delay={400}>
                  <div className="text-center group">
                    <div className="mx-auto h-20 w-20 sm:h-22 sm:w-22 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                      <Headphones className="h-7 w-7 stroke-[1.75]" />
                    </div>
                    <div className="h-0.5 w-6 bg-primary rounded-full mx-auto mt-4 mb-2.5" />
                    <h3 className="font-black text-sm lg:text-base text-slate-900 tracking-tight leading-snug">
                      Direct Human Support
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-[220px] mx-auto">
                      Real, knowledgeable people in Gloucestershire on hand to answer questions and
                      resolve enquiries.
                    </p>
                  </div>
                </ScrollRevealItem>
              </div>
            </div>

            {/* Mobile Layout: Connected Vertical Timeline */}
            <div className="md:hidden relative mt-8 pl-12 space-y-6">
              {/* Vertical Connecting Line */}
              <div className="absolute top-5 bottom-5 left-5 w-[1px] bg-slate-200 z-0" />

              {/* Mobile Item 1 */}
              <ScrollRevealItem variant="card" delay={100}>
                <div className="relative">
                  <div className="absolute -left-12 top-0 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-primary z-10">
                    <Users className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <div className="pt-0.5">
                    <div className="h-0.5 w-4 bg-primary rounded-full mb-1" />
                    <h3 className="font-black text-xs text-slate-900">Family-Run Business</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Independent and established in 1972, bringing personal accountability and care
                      to every order.
                    </p>
                  </div>
                </div>
              </ScrollRevealItem>

              {/* Mobile Item 2 */}
              <ScrollRevealItem variant="card" delay={200}>
                <div className="relative">
                  <div className="absolute -left-12 top-0 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-primary z-10">
                    <Truck className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <div className="pt-0.5">
                    <div className="h-0.5 w-4 bg-primary rounded-full mb-1" />
                    <h3 className="font-black text-xs text-slate-900">Dedicated Fleet</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Our own local delivery drivers serving households, farms and businesses across
                      a 40-mile radius.
                    </p>
                  </div>
                </div>
              </ScrollRevealItem>

              {/* Mobile Item 3 */}
              <ScrollRevealItem variant="card" delay={300}>
                <div className="relative">
                  <div className="absolute -left-12 top-0 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-primary z-10">
                    <MapPin className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <div className="pt-0.5">
                    <div className="h-0.5 w-4 bg-primary rounded-full mb-1" />
                    <h3 className="font-black text-xs text-slate-900">3 Local Forecourts</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Physical service stations open 7 days a week for immediate gas bottle
                      exchanges and supplies.
                    </p>
                  </div>
                </div>
              </ScrollRevealItem>

              {/* Mobile Item 4 */}
              <ScrollRevealItem variant="card" delay={400}>
                <div className="relative">
                  <div className="absolute -left-12 top-0 h-10 w-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-primary z-10">
                    <Headphones className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <div className="pt-0.5">
                    <div className="h-0.5 w-4 bg-primary rounded-full mb-1" />
                    <h3 className="font-black text-xs text-slate-900">Direct Human Support</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      An experienced local team on hand to answer technical questions and arrange
                      flexible orders.
                    </p>
                  </div>
                </div>
              </ScrollRevealItem>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
        TEXACO FORECOURT PARTNERSHIP HIGHLIGHT
      ========================================================================= */}
      <TexacoForecourtHighlightSection />

      {/* =========================================================================
        5. FILLING STATIONS PREVIEW (Strict Reference Rebuild - ISOLATED SCOPE)
    ========================================================================= */}
      <section className="filling-stations-section py-12 md:py-16 bg-[#fafbfc] border-b border-slate-200/60 relative overflow-hidden">
        {/* Subtle background curved accent on left */}
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full border border-slate-200/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full border border-slate-200/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="container-page">
          <ScrollRevealSection>
            <div className="filling-stations-layout grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* LEFT COLUMN: Section Info & 3 Benefit Items (~4 cols) */}
              <ScrollRevealItem
                variant="heading"
                delay={0}
                className="filling-stations-info lg:col-span-4 space-y-6"
              >
                <div>
                  <p className="filling-stations-eyebrow text-xs font-extrabold uppercase tracking-[0.2em] text-primary mb-2">
                    FORECOURT LOCATIONS
                  </p>
                  <h2 className="filling-stations-title text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 tracking-tight leading-[1.15]">
                    Find a Filling <span className="text-primary">Station</span> Near You
                  </h2>
                  <div className="h-0.5 w-10 bg-primary rounded-full mt-3 mb-3.5" />
                  <p className="filling-stations-desc text-sm text-slate-600 leading-relaxed max-w-md">
                    Visit our physical locations for cylinder exchange, autogas and forecourt
                    essentials.
                  </p>
                </div>

                {/* 3 Compact Benefit Items */}
                <div className="filling-stations-benefits space-y-4 pt-1">
                  {/* Benefit 1 */}
                  <div className="filling-station-benefit-item flex items-start gap-3.5">
                    <div className="filling-station-benefit-icon h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15 shadow-2xs">
                      <Fuel className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        3 Convenient Locations
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Across Gloucestershire for all your fuel and gas needs.
                      </p>
                    </div>
                  </div>

                  {/* Benefit 2 */}
                  <div className="filling-station-benefit-item flex items-start gap-3.5">
                    <div className="filling-station-benefit-icon h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15 shadow-2xs">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">7 Days a Week</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Our forecourts are open daily for your convenience.
                      </p>
                    </div>
                  </div>

                  {/* Benefit 3 */}
                  <div className="filling-station-benefit-item flex items-start gap-3.5">
                    <div className="filling-station-benefit-icon h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15 shadow-2xs">
                      <Navigation className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Easy to Access</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Well located with easy access and ample parking.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom-left Action Button */}
                <div className="pt-2">
                  <Link
                    to="/filling-stations"
                    className="filling-stations-view-all-btn inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-extrabold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <span>View All Filling Stations</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </ScrollRevealItem>

              {/* RIGHT COLUMN: 3 Station Cards Side-by-Side (~8 cols) */}
              <div className="filling-stations-cards lg:col-span-8">
                <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                  {(() => {
                    const getStationSortOrder = (name: string) => {
                      const n = (name || "").toLowerCase();
                      if (n.includes("fromebridge") || n.includes("whitminster")) return 1;
                      if (n.includes("wild goose") || n.includes("dursley") || n.includes("cambridge")) return 2;
                      if (n.includes("bridge") || n.includes("stonehouse") || n.includes("frampton")) return 3;
                      return 99;
                    };

                    const getStationImage = (s: any) => {
                      const name = (s?.name || "").toLowerCase();
                      if (name.includes("fromebridge") || name.includes("whitminster")) {
                        return "/fromebridge-service-station-1.jpg";
                      }
                      if (name.includes("wild goose") || name.includes("dursley") || name.includes("cambridge")) {
                        return "/wild-goose-garage-1.jpg";
                      }
                      if (name.includes("bridge") || name.includes("stonehouse") || name.includes("frampton")) {
                        return "/bridge-station-forecourt.jpg";
                      }
                      if (Array.isArray(s?.images) && s.images.length > 0 && typeof s.images[0] === "string" && s.images[0].trim()) {
                        return s.images[0].trim();
                      }
                      if (s?.image_url && typeof s.image_url === "string" && s.image_url.trim()) {
                        return s.image_url.trim();
                      }
                      return "/fromebridge-service-station-1.jpg";
                    };

                    const sortedStations = [...dbStations].sort(
                      (a, b) => getStationSortOrder(a.name) - getStationSortOrder(b.name)
                    );

                    return sortedStations.map((s, idx) => {
                      const stationImage = getStationImage(s);
                      const numBadge = String(idx + 1).padStart(2, "0");
                      const hoursParts = (s.hours || "").split(" · ");

                      return (
                        <ScrollRevealItem
                          key={s.name || idx}
                          variant="card"
                          delay={100 + idx * 100}
                          className="h-full"
                        >
                          <div className="filling-station-card rounded-[22px] border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group h-full">
                            <div>
                              {/* Station Image Area Container */}
                              <div className="relative">
                                <div className="filling-station-image-wrap h-44 sm:h-48 overflow-hidden bg-slate-100 relative">
                                  <img
                                    src={stationImage}
                                    alt={`${s.name} forecourt`}
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                    loading="lazy"
                                  />
                                  {/* Number Badge (Top-Left) */}
                                  <div className="filling-station-num-badge absolute top-3 left-3 h-7 w-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shadow-xs z-10">
                                    {numBadge}
                                  </div>
                                </div>

                                {/* Overlapping Map Pin Badge (Bottom-Left - Fully Visible) */}
                                <div className="filling-station-pin-badge absolute -bottom-4 left-5 h-9 w-9 rounded-full bg-white text-primary shadow-md border border-slate-200/90 flex items-center justify-center font-bold z-20">
                                  <MapPin className="h-4 w-4 fill-primary/10 text-primary" />
                                </div>
                              </div>

                              {/* Station Info Content */}
                              <div className="filling-station-content p-5 pt-6 space-y-3.5">
                                <div>
                                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight leading-snug">
                                    {typeof s.name === "string" ? s.name : String(s.name || "")}
                                  </h3>
                                  <div className="h-0.5 w-5 bg-primary rounded-full mt-2" />
                                </div>

                                <ul className="space-y-2.5 text-xs text-slate-600">
                                  <li className="flex items-start gap-2.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                                    <span className="leading-relaxed">
                                      {typeof s.address === "string"
                                        ? s.address
                                        : String(s.address || "")}
                                    </span>
                                  </li>
                                  <li className="flex items-center gap-2.5">
                                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                                    <a
                                      href={`tel:${(typeof s.phone === "string" ? s.phone : String(s.phone || "")).replace(/\s/g, "")}`}
                                      className="hover:text-primary font-bold text-slate-800 transition-colors"
                                    >
                                      {typeof s.phone === "string" ? s.phone : String(s.phone || "")}
                                    </a>
                                  </li>
                                  <li className="flex items-start gap-2.5">
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                                    <div className="leading-relaxed">
                                      {hoursParts.map((h: string, i: number) => (
                                        <div key={i}>{h}</div>
                                      ))}
                                    </div>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            {/* Bottom Full-Width Pale-Red Action Strip */}
                            <a
                              href={
                                s.maps ||
                                s.maps_link ||
                                `https://maps.google.com/?q=${encodeURIComponent(s.name + " " + s.address)}`
                              }
                              target="_blank"
                              rel="noreferrer noopener"
                              className="filling-station-action-strip bg-primary/5 hover:bg-primary/10 border-t border-primary/10 text-primary text-xs font-extrabold py-3.5 px-5 flex items-center justify-between transition-colors group/cta"
                            >
                              <span>Get Directions</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover/cta:translate-x-1 transition-transform" />
                            </a>
                          </div>
                        </ScrollRevealItem>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
        6. BRANDS (Official Stockist Showcase - Viewport Reveal)
    ========================================================================= */}
      <TrustedBrandsSection />

      {/* =========================================================================
        6B. PROUDLY POWERING BUSINESSES WITH CALOR (Partnership / Business Energy)
    ========================================================================= */}
      <CalorBusinessHighlightSection />

      {/* =========================================================================
        7. CUSTOMER HELP / INFORMATION (Exact Reference 3x2 Grid + Contact Bar)
    ========================================================================= */}
      <section className="py-8 sm:py-10 md:py-12 bg-white border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection className="space-y-6 sm:space-y-7">
            {/* Header */}
            <ScrollRevealItem variant="heading" delay={0}>
              <div className="space-y-1.5 max-w-3xl">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary block">
                  CUSTOMER SUPPORT
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  How Can We <span className="text-primary">Help You?</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-0.5">
                  Quick access to order management, delivery information, and customer service.
                </p>
                <div className="w-12 h-1 bg-primary rounded-full mt-2.5" />
              </div>
            </ScrollRevealItem>

            {/* 3x2 Support Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  title: "How to Order Gas",
                  desc: "Order cylinders online quickly and easily.",
                  to: "/contact",
                  icon: (props: React.SVGProps<SVGSVGElement>) => (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      {...props}
                    >
                      <rect x="7" y="7" width="10" height="14" rx="3" />
                      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                      <path d="M10 4h4" />
                      <path d="M7 13h10" />
                    </svg>
                  ),
                  borderBottomColor: "border-b-red-600",
                },
                {
                  title: "Track Your Order",
                  desc: "Check real-time status of your orders and deliveries.",
                  to: "/contact",
                  icon: Package,
                  borderBottomColor: "border-b-blue-500",
                },
                {
                  title: "Delivery Information",
                  desc: "Delivery areas, schedules, and important policies.",
                  to: "/contact",
                  icon: Truck,
                  borderBottomColor: "border-b-teal-400",
                },
                {
                  title: "Filling Stations",
                  desc: "Find your nearest filling station and check opening times.",
                  to: "/contact",
                  icon: MapPin,
                  borderBottomColor: "border-b-amber-400",
                },
                {
                  title: "Account Management",
                  desc: "Manage your account details, invoices and preferences.",
                  to: "/contact",
                  icon: User,
                  borderBottomColor: "border-b-purple-500",
                },
                {
                  title: "Contact Support",
                  desc: "Get in touch with our team via phone or email.",
                  to: "/contact",
                  icon: Headphones,
                  borderBottomColor: "border-b-pink-500",
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <ScrollRevealItem
                    key={card.title}
                    variant="card"
                    delay={100 + idx * 80}
                    className="h-full"
                  >
                    <Link
                      to={card.to}
                      className={cn(
                        "group bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between border-b-[3px] h-full",
                        card.borderBottomColor,
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon Container */}
                        <div className="h-14 w-14 rounded-full bg-red-50/90 border border-red-100/80 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 group-hover:bg-red-100/80 transition-all duration-200">
                          <Icon className="h-7 w-7 stroke-[1.8]" />
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1 pt-0.5">
                          <h3 className="text-base sm:text-[17px] font-extrabold text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-slate-500 leading-snug">
                            {card.desc}
                          </p>
                        </div>
                      </div>

                      {/* Red CTA Text */}
                      <div className="mt-5 pt-1">
                        <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5 transition-all group-hover:gap-2">
                          Get help{" "}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </ScrollRevealItem>
                );
              })}
            </div>

            {/* Bottom Horizontal Contact Bar */}
            <ScrollRevealItem variant="card" delay={600}>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 lg:gap-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  {/* 1. Need Immediate Assistance? */}
                  <div className="flex items-center gap-3.5 pr-0 lg:pr-4">
                    <div className="h-11 w-11 rounded-full bg-red-50/90 text-primary border border-red-100/80 flex items-center justify-center shrink-0">
                      <Headphones className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-[15px] font-extrabold text-slate-900 tracking-tight">
                        Need Immediate Assistance?
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Our team is ready to help you.
                      </p>
                    </div>
                  </div>

                  {/* 2. Call Us Now */}
                  <a
                    href="tel:+441453822859"
                    className="flex items-center gap-3.5 px-0 lg:px-4 pt-3.5 lg:pt-0 group hover:opacity-95 transition-opacity"
                  >
                    <div className="h-11 w-11 rounded-full bg-red-50/90 text-primary border border-red-100/80 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                      <Phone className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Call Us Now
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-primary transition-colors">
                        +44 (0)1453 822859
                      </span>
                    </div>
                  </a>

                  {/* 3. Email Us */}
                  <a
                    href="mailto:info@johnstayteservices.co.uk"
                    className="flex items-center gap-3.5 px-0 lg:px-4 pt-3.5 lg:pt-0 group hover:opacity-95 transition-opacity"
                  >
                    <div className="h-11 w-11 rounded-full bg-red-50/90 text-primary border border-red-100/80 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                      <Mail className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Email Us
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-primary transition-colors">
                        info@johnstayteservices.co.uk
                      </span>
                    </div>
                  </a>

                  {/* 4. Get in Touch CTA */}
                  <div className="pt-3.5 lg:pt-0 pl-0 lg:pl-4 flex items-center justify-start lg:justify-end">
                    <Button
                      asChild
                      className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 text-xs sm:text-sm shadow-sm w-full sm:w-auto"
                    >
                      <Link to="/contact">
                        Get in Touch <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollRevealItem>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
        TESTIMONIALS SECTION (Exact Reference Carousel)
    ========================================================================= */}
      <section className="py-10 sm:py-12 md:py-14 bg-slate-50 border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection className="space-y-7 sm:space-y-8">
            {/* Header */}
            <ScrollRevealItem variant="heading" delay={0}>
              <div className="space-y-1.5 max-w-3xl">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary block">
                  TESTIMONIALS
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-tight">
                  Don’t take our word for it!
                  <br />
                  Hear it from <span className="text-primary">our partners.</span>
                </h2>
              </div>
            </ScrollRevealItem>

            <TestimonialsCarousel customItems={dbTestimonials} />
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
          8. FEATURED SAFETY GUIDE (Exact Component from Blog Page)
      ========================================================================= */}
      <section className="py-12 sm:py-16 md:py-20 bg-slate-50 border-b border-slate-200/60">
        <div className="container-page">
          <ScrollRevealSection>
            <ScrollRevealItem variant="card" delay={0}>
              <FeaturedSafetyGuide />
            </ScrollRevealItem>
          </ScrollRevealSection>
        </div>
      </section>

      {/* =========================================================================
          9. FINAL CALL TO ACTION & RED GLASS FLOWING WAVE (Exact Reference)
      ========================================================================= */}
      <section className="pt-10 sm:pt-14 md:pt-16 pb-0 bg-white text-center">
        <ScrollRevealSection>
          <ScrollRevealItem variant="card" delay={0}>
            <div className="container-page max-w-2xl space-y-6 pb-8 sm:pb-10">
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Order online today for dependable next-day delivery across Gloucestershire, or visit
                any of our three forecourts.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 text-xs sm:text-sm shadow-md"
                >
                  <Link to="/order-gas">
                    Order Gas Online <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold px-8 py-3 text-xs sm:text-sm shadow-2xs"
                >
                  <Link to="/products">Browse All Products</Link>
                </Button>
              </div>
            </div>
          </ScrollRevealItem>
        </ScrollRevealSection>
      </section>
    </SiteLayout>
  );
}
