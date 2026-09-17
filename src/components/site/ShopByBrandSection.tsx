import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { ALL_BRANDS, type BrandInfo } from "@/data/brands";
import { Input } from "@/components/ui/input";
import { OrderGasReveal3D } from "./OrderGasReveal3D";

interface ShopByBrandSectionProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  limit?: number;
  className?: string;
  onSelectBrand?: (brand: BrandInfo) => void;
}

interface Brand3DCardItemProps {
  brand: BrandInfo;
  index: number;
  screenCols: number;
  isSearching: boolean;
  onSelectBrand?: (brand: BrandInfo) => void;
}

function Brand3DCardItem({
  brand,
  index,
  screenCols,
  isSearching,
  onSelectBrand,
}: Brand3DCardItemProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [hasRevealed, setHasRevealed] = useState(isSearching);
  const [isTransitionDone, setIsTransitionDone] = useState(isSearching);

  useEffect(() => {
    if (isSearching) {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasRevealed(true);
            observer.unobserve(el);
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isSearching]);

  const colPos = index % (screenCols || 6);
  const staggerDelay = isSearching ? 0 : colPos * 35;
  const duration = 750;

  useEffect(() => {
    if (hasRevealed && !isTransitionDone) {
      const timer = setTimeout(() => {
        setIsTransitionDone(true);
      }, duration + staggerDelay + 60);
      return () => clearTimeout(timer);
    }
  }, [hasRevealed, isTransitionDone, duration, staggerDelay]);

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
  const rotateX = isMobile ? 3.5 : 5.5;
  const translateY = isMobile ? 16 : 22;
  const scale = isMobile ? 0.97 : 0.96;

  const animatedStyle: React.CSSProperties = {
    opacity: hasRevealed ? 1 : 0,
    transform: hasRevealed
      ? "perspective(1000px) rotateX(0deg) translateY(0px) scale(1)"
      : `perspective(1000px) rotateX(${rotateX}deg) translateY(${translateY}px) scale(${scale})`,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}ms`,
    willChange: hasRevealed && isTransitionDone ? "auto" : "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const cardContent = (
    <>
      {/* Subtle top hover glow line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Logo Box */}
      <div className="h-16 sm:h-20 w-full flex items-center justify-center p-2 select-none">
        <img
          src={brand.logo}
          alt={`${brand.name} Logo`}
          loading="lazy"
          className="max-h-full max-w-full object-contain filter drop-shadow-2xs transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback to text if image fails
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Brand Label */}
      <div className="mt-2 w-full pt-1.5 border-t border-slate-100">
        <p className="text-xs sm:text-[13px] font-bold text-slate-700 group-hover:text-red-600 transition-colors truncate">
          {brand.name}
        </p>
      </div>
    </>
  );

  const cardClasses =
    "group relative flex flex-col items-center justify-between p-3.5 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-200 hover:-translate-y-1 transition-all duration-300 ease-out text-center cursor-pointer overflow-hidden select-none w-full";

  if (onSelectBrand) {
    return (
      <button
        ref={(el) => {
          cardRef.current = el;
        }}
        type="button"
        onClick={() => onSelectBrand(brand)}
        style={isTransitionDone ? undefined : animatedStyle}
        className={cardClasses}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      ref={(el) => {
        cardRef.current = el;
      }}
      to="/order-gas"
      search={{ brand: brand.name }}
      style={isTransitionDone ? undefined : animatedStyle}
      className={cardClasses}
    >
      {cardContent}
    </Link>
  );
}

export function ShopByBrandSection({
  title = "Shop by Brand",
  subtitle = "Shop by Brand – Trusted Names, Quality Products",
  showSearch = true,
  limit,
  className = "",
  onSelectBrand,
}: ShopByBrandSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [screenCols, setScreenCols] = useState(6);

  useEffect(() => {
    const updateCols = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenCols(2);
      } else if (width < 768) {
        setScreenCols(3);
      } else if (width < 1024) {
        setScreenCols(4);
      } else {
        setScreenCols(6);
      }
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const filteredBrands = useMemo(() => {
    let list = ALL_BRANDS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.category && b.category.toLowerCase().includes(q)),
      );
    }
    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }
    return list;
  }, [searchQuery, limit]);

  return (
    <section className={`w-full pt-1 pb-6 sm:pb-10 ${className}`}>
      <div className="container-page space-y-6 sm:space-y-8">
        {/* Section Header with subtle 3D Scroll Reveal */}
        <OrderGasReveal3D translateY={18} rotateX={4} scale={0.98} duration={700}>
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display relative inline-block">
              {title}
              {/* Small red accent line */}
              <span className="block h-1 w-12 bg-red-600 rounded-full mx-auto mt-2" />
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              {subtitle}
            </p>
          </div>
        </OrderGasReveal3D>

        {/* Optional Search Bar with subtle 3D Scroll Reveal */}
        {showSearch && (
          <OrderGasReveal3D delay={50} translateY={14} rotateX={3} scale={0.98} duration={650}>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 31 brands..."
                className="h-10 pl-10 pr-4 rounded-full bg-white border-slate-200/90 text-xs shadow-2xs focus-visible:ring-red-500"
              />
            </div>
          </OrderGasReveal3D>
        )}

        {/* Brand Grid - 6 Columns on Desktop, Responsive on Tablet & Mobile with 3D Depth */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 [perspective:1200px]">
          {filteredBrands.map((brand, index) => (
            <Brand3DCardItem
              key={brand.id}
              brand={brand}
              index={index}
              screenCols={screenCols}
              isSearching={Boolean(searchQuery.trim())}
              onSelectBrand={onSelectBrand}
            />
          ))}
        </div>

        {/* Empty Search Result */}
        {filteredBrands.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <p className="text-slate-500 font-medium text-sm">
              No brands found matching &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-bold text-primary hover:underline"
            >
              Clear search filter
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
