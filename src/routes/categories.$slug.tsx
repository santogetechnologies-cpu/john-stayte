import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  Clock,
  Phone,
  Search as SearchIcon,
  X,
  Loader2,
  HelpCircle,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Fuel,
  Info,
  ChevronRight,
  CalendarDays,
  Heart,
  Minus,
  Plus,
  Star,
  XCircle,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { categories as fallbackCategories, type Category, type Product } from "@/data/catalog";
import hero from "@/assets/hero-delivery.jpg";
import stationImg from "@/assets/station.jpg";
import coalLogs from "@/assets/coal-logs.jpg";
import bbqPro3 from "@/assets/char_broil_professionalpro3_1.jpg";
import truckImg from "@/assets/image-3.png";
import cylinderImg from "@/assets/image-2.png";
import heaterImg from "@/assets/image-4.png";
import baitsImg from "@/assets/fishing-baits.jpg";
import animalFeedImg from "@/assets/animal-feed-cat.jpg";
import gardenImg from "@/assets/garden-cat.jpg";
import foodImg from "@/assets/food-cat.jpg";
import trailersImg from "@/assets/trailers-cat.jpg";
import workwearImg from "@/assets/workwear-cat.jpg";
import { supabase } from "@/lib/supabase";
import { gbp, useStore } from "@/lib/store";
import { toast } from "sonner";
import { cn, cleanImageUrl } from "@/lib/utils";

type CategorySearch = {
  q?: string;
  sub?: string;
  brand?: string;
  sort?: string;
  max?: number;
  inStock?: boolean;
};

