import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unread" | "orders" | "deliveries" | "inventory" | "customers" | "system"
  >("all");
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch notifications from Supabase
  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setNotifications(data || []);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    try {
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      toast.error("Failed to update notification: " + err.message);
      // Revert on error
      await loadNotifications();
    }
  };

  // Mark all notifications as read in Supabase
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    try {
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (updateErr) throw updateErr;

      toast.success("All notifications marked as read");
      await loadNotifications();
    } catch (err: any) {
      toast.error("Failed to mark all as read: " + err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "unread") return !n.is_read;
      if (activeFilter === "all") return true;

      const category = (n.category || n.type || "").toLowerCase();
      if (activeFilter === "orders") return category.includes("order");
      if (activeFilter === "deliveries") return category.includes("delivery") || category.includes("truck");
      if (activeFilter === "inventory") return category.includes("inventory") || category.includes("stock");
      if (activeFilter === "customers") return category.includes("customer") || category.includes("user");
      if (activeFilter === "system") return category.includes("system") || category.includes("security") || category.includes("setting");
      return true;
    });
  }, [notifications, activeFilter]);

  // Contextual icon selector
  const getCategoryIcon = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("order")) return <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />;
    if (cat.includes("delivery") || cat.includes("truck")) return <Truck className="h-3.5 w-3.5 text-purple-600" />;
    if (cat.includes("inventory") || cat.includes("stock")) return <Package className="h-3.5 w-3.5 text-amber-600" />;
    if (cat.includes("customer") || cat.includes("user")) return <Users className="h-3.5 w-3.5 text-emerald-600" />;
    if (cat.includes("support") || cat.includes("enquiry")) return <MessageSquare className="h-3.5 w-3.5 text-rose-600" />;
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

  return (
    <div className="max-w-4xl space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Manager Notifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Stay up to date with orders, deliveries, inventory and customer activity.
          </p>
        </div>

        <Button
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0 || markingAll}
          variant="outline"
          size="sm"
          className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white hover:bg-slate-50 transition-all shrink-0 self-start sm:self-center disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5 text-muted-foreground" />
          {markingAll ? "Updating..." : "Mark all as read"}
        </Button>
      </div>

      {/* 2. FILTER NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "orders", label: "Orders" },
          { id: "deliveries", label: "Deliveries" },
          { id: "inventory", label: "Inventory" },
          { id: "customers", label: "Customers" },
          { id: "system", label: "System" },
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
          /* SKELETON LOADING STATE */
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
          /* ERROR STATE */
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
          /* EMPTY STATE */
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
                : "Activity and system notifications will appear here in real-time."}
            </p>
          </div>
        ) : (
          /* NOTIFICATION LIST ROWS */
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.is_read)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-3.5 transition-colors cursor-pointer group ${
                    isUnread
                      ? "bg-slate-50/70 hover:bg-slate-100/70"
                      : "bg-white hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Category Icon */}
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 transition-transform group-hover:scale-105 ${
                        isUnread
                          ? "bg-white border-slate-200/80 shadow-2xs"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      {getCategoryIcon(n.category || n.type)}
                    </div>

                    {/* Content */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs sm:text-sm tracking-tight truncate ${
                            isUnread
                              ? "font-extrabold text-foreground"
                              : "font-semibold text-slate-700"
                          }`}
                        >
                          {n.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {n.message || n.description}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Timestamp & Unread Dot */}
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
