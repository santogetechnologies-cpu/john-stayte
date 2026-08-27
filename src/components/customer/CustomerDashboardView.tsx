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
  CheckCircle,
  Truck,
  XCircle,
  Loader2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerDashboardView() {
  const { user, wishlist } = useStore();
  const customerName = user?.name && user.name !== "Sarah Hughes" ? user.name : "My Account";

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

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

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
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Delivered
          </Badge>
        );
      case "Out for Delivery":
        return (
          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Out for Delivery
          </Badge>
        );
      case "Packed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Packed
          </Badge>
        );
      case "Approved":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Approved
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            Pending
          </Badge>
        );
    }
  };

  const kpiCards = [
    {
      label: "Total Orders",
      value: loading ? null : totalOrders,
      sub: totalOrders === 1 ? "1 order placed" : `${totalOrders} order${totalOrders !== 1 ? "s" : ""} total`,
      icon: ShoppingBag,
      accent: "text-slate-700",
      iconBg: "bg-slate-100",
    },
    {
      label: "Lifetime Spend",
      value: loading ? null : gbp(lifetimeSpend),
      sub: "Excludes cancelled orders",
      icon: TrendingUp,
      accent: "text-primary",
      iconBg: "bg-primary/8",
      highlight: true,
    },
    {
      label: "Wishlist",
      value: loading ? null : wishlist.length,
      sub: wishlist.length > 0 ? `${wishlist.length} saved item${wishlist.length !== 1 ? "s" : ""}` : "No saved items",
      icon: Heart,
      accent: "text-slate-700",
      iconBg: "bg-rose-50",
    },
    {
      label: "Support Tickets",
      value: loading ? null : ticketCount,
      sub: ticketCount > 0 ? `${ticketCount} request${ticketCount !== 1 ? "s" : ""}` : "No open tickets",
      icon: Bell,
      accent: "text-slate-700",
      iconBg: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-7">
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Customer Dashboard
          </p>
          <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
            {getGreeting()}, {customerName.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
            Manage your orders, invoices, addresses and preferences in one place.
          </p>
        </div>
        <div className="shrink-0">
          <Button asChild size="sm" className="rounded-lg text-xs font-bold gap-1.5 h-9 px-4">
            <Link to="/products">
              Shop Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin mb-1" />
            ) : (
              <p className={`text-[26px] font-black leading-none tracking-tight ${card.highlight ? "text-primary" : "text-slate-900"}`}>
                {card.value}
              </p>
            )}
            <p className="text-[11px] text-slate-400 font-medium mt-1.5 leading-tight">{card.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 3. RECENT ORDERS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-black text-slate-900">Recent Orders</h2>
          {orders.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="text-[12px] font-bold text-primary hover:text-primary hover:bg-primary/5 h-8 px-3 rounded-lg">
              <Link to="/account/orders">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2.5" />
            <p className="text-[12px] text-slate-400 font-semibold">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-14 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="p-4 rounded-2xl bg-primary/8 text-primary w-fit mx-auto mb-4">
              <ShoppingBag className="h-9 w-9" />
            </div>
            <h2 className="font-black text-[15px] text-slate-900 mb-1">No orders yet</h2>
            <p className="text-[12px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your orders will appear here once you place your first order.
            </p>
            <div className="pt-4">
              <Button asChild className="rounded-lg font-bold text-[12px] gap-1.5 h-9 px-5">
                <Link to="/products">
                  Start Shopping <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Left: Order info */}
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 shrink-0">
                    <Package className="h-[18px] w-[18px] text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-[13px] text-slate-900">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {order.order_items?.length > 0 && (
                        <span className="text-slate-300 mx-1.5">·</span>
                      )}
                      {order.order_items?.length > 0 && `${order.order_items.length} item${order.order_items.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                {/* Right: Total + Action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-100 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total</p>
                    <p className="text-[15px] font-black text-slate-900 leading-tight">
                      {gbp(Number(order.total || 0))}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-[11px] font-bold gap-1 border-slate-200 hover:border-primary hover:text-primary hover:bg-primary/5 h-8 px-3 transition-colors duration-150 shrink-0"
                  >
                    <Link to="/account/orders">
                      Details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "My Orders", icon: ShoppingBag, href: "/account/orders", iconCls: "text-blue-600", bgCls: "bg-blue-50 group-hover:bg-blue-100" },
            { label: "Wishlist", icon: Heart, href: "/account/wishlist", iconCls: "text-rose-500", bgCls: "bg-rose-50 group-hover:bg-rose-100" },
            { label: "Addresses", icon: MapPin, href: "/account/addresses", iconCls: "text-emerald-600", bgCls: "bg-emerald-50 group-hover:bg-emerald-100" },
            { label: "Support", icon: HelpCircle, href: "/account/support", iconCls: "text-violet-600", bgCls: "bg-violet-50 group-hover:bg-violet-100" },
          ].map((act) => (
            <Link
              key={act.label}
              to={act.href as never}
              className="group flex flex-col items-center justify-center py-5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 text-center"
            >
              <div className={`p-3 rounded-xl ${act.bgCls} transition-colors duration-200 mb-2.5`}>
                <act.icon className={`h-5 w-5 ${act.iconCls} group-hover:scale-110 transition-transform duration-200`} />
              </div>
              <span className="text-[12px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors duration-150 leading-tight">
                {act.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