export const Route = createFileRoute("/categories/$slug")({
  validateSearch: (search: Record<string, unknown>): CategorySearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    sub: typeof search.sub === "string" ? search.sub : undefined,
    brand: typeof search.brand === "string" ? search.brand : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    max: typeof search.max === "number" ? search.max : undefined,
    inStock: search.inStock === true || search.inStock === "true" ? true : undefined,
  }),
  head: ({ params }) => {
    const isGas = params.slug.toLowerCase() === "gas";
    const title = isGas ? "Gas Cylinders & Bottled Gas" : params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${title} | John Stayte Services` },
        {
          name: "description",
          content: isGas
            ? "Order Calor gas cylinders, propane, butane and patio gas online. Next-day delivery across Gloucestershire from John Stayte Services."
            : `Browse premium ${title.toLowerCase()} from John Stayte Services. Next-day delivery across Gloucestershire.`,
        },
      ],
    };
  },
  component: CategoryLandingPage,
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

const categoryImagesMap: Record<string, string> = {
  gas: cylinderImg,
  "coal-logs": coalLogs,
  "fishing-baits": baitsImg,
  "animal-feed": animalFeedImg,
  "gas-appliances": bbqPro3,
  "gas-spares": heaterImg,
  garden: gardenImg,
  food: foodImg,
  trailers: trailersImg,
  workwear: workwearImg,
};

function CategoryLandingPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/categories/$slug" });

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);

  const { addToCart, wishlist, toggleWishlist } = useStore();
  const [selectedFeaturedIndex, setSelectedFeaturedIndex] = useState(0);
  const [featuredQty, setFeaturedQty] = useState(1);

  // Fetch real product & category catalog from Supabase
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const [{ data: prods }, { data: cats }] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("categories").select("*").eq("is_active", true),
        ]);

        if (prods) {
          const mapped: Product[] = prods.map((p) => ({
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
            specs:
              p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
                ? (p.specs as Record<string, string>)
                : {},
          }));
          setDbProducts(mapped);
        }

        if (cats && cats.length > 0) {
          const mappedCats: Category[] = cats.map((c) => ({
            slug: c.slug,
            name: c.name,
            icon: c.icon || "Flame",
            subs: c.subcategories || [],
          }));
          setDbCategories(mappedCats);
        }
      } catch (err) {
        console.error("Failed to fetch category products from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Matched category object
  const category = useMemo(() => {
    const found = dbCategories.find((c) => c.slug === slug);
    if (found) return found;
    return (
      fallbackCategories.find((c) => c.slug === slug) || {
        slug,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        icon: "Flame",
        subs: [],
      }
    );
  }, [dbCategories, slug]);

  const IconComponent = iconMap[category.icon] || Flame;
  const categoryHeroImage = categoryImagesMap[category.slug] || cylinderImg;

  // Filter products belonging to this category
  const categoryProducts = useMemo(() => {
    return dbProducts.filter((p) => p.category.toLowerCase() === slug.toLowerCase());
  }, [dbProducts, slug]);

  // Featured products within this category
  const featuredCategoryProducts = useMemo(() => {
    const featuredItems = categoryProducts.filter((p) => p.featured);
    if (featuredItems.length > 0) return featuredItems.slice(0, 4);
    return categoryProducts.slice(0, 4);
  }, [categoryProducts]);

  const activeFeatured = useMemo(() => {
    if (featuredCategoryProducts.length === 0) return null;
    return featuredCategoryProducts[selectedFeaturedIndex] || featuredCategoryProducts[0];
  }, [featuredCategoryProducts, selectedFeaturedIndex]);

  // Brands present in this category
  const brands = useMemo(() => {
    return Array.from(new Set(categoryProducts.map((p) => p.brand)))
      .filter(Boolean)
      .sort();
  }, [categoryProducts]);

  // Filtered explorer product list
  const explorerList = useMemo(() => {
    let r = categoryProducts.slice();
    if (search.q) {
      const q = search.q.toLowerCase();
      r = r.filter((p) => (p.name + p.brand + p.sub).toLowerCase().includes(q));
    }
    if (search.sub) {
      r = r.filter((p) => p.sub?.toLowerCase().includes(search.sub!.toLowerCase()));
    }
    if (search.brand) {
      r = r.filter((p) => p.brand === search.brand);
    }
    if (search.max) {
      r = r.filter((p) => p.price <= search.max!);
    }
    if (search.inStock) {
      r = r.filter((p) => p.stock > 0);
    }
    switch (search.sort) {
      case "price-asc":
        r.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        r.sort((a, b) => b.price - a.price);
        break;
      case "name":
        r.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        r.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return r;
  }, [categoryProducts, search]);

  const setParams = (patch: Partial<CategorySearch>) =>
    navigate({ search: ((prev: CategorySearch) => ({ ...prev, ...patch })) as never });

  // Valid subcategories (filtering out duplicates)
  const validSubs = useMemo(() => {
    const raw = category.subs || [
      "Propane Cylinders",
      "Butane Cylinders",
      "Patio Cylinders",
      "Camping Gas",
      "Pub Gas",
    ];
    return raw.filter((s) => s.trim().toLowerCase() !== category.name.trim().toLowerCase());
  }, [category]);

  const scrollToCatalogue = () => {
    const el = document.getElementById("catalogue-explorer");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isGasPage = slug.toLowerCase() === "gas";

  return (
    <SiteLayout>
      {/* 1. BREADCRUMB & GAS HERO (Compact, Premium, No Massive Whitespace) */}
      <section className="bg-slate-50 border-b border-slate-200/80 pt-6 pb-10 md:pt-8 md:pb-12">
        <div className="container-page space-y-6">
          <Breadcrumb>
            <BreadcrumbList className="text-xs font-semibold text-muted-foreground">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="hover:text-primary transition-colors">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/products" className="hover:text-primary transition-colors">
                    Shop
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold text-foreground">
                  {isGasPage ? "Gas" : category.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase tracking-wider">
                <IconComponent className="h-4 w-4" />
                <span>Authorised Calor Gas Specialist</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Gas cylinders for home, business & outdoor use
              </h1>

              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-xl">
                Browse our complete range of bottled gas, propane, butane and patio cylinders
                available from John Stayte Services with fast local delivery across Gloucestershire.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-7 text-xs sm:text-sm font-bold shadow-xs"
                  onClick={scrollToCatalogue}
                >
                  Shop Gas Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6 text-xs sm:text-sm font-bold"
                >
                  <Link to="/order-gas">Order Gas Online</Link>
                </Button>
              </div>

              <dl className="pt-3 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-md">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Delivery
                  </dt>
                  <dd className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                    Next Working Day
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Depot Radius
                  </dt>
                  <dd className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                    40 Miles
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Forecourts
                  </dt>
                  <dd className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                    3 Stations
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <div className="group relative rounded-3xl overflow-hidden aspect-4/3 bg-white border border-slate-200/80 shadow-md">
                <img
                  src={categoryHeroImage}
                  alt="Calor Gas cylinders"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 bg-white/95 text-slate-900 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-xs text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Genuine Calor Seals
                  </span>
                  <span className="bg-primary/95 text-white px-2.5 py-1 rounded-full text-[11px] font-extrabold">
                    Whitminster Depot
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK GAS OPTIONS (Compact, Interactive Pill Strip) */}
      <section className="bg-white border-b border-slate-200/80 py-4 sticky top-16 z-20 backdrop-blur-md bg-white/95">
        <div className="container-page">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Gas Types:
            </span>

            <button
              type="button"
              onClick={() => {
                setParams({ sub: undefined });
                scrollToCatalogue();
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all shrink-0 ${
                !search.sub
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Gas
            </button>

            {validSubs.map((subName) => {
              const isActive = search.sub?.toLowerCase() === subName.toLowerCase();
              return (
                <button
                  key={subName}
                  type="button"
                  onClick={() => {
                    setParams({ sub: isActive ? undefined : subName });
                    scrollToCatalogue();
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all shrink-0 ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {subName}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. GAS PRODUCT TYPES (Find The Right Gas For You) */}
      <section className="py-10 md:py-14 bg-white border-b border-slate-200/80">
        <div className="container-page space-y-8">
          <div className="max-w-2xl space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Cylinder Selection
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Find the right gas for your application
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore our primary gas formulations for domestic heating, patio cooking, mobile
              leisure and commercial work.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Type 1: Propane */}
            <div
              onClick={() => {
                setParams({ sub: "Propane Cylinders" });
                scrollToCatalogue();
              }}
              className="group surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-xs cursor-pointer"
            >
              <div className="h-44 overflow-hidden bg-slate-100 relative">
                <img
                  src={cylinderImg}
                  alt="Propane gas cylinders"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3.5 left-3.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 tracking-wider">
                  Red Cylinder
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-primary transition-colors">
                    Propane Gas
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Operates in freezing temperatures down to -42°C. For outdoor heating, commercial
                    catering & roofers.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary pt-2 border-t border-slate-100">
                  <span>View Propane Range</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Type 2: Butane */}
            <div
              onClick={() => {
                setParams({ sub: "Butane Cylinders" });
                scrollToCatalogue();
              }}
              className="group surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-xs cursor-pointer"
            >
              <div className="h-44 overflow-hidden bg-slate-100 relative">
                <img
                  src={heaterImg}
                  alt="Butane gas heaters and cylinders"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3.5 left-3.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 tracking-wider">
                  Blue Cylinder
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-primary transition-colors">
                    Butane Gas
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Clean indoor burn operating above 5°C. The standard cylinder for portable mobile
                    room heaters & camping.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary pt-2 border-t border-slate-100">
                  <span>View Butane Range</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Type 3: Patio Gas */}
            <div
              onClick={() => {
                setParams({ sub: "Patio Cylinders" });
                scrollToCatalogue();
              }}
              className="group surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-xs cursor-pointer"
            >
              <div className="h-44 overflow-hidden bg-slate-100 relative">
                <img
                  src={bbqPro3}
                  alt="Patio gas barbecues"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3.5 left-3.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 tracking-wider">
                  Green Cylinder
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-primary transition-colors">
                    Patio Gas (27mm)
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Specially fitted with quick 27mm clip-on connection for instant hookup to gas
                    BBQs and outdoor patio heaters.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary pt-2 border-t border-slate-100">
                  <span>View Patio Range</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Type 4: Exchange & Refills */}
            <Link
              to="/order-gas"
              className="group surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-xs"
            >
              <div className="h-44 overflow-hidden bg-slate-100 relative">
                <img
                  src={truckImg}
                  alt="Cylinder doorstep exchange"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3.5 left-3.5 rounded-full bg-primary text-white text-[10px] font-extrabold uppercase px-2.5 py-1 tracking-wider">
                  Exchange Service
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-primary transition-colors">
                    Cylinder Exchange
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Doorstep empties swap during delivery or exchange directly at Fromebridge, Wild
                    Goose or Bridge stations.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary pt-2 border-t border-slate-100">
                  <span>Order Doorstep Swap</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FEATURED GAS PRODUCTS SHOWCASE */}
      {activeFeatured && (
        <section className="py-8 md:py-12 bg-slate-50 border-b border-slate-200/80">
          <div className="container-page space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Popular Selections
                </p>
                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
                  Featured Gas Products
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Popular gas products available from our current catalogue.
                </p>
              </div>

              <button
                type="button"
                onClick={scrollToCatalogue}
                className="text-xs font-bold text-primary hover:underline hidden sm:flex items-center gap-1"
              >
                View all ({categoryProducts.length}) <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Main Featured Showcase Box */}
            <div className="surface-card rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Large Product Image Stage */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-full aspect-square max-h-[380px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-8 group overflow-hidden">
                  {activeFeatured.offer && (
                    <span className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-xs z-10">
                      Special Offer
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Add to wishlist"
                    onClick={() => toggleWishlist(activeFeatured.slug)}
                    className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full border bg-white/95 backdrop-blur-xs transition-colors hover:border-primary shadow-xs"
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5",
                        wishlist.includes(activeFeatured.slug)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>

                  <Link
                    to="/products/$slug"
                    params={{ slug: activeFeatured.slug }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <img
                      src={cleanImageUrl(activeFeatured.image, activeFeatured.slug)}
                      alt={activeFeatured.name}
                      className="max-h-[280px] w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </Link>

                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Genuine Stock
                    </span>
                    <span className="text-[10px] text-slate-400">Ref: {activeFeatured.slug}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Editorial Product Details & Action Controls */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                      {activeFeatured.brand || "Calor Gas"}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{(activeFeatured.rating || 5.0).toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">
                        ({activeFeatured.reviews || 12} reviews)
                      </span>
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    <Link
                      to="/products/$slug"
                      params={{ slug: activeFeatured.slug }}
                      className="hover:text-primary transition-colors"
                    >
                      {activeFeatured.name}
                    </Link>
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activeFeatured.description ||
                      "High-quality genuine gas cylinder supplied with tamper-evident seal. Ideal for dependable domestic, outdoor or commercial gas applications with fast Gloucestershire delivery."}
                  </p>

                  {/* Badges / Specifications from real data */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeFeatured.sub && (
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        Type: {activeFeatured.sub}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      Next-Day Local Delivery
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      Doorstep Empties Swap
                    </span>
                  </div>
                </div>

                {/* Price & Real Stock Status */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">
                        {gbp(activeFeatured.price)}
                      </span>
                      {activeFeatured.compareAt && (
                        <span className="text-base text-muted-foreground line-through font-semibold">
                          {gbp(activeFeatured.compareAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Inc. VAT · Empty cylinder exchange available on delivery
                    </p>
                  </div>

                  <div>
                    {Number(activeFeatured.stock || 0) <= 0 ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                        <XCircle className="mr-1.5 h-4 w-4 text-rose-500" /> Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" /> In Stock at
                        Whitminster
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls and Buttons */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <div className="inline-flex items-center justify-between border border-slate-200 rounded-full h-12 px-2 bg-slate-50 shrink-0 w-36">
                    <button
                      type="button"
                      disabled={featuredQty <= 1}
                      onClick={() => setFeaturedQty((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-30 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-extrabold text-sm text-slate-900 w-8 text-center">
                      {featuredQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFeaturedQty((q) => q + 1)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    size="lg"
                    disabled={Number(activeFeatured.stock || 0) <= 0}
                    onClick={() => {
                      if (Number(activeFeatured.stock || 0) <= 0) {
                        toast.error(`${activeFeatured.name} is currently out of stock.`);
                        return;
                      }
                      for (let i = 0; i < featuredQty; i++) {
                        addToCart(activeFeatured.slug);
                      }
                      toast.success(`Added ${featuredQty} × ${activeFeatured.name} to basket`);
                    }}
                    className="flex-1 rounded-full font-extrabold text-sm h-12 shadow-sm"
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add to Basket
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-full font-bold text-sm h-12 px-6 shrink-0"
                  >
                    <Link to="/products/$slug" params={{ slug: activeFeatured.slug }}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* If there are multiple featured products, show clean selector cards */}
            {featuredCategoryProducts.length > 1 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Select Featured Cylinder:
                  </p>
                  <button
                    type="button"
                    onClick={scrollToCatalogue}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View all {categoryProducts.length} gas products{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {featuredCategoryProducts.map((p, idx) => {
                    const isSelected = idx === selectedFeaturedIndex;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedFeaturedIndex(idx);
                          setFeaturedQty(1);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex items-center gap-3 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                        )}
                      >
                        <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={cleanImageUrl(p.image, p.slug)}
                            alt={p.name}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs font-black text-primary mt-0.5">{gbp(p.price)}</p>
                        </div>
                        {isSelected && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. GAS PRODUCT EXPLORER ("Shop all gas") */}
      <section
        id="catalogue-explorer"
        className="py-10 md:py-14 bg-white border-b border-slate-200/80"
      >
        <div className="container-page space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
                Catalogue Explorer
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Shop all gas
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Showing {explorerList.length} of {categoryProducts.length} gas products
                {search.sub ? ` in ${search.sub}` : ""}
              </p>
            </div>

            {/* Filter controls toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Input
                  value={search.q ?? ""}
                  onChange={(e) => setParams({ q: e.target.value || undefined })}
                  placeholder="Search gas products..."
                  className="rounded-full bg-slate-50 border-slate-200 text-xs font-medium h-9 pl-9 pr-3"
                />
                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {brands.length > 0 && (
                <Select
                  value={search.brand ?? "all"}
                  onValueChange={(v) => setParams({ brand: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="w-36 rounded-full bg-slate-50 border-slate-200 text-xs font-semibold h-9">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={search.sort ?? "featured"}
                onValueChange={(v) => setParams({ sort: v })}
              >
                <SelectTrigger className="w-40 rounded-full bg-slate-50 border-slate-200 text-xs font-semibold h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(search.q || search.sub || search.brand || search.inStock) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-muted-foreground mr-1">Active filters:</span>
              {search.q && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 border text-xs font-semibold">
                  "{search.q}"
                  <button
                    type="button"
                    onClick={() => setParams({ q: undefined })}
                    className="hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search.sub && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                  {search.sub}
                  <button
                    type="button"
                    onClick={() => setParams({ sub: undefined })}
                    className="hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search.brand && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 border text-xs font-semibold">
                  Brand: {search.brand}
                  <button
                    type="button"
                    onClick={() => setParams({ brand: undefined })}
                    className="hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-bold text-primary hover:bg-primary/10 rounded-full px-2.5"
                onClick={() =>
                  setParams({ q: undefined, sub: undefined, brand: undefined, inStock: undefined })
                }
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="surface-card p-12 text-center rounded-3xl border bg-slate-50 space-y-3">
              <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin" />
              <p className="font-bold text-xs text-muted-foreground">Loading gas products...</p>
            </div>
          ) : explorerList.length === 0 ? (
            <div className="surface-card p-12 text-center rounded-3xl border bg-slate-50 space-y-4 max-w-lg mx-auto shadow-xs">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900">No gas products found</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No items matched your current filter or search criteria.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-bold"
                  onClick={() => setParams({ q: undefined, sub: undefined, brand: undefined })}
                >
                  Reset Filters
                </Button>
                <Button asChild size="sm" className="rounded-full text-xs font-bold">
                  <Link to="/order-gas">Order Gas Online</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {explorerList.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. GAS INFORMATION & TECHNICAL EDITORIAL ("Choosing your gas") */}
      <section className="py-10 md:py-14 bg-slate-50 border-b border-slate-200/80">
        <div className="container-page space-y-8">
          <div className="surface-card rounded-3xl border border-slate-200/80 bg-white p-8 md:p-12 overflow-hidden grid gap-8 lg:grid-cols-2 items-center shadow-xs">
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 border border-slate-200">
              <img
                src={cylinderImg}
                alt="Choosing gas cylinders"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <span className="absolute bottom-4 left-4 bg-white/95 text-slate-900 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-xs flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" /> Technical Compatibility Guide
              </span>
            </div>

            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Expert Guidance
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Choosing the right gas for your requirements
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Selecting the right gas cylinder ensures optimal appliance efficiency, safety and
                all-weather performance. Here is how our primary gases compare:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    P
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Propane (Red / Green)
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      37mbar screw-on (POL) or 27mm clip-on patio gas. High operating pressure ideal
                      for outdoor temperatures below freezing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    B
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Butane (Blue)</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      28mbar clip-on regulator. Highest energy density per cylinder volume,
                      formulated specifically for indoor mobile room heaters.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-7 font-bold text-xs sm:text-sm shadow-xs"
                  onClick={scrollToCatalogue}
                >
                  Explore Gas Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6 font-bold text-xs sm:text-sm"
                >
                  <Link to="/contact">Ask Our Specialists</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. GAS BENEFITS / FEATURES STRIP (Compact & Clean) */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-200/80">
        <div className="container-page">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Local Gas Delivery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dedicated Gloucestershire fleet delivering next working day across a 40-mile depot
                radius.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">100% Genuine Calor Gas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Authorised official distributor with factory tamper-evident safety seals on every
                valve.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <RefreshCw className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Doorstep & Station Swap</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Swap empty cylinders on your doorstep during delivery or at any of our 3 service
                stations.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Phone className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Direct Human Support</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experienced Gloucestershire support team you can call directly on 01452 741234.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. DELIVERY & ORDERING SECTION ("Order your gas") */}
      <section className="py-10 md:py-14 bg-slate-50 border-b border-slate-200/80">
        <div className="container-page space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How to order your gas cylinder
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Convenient online ordering with doorstep delivery across Gloucestershire.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-2.5 relative shadow-xs">
              <span className="text-2xl font-black text-primary/20">01</span>
              <h3 className="font-extrabold text-base text-slate-900">Choose Cylinder</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select your required gas type (Propane, Butane or Patio Gas) and bottle size.
              </p>
            </div>

            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-2.5 relative shadow-xs">
              <span className="text-2xl font-black text-primary/20">02</span>
              <h3 className="font-extrabold text-base text-slate-900">Add to Basket</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add cylinder to basket and select empty cylinder return or new cylinder issue.
              </p>
            </div>

            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-2.5 relative shadow-xs">
              <span className="text-2xl font-black text-primary/20">03</span>
              <h3 className="font-extrabold text-base text-slate-900">Secure Checkout</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your Gloucestershire delivery address and complete secure online payment.
              </p>
            </div>

            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-2.5 relative shadow-xs">
              <span className="text-2xl font-black text-primary/20">04</span>
              <h3 className="font-extrabold text-base text-slate-900">Next-Day Delivery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our local driver arrives with your full cylinder and collects your empty bottle.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-xs sm:text-sm font-bold shadow-xs"
            >
              <Link to="/order-gas">
                Start Gas Order Online <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 9. GAS HELP & ADVICE SECTION */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-200/80">
        <div className="container-page">
          <div className="surface-card p-6 md:p-8 rounded-3xl border border-slate-200/80 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Need help choosing the right gas?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our Gloucestershire team is on hand to answer technical questions and arrange
                  custom delivery.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full font-bold text-xs"
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full font-bold text-xs">
                <Link to="/filling-stations">Find a Station</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL PRODUCT CTA (Compact & Focused) */}
      <section className="py-12 bg-slate-900 text-white text-center">
        <div className="container-page max-w-xl space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Ready to order your gas?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Order before 2pm for fast next working day delivery across Gloucestershire.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full px-7 text-xs sm:text-sm font-bold shadow-lg"
              onClick={scrollToCatalogue}
            >
              Shop Gas Products <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 bg-white/10 px-7 text-xs sm:text-sm font-bold text-white hover:bg-white/20"
            >
              <Link to="/order-gas">Order Gas Online</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
