import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Flame,
  Logs,
  Fish,
  Dog,
  CookingPot,
  Wrench,
  Sprout,
  Utensils,
  Truck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tent,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { INITIAL_GAS_PRODUCTS } from "@/lib/cylinder-service";
import { OrderGasReveal3D } from "./OrderGasReveal3D";

export interface CategoryCardData {
  id: string;
  name: string;
  icon: LucideIcon;
  image: string;
  description: string;
  productCount: number;
}

/**
 * Real PRODUCT CATEGORIES from the Supabase Product Catalogue
 * Strictly Category-based (NOT brand-based, NO brand logos).
 */
export const PRODUCT_CATEGORIES_METADATA: Array<{
  id: string;
  name: string;
  icon: LucideIcon;
  image: string;
  description: string;
  matchSlugs: string[];
}> = [
    {
      id: "calor-gas",
      name: "LPG & Gas Cylinders",
      icon: Flame,
      image: "/calor-cylinders-studio.jpg",
      description: "Butane, propane & patio gas cylinders for homes, businesses & outdoor use.",
      matchSlugs: ["gas", "calor-gas", "bottled-gas"],
    },
    {
      id: "pub-gas",
      name: "Pub & Cellar Gas",
      icon: UtensilsCrossed,
      image: "/pub-gas-co2-6-35kg.png",
      description: "Food-grade CO2 and mixed beverage dispense gases for pubs, bars, venues and cellars.",
      matchSlugs: ["pub-gas"],
    },
    {
      id: "coal-fuels",
      name: "Coal, Logs & Fuels",
      icon: Logs,
      image: "/coal-logs.jpg",
      description: "Smokeless coal, kiln-dried logs, kindling & firelighters for a warmer home.",
      matchSlugs: ["coal-fuels", "coal-logs"],
    },
    {
      id: "campingaz",
      name: "Camping Gas & Stoves",
      icon: Tent,
      image: "/service_domestic_supply.jpg",
      description: "Refillable 907/904 cylinders, gas cartridges, party grills and portable camping cookers.",
      matchSlugs: ["campingaz", "camping"],
    },
    {
      id: "animal-feed",
      name: "Animal & Pet Feeds",
      icon: Dog,
      image: "/animal-feed-cat.jpg",
      description: "Premium feeds for horse, poultry, dogs, livestock & small animals.",
      matchSlugs: ["animal-feed", "feeds"],
    },
    {
      id: "dynamite-baits",
      name: "Fishing Baits",
      icon: Fish,
      image: "/fishing-baits.jpg",
      description: "Groundbait, carp pellets & attractants for match & specimen anglers.",
      matchSlugs: ["dynamite-baits", "fishing-baits"],
    },
    {
      id: "vehicle-lpg-autogas",
      name: "Vehicle LPG & Autogas",
      icon: Truck,
      image: "/vehicle_lpg_autogas.jpg",
      description: "Forecourt vehicle autogas refuelling, commercial fleet metered accounts & adapter kits.",
      matchSlugs: ["vehicle-lpg-autogas", "autogas"],
    },
    {
      id: "bulk-gas",
      name: "Bulk LPG Supply",
      icon: Flame,
      image: "/service_bulk_supply.jpg",
      description: "Commercial, domestic and agricultural bulk LPG storage tanker deliveries and refills.",
      matchSlugs: ["bulk-gas", "bulk-lpg"],
    },
    {
      id: "gas-appliances",
      name: "Gas Appliances & BBQs",
      icon: CookingPot,
      image: "/char_broil_professionalpro3_1.jpg",
      description: "BBQs, accessories & outdoor essentials for garden cooking all year round.",
      matchSlugs: ["gas-appliances", "appliances"],
    },
    {
      id: "gas-spares",
      name: "Gas Regulators & Spares",
      icon: Wrench,
      image: "/spares-propane-regulator-low-pressure.png",
      description: "BS certified gas regulators, changeover valves, high-pressure hoses and safety fittings.",
      matchSlugs: ["gas-spares", "spares"],
    },
    {
      id: "garden",
      name: "Garden & Outdoor",
      icon: Sprout,
      image: "/garden-cat.jpg",
      description: "Compost, soil, tools & everything you need for a thriving garden.",
      matchSlugs: ["garden"],
    },
    {
      id: "food",
      name: "Local Produce & Food",
      icon: Utensils,
      image: "/food-cat.jpg",
      description: "Local farm produce, fresh bundles & Gloucestershire store essentials.",
      matchSlugs: ["food"],
    },
  ];

interface OrderGasShopByCategoryProps {
  onSelectCategory: (categoryId: string) => void;
  activeCategoryId?: string;
  dbProducts?: any[];
  className?: string;
}

