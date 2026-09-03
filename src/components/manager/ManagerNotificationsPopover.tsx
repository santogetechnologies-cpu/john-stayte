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
        className="w-80 sm:w-96 p-0 rounded-2xl border bg-card shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full px-2 text-[10px] bg-primary/10 text-primary font-bold"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-bold text-foreground">You're all caught up</p>
              <p className="text-[11px] text-muted-foreground">No new orders or notifications.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.is_read && !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                    isUnread ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-background border shrink-0">
                    {n.type === "order" || n.category === "Orders" ? (
                      <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 text-rose-600" />
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}
                      >
                        {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                      </p>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {typeof n.message === "string" ? n.message : String(n.message || "")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 border-t bg-muted/10 text-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 rounded-xl h-8 gap-1"
          >
            <Link to="/manager/notifications" onClick={() => setOpen(false)}>
              View All Notifications <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
