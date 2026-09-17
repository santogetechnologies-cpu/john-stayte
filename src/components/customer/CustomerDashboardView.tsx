import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Heart,
  MapPin,
  HelpCircle,
  ArrowRight,
  Bell,
  Package,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Sparkles,
  Flame,
  FileText,
  AlertCircle,
  Plus,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getCustomerGasApplication, GasCustomerApplication } from "@/lib/application-service";
import { cleanImageUrl, cn } from "@/lib/utils";

interface CustomerOrder {
  id: string;
  order_number?: string;
  status: string;
  total: number | string;
  created_at: string;
  order_items?: { id?: string; name?: string; quantity?: number; price?: number }[];
}

interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category_slug: string;
  subcategory?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  image_url: string | null;
  is_offer?: boolean;
  is_featured?: boolean;
  rating?: number;
  reviews_count?: number;
}

export function CustomerDashboardView() {
  const { user, wishlist, toggleWishlist, addToCart } = useStore();
  const customerName = user?.name || "Customer";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [customerApp, setCustomerApp] = useState<GasCustomerApplication | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Fetch real customer data & products from Supabase
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const currentEmail = authUser?.user?.email || user?.email;
        const currentUid = authUser?.user?.id || user?.id;

        // Fetch application status
        if (currentUid) {
          const app = await getCustomerGasApplication(currentUid);
          setCustomerApp(app);
        }

        // 1. Query Orders belonging to authenticated customer
        if (currentEmail || currentUid) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .or(`customer_email.eq.${currentEmail},customer_id.eq.${currentUid}`)
            .order("created_at", { ascending: false });

          if (orderData) {
            setOrders(orderData);
          }
        }

        // 2. Query support requests for customer filtered strictly by auth.uid()
        if (currentUid) {
          const { count } = await supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", currentUid);
          setTicketCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to load customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadFeaturedProducts() {
      setLoadingProducts(true);
      try {
        // Query real store products from Supabase
        const { data: prodData } = await supabase
          .from("products")
          .select("*")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8);

        if (prodData && prodData.length > 0) {
          const mapped: ShopProduct[] = prodData.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand || "Calor",
            category_slug: p.category_slug || "gas",
            subcategory: p.subcategory || null,
            price: Number(p.price || 0),
            compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
            stock: Number(p.stock ?? 10),
            image_url: p.image_url,
            is_offer: Boolean(p.is_offer),
            is_featured: Boolean(p.is_featured),
            rating: Number(p.rating || 5.0),
            reviews_count: Number(p.reviews_count || 0),
          }));

          // Sort in-stock products first, then take 4
          const sorted = mapped.sort((a, b) => {
            if (a.stock > 0 && b.stock <= 0) return -1;
            if (a.stock <= 0 && b.stock > 0) return 1;
            return 0;
          });

          setProducts(sorted.slice(0, 4));
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to load shop products for dashboard:", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadDashboardData();
    loadFeaturedProducts();

    const channel = supabase
      .channel("customer_dashboard_realtime_kpis")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        loadDashboardData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () =>
        loadDashboardData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        loadDashboardData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () =>
        loadFeaturedProducts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Compute metrics from REAL database rows
  const totalOrders = orders.length;

  // Lifetime Spend excludes Cancelled orders
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "Cancelled"), [orders]);

  const lifetimeSpend = useMemo(
    () => activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [activeOrders],
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const kpiCards = [
    {
      label: "TOTAL ORDERS",
      value: loading ? null : totalOrders,
      sub: totalOrders === 1 ? "1 order placed" : `${totalOrders} orders on record`,
      icon: ShoppingBag,
      accent: "text-slate-900",
      iconBg: "bg-slate-100 text-slate-700 border border-slate-200/60",
      cardBorder: "border-slate-200/90",
      highlight: false,
      href: "/account/orders",
    },
    {
      label: "LIFETIME SPEND",
      value: loading ? null : gbp(lifetimeSpend),
      sub: "Excludes cancelled orders",
      icon: TrendingUp,
      accent: "text-primary",
      iconBg: "bg-primary/10 text-primary border border-primary/20",
      cardBorder: "border-primary/30 shadow-[0_4px_16px_rgba(227,27,35,0.06)]",
      highlight: true,
      href: "/account/orders",
    },
    {
      label: "SAVED WISHLIST",
      value: loading ? null : wishlist.length,
      sub: wishlist.length > 0 ? `${wishlist.length} item(s) saved` : "No saved items",
      icon: Heart,
      accent: "text-slate-900",
      iconBg: "bg-rose-50 text-rose-600 border border-rose-200/60",
      cardBorder: "border-slate-200/90",
      highlight: false,
      href: "/account/wishlist",
    },
    {
      label: "SUPPORT ENQUIRIES",
      value: loading ? null : ticketCount,
      sub: ticketCount > 0 ? `${ticketCount} ticket(s) logged` : "No open requests",
      icon: Bell,
      accent: "text-slate-900",
      iconBg: "bg-amber-50 text-amber-600 border border-amber-200/60",
      cardBorder: "border-slate-200/90",
      highlight: false,
      href: "/account/support",
    },
  ];

  const quickActions = [
    {
      label: "My Orders",
      description: "Track deliveries & invoices",
      icon: Package,
      href: "/account/orders",
      iconCls: "text-blue-600",
      bgCls: "bg-blue-50/80 group-hover:bg-blue-100 border border-blue-100",
    },
    {
      label: "Wishlist",
      description: "Fast reorder saved fuels & gas",
      icon: Heart,
      href: "/account/wishlist",
      iconCls: "text-rose-600",
      bgCls: "bg-rose-50/80 group-hover:bg-rose-100 border border-rose-100",
    },
    {
      label: "Addresses",
      description: "Delivery drop-off locations",
      icon: MapPin,
      href: "/account/addresses",
      iconCls: "text-emerald-600",
      bgCls: "bg-emerald-50/80 group-hover:bg-emerald-100 border border-emerald-100",
    },
    {
      label: "Help & Support",
      description: "Contact Gloucestershire depot",
      icon: HelpCircle,
      href: "/account/support",
      iconCls: "text-violet-600",
      bgCls: "bg-violet-50/80 group-hover:bg-violet-100 border border-violet-100",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ============================================================ */}
      {/* 1. WELCOME / HERO HEADER                                    */}
      {/* ============================================================ */}
      <div className="relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-gradient-to-bl from-primary/5 via-primary/2 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/8 border border-primary/15">
                <Sparkles className="h-3 w-3" />
                Customer Account
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Gloucestershire Delivery Zone
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
              {getGreeting()}, {customerName.split(" ")[0]}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Welcome to your John Stayte Services portal. Manage scheduled deliveries, download VAT
              invoices, and reorder bottled gas directly.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-10 px-5 gap-2 transition-all hover:scale-[1.01]"
            >
              <Link to="/order-gas">
                <Flame className="h-4 w-4" /> Order Gas & Cylinders
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4"
            >
              <Link to="/account/application">
                <FileText className="h-3.5 w-3.5 mr-1 text-slate-500" /> Gas Application
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* GAS CUSTOMER APPLICATION STATUS BANNER (COMPACT PREMIUM ALERT CARD) */}
      {!customerApp || customerApp.status === "NOT_COMPLETED" ? (
        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/40 px-4 py-2.5 sm:py-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/50 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300/80 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-none hover:bg-amber-100">
                  Application Required
                </Badge>
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Complete your gas application
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300 text-xs">·</span>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Required before placing your first gas order.
              </p>
            </div>
          </div>

          <Button
            asChild
            size="sm"
            className="rounded-full h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shrink-0 shadow-2xs gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Link to="/account/application">
              Complete Application <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-300/70 bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-teal-50/40 px-4 py-2.5 sm:py-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300/50 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300/80 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-none hover:bg-emerald-100">
                  {customerApp.status === "APPROVED"
                    ? "Application Approved"
                    : "Application Submitted"}
                </Badge>
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Gas application on file
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300 text-xs">·</span>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Authorized for cylinder deliveries · Signed{" "}
                {new Date(customerApp.signed_at).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full h-8 px-4 border-slate-200 text-slate-700 hover:bg-white font-bold text-xs shrink-0 bg-white/80 shadow-2xs cursor-pointer"
          >
            <Link to="/account/application">View Application</Link>
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. KPI / ACCOUNT STATS                                      */}
      {/* ============================================================ */}
      <div className="grid gap-3.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className={`bg-white rounded-2xl border ${card.cardBorder} p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm block cursor-pointer`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.iconBg}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>

            {loading ? (
              <div className="py-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                <p
                  className={`text-2xl sm:text-[28px] font-display font-black tracking-tight leading-none ${
                    card.highlight ? "text-primary" : "text-slate-900"
                  }`}
                >
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">{card.sub}</p>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK ACTIONS                                            */}
      {/* ============================================================ */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 tracking-tight">
              Quick Actions
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Instant shortcuts to manage your orders, saved items, and delivery locations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {quickActions.map((act) => (
            <Link
              key={act.label}
              to={act.href as never}
              className="group bg-white p-4 sm:p-5 rounded-[18px] border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex sm:flex-col items-center sm:items-stretch justify-between gap-3 sm:gap-4"
            >
              {/* Top row (Desktop) / Left side (Mobile) */}
              <div className="flex items-center sm:items-start sm:justify-between gap-3.5 min-w-0 flex-1 sm:flex-initial">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${act.bgCls} shrink-0 transition-transform duration-200 group-hover:scale-105`}
                >
                  <act.icon className={`h-5 w-5 ${act.iconCls}`} />
                </div>

                {/* Middle on mobile */}
                <div className="min-w-0 flex-1 sm:hidden">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug truncate">
                    {act.label}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 leading-normal truncate">
                    {act.description}
                  </p>
                </div>

                {/* Circular Arrow Button (Desktop Top-Right) */}
                <div className="hidden sm:flex h-7 w-7 rounded-full bg-slate-50 border border-slate-200/70 items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shrink-0">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Desktop Bottom Text Block */}
              <div className="hidden sm:block">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                  {act.label}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">
                  {act.description}
                </p>
              </div>

              {/* Circular Arrow Button (Mobile Right) */}
              <div className="sm:hidden h-8 w-8 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shrink-0">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SHOP PRODUCTS (PREMIUM ECOMMERCE SHOWCASE)                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 sm:gap-y-4">
        {/* Section Header */}
        <div className="col-span-1 px-0.5">
          <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 tracking-tight">
            Shop Products
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Explore our latest gas, cylinders and home heating products.
          </p>
        </div>

        {/* View All Products Action: Top-Right on Desktop/Tablet, Bottom on Mobile */}
        <div className="order-3 sm:order-2 col-span-1 flex justify-center sm:justify-end items-center pt-2 sm:pt-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 rounded-xl gap-1.5 h-8 px-3 cursor-pointer"
          >
            <Link to="/products">
              View All Products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Product Cards Showcase */}
        <div className="order-2 sm:order-3 col-span-1 sm:col-span-2">
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-2.5 sm:p-4 space-y-2 sm:space-y-3.5 animate-pulse shadow-xs"
                >
                  <div className="aspect-square bg-slate-100 rounded-xl sm:rounded-2xl w-full" />
                  <div className="h-2.5 sm:h-3 bg-slate-100 rounded-md w-1/3" />
                  <div className="h-3 sm:h-4 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-4 sm:h-5 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-8 sm:h-9 bg-slate-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-xs space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 w-fit mx-auto">
                <ShoppingBag className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  No products available right now.
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Explore our full catalog of LPG cylinders, heating equipment, and accessories.
                </p>
              </div>
              <div className="pt-1">
                <Button
                  asChild
                  className="rounded-full font-bold text-xs gap-2 shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-9 px-5 cursor-pointer"
                >
                  <Link to="/products">
                    Browse Shop <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
              {products.map((p) => {
                const isWished = wishlist.includes(p.slug);
                const isOutOfStock = p.stock <= 0;
                const hasDiscount = Boolean(p.compare_at_price && p.compare_at_price > p.price);
                const discountPercent = hasDiscount
                  ? Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100)
                  : null;

                const categoryBadge =
                  p.subcategory ||
                  (p.category_slug === "gas"
                    ? "LPG / Cylinder"
                    : p.category_slug === "heating"
                      ? "Home Heating"
                      : p.brand || "Calor Gas");

                return (
                  <div
                    key={p.id}
                    className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-2.5 sm:p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between relative"
                  >
                    {/* Top Image Container */}
                    <div className="relative w-full rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-100 p-2 sm:p-4 aspect-square flex items-center justify-center overflow-hidden mb-2 sm:mb-3">
                      {/* Discount or Offer Badge */}
                      {hasDiscount ? (
                        <span className="absolute left-1.5 top-1.5 sm:left-2.5 sm:top-2.5 z-10 rounded-full bg-red-600 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide text-white shadow-2xs">
                          {discountPercent ? `${discountPercent}% OFF` : "Sale"}
                        </span>
                      ) : p.is_offer ? (
                        <span className="absolute left-1.5 top-1.5 sm:left-2.5 sm:top-2.5 z-10 rounded-full bg-amber-500 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide text-white shadow-2xs">
                          Offer
                        </span>
                      ) : null}

                      {/* Wishlist Heart Button */}
                      <button
                        type="button"
                        aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(p.slug);
                          if (!isWished) {
                            toast.success(`${p.name} saved to wishlist!`);
                          }
                        }}
                        className="absolute right-1.5 top-1.5 sm:right-2.5 sm:top-2.5 z-10 grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full border border-slate-200/80 bg-white/95 backdrop-blur-xs text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-white transition-all shadow-2xs cursor-pointer"
                      >
                        <Heart
                          className={cn(
                            "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform active:scale-75",
                            isWished ? "fill-red-600 text-red-600" : "text-slate-400",
                          )}
                        />
                      </button>

                      {/* Product Image Link */}
                      <Link
                        to="/products/$slug"
                        params={{ slug: p.slug }}
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                      >
                        <img
                          src={cleanImageUrl(p.image_url, p.slug)}
                          alt={p.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </Link>
                    </div>

                    {/* Middle Content */}
                    <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">
                          {categoryBadge}
                        </p>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mt-0.5 line-clamp-2 group-hover:text-primary transition-colors">
                          <Link to="/products/$slug" params={{ slug: p.slug }}>
                            {p.name}
                          </Link>
                        </h3>

                        {p.rating && p.rating > 0 ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-700">{p.rating.toFixed(1)}</span>
                            {Boolean(p.reviews_count && p.reviews_count > 0) && (
                              <span className="text-slate-400">({p.reviews_count})</span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="pt-1.5 sm:pt-2">
                        {/* Price & Compare Price */}
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                          <span className="text-sm sm:text-base font-display font-black text-slate-900">
                            {gbp(p.price)}
                          </span>
                          {p.compare_at_price && p.compare_at_price > p.price && (
                            <span className="text-[10px] sm:text-xs text-slate-400 line-through font-semibold">
                              {gbp(p.compare_at_price)}
                            </span>
                          )}
                        </div>

                        {/* Stock availability indicator */}
                        <div className="mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px]">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center font-bold text-rose-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1" />
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: Add to Cart */}
                    <Button
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isOutOfStock) {
                          toast.error(`${p.name} is currently out of stock.`);
                          return;
                        }
                        addToCart(p.slug, 1);
                        toast.success(`${p.name} added to your basket!`);
                      }}
                      className={cn(
                        "mt-2.5 sm:mt-3.5 w-full rounded-full font-bold text-[11px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3 shadow-xs transition-all gap-1 sm:gap-1.5 cursor-pointer",
                        isOutOfStock
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10 hover:shadow-md hover:scale-[1.01]",
                      )}
                    >
                      <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                      {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
