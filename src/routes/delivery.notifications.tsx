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
    <div className="space-y-5 sm:space-y-6 w-full max-w-5xl mx-auto">
      {/* 1. Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/delivery" className="hover:text-red-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-red-600" /> Dispatch Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Real-time delivery assignments, route modifications, and depot messages for{" "}
            <span className="font-bold text-slate-800">{user?.name || "Delivery Driver"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotifications}
            className="rounded-full text-xs font-bold border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs h-9 px-3.5 cursor-pointer transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-500" /> Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={markAllRead}
              className="rounded-full text-xs font-black bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 cursor-pointer shadow-2xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div className="surface-card bg-white/70 backdrop-blur-xl rounded-[26px] border border-white/80 p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: `All Alerts (${notifications.length})` },
          { id: "unread", label: `Unread (${unreadCount})`, highlight: unreadCount > 0 },
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
          <Button
            key={tab.id}
            size="sm"
            variant={filterTab === tab.id ? "default" : "outline"}
            onClick={() => setFilterTab(tab.id as any)}
            className={cn(
              "rounded-full text-xs font-bold h-8 px-4 shrink-0 transition-all cursor-pointer",
              filterTab === tab.id
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 font-black border-transparent"
                : "border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 3. Notifications List */}
      <div className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-7 w-7 text-red-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">Syncing dispatch notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center space-y-2.5">
            <Bell className="h-10 w-10 text-slate-300 mx-auto" />
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
                  "p-4 sm:p-5 transition-all duration-150 flex flex-col md:flex-row md:items-start justify-between gap-4",
                  isUnread
                    ? "bg-red-50/40 border-l-4 border-l-red-600"
                    : "hover:bg-slate-50/50 border-l-4 border-l-transparent",
                )}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category / Event Icon */}
                  <div
                    className={cn(
                      "p-3 rounded-2xl shrink-0 mt-0.5 shadow-2xs",
                      isAssignment
                        ? "bg-red-100 text-red-600"
                        : isReassignment
                          ? "bg-amber-100 text-amber-700"
                          : isException
                            ? "bg-rose-100 text-rose-600"
                            : "bg-blue-100 text-blue-600",
                    )}
                  >
                    {isAssignment ? (
                      <Truck className="h-5 w-5" />
                    ) : isReassignment ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : isException ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </div>

                  {/* Notification Content Body */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-black text-sm sm:text-base text-slate-900 leading-snug">
                        {n.title}
                      </h3>

                      {isUnread && (
                        <Badge className="bg-red-600 text-white text-[9px] font-black px-2 py-0.2 rounded-full uppercase shadow-2xs">
                          New
                        </Badge>
                      )}

                      {orderRef && (
                        <Badge variant="outline" className="font-mono text-[10px] font-bold border-slate-200 text-slate-700 rounded-full">
                          #{orderRef}
                        </Badge>
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

                    {/* Rich assignment breakdown card if metadata is present */}
                    {isAssignment && (customerName || deliveryArea || orderRef) ? (
                      <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 shadow-2xs space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <p className="font-extrabold text-xs text-slate-900">
                            {customerName ? `${customerName} · ${deliveryArea}` : deliveryArea || "Customer Delivery"}
                          </p>
                          {timeSlot && (
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" /> {timeSlot}
                            </span>
                          )}
                        </div>

                        {/* Cylinder Requirements Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-none",
                              emptyCylinderRequired
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-emerald-50 text-emerald-900 border-emerald-300",
                            )}
                          >
                            <Flame className="h-3 w-3 mr-1" />
                            {deliveryType}
                          </Badge>

                          <Badge
                            className={cn(
                              "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-none",
                              emptyCylinderRequired
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-900 border-emerald-300",
                            )}
                          >
                            {emptyCylinderRequired
                              ? "Empty cylinder required"
                              : "No empty cylinder required"}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                        {n.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Right Side */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                  {isAssignment && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenDelivery(n)}
                      className="rounded-full font-black text-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/20 px-4 h-8 gap-1.5 cursor-pointer"
                    >
                      <span>View Delivery</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markSingleAsRead(n.id)}
                      className="rounded-full text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2.5 cursor-pointer"
                      title="Mark as Read"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" />
                      <span className="hidden sm:inline">Mark Read</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(n.id)}
                    className="rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 cursor-pointer"
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
