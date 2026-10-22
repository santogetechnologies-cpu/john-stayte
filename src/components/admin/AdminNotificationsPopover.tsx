import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  Sparkles,
  FileText,
  ShoppingBag,
  Package,
  Truck,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export function AdminNotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      setNotifications(data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // 1. Listen for local window events
    const handleUpdate = () => loadNotifications();
    window.addEventListener("admin_modules_updated", handleUpdate);

    // 2. Supabase Realtime: instantly update when a new notification is inserted/updated
    const channel = supabase
      .channel("admin_popover_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("admin_modules_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read: true })
        .or("is_read.eq.false,read.eq.false");
      window.dispatchEvent(new Event("admin_modules_updated"));
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = async (item: any) => {
    // Optimistically mark as read
    if (!item.is_read || !item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read: true } : n)),
      );
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("id", item.id);
        window.dispatchEvent(new Event("admin_modules_updated"));
      } catch {
        /* ignore */
      }
    }

    setOpen(false);

    if (item.link) {
      navigate({ to: item.link });
    }
  };

  const getCategoryIcon = (category: string | null) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("application")) return <FileText className="h-4 w-4 text-emerald-600" />;
    if (cat.includes("order")) return <ShoppingBag className="h-4 w-4 text-blue-600" />;
    if (cat.includes("stock") || cat.includes("inventory"))
      return <Package className="h-4 w-4 text-amber-600" />;
    if (cat.includes("delivery") || cat.includes("logistics"))
      return <Truck className="h-4 w-4 text-cyan-600" />;
    if (cat.includes("security") || cat.includes("audit"))
      return <ShieldCheck className="h-4 w-4 text-purple-600" />;
    return <Bell className="h-4 w-4 text-slate-600" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-1.5rem)] max-w-[380px] sm:w-[420px] p-0 rounded-2xl border bg-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-extrabold text-xs sm:text-sm truncate">Notifications</h4>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0.5 text-[10px] bg-red-100 text-red-700 font-extrabold leading-tight shrink-0 border border-red-200"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-slate-700">All caught up!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No unread alerts or notifications.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.is_read && !item.read;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left cursor-pointer ${
                    isUnread ? "bg-amber-50/60" : ""
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5 border border-slate-200">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <p
                        className={`text-xs truncate min-w-0 ${
                          isUnread ? "font-black text-slate-900" : "font-semibold text-slate-700"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.message || item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.category && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {item.category}
                        </span>
                      )}
                      {item.link && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:underline">
                          View <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t p-2.5 bg-slate-50 text-center">
          <Link
            to="/admin/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-slate-700 hover:text-primary transition-colors block py-1"
          >
            View all notifications &rarr;
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
