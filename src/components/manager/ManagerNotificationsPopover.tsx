import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, ShoppingBag, Truck, Package, MessageSquare, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export function ManagerNotificationsPopover() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: notifsData, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(notifsData || []);
    } catch (e) {
      console.warn("Notifications popover error:", e);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const notifsChannel = supabase
      .channel("manager_popover_notifications_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        loadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n: any) => !n.is_read && !n.read).length;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read: true })
        .or("is_read.eq.false,read.eq.false");
      await loadNotifications();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const handleItemClick = async (item: any) => {
    const isUnread = !item.is_read && !item.read;
    if (isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read: true } : n)),
      );
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("id", item.id);
      } catch (e) {
        console.error("Failed to mark notification as read:", e);
      }
    }

    setOpen(false);
    const targetLink =
      item.link ||
      ((item.category || "").toLowerCase().includes("order")
        ? "/manager/orders"
        : "/manager/enquiries");
    navigate({ to: targetLink as any });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100/80 text-slate-600 hover:text-slate-900">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-1.5rem)] max-w-[360px] sm:w-96 p-0 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-xl overflow-hidden text-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">Notifications</h4>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full px-1.5 py-0 text-[10px] bg-red-50 text-red-600 border border-red-200/60 font-black shadow-2xs leading-tight shrink-0"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-red-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center space-y-1">
              <Bell className="mx-auto h-7 w-7 text-slate-300 mb-1.5" />
              <p className="text-xs font-extrabold text-slate-900">You're all caught up</p>
              <p className="text-[11px] text-slate-500 font-medium">No new orders or notifications.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.is_read && !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                    isUnread ? "bg-rose-50/20" : ""
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200/80 shrink-0 shadow-2xs">
                    {n.type === "order" || n.category === "Orders" ? (
                      <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <p
                        className={`text-xs truncate min-w-0 ${isUnread ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}
                      >
                        {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                      </p>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0 shadow-2xs" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {typeof n.message === "string" ? n.message : String(n.message || "")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 sm:p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs font-black text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-8 sm:h-8 gap-1 transition-all"
          >
            <Link to="/manager/notifications" onClick={() => setOpen(false)}>
              View All Notifications <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