export function OrderGasShopByCategory({
  onSelectCategory,
  activeCategoryId,
  dbProducts: propDbProducts = [],
  className = "",
}: OrderGasShopByCategoryProps) {
  const [liveProducts, setLiveProducts] = useState<any[]>(propDbProducts);

  // Carousel mechanics (Exact replication of Home Page Browse by Category)
  const categoryTrackRef = useRef<HTMLDivElement | null>(null);
  const isCategoryHoveredRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const categoryOffsetRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);

  // Load real products from Supabase catalogue on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("price", { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          setLiveProducts(data);
        } else if (propDbProducts.length > 0 && isMounted) {
          setLiveProducts(propDbProducts);
        } else if (isMounted) {
          setLiveProducts(INITIAL_GAS_PRODUCTS);
        }
      } catch (err) {
        console.warn("ShopByCategory product load notice:", err);
        if (isMounted) {
          setLiveProducts(propDbProducts.length > 0 ? propDbProducts : INITIAL_GAS_PRODUCTS);
        }
      }
    }

    fetchProducts();

    // Listen to realtime database updates
    const channel = supabase
      .channel("shop-by-category-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [propDbProducts]);

  // Dynamically compute real product categories with actual product counts
  const activeCategories: CategoryCardData[] = useMemo(() => {
    const products = liveProducts.length > 0 ? liveProducts : INITIAL_GAS_PRODUCTS;

    return PRODUCT_CATEGORIES_METADATA.map((cat) => {
      const matchingCount = products.filter((p) => {
        if (p.is_active === false) return false;
        const catSlug = (p.category_slug || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const sub = (p.subcategory || "").toLowerCase();

        return cat.matchSlugs.some(
          (slug) =>
            catSlug === slug ||
            catSlug.includes(slug) ||
            sub.includes(slug) ||
            (cat.id === "campingaz" && (brand.includes("camping") || name.includes("campingaz")))
        );
      }).length;

      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        image: cat.image,
        description: cat.description,
        productCount: matchingCount,
      };
    }).filter((cat) => cat.productCount > 0); // STRICT: ZERO products => HIDE completely!
  }, [liveProducts]);

  // Carousel manual left/right navigation (Exact Home page behavior)
  const scrollCategory = (direction: "left" | "right") => {
    pauseUntilRef.current = performance.now() + 2500;
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
    const cardWidth = isMobile ? 190 : 210;
    const gap = isMobile ? 16 : 20;
    const shift = cardWidth + gap;
    if (direction === "left") {
      categoryOffsetRef.current -= shift;
    } else {
      categoryOffsetRef.current += shift;
    }
    if (categoryTrackRef.current) {
      const singleSetWidth = activeCategories.length * (cardWidth + gap);
      if (singleSetWidth > 0) {
        while (categoryOffsetRef.current < 0) {
          categoryOffsetRef.current += singleSetWidth;
        }
        const renderPos = -(categoryOffsetRef.current % singleSetWidth);
        categoryTrackRef.current.style.transform = `translate3d(${renderPos}px, 0, 0)`;
      }
    }
  };

  // Continuous smooth auto-glide animation (Exact Home page behavior)
  useEffect(() => {
    if (activeCategories.length === 0) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (
        categoryTrackRef.current &&
        !isCategoryHoveredRef.current &&
        !isDraggingRef.current &&
        performance.now() > pauseUntilRef.current
      ) {
        const isMobile = window.innerWidth < 640;
        const speed = isMobile ? 32 : 42; // Fast, smooth glide matching Home page
        const cardWidth = isMobile ? 190 : 210;
        const gapWidth = isMobile ? 16 : 20;
        const singleSetWidth = activeCategories.length * (cardWidth + gapWidth);

        categoryOffsetRef.current += speed * dt;

        if (singleSetWidth > 0 && categoryOffsetRef.current >= singleSetWidth) {
          categoryOffsetRef.current %= singleSetWidth;
        }

        const renderPos = -(categoryOffsetRef.current % singleSetWidth);
        categoryTrackRef.current.style.transform = `translate3d(${renderPos}px, 0, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeCategories.length]);

  return (
    <section
      id="shop-by-category"
      className={cn(
        "pt-5 pb-4 sm:pt-6 sm:pb-5 md:pb-6 bg-[#f7f8fa] border-b border-slate-200/60 overflow-hidden text-left",
        className,
      )}
    >
      <div className="container-page max-w-[88rem] px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
        {/* Section Header (Exact Home page UI design) */}
        <OrderGasReveal3D translateY={18} rotateX={4} scale={0.98} duration={700}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-6 bg-primary rounded-full inline-block" />
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                  PRODUCT CATALOGUE
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight font-display">
                Browse by <span className="text-primary">Category</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
                Explore our full range of products and everyday essentials, delivered direct
                across Gloucestershire. Click any category to view products.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Circular Navigation Controls */}
              <div className="flex items-center gap-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => scrollCategory("left")}
                  aria-label="Scroll left"
                  className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-2xs hover:border-primary hover:text-primary transition-all flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategory("right")}
                  aria-label="Scroll right"
                  className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-2xs hover:border-primary hover:text-primary transition-all flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Categories Available Pill */}
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{activeCategories.length} Categories</span>
              </span>
            </div>
          </div>
        </OrderGasReveal3D>

        {/* Carousel Track & Card Cards Grid (Exact Home page UI layout & card styling) */}
        <OrderGasReveal3D delay={120} translateY={14} rotateX={3} scale={0.98} duration={750}>
          <div
            className="relative w-full overflow-hidden py-2 select-none"
            onMouseEnter={() => {
              isCategoryHoveredRef.current = true;
            }}
            onMouseLeave={() => {
              isCategoryHoveredRef.current = false;
            }}
            onTouchStart={(e) => {
              isDraggingRef.current = true;
              dragStartXRef.current = e.touches[0].clientX;
              dragStartOffsetRef.current = categoryOffsetRef.current;
              pauseUntilRef.current = performance.now() + 3000;
            }}
            onTouchMove={(e) => {
              if (isDraggingRef.current && categoryTrackRef.current) {
                const delta = e.touches[0].clientX - dragStartXRef.current;
                categoryOffsetRef.current = dragStartOffsetRef.current - delta;
                const isMobile = window.innerWidth < 640;
                const cardWidth = isMobile ? 190 : 210;
                const gapWidth = isMobile ? 16 : 20;
                const singleSetWidth = activeCategories.length * (cardWidth + gapWidth);
                if (singleSetWidth > 0) {
                  while (categoryOffsetRef.current < 0) {
                    categoryOffsetRef.current += singleSetWidth;
                  }
                  const renderPos = -(categoryOffsetRef.current % singleSetWidth);
                  categoryTrackRef.current.style.transform = `translate3d(${renderPos}px, 0, 0)`;
                }
              }
            }}
            onTouchEnd={() => {
              isDraggingRef.current = false;
              pauseUntilRef.current = performance.now() + 2500;
            }}
          >
            <div ref={categoryTrackRef} className="flex gap-4 sm:gap-5 will-change-transform">
              {[
                ...activeCategories,
                ...activeCategories,
                ...activeCategories,
                ...activeCategories,
              ].map((c, idx) => {
                const Icon = c.icon;
                const isSelected = activeCategoryId === c.id;

                return (
                  <div
                    key={`${c.id}-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectCategory(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectCategory(c.id);
                      }
                    }}
                    className={cn(
                      "group rounded-[22px] border bg-white overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 shadow-2xs w-[190px] sm:w-[210px] lg:w-[220px] shrink-0 h-full block cursor-pointer select-none text-left",
                      isSelected
                        ? "border-primary ring-2 ring-red-100 shadow-md"
                        : "border-slate-200/90",
                    )}
                  >
                    {/* Top Image Area */}
                    <div className="h-36 sm:h-40 overflow-hidden bg-slate-100 relative shrink-0">
                      <img
                        src={c.image}
                        alt={c.name}
                        className="w-full h-full object-cover object-center group-hover:scale-[1.035] transition-transform duration-300 rounded-t-[22px]"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/calor-cylinders-studio.jpg";
                        }}
                      />

                      {/* Top Left Floating Icon Badge */}
                      <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white text-primary flex items-center justify-center shadow-xs border border-slate-100 font-bold z-10">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Bottom White Content Area */}
                    <div className="p-4 sm:p-4.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Red Accent Line */}
                        <div className="h-0.5 w-5 bg-primary rounded-full group-hover:w-8 transition-all duration-300 mb-2" />

                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-1">
                          {c.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1 min-h-[34px]">
                          {c.description}
                        </p>
                      </div>

                      {/* CTA Button & Count Footer */}
                      <div className="pt-2.5 border-t border-slate-100/90 flex items-center justify-between gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white text-[11px] sm:text-xs font-extrabold shadow-2xs group-hover:bg-red-700 group-hover:shadow-xs group-hover:scale-[1.02] transition-all duration-200">
                          <span>Shop now</span>
                          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white group-hover:translate-x-1 transition-transform duration-200" />
                        </div>

                        <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-400 truncate">
                          {c.productCount} {c.productCount === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </OrderGasReveal3D>
      </div>
    </section>
  );
}
