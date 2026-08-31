import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Heart,
  MapPin,
  HelpCircle,
  ArrowRight,
  User,
  Bell,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Flame,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerDashboardView() {
  const { user, wishlist } = useStore();
  const customerName = user?.name || "Customer";

  const [orders, setOrders] = useState<any[]>([]);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real customer orders & data from Supabase
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const currentEmail = authUser?.user?.email || user?.email;

        if (!currentEmail && !authUser?.user?.id) {
          setOrders([]);
          setLoading(false);
          return;
        }

        // 1. Query Orders belonging to authenticated customer
        const { data: orderData } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`customer_email.eq.${currentEmail},customer_id.eq.${authUser?.user?.id}`)
          .order("created_at", { ascending: false });

        if (orderData) {
          setOrders(orderData);
        }

        // 2. Query support requests for customer filtered strictly by auth.uid()
        if (authUser?.user?.id) {
          const { count } = await supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", authUser.user.id);
          setTicketCount(count || 0);
        }
      } catch (err) {
        console.error("Failed to load customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Compute metrics from REAL database rows
  const totalOrders = orders.length;

  // Lifetime Spend excludes Cancelled orders
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "Cancelled"),
    [orders],
  );

  const lifetimeSpend = useMemo(
    () => activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [activeOrders],
  );

  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            Delivered
          </span>
        );
      case "Out for Delivery":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
            Out for Delivery
          </span>
        );
      case "Packed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            Packed
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Approved
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
            Pending
          </span>
        );
    }
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
              Welcome to your John Stayte Services portal. Manage scheduled deliveries, download VAT invoices, and reorder bottled gas directly.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-10 px-5 gap-2 transition-all hover:scale-[1.01]"
            >
              <Link to="/products">
                <Flame className="h-4 w-4" /> Order Gas & Products
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4"
            >
              <Link to="/account/orders">
                <FileText className="h-3.5 w-3.5 mr-1 text-slate-500" /> Invoices
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. KPI / ACCOUNT STATS                                      */}
      {/* ============================================================ */}
      <div className="grid gap-3.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-2xl border ${card.cardBorder} p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}
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
                <p className={`text-2xl sm:text-[28px] font-display font-black tracking-tight leading-none ${
                  card.highlight ? "text-primary" : "text-slate-900"
                }`}>
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                  {card.sub}
                </p>
              </div>
            )}
          </div>
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
                <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${act.bgCls} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
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
      {/* 4. RECENT ORDERS                                            */}
      {/* ============================================================ */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 tracking-tight">
              Recent Orders
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Your latest cylinder and fuel orders processed by John Stayte Services
            </p>
          </div>
          {orders.length > 0 && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 rounded-xl gap-1.5 h-8 px-3"
            >
              <Link to="/account/orders">
                View All Orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-xs space-y-3">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
            <p className="text-xs text-slate-500 font-bold">
              Loading your live orders from Supabase...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center shadow-xs space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 w-fit mx-auto">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                No orders placed yet
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Order your Calor propane, butane, patio cylinders, fuels or store essentials online for fast Gloucestershire delivery.
              </p>
            </div>
            <div className="pt-1">
              <Button
                asChild
                className="rounded-xl font-bold text-xs gap-2 shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-9 px-4"
              >
                <Link to="/products">
                  Start Shopping <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:px-6 sm:py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                {/* Left: Order Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 shrink-0">
                    <Package className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        #{order.order_number}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <span>
                        {new Date(order.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {order.order_items?.length > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>
                            {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Total + View Details */}
                <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-slate-100 sm:border-0 pt-2.5 sm:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </p>
                    <p className="text-base font-display font-black text-slate-900 leading-tight">
                      {gbp(Number(order.total || 0))}
                    </p>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold gap-1 border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 hover:bg-primary/5 h-8.5 px-3.5 transition-colors"
                  >
                    <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
                      View Details <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
