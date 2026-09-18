import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Loader2,
  ArrowRight,
  Truck,
  AlertTriangle,
  Flame,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function DeliveryNotificationsPopover() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || user?.id;
      const currentUserEmail = authData?.user?.email || user?.email;

      if (!currentUserId && !currentUserEmail) {
        setNotifications([]);
        return;
      }

      const idFilters: string[] = [];
      if (currentUserId) idFilters.push(`user_id.eq.${currentUserId}`);

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
        .order("created_at", { ascending: false })
        .limit(10);

      if (idFilters.length > 0) {
        query = query.or(idFilters.join(","));
      } else {
        query = query.eq("user_id", currentUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.warn("Popover notifications load error:", err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription for authenticated agent
  useEffect(() => {
    const channelName = `delivery_popover_notifications_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadIds = notifications.filter((n) => !n.is_read && !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await (supabase.from("notifications") as any)
          .update({ is_read: true, read: true })
          .in("id", unreadIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
      }
    } catch (err) {
      console.warn("Error marking read:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read && !n.read) {
      try {
        await (supabase.from("notifications") as any)
          .update({ is_read: true, read: true })
          .eq("id", n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true, read: true } : item)),
        );
      } catch (e) {
        console.warn("Notice updating read status:", e);
      }
    }

    setOpen(false);
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

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9 bg-white/70 hover:bg-white border border-white/80 shadow-2xs backdrop-blur-md transition-all cursor-pointer"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="h-4 w-4 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-3xl border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-black text-xs text-slate-900 tracking-tight">
              Delivery Dispatch Alerts
            </h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white shadow-2xs">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={loading}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 h-auto p-0 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 mr-1 inline" />
              )}
              Mark read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <Bell className="mx-auto h-8 w-8 text-slate-300 mb-1" />
            <p className="text-xs font-bold text-slate-900">No dispatch alerts</p>
            <p className="text-[11px] text-slate-400">
              New assigned cylinder deliveries will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const isUnread = !n.is_read && !n.read;
              const isAssignment =
                n.type === "delivery_assigned" ||
                (n.title && n.title.toLowerCase().includes("new delivery assigned"));
              const meta = n.metadata || {};
              const orderRef = meta.order_ref || meta.order_number || "";
              const customerName = meta.customer_name || "";
              const deliveryArea = meta.delivery_area || meta.delivery_address || "";
              const deliveryType = meta.delivery_type || (meta.empty_cylinder_required ? "Refill / Exchange" : "New Cylinder Purchase");
              const emptyCylinderRequired = meta.empty_cylinder_required ?? (meta.order_type === "REFILL_EXCHANGE" || deliveryType.includes("Refill"));

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-3.5 flex gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer",
                    isUnread ? "bg-red-50/30" : "",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                      isAssignment
                        ? "bg-red-100 text-red-600"
                        : n.type === "delivery_exception"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-blue-100 text-blue-600",
                    )}
                  >
                    {isAssignment ? (
                      <Truck className="h-4 w-4" />
                    ) : n.type === "delivery_exception" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-extrabold text-xs text-slate-900 truncate">{n.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {isAssignment && (orderRef || customerName) ? (
                      <div className="space-y-1 text-[11px]">
                        <p className="font-bold text-slate-800 truncate">
                          {orderRef ? `#${orderRef}` : ""} {customerName ? `· ${customerName}` : ""}
                        </p>
                        {deliveryArea && (
                          <p className="text-slate-500 truncate">{deliveryArea}</p>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span
                            className={cn(
                              "font-black text-[9px] px-2 py-0.2 rounded-full",
                              emptyCylinderRequired
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900",
                            )}
                          >
                            {deliveryType}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {emptyCylinderRequired ? "Empty required" : "No empty req."}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {n.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-100 p-2.5 bg-slate-50/70 text-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="w-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 justify-center gap-1.5 cursor-pointer rounded-full"
          >
            <Link to="/delivery/notifications">
              View All Notifications <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
