import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ShoppingBag,
  Truck,
  Package,
  Users,
  MessageSquare,
  Settings,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export function ManagerNotificationsView() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unread" | "orders" | "deliveries" | "inventory" | "customers" | "system"
  >("all");
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch real persistent staff notifications from public.notifications in Supabase
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let { data: notifsData, error: notifErr } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (notifErr) throw notifErr;

      // If notifications table is completely empty, seed initial recent order alerts so historical orders appear
      if ((!notifsData || notifsData.length === 0)) {
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (recentOrders && recentOrders.length > 0) {
          const backfillRows = recentOrders.map((o: any) => ({
            user_id: null,
            title: `New Order #${o.order_number || o.id.slice(0, 8)}`,
            message: `${o.customer_name || o.customer_email || "Customer"} placed an order #${o.order_number || o.id.slice(0, 8)} (Total: £${Number(o.total || 0).toFixed(2)}).`,
            category: "Orders",
            link: `/manager/orders?orderId=${o.id}`,
            read: o.status !== "Pending",
            is_read: o.status !== "Pending",
            created_at: o.created_at,
          }));
          await (supabase.from("notifications") as any).insert(backfillRows);
          const { data: refreshed } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false });
          if (refreshed) notifsData = refreshed;
        }
      }

      setNotifications(notifsData || []);
    } catch (err: any) {
      console.error("Failed to load notifications from Supabase:", err);
      setError(err.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Supabase Realtime subscription on public.notifications
    const notifsChannel = supabase
      .channel("manager_notifications_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, [loadNotifications]);

  // Compute live unread count based on database state
  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => !n.is_read && !n.read).length;
  }, [notifications]);

  // Mark single notification as read in Supabase & navigate to corresponding view
  const handleNotificationClick = async (notif: any) => {
    const isUnread = !notif.is_read && !notif.read;

    if (isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
      );

      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("id", notif.id);
      } catch (err: any) {
        console.error("Failed to update notification status in Supabase:", err);
      }
    }

    const targetLink =
      notif.link ||
      ((notif.category || "").toLowerCase().includes("order")
        ? "/manager/orders"
        : "/manager/enquiries");
    navigate({ to: targetLink as any });
  };

  // Mark all notifications as read in Supabase database
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));

      const { error: updErr } = await supabase
        .from("notifications")
        .update({ is_read: true, read: true })
        .or("is_read.eq.false,read.eq.false");

      if (updErr) throw updErr;

      toast.success("All manager notifications marked as read in database");
      await loadNotifications();
    } catch (err: any) {
      toast.error("Failed to mark all as read: " + err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n: any) => {
      const isUnread = !n.is_read && !n.read;
      if (activeFilter === "unread") return isUnread;
      if (activeFilter === "all") return true;

      const category = (n.category || n.type || "").toLowerCase();
      if (activeFilter === "orders") return category.includes("order");
      if (activeFilter === "deliveries")
        return category.includes("delivery") || category.includes("truck");
      if (activeFilter === "inventory")
        return category.includes("inventory") || category.includes("stock");
      if (activeFilter === "customers")
        return (
          category.includes("customer") ||
          category.includes("user") ||
          category.includes("support")
        );
      if (activeFilter === "system")
        return (
          category.includes("system") ||
          category.includes("security") ||
          category.includes("setting")
        );
      return true;
    });
  }, [notifications, activeFilter]);

  // Contextual icon selector
  const getCategoryIcon = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("order")) return <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />;
    if (cat.includes("delivery") || cat.includes("truck"))
      return <Truck className="h-3.5 w-3.5 text-purple-600" />;
    if (cat.includes("inventory") || cat.includes("stock"))
      return <Package className="h-3.5 w-3.5 text-amber-600" />;
    if (cat.includes("customer") || cat.includes("user"))
      return <Users className="h-3.5 w-3.5 text-emerald-600" />;
    if (cat.includes("support") || cat.includes("enquiry"))
      return <MessageSquare className="h-3.5 w-3.5 text-rose-600" />;
    return <Settings className="h-3.5 w-3.5 text-slate-600" />;
  };

  // Relative time formatter
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  };

  const filterTabs = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    {
      id: "orders",
      label: "Orders",
      count: notifications.filter((n: any) =>
        (n.category || n.type || "").toLowerCase().includes("order")
      ).length,
    },
    {
      id: "customers",
      label: "Customers / Support",
      count: notifications.filter(
        (n: any) =>
          (n.category || n.type || "").toLowerCase().includes("support") ||
          (n.category || n.type || "").toLowerCase().includes("customer")
      ).length,
    },
    {
      id: "deliveries",
      label: "Deliveries",
      count: notifications.filter((n: any) =>
        (n.category || n.type || "").toLowerCase().includes("delivery")
      ).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Manager Notifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time customer orders, support enquiries, and operational updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            variant="outline"
            className="rounded-full text-xs font-extrabold gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-foreground shrink-0 self-start sm:self-center"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            {markingAll ? "Marking all..." : "Mark all as read"}
          </Button>
        )}
      </div>

      {/* 2. FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className={`px-1.5 py-0 text-[10px] font-black rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. NOTIFICATION LIST CONTAINER */}
      <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 sm:p-5 flex items-start gap-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-40 bg-slate-100 rounded-md" />
                    <div className="h-3 w-16 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-3 w-3/4 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
            <h3 className="font-bold text-sm text-foreground">Unable to load notifications</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
            <Button
              onClick={loadNotifications}
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white mt-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              {activeFilter === "unread" ? (
                <Sparkles className="h-6 w-6 text-emerald-500" />
              ) : (
                <Bell className="h-6 w-6" />
              )}
            </div>
            <h3 className="font-bold text-sm text-foreground">
              {activeFilter === "unread"
                ? "You're all caught up"
                : activeFilter === "all"
                ? "No notifications yet"
                : `No ${activeFilter} notifications`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeFilter === "unread"
                ? "There are no unread notifications right now."
                : "Customer orders, delivery updates and enquiries will appear here in real-time."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n: any) => {
              const isUnread = !n.is_read && !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-3.5 transition-colors cursor-pointer group ${
                    isUnread
                      ? "bg-slate-50/70 hover:bg-slate-100/70"
                      : "bg-white hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 transition-transform group-hover:scale-105 ${
                        isUnread
                          ? "bg-white border-slate-200/80 shadow-2xs"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      {getCategoryIcon(n.category || n.type)}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs sm:text-sm tracking-tight truncate ${
                            isUnread
                              ? "font-extrabold text-foreground"
                              : "font-semibold text-slate-700"
                          }`}
                        >
                          {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                        </p>
                        {n.status === "Pending" && n.type === "order" && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-800 border-blue-200 text-[9px] font-extrabold"
                          >
                            New Order
                          </Badge>
                        )}
                        {n.status === "Open" && n.type === "support" && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-extrabold"
                          >
                            Pending Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {typeof (n.message || n.description) === "string" ? (n.message || n.description) : String(n.message || n.description || "")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </span>
                    {isUnread && (
                      <span
                        className="h-2 w-2 rounded-full bg-primary shrink-0"
                        title="Unread notification"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
