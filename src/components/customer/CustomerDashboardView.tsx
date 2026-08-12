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

        // 2. Query open support tickets / notifications for customer
        if (currentEmail) {
          const { count } = await supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .eq("customer_email", currentEmail);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Delivered</Badge>;
      case "Out for Delivery":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">Out for Delivery</Badge>;
      case "Packed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">Packed</Badge>;
      case "Approved":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Approved</Badge>;
      case "Cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. DASHBOARD HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Good morning, {customerName}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your orders, invoices, addresses and preferences in one place.
        </p>
      </div>

      {/* 2. SUMMARY KPI CARDS (REAL SUPABASE DATA) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-5 rounded-3xl border bg-white text-center shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orders</p>
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mt-2" />
          ) : (
            <p className="mt-2 font-display text-2xl font-black text-foreground">{totalOrders}</p>
          )}
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {totalOrders === 1 ? "1 order placed" : `${totalOrders} total order(s)`}
          </p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white text-center shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifetime Spend</p>
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mt-2" />
          ) : (
            <p className="mt-2 font-display text-2xl font-black text-foreground">{gbp(lifetimeSpend)}</p>
          )}
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">Excludes cancelled orders</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white text-center shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wishlist</p>
          <p className="mt-2 font-display text-2xl font-black text-primary">
            {wishlist.length}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {wishlist.length > 0 ? `${wishlist.length} saved item(s)` : "No saved items"}
          </p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white text-center shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</p>
          <p className="mt-2 font-display text-2xl font-black text-foreground">{ticketCount}</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {ticketCount > 0 ? `${ticketCount} support ticket(s)` : "No new notifications"}
          </p>
        </div>
      </div>

      {/* 3. RECENT ORDERS OR EMPTY STATE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">Recent Orders</h2>
          {orders.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-primary hover:text-primary">
              <Link to="/account/orders">
                View All Orders <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="surface-card p-8 rounded-3xl border bg-white text-center text-xs text-muted-foreground font-bold">
            <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
            Loading your orders from Supabase...
          </div>
        ) : orders.length === 0 ? (
          <div className="surface-card p-8 sm:p-12 rounded-3xl border bg-white text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary w-fit mx-auto">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="font-black text-lg text-foreground">No orders yet</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your orders will appear here once you place your first order.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="rounded-full font-bold text-xs gap-2">
                <Link to="/products">
                  Start Shopping <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="surface-card p-4 sm:p-5 rounded-2xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-foreground">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Placed on {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {order.order_items?.length > 0 && ` • ${order.order_items.length} item(s)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium text-muted-foreground">Total</p>
                    <p className="text-base font-black text-foreground">{gbp(Number(order.total || 0))}</p>
                  </div>

                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs font-bold gap-1">
                    <Link to="/account/orders">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. QUICK ACTIONS GRID */}
      <div className="surface-card p-6 rounded-3xl border bg-white space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "My Orders", icon: ShoppingBag, href: "/account/orders", color: "text-blue-600 bg-blue-50" },
            { label: "Wishlist", icon: Heart, href: "/account/wishlist", color: "text-red-600 bg-red-50" },
            { label: "Addresses", icon: MapPin, href: "/account/addresses", color: "text-emerald-600 bg-emerald-50" },
            { label: "Support", icon: HelpCircle, href: "/account/support", color: "text-purple-600 bg-purple-50" },
          ].map((act) => (
            <Link
              key={act.label}
              to={act.href as never}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-background hover:bg-slate-50 hover:border-primary/40 hover:shadow-md transition-all text-center group"
            >
              <div className={`p-3 rounded-xl ${act.color} group-hover:scale-110 transition-transform mb-2`}>
                <act.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
