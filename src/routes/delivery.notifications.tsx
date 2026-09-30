import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Truck,
  AlertTriangle,
  CheckCheck,
  Loader2,
  Calendar,
  MapPin,
  Flame,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery/notifications")({
  head: () => ({
    meta: [
      { title: "Delivery Notifications | John Stayte Services" },
      { name: "description", content: "Real-time dispatch assignments and operational alerts." },
    ],
  }),
  component: DeliveryNotificationsView,
});

function DeliveryNotificationsView() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || user?.id;
      const currentUserEmail = authData?.user?.email || user?.email;

      if (!currentUserId && !currentUserEmail) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Collect target IDs for the authenticated agent
      const idFilters: string[] = [];
      if (currentUserId) idFilters.push(`user_id.eq.${currentUserId}`);

      // Query delivery_agents for potential legacy/code IDs
      if (currentUserEmail) {
        try {
          const { data: agData } = await (supabase.from("delivery_agents") as any)
            .select("id")
            .eq("email", currentUserEmail)
            .maybeSingle();
          if (agData?.id && agData.id !== currentUserId) {
            idFilters.push(`user_id.eq.${agData.id}`);
          }
        } catch {
          // Ignore
        }
      }

      let query = (supabase.from("notifications") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (idFilters.length > 0) {
        query = query.or(idFilters.join(","));
      } else {
        query = query.eq("user_id", currentUserId);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.warn("Notice querying agent notifications:", error);
      }

      setNotifications(data || []);
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();

    const channelName = `delivery_notifications_page_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const markSingleAsRead = async (id: string) => {
    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: true, read: true })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n)),
      );
      toast.success("Notification marked as read");
    } catch (err: any) {
      toast.error("Failed to mark as read: " + err.message);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.is_read && !n.read)
      .map((n) => n.id);

    if (unreadIds.length === 0) {
      toast.info("All notifications are already marked as read.");
      return;
    }

    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: true, read: true })
        .in("id", unreadIds);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read: true })),
      );
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.error("Failed to mark all as read: " + err.message);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await (supabase.from("notifications") as any).delete().eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification dismissed");
    } catch (err: any) {
      toast.error("Failed to dismiss notification: " + err.message);
    }
  };

  const handleOpenDelivery = (n: any) => {
    // Mark as read in background
    if (!n.is_read && !n.read) {
      markSingleAsRead(n.id);
    }
    const orderId = n.metadata?.order_id || n.metadata?.order_ref || "";
    if (orderId) {
      navigate({
        to: "/delivery/deliveries",
        search: { orderId } as any,
      });
    } else {
      navigate({ to: "/delivery/deliveries" });
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !n.is_read && !n.read;
    if (filterTab === "unread") return isUnread;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  // Calendar date key for strict day-level comparison ("YYYY-MM-DD")
  const getCalendarDateKey = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Date group header label formatter: e.g. "FRIDAY 25 SEPT" or "18 SEPT 2026"
  const getDateGroupLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "RECENT";
      const now = new Date();
      const isThisYear = d.getFullYear() === now.getFullYear();

      if (isThisYear) {
        return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }).toUpperCase();
      }
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
    } catch {
      return "RECENT";
    }
  };

  // Find the calendar date of the newest loaded notification
  const latestNotificationDateKey =
    notifications.length > 0 ? getCalendarDateKey(notifications[0].created_at) : null;

  // Build sequential date groups preserving descending order
  const groupedNotifications: { groupTitle: string; dateKey: string; items: any[] }[] = [];
  filteredNotifications.forEach((n) => {
    const groupTitle = getDateGroupLabel(n.created_at);
    const dateKey = getCalendarDateKey(n.created_at);
    const existing = groupedNotifications.find((g) => g.groupTitle === groupTitle);
    if (existing) {
      existing.items.push(n);
    } else {
      groupedNotifications.push({ groupTitle, dateKey, items: [n] });
    }
  });

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      {/* 1. Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-0.5">
            <Link to="/delivery" className="hover:text-red-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-2xs shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <span>Dispatch Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Real-time delivery assignments and operational alerts for{" "}
            <span className="font-bold text-slate-700">{user?.name || "Delivery Driver"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotifications}
            className="rounded-xl text-xs font-semibold border-slate-200/80 bg-white/80 hover:bg-white text-slate-700 shadow-2xs h-8 px-3 cursor-pointer transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={markAllRead}
              className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white h-8 px-3.5 cursor-pointer shadow-2xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70 inline-flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-2xs">
        {[
          { id: "all", label: `All Alerts (${notifications.length})` },
          { id: "unread", label: `Unread (${unreadCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as "all" | "unread")}
            className={cn(
              "rounded-xl text-xs px-3.5 py-1.5 font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
              filterTab === tab.id
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Operational Activity Timeline Feed */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-16 text-center shadow-2xs">
            <Loader2 className="h-6 w-6 text-red-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Syncing dispatch timeline...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Bell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                {filterTab === "unread" ? "No unread notifications" : "No notifications on record"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When an Admin or Manager assigns a delivery route to you, it will appear here in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-7">
            {groupedNotifications.map((group) => (
              <div key={group.groupTitle} className="space-y-3">
                {/* Date Group Heading */}
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70 text-[10px] sm:text-[11px] font-bold tracking-wider shadow-2xs">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <span>{group.groupTitle}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200/90 via-slate-200/40 to-transparent" />
                </div>

                {/* Vertical Timeline Container */}
                <div className="relative pl-7 sm:pl-9 space-y-2.5 sm:space-y-3 before:absolute before:left-[11px] sm:before:left-[14px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200/70">
                  {group.items.map((n) => {
                    const isUnread = !n.is_read && !n.read;
                    // DATE-BASED NEW vs OLD badge
                    const isNewByDate = Boolean(
                      latestNotificationDateKey &&
                        getCalendarDateKey(n.created_at) === latestNotificationDateKey,
                    );

                    const isAssignment =
                      n.type === "delivery_assigned" ||
                      (n.title && n.title.toLowerCase().includes("new delivery assigned"));
                    const isReassignment =
                      n.type === "delivery_reassigned" ||
                      (n.title && n.title.toLowerCase().includes("reassigned"));
                    const isException =
                      n.type === "delivery_exception" ||
                      (n.title && n.title.toLowerCase().includes("exception"));

                    const meta = n.metadata || {};
                    const orderRef = meta.order_ref || meta.order_number || "";
                    const customerName = meta.customer_name || "";
                    const deliveryArea = meta.delivery_area || meta.delivery_address || "";
                    const deliveryType =
                      meta.delivery_type ||
                      (meta.empty_cylinder_required
                        ? "Refill / Exchange"
                        : "New Cylinder Purchase");
                    const emptyCylinderRequired =
                      meta.empty_cylinder_required ??
                      (meta.order_type === "REFILL_EXCHANGE" || deliveryType.includes("Refill"));
                    const timeSlot = meta.time_slot || "";

                    return (
                      <div key={n.id} className="relative group">
                        {/* Circular Timeline Node */}
                        <div
                          className={cn(
                            "absolute -left-[27px] sm:-left-[35px] top-3.5 h-6 w-6 rounded-full flex items-center justify-center transition-all shadow-2xs z-10",
                            isUnread
                              ? "bg-red-600 text-white ring-4 ring-red-100"
                              : "bg-white text-slate-400 border border-slate-200 ring-4 ring-slate-100/90",
                          )}
                        >
                          {isAssignment ? (
                            <Truck className="h-3 w-3" />
                          ) : isReassignment || isException ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Bell className="h-3 w-3" />
                          )}
                        </div>

                        {/* Compact Timeline Notification Card */}
                        <div
                          className={cn(
                            "rounded-xl sm:rounded-2xl border p-3 sm:p-3.5 transition-all duration-150 relative",
                            isUnread
                              ? "bg-red-50/20 border-red-200/70 shadow-2xs hover:shadow-xs"
                              : "bg-white border-slate-200/70 shadow-2xs hover:border-slate-300 hover:shadow-xs",
                          )}
                        >
                          {/* Top Row: Title, Date-based NEW/OLD Badge, Order #, Timestamp */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <h3
                                className={cn(
                                  "text-xs sm:text-[13px] leading-snug transition-colors",
                                  isUnread
                                    ? "font-black text-slate-900"
                                    : "font-semibold text-slate-800",
                                )}
                              >
                                {n.title}
                              </h3>

                              {/* DATE-BASED NEW / OLD Badge */}
                              {isNewByDate ? (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200/80 shrink-0">
                                  NEW
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/70 shrink-0">
                                  OLD
                                </span>
                              )}

                              {orderRef && (
                                <span className="inline-flex items-center font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/70 shrink-0">
                                  #{orderRef}
                                </span>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {new Date(n.created_at).toLocaleString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Body Details */}
                          {isAssignment && (customerName || deliveryArea || orderRef) ? (
                            <div className="mt-1.5 space-y-1.5 text-xs">
                              {/* Customer and Location */}
                              {(customerName || deliveryArea) && (
                                <div className="flex items-start gap-1.5 text-slate-700 font-semibold text-xs leading-snug">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="break-words">
                                    {customerName
                                      ? `${customerName} · ${deliveryArea}`
                                      : deliveryArea}
                                  </span>
                                </div>
                              )}

                              {/* Badges / Requirements */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {timeSlot && (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-600 gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                                    <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                    {timeSlot}
                                  </span>
                                )}

                                <span className="inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100/80 border border-slate-200/70 px-2 py-0.5 rounded-full">
                                  <Flame className="h-2.5 w-2.5 mr-1 text-slate-500" />
                                  {deliveryType}
                                </span>

                                <span
                                  className={cn(
                                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                    emptyCylinderRequired
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200",
                                  )}
                                >
                                  {emptyCylinderRequired
                                    ? "Empty cylinder required"
                                    : "No return required"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                              {n.message}
                            </p>
                          )}

                          {/* Action Area Below Content */}
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100/90 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              {isAssignment && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenDelivery(n)}
                                  className="rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-2xs px-3 h-7 gap-1 cursor-pointer transition-colors"
                                >
                                  <span>View Delivery</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-auto">
                              {isUnread && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markSingleAsRead(n.id)}
                                  className="rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 px-2 cursor-pointer"
                                  title="Mark as Read"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                  <span>Mark Read</span>
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNotification(n.id)}
                                className="rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 cursor-pointer"
                                title="Dismiss"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

