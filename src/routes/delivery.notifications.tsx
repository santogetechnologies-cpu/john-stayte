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
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "assignments">("all");

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
    if (filterTab === "assignments") {
      const t = (n.type || "").toLowerCase();
      const title = (n.title || "").toLowerCase();
      return t.includes("assign") || title.includes("assigned");
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* 1. Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-0.5">
            <Link to="/delivery" className="hover:text-red-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-2xs">
              <Bell className="h-4 w-4" />
            </div>
            Dispatch Notifications
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time delivery assignments and operational alerts for{" "}
            <span className="font-bold text-slate-700">{user?.name || "Delivery Driver"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
          {
            id: "assignments",
            label: `New Assignments (${
              notifications.filter((n) =>
                (n.type || "").toLowerCase().includes("assign") ||
                (n.title || "").toLowerCase().includes("assigned"),
              ).length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
            className={cn(
              "rounded-xl text-xs px-3.5 py-1.5 font-bold transition-all whitespace-nowrap cursor-pointer",
              filterTab === tab.id
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 text-red-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Syncing dispatch notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {filterTab === "unread" ? "No unread notifications" : "No notifications on record"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When an Admin or Manager assigns a delivery route to you, it will appear here in real-time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = !n.is_read && !n.read;
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
            const deliveryType = meta.delivery_type || (meta.empty_cylinder_required ? "Refill / Exchange" : "New Cylinder Purchase");
            const emptyCylinderRequired = meta.empty_cylinder_required ?? (meta.order_type === "REFILL_EXCHANGE" || deliveryType.includes("Refill"));
            const timeSlot = meta.time_slot || "";

            return (
              <div
                key={n.id}
                className={cn(
                  "py-3.5 px-4 sm:px-5 transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3",
                  isUnread
                    ? "bg-slate-50/70 border-l-[3px] border-l-red-600"
                    : "hover:bg-slate-50/40 border-l-[3px] border-l-transparent",
                )}
              >
                {/* Left side: Icon + Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Category / Event Icon */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl shrink-0 mt-0.5 flex items-center justify-center border shadow-2xs",
                      isAssignment
                        ? "bg-red-50 text-red-600 border-red-100"
                        : isReassignment || isException
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-blue-50 text-blue-600 border-blue-100",
                    )}
                  >
                    {isAssignment ? (
                      <Truck className="h-4 w-4" />
                    ) : isReassignment || isException ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </div>

                  {/* Notification Content Body */}
                  <div className="space-y-1 flex-1 min-w-0">
                    {/* Header Row: Title, New Badge, Order #, Timestamp */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className={cn("text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate", isUnread && "font-black")}>
                        {n.title}
                      </h3>

                      {isUnread && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                          New
                        </span>
                      )}

                      {orderRef && (
                        <span className="inline-flex items-center font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/80">
                          #{orderRef}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium ml-auto shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(n.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Metadata Detail Row */}
                    {isAssignment && (customerName || deliveryArea || orderRef) ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 pt-0.5">
                        {/* Customer & Location */}
                        {(customerName || deliveryArea) && (
                          <div className="flex items-center gap-1 text-slate-700 font-semibold min-w-0">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-md sm:max-w-lg lg:max-w-2xl">
                              {customerName ? `${customerName} · ${deliveryArea}` : deliveryArea}
                            </span>
                          </div>
                        )}

                        {/* Timeslot */}
                        {timeSlot && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {timeSlot}
                          </span>
                        )}

                        {/* Compact Cylinder requirement tag */}
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-full">
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
                            {emptyCylinderRequired ? "Empty return required" : "No return required"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 pl-11 md:pl-0">
                  {isAssignment && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenDelivery(n)}
                      className="rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-2xs px-3 h-7.5 gap-1 cursor-pointer transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markSingleAsRead(n.id)}
                      className="rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 h-7.5 px-2 cursor-pointer"
                      title="Mark as Read"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      <span className="hidden sm:inline">Mark Read</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(n.id)}
                    className="rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 h-7.5 w-7.5 p-0 cursor-pointer"
                    title="Dismiss"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
